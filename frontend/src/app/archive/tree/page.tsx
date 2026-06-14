import { SimilarNormiesExplorer } from "@/components/SimilarNormiesExplorer";

export const metadata = {
  title: "Similar Normies",
  description: "Search by token ID and find the closest Normies by pixel edit distance",
};

export default function ArchiveTreePage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-100">
      <SimilarNormiesExplorer />
    </div>
  );
}
