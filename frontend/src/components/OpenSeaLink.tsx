import { OPENSEA_NORMIE_URL } from "@/lib/clan-config";

const OPENSEA_LOGO =
  "https://static.seadn.io/logos/Logomark-Blue.svg";

type OpenSeaLinkProps = {
  tokenId: number;
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function OpenSeaLink({
  tokenId,
  className = "inline-flex items-center justify-center opacity-80 transition-opacity hover:opacity-100",
  iconClassName = "h-4 w-4",
  onClick,
}: OpenSeaLinkProps) {
  return (
    <a
      href={OPENSEA_NORMIE_URL(tokenId)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
      aria-label={`View Normie #${tokenId} on OpenSea`}
      title="OpenSea"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={OPENSEA_LOGO}
        alt=""
        className={iconClassName}
      />
    </a>
  );
}
