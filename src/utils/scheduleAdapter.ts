/**
 * アプリ内部状態 → ScheduleRenderInput 変換アダプター
 *
 * 入力側（TimeSlot[], RankLists, CastMaster[]）と
 * 出力側（ScheduleRenderInput）を分離するための変換層。
 * 入力の設計を変えるときはここだけ修正すれば良い。
 */

import type { TimeSlot, CastMaster, RankLists } from "../types/schedule";
import { getCastRank } from "./castRank";
import { normalizeCastName } from "./castNameNormalizer";
import type {
  ScheduleRenderInput,
  RenderCast,
  CastRank,
} from "../types/renderTypes";

import { DEFAULT_COLOR } from "../constants";

/**
 * アプリの内部状態をレンダラー入力型に変換する。
 *
 * @param date       表示用日付文字列（"M/D（曜日）"）
 * @param timeSlots  アプリの TimeSlot[] 状態
 * @param rankLists  ランクリスト（gold/silver/bronze）
 * @param castMasters キャストマスター（画像URL・色の参照元）
 * @param logoImage  ロゴ画像（任意）
 */
export function buildScheduleRenderInput(
  date: string,
  timeSlots: TimeSlot[],
  rankLists: RankLists,
  castMasters: CastMaster[],
  logoImage?: HTMLImageElement | null
): ScheduleRenderInput {
  // 正規化名 → CastMaster のマップを構築
  const masterMap = new Map<string, CastMaster>();
  castMasters.forEach((m) => {
    const normalized = normalizeCastName(m.name);
    if (normalized) masterMap.set(normalized, m);
  });

  return {
    date,
    logoImage,
    timeSlots: timeSlots.map((slot) => ({
      time: slot.time,
      casts: slot.casts.map((cast): RenderCast => {
        const normalized = normalizeCastName(cast.name);
        const master = normalized ? masterMap.get(normalized) : undefined;
        // ランクはキャストにすでに持っている場合はそれを使い、なければ rankLists から解決
        const rank: CastRank =
          (cast.rank as CastRank) ??
          (getCastRank(cast.name, rankLists) as CastRank);
        return {
          id: cast.id,
          name: cast.name,
          imageUrl: master?.imageUrl || cast.imageUrl,
          rank,
          color: master?.color || DEFAULT_COLOR,
        };
      }),
    })),
  };
}
