// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {INormiesCanvasStorage} from "./interfaces/INormiesCanvasStorage.sol";
import {INormiesStorage} from "./interfaces/INormiesStorage.sol";

/// @title NormiesClanWar
/// @notice Red vs Blue clan war. On each join, fetches 200-byte pixel data from
///         NormiesStorage and incrementally updates mean pairwise Hamming distance
///         (O(n) per join). Lower average wins the round; pot splits among winners.
contract NormiesClanWar is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    enum Clan {
        None,
        Red,
        Blue
    }

    struct Fighter {
        Clan clan;
        address enlistedBy;
        bool fromBurnPool;
    }

    struct ClanMember {
        uint256 tokenId;
        address enlistedBy;
        bool fromBurnPool;
    }

    struct RoundResult {
        Clan winningClan;
        uint256 potPaid;
        uint256 winnerCount;
        bool resolved;
    }

    /// @dev Normies ERC721 on Ethereum mainnet.
    address public constant NORMIES_MAINNET =
        0x9Eb6E2025B64f340691e424b7fe7022fFDE12438;

    /// @dev NormiesStorage on Ethereum mainnet.
    address public constant NORMIES_STORAGE_MAINNET =
        0x1B976bAf51cF51F0e369C070d47FBc47A706e602;

    /// @dev NormiesCanvas storage on Ethereum mainnet.
    address public constant NORMIES_TRANSFORM_STORAGE_MAINNET =
        0xC255BE0983776BAB027a156681b6925cde47B2D1;

    uint256 public constant IMAGE_BYTES = 200;
    uint256 public constant MAX_TOKEN_ID = 9999;
    uint256 public constant MAX_PIXELS = 1600;
    uint256 public constant MAX_CLAN_MEMBERS = 25;
    uint256 public constant ROUND_JOIN_DURATION = 15 days;

    IERC721 public normies;
    INormiesStorage public normiesStorage;
    uint256 public joinFee;
    uint256 public pot;
    /// @dev Active round number; first round is 1 (not 0).
    uint256 public round;

    mapping(uint256 round => RoundResult result) public roundResults;
    mapping(uint256 round => mapping(uint256 tokenId => Fighter fighter))
        public fighters;
    mapping(uint256 round => uint256 count) public redCount;
    mapping(uint256 round => uint256 count) public blueCount;
    /// @dev Sum of Hamming distances over all unique fighter pairs in the clan (incremental).
    mapping(uint256 round => mapping(Clan clan => uint256 sum))
        public pairwiseDistanceSum;
    /// @dev Mean pairwise Hamming distance; 0 when clan has 0–1 fighters.
    mapping(uint256 round => mapping(Clan clan => uint256 avg))
        public avgEditDistance;
    mapping(uint256 round => uint256[] tokenIds) private _redTokenIds;
    mapping(uint256 round => uint256[] tokenIds) private _blueTokenIds;
    /// @dev Clan a token was evicted from this round; cannot rejoin that clan until next round.
    mapping(uint256 round => mapping(uint256 tokenId => Clan clan))
        public evictedFromClan;
    /// @dev Unix timestamp when each round's join window opened.
    mapping(uint256 round => uint256 startTime) public roundStartTime;
    /// @dev NormiesCanvas storage for customized (XOR-composited) pixel data.
    INormiesCanvasStorage public transformStorageContract;

    event JoinedClan(
        uint256 indexed round,
        uint256 indexed tokenId,
        Clan indexed clan,
        address enlistedBy,
        bool fromBurnPool,
        uint256 feePaid,
        uint256 clanAvgEditDistance
    );
    event EvictedFromClan(
        uint256 indexed round,
        uint256 indexed tokenId,
        Clan indexed clan,
        address evictedBy,
        address compensationRecipient,
        uint256 potShare,
        uint256 compensationPaid,
        uint256 clanAvgEditDistance
    );
    event RoundResolved(
        uint256 indexed round,
        Clan indexed winner,
        uint256 potPaid,
        uint256 winnerCount,
        uint256 redAvgEditDistance,
        uint256 blueAvgEditDistance
    );
    event WinnerPaid(
        uint256 indexed round,
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 amount
    );
    event RoundStarted(uint256 indexed round, uint256 startTime, uint256 joinDeadline);
    event JoinFeeUpdated(uint256 joinFee);
    event NormiesContractUpdated(address normies);
    event NormiesStorageUpdated(address normiesStorage);
    event TransformStorageUpdated(address transformStorage);
    event Withdrawn(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        uint256 joinFee_,
        address normies_,
        address normiesStorage_,
        address owner_
    ) external initializer {
        __Ownable_init(owner_);

        require(normies_ != address(0), "normies=0");
        require(normiesStorage_ != address(0), "storage=0");
        require(owner_ != address(0), "owner=0");

        joinFee = joinFee_;
        normies = IERC721(normies_);
        normiesStorage = INormiesStorage(normiesStorage_);
        round = 1;

        _startRound(round);
    }

    /// @notice Join deadline for a round (exclusive end of enlistment window).
    function roundJoinDeadline(uint256 round_) public view returns (uint256) {
        return roundStartTime[round_] + ROUND_JOIN_DURATION;
    }

    /// @notice Composited 200-byte bitmap (original XOR canvas layer when customized).
    function getTokenImage(uint256 tokenId) external view returns (bytes memory) {
        return _getTokenImage(tokenId);
    }

    /// @notice Enlist a Normie. Fetches pixels from NormiesStorage and updates clan cohesion stats.
    function joinClan(
        uint256 tokenId,
        Clan clan,
        bool fromBurnPool
    ) external payable {
        require(!roundResults[round].resolved, "round resolved");
        require(block.timestamp < roundJoinDeadline(round), "join closed");
        require(clan == Clan.Red || clan == Clan.Blue, "invalid clan");
        require(msg.value == joinFee, "wrong join fee");
        require(tokenId <= MAX_TOKEN_ID, "invalid tokenId");
        require(fighters[round][tokenId].clan == Clan.None, "already enlisted");
        require(
            evictedFromClan[round][tokenId] != clan,
            "evicted from clan"
        );
        require(normiesStorage.isTokenDataSet(tokenId), "pixels not set");

        uint256[] storage clanTokenIds = clan == Clan.Red
            ? _redTokenIds[round]
            : _blueTokenIds[round];
        require(
            clanTokenIds.length < MAX_CLAN_MEMBERS,
            "clan full"
        );

        if (fromBurnPool) {
            try normies.ownerOf(tokenId) returns (address owner) {
                require(owner == address(0), "not in burn pool");
            } catch {
                // Burned on Normies ERC721: ownerOf reverts instead of returning address(0).
            }
        } else {
            try normies.ownerOf(tokenId) returns (address owner) {
                require(owner != address(0), "in burn pool");
                require(
                    owner == msg.sender ||
                        _isApproved(msg.sender, tokenId, owner),
                    "not owner or approved"
                );
            } catch {
                revert("in burn pool");
            }
        }

        bytes memory newImage = _getTokenImage(tokenId);

        uint256 existingCount = clanTokenIds.length;

        uint256 addedDistance = 0;
        for (uint256 i = 0; i < existingCount; i++) {
            bytes memory existingImage = _getTokenImage(clanTokenIds[i]);
            addedDistance += _hammingDistance(newImage, existingImage);
        }

        pairwiseDistanceSum[round][clan] += addedDistance;
        clanTokenIds.push(tokenId);

        uint256 newCount = existingCount + 1;
        if (clan == Clan.Red) {
            redCount[round] = newCount;
        } else {
            blueCount[round] = newCount;
        }

        uint256 newAvg = _meanPairwiseDistance(
            pairwiseDistanceSum[round][clan],
            newCount
        );
        avgEditDistance[round][clan] = newAvg;

        fighters[round][tokenId] = Fighter({
            clan: clan,
            enlistedBy: msg.sender,
            fromBurnPool: fromBurnPool
        });

        pot += msg.value;

        emit JoinedClan(
            round,
            tokenId,
            clan,
            msg.sender,
            fromBurnPool,
            msg.value,
            newAvg
        );
    }

    /// @notice Remove an enlisted Normie from its clan (O(n)). Costs 2× join fee:
    ///         half to pot, half to the evicted enlistee. Token cannot rejoin that clan this round.
    function evictFromClan(uint256 tokenId) external payable {
        require(!roundResults[round].resolved, "round resolved");
        require(block.timestamp < roundJoinDeadline(round), "join closed");
        require(tokenId <= MAX_TOKEN_ID, "invalid tokenId");
        require(msg.value == joinFee * 2, "wrong evict fee");

        Fighter memory fighter = fighters[round][tokenId];
        Clan clan = fighter.clan;
        require(clan == Clan.Red || clan == Clan.Blue, "not enlisted");

        address compensationRecipient = fighter.enlistedBy;

        uint256[] storage clanTokenIds = clan == Clan.Red
            ? _redTokenIds[round]
            : _blueTokenIds[round];

        uint256 len = clanTokenIds.length;
        require(len > 3, "clan too small");

        uint256 evictIndex = len;
        for (uint256 i = 0; i < len; i++) {
            if (clanTokenIds[i] == tokenId) {
                evictIndex = i;
                break;
            }
        }
        require(evictIndex < len, "not in clan");

        bytes memory evictedImage = _getTokenImage(tokenId);

        uint256 removedDistance = 0;
        for (uint256 i = 0; i < len; i++) {
            if (i == evictIndex) {
                continue;
            }
            bytes memory otherImage = _getTokenImage(clanTokenIds[i]);
            removedDistance += _hammingDistance(evictedImage, otherImage);
        }

        if (evictIndex != len - 1) {
            clanTokenIds[evictIndex] = clanTokenIds[len - 1];
        }
        clanTokenIds.pop();

        pairwiseDistanceSum[round][clan] -= removedDistance;

        uint256 newCount = len - 1;
        if (clan == Clan.Red) {
            redCount[round] = newCount;
        } else {
            blueCount[round] = newCount;
        }

        uint256 newAvg = _meanPairwiseDistance(
            pairwiseDistanceSum[round][clan],
            newCount
        );
        avgEditDistance[round][clan] = newAvg;

        delete fighters[round][tokenId];
        evictedFromClan[round][tokenId] = clan;

        uint256 potShare = joinFee;
        uint256 compensation = joinFee;
        pot += potShare;

        (bool ok, ) = compensationRecipient.call{value: compensation}("");
        require(ok, "compensation failed");

        emit EvictedFromClan(
            round,
            tokenId,
            clan,
            msg.sender,
            compensationRecipient,
            potShare,
            compensation,
            newAvg
        );
    }

    /// @notice Resolve round after the 15-day join window. Lower avgEditDistance wins.
    /// @param emergencyEnd Owner may force-resolve before the join deadline.
    function resolveWar(bool emergencyEnd) external {
        require(!roundResults[round].resolved, "round resolved");
        if (emergencyEnd) {
            require(msg.sender == owner(), "not owner");
        } else {
            require(
                block.timestamp >= roundJoinDeadline(round),
                "join open"
            );
        }

        uint256 currentRound = round;
        uint256 redN = redCount[currentRound];
        uint256 blueN = blueCount[currentRound];

        if (redN + blueN == 0) {
            roundResults[currentRound] = RoundResult({
                winningClan: Clan.None,
                potPaid: 0,
                winnerCount: 0,
                resolved: true
            });

            emit RoundResolved(
                currentRound,
                Clan.None,
                0,
                0,
                0,
                0
            );

            round = currentRound + 1;
            _startRound(round);
            return;
        }

        Clan winner = _pickWinner(currentRound, redN, blueN);

        uint256 amount = pot;
        pot = 0;

        uint256[] storage winnerTokenIds = winner == Clan.Red
            ? _redTokenIds[currentRound]
            : _blueTokenIds[currentRound];
        uint256 winnerCount = winnerTokenIds.length;

        roundResults[currentRound] = RoundResult({
            winningClan: winner,
            potPaid: amount,
            winnerCount: winnerCount,
            resolved: true
        });

        if (amount > 0) {
            _payoutWinners(currentRound, winnerTokenIds, amount);
        }

        emit RoundResolved(
            currentRound,
            winner,
            amount,
            winnerCount,
            avgEditDistance[currentRound][Clan.Red],
            avgEditDistance[currentRound][Clan.Blue]
        );

        round = currentRound + 1;
        _startRound(round);
    }

    function getClanTokenIds(
        uint256 round_,
        Clan clan
    ) external view returns (uint256[] memory) {
        return _clanTokenIds(round_, clan);
    }

    /// @notice All enlisted members of a clan for a round (token id + enlistment metadata).
    function getClanMembers(
        uint256 round_,
        Clan clan
    ) external view returns (ClanMember[] memory members) {
        return _clanMembers(round_, clan);
    }

    /// @notice Members of a clan in the active (unresolved) round.
    function getCurrentClanMembers(
        Clan clan
    ) external view returns (ClanMember[] memory) {
        require(!roundResults[round].resolved, "round resolved");
        return _clanMembers(round, clan);
    }

    function _clanTokenIds(
        uint256 round_,
        Clan clan
    ) internal view returns (uint256[] memory) {
        if (clan == Clan.Red) {
            return _redTokenIds[round_];
        }
        if (clan == Clan.Blue) {
            return _blueTokenIds[round_];
        }
        revert("invalid clan");
    }

    function _clanMembers(
        uint256 round_,
        Clan clan
    ) internal view returns (ClanMember[] memory members) {
        uint256[] memory tokenIds = _clanTokenIds(round_, clan);
        uint256 n = tokenIds.length;
        members = new ClanMember[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 tokenId = tokenIds[i];
            Fighter memory fighter = fighters[round_][tokenId];
            members[i] = ClanMember({
                tokenId: tokenId,
                enlistedBy: fighter.enlistedBy,
                fromBurnPool: fighter.fromBurnPool
            });
        }
    }

    function setJoinFee(uint256 joinFee_) external onlyOwner {
        require(!roundResults[round].resolved, "round resolved");
        joinFee = joinFee_;
        emit JoinFeeUpdated(joinFee_);
    }

    function setNormiesContract(address normies_) external onlyOwner {
        require(normies_ != address(0), "normies=0");
        normies = IERC721(normies_);
        emit NormiesContractUpdated(normies_);
    }

    function setNormiesStorage(address normiesStorage_) external onlyOwner {
        require(normiesStorage_ != address(0), "storage=0");
        normiesStorage = INormiesStorage(normiesStorage_);
        emit NormiesStorageUpdated(normiesStorage_);
    }

    function setTransformStorageContract(
        address transformStorage_
    ) external onlyOwner {
        transformStorageContract = INormiesCanvasStorage(transformStorage_);
        emit TransformStorageUpdated(transformStorage_);
    }

    /// @notice Withdraw ETH that was sent outside join/evict (does not touch the tracked pot).
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to=0");
        uint256 excess = address(this).balance - pot;
        require(amount > 0 && amount <= excess, "exceeds excess");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(to, amount);
    }

    /// @notice Owner emergency exit: withdraw entire contract balance.
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "to=0");
        uint256 amount = address(this).balance;
        require(amount > 0, "nothing to withdraw");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function version() external pure returns (string memory) {
        return "1.8.2";
    }

    function _getTokenImage(
        uint256 tokenId
    ) internal view returns (bytes memory imageData) {
        require(normiesStorage.isTokenDataSet(tokenId), "pixels not set");

        bytes memory originalData = normiesStorage.getTokenRawImageData(tokenId);
        require(originalData.length == IMAGE_BYTES, "bad image length");

        if (address(transformStorageContract) == address(0)) {
            return originalData;
        }

        if (transformStorageContract.isTransformed(tokenId)) {
            bytes memory customLayer = transformStorageContract
                .getTransformedImageData(tokenId);
            return _composite(originalData, customLayer);
        }

        return originalData;
    }

    function _composite(
        bytes memory base,
        bytes memory overlay
    ) internal pure returns (bytes memory result) {
        result = new bytes(IMAGE_BYTES);
        for (uint256 i = 0; i < IMAGE_BYTES; i++) {
            result[i] = base[i] ^ overlay[i];
        }
    }

    function _pickWinner(
        uint256 currentRound,
        uint256 redN,
        uint256 blueN
    ) internal view returns (Clan) {
        if (redN == 0) return Clan.Blue;
        if (blueN == 0) return Clan.Red;

        uint256 redAvg = avgEditDistance[currentRound][Clan.Red];
        uint256 blueAvg = avgEditDistance[currentRound][Clan.Blue];

        if (redAvg < blueAvg) return Clan.Red;
        if (blueAvg < redAvg) return Clan.Blue;

        if (redN > blueN) return Clan.Red;
        if (blueN > redN) return Clan.Blue;

        return _randomClan(currentRound);
    }

    function _randomClan(uint256 currentRound) internal view returns (Clan) {
        uint256 r = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    currentRound,
                    address(this)
                )
            )
        );
        return (r & 1 == 0) ? Clan.Red : Clan.Blue;
    }

    /// @dev Mean pairwise Hamming over n fighters; 0 when n <= 1.
    function _meanPairwiseDistance(
        uint256 distanceSum,
        uint256 count
    ) internal pure returns (uint256) {
        if (count <= 1) {
            return 0;
        }
        return (distanceSum * 2) / (count * (count - 1));
    }

    /// @dev Popcount XOR over 200 bytes (1600 bits, MSB-first per Normies spec).
    function _hammingDistance(
        bytes memory a,
        bytes memory b
    ) internal pure returns (uint256) {
        require(a.length == IMAGE_BYTES && b.length == IMAGE_BYTES, "bad len");
        uint256 dist = 0;
        for (uint256 i = 0; i < IMAGE_BYTES; i++) {
            dist += _popcount8(uint8(a[i]) ^ uint8(b[i]));
        }
        return dist;
    }

    function _popcount8(uint8 x) internal pure returns (uint256) {
        uint256 count = 0;
        while (x != 0) {
            x &= uint8(x - 1);
            count++;
        }
        return count;
    }

    function _payoutWinners(
        uint256 currentRound,
        uint256[] storage winnerTokenIds,
        uint256 amount
    ) internal {
        uint256 winnerCount = winnerTokenIds.length;
        uint256 share = amount / winnerCount;
        uint256 remainder = amount - share * winnerCount;

        for (uint256 i = 0; i < winnerCount; i++) {
            uint256 tokenId = winnerTokenIds[i];
            address recipient = fighters[currentRound][tokenId].enlistedBy;
            uint256 payout = share;
            if (i == winnerCount - 1) {
                payout += remainder;
            }

            (bool ok, ) = recipient.call{value: payout}("");
            require(ok, "payout failed");

            emit WinnerPaid(currentRound, tokenId, recipient, payout);
        }
    }

    function _isApproved(
        address spender,
        uint256 tokenId,
        address owner
    ) internal view returns (bool) {
        return
            normies.getApproved(tokenId) == spender ||
            normies.isApprovedForAll(owner, spender);
    }

    function _startRound(uint256 round_) internal {
        uint256 startTime = block.timestamp;
        roundStartTime[round_] = startTime;
        emit RoundStarted(round_, startTime, startTime + ROUND_JOIN_DURATION);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
