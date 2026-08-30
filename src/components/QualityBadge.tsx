import { QualityScore } from "@/lib/quality";

export default function QualityBadge({ score }: { score: QualityScore | null | undefined }) {
  if (!score) return null;
  const color =
    score.overall >= 75
      ? "bg-green-100 text-green-800"
      : score.overall >= 50
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`} title="Kalite Skoru">
      {score.overall}/100
    </span>
  );
}
