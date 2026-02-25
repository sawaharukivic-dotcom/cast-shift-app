/**
 * バルクテキスト（【HH:00】形式）をタイムスロットに変換する純粋関数
 */

import type { Cast, TimeSlot, CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";
import { normalizeCastName, findCastMasterByNormalizedName } from "./castNameNormalizer";
import { getCastRank } from "./castRank";
import { createDefaultSlots } from "./scheduleDefaults";

export interface ParseBulkTextResult {
  /** 変換後のタイムスロット配列 */
  slots: TimeSlot[];
  /** マスターに未登録のキャスト名 */
  unknownNames: Set<string>;
  /** 対応する時間帯が見つからなかった時間ラベル */
  invalidTimes: Set<string>;
  /** 更新されたスロット数 */
  updatedSlots: number;
}

/**
 * 【HH:00】形式のバルクテキストを解析し、タイムスロット配列に変換する。
 *
 * @param text       入力テキスト
 * @param baseSlots  ベースとなるタイムスロット（overwrite=true の場合は無視）
 * @param castMasters キャストマスター一覧
 * @param rankLists  ランクリスト
 * @param overwrite  true の場合、baseSlots を無視してデフォルトスロットから開始
 * @returns 解析結果（slots が null の場合はテキスト形式不正）
 */
export function parseBulkTextToSlots(
  text: string,
  baseSlots: TimeSlot[],
  castMasters: CastMaster[],
  rankLists: RankLists,
  overwrite = false
): ParseBulkTextResult | null {
  if (!text.trim()) return null;

  const timePattern = /【(\d{1,2}):00】/g;
  const matches = Array.from(text.matchAll(timePattern));

  if (matches.length === 0) return null;

  const newSlots = overwrite ? createDefaultSlots() : baseSlots.map(s => ({ ...s }));
  const timeIndexByLabel = new Map(newSlots.map((slot, index) => [slot.time, index]));
  const unknownNames = new Set<string>();
  const invalidTimes = new Set<string>();
  let updatedSlots = 0;

  matches.forEach((match, i) => {
    const hourLabel = `${parseInt(match[1], 10)}:00`;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? text.length;
    const block = text.slice(start, end).trim();
    const names = block
      .split(/[\s　]+/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const slotIndex = timeIndexByLabel.get(hourLabel);
    if (slotIndex === undefined) {
      invalidTimes.add(hourLabel);
      return;
    }

    const casts: Cast[] = names.map((name) => {
      const normalizedName = normalizeCastName(name);
      const masterIndex = normalizedName
        ? findCastMasterByNormalizedName(castMasters, normalizedName)
        : -1;
      const master = masterIndex !== -1 ? castMasters[masterIndex] : null;
      const rank = getCastRank(normalizedName || name, rankLists);
      if (!master) {
        unknownNames.add(name);
        return {
          id: `${Date.now()}_${Math.random()}`,
          name: normalizedName || name,
          imageUrl: PLACEHOLDER_IMAGE,
          rank,
        };
      }
      return {
        id: `${Date.now()}_${Math.random()}`,
        name: master.name,
        imageUrl: master.imageUrl?.trim() || PLACEHOLDER_IMAGE,
        rank,
      };
    });

    newSlots[slotIndex] = { ...newSlots[slotIndex], casts };
    updatedSlots += 1;
  });

  return { slots: newSlots, unknownNames, invalidTimes, updatedSlots };
}
