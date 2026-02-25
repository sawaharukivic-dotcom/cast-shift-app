/**
 * キャスト名からランクを判定するユーティリティ
 */

import type { CastRank, RankLists } from "../types/schedule";
import { normalizeCastName } from "./castNameNormalizer";

export function getCastRank(castName: string, rankLists: RankLists): CastRank {
  const normalizedName = normalizeCastName(castName);
  if (!normalizedName) return "normal";

  const normalizedGold = rankLists.gold.map((n) => normalizeCastName(n));
  const normalizedSilver = rankLists.silver.map((n) => normalizeCastName(n));
  const normalizedBronze = rankLists.bronze.map((n) => normalizeCastName(n));

  if (normalizedGold.includes(normalizedName)) return "gold";
  if (normalizedSilver.includes(normalizedName)) return "silver";
  if (normalizedBronze.includes(normalizedName)) return "bronze";
  return "normal";
}
