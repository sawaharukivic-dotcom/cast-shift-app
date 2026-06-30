/**
 * shift-manager が書き出した構造化 JSON を取り込むパーサー。
 *
 * 旧お助けマンの Xlsx 取込（xlsxParser / buildSlotsFromHourNames）とは別パスとして用意し、
 * レガシーの挙動（11:00〜翌1:00 のスロット）には一切影響を与えない。
 *
 * このパスの特徴:
 * - 各日の slots は「配列順 = 描画順（夜順）」をそのまま維持する。
 * - 時刻は JSON が渡す time 文字列をそのまま slot.time にする（申請ウィンドウに追従。0:00 等も可）。
 * - 氏名は文字列のまま Cast に変換する（内部に空白を含む名前を分割しない）。
 */

import type { Cast, TimeSlot, CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";
import {
  normalizeCastName,
  findCastMasterByNormalizedName,
} from "./castNameNormalizer";
import { getCastRank } from "./castRank";

/** shift-manager 側の出力フォーマット（cast-shift-export.ts と対応） */
interface ImportedSlot {
  time: string;
  names: string[];
}
interface ImportedDay {
  date: string; // YYYY-MM-DD
  slots: ImportedSlot[];
}
interface ShiftManagerExport {
  version?: number;
  weekStart?: string;
  days: ImportedDay[];
}

export interface ParseShiftManagerResult {
  /** 日付キー（YYYY-MM-DD）と、そのままの並び順（夜順）のスロット配列 */
  days: { dateKey: string; slots: TimeSlot[] }[];
  /** キャストマスターに未登録だった名前 */
  unknownNames: Set<string>;
}

/** 氏名1件を Cast に解決する（buildSlotsFromHourNames と同じ手順・氏名の空白は保持） */
function resolveCast(
  name: string,
  castMasters: CastMaster[],
  rankLists: RankLists,
  unknownNames: Set<string>,
): Cast {
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
}

/**
 * shift-manager の JSON 文字列を解析し、日付ごとの TimeSlot[] を返す。
 * 形式不正のときは Error を投げる。
 */
export function parseShiftManagerJson(
  text: string,
  castMasters: CastMaster[],
  rankLists: RankLists,
): ParseShiftManagerResult {
  let data: ShiftManagerExport;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSONの解析に失敗しました");
  }
  if (!data || !Array.isArray(data.days)) {
    throw new Error("shift-manager のデータ形式ではありません（days がありません）");
  }

  const unknownNames = new Set<string>();

  const days = data.days
    .filter((day) => day && typeof day.date === "string")
    .map((day) => {
      const dateKey = day.date; // shift-manager は YYYY-MM-DD（scheduleByDate のキー形式と一致）
      const rawSlots = Array.isArray(day.slots) ? day.slots : [];
      const slots: TimeSlot[] = rawSlots.map((slot) => {
        const names = Array.isArray(slot.names) ? slot.names : [];
        const casts: Cast[] = names
          .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
          .map((n) => resolveCast(n, castMasters, rankLists, unknownNames));
        return { time: String(slot.time), casts };
      });
      return { dateKey, slots };
    });

  return { days, unknownNames };
}
