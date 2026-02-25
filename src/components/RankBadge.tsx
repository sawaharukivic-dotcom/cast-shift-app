/**
 * ランクバッジコンポーネント
 */

import type { CastRank } from "../types/schedule";

const RANK_STYLES: Record<Exclude<CastRank, "normal">, { bg: string; label: string }> = {
  gold: { bg: "bg-yellow-100 text-yellow-800", label: "Gold" },
  silver: { bg: "bg-gray-200 text-gray-700", label: "Silver" },
  bronze: { bg: "bg-orange-100 text-orange-700", label: "Bronze" },
};

interface RankBadgeProps {
  rank: CastRank;
}

export function RankBadge({ rank }: RankBadgeProps) {
  if (rank === "normal") return null;
  const style = RANK_STYLES[rank];
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${style.bg}`}>
      {style.label}
    </span>
  );
}
