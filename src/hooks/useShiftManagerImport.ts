/**
 * shift-manager データ（構造化 JSON）の取り込みフック。
 *
 * useXlsxImport と同じ流儀で実装する（未登録キャストのマスター自動追加・選択日更新など）。
 * 旧お助けマンの Xlsx 取込（useXlsxImport）はそのまま残し、本フックは別パスとして併存する。
 */

import { toast } from "sonner@2.0.3";
import type { DayKey, CastMaster, RankLists, TimeSlot } from "../types/schedule";
import { logger } from "../utils/logger";
import { PLACEHOLDER_IMAGE, DEFAULT_COLOR } from "../constants";
import { normalizeCastName } from "../utils/castNameNormalizer";
import { parseShiftManagerJson } from "../utils/shiftManagerImport";

interface UseShiftManagerImportDeps {
  setSelectedDateKey: React.Dispatch<React.SetStateAction<DayKey | null>>;
  setWeekDateKeys: React.Dispatch<React.SetStateAction<string[]>>;
  castMasters: CastMaster[];
  setCastMasters: React.Dispatch<React.SetStateAction<CastMaster[]>>;
  rankLists: RankLists;
  updateSchedule: (
    updater: (prev: Record<DayKey, TimeSlot[]>) => Record<DayKey, TimeSlot[]>,
  ) => void;
}

export function useShiftManagerImport(deps: UseShiftManagerImportDeps) {
  const {
    setSelectedDateKey,
    setWeekDateKeys,
    castMasters,
    setCastMasters,
    rankLists,
    updateSchedule,
  } = deps;

  const handleShiftManagerImport = async (
    files: FileList | null,
    fileInputRef?: React.RefObject<HTMLInputElement>,
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      const { days, unknownNames } = parseShiftManagerJson(text, castMasters, rankLists);

      if (days.length === 0) {
        toast.error("日付データが見つかりませんでした");
        return;
      }

      // 各日のスケジュールを反映（夜順のスロットをそのまま格納）
      updateSchedule((prev) => {
        const next = { ...prev };
        for (const d of days) next[d.dateKey] = d.slots;
        return next;
      });

      // 週日付キー（昇順）と先頭日を選択
      const dateKeys = days.map((d) => d.dateKey).sort();
      setWeekDateKeys(dateKeys);
      if (dateKeys.length > 0) setSelectedDateKey(dateKeys[0]);

      // マスター未登録のキャストを自動追加（XLSX 取込と同じ挙動）
      if (unknownNames.size > 0) {
        const existingNormalized = new Set(
          castMasters.map((m) => normalizeCastName(m.name)).filter(Boolean),
        );
        const newMasters: CastMaster[] = [];
        unknownNames.forEach((name) => {
          const normalized = normalizeCastName(name) || name;
          if (!existingNormalized.has(normalized)) {
            newMasters.push({
              name: normalized,
              imageUrl: PLACEHOLDER_IMAGE,
              color: DEFAULT_COLOR,
            });
            existingNormalized.add(normalized);
          }
        });
        if (newMasters.length > 0) {
          setCastMasters((prev) => [...prev, ...newMasters]);
          toast.info(`未登録キャスト ${newMasters.length}人をマスターに追加しました`);
        }
      }

      toast.success(`shift-manager のデータから ${days.length}日分を読み込みました`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "読み込みエラー";
      logger.error("[shift-manager Import] エラー:", msg);
      toast.error(`shift-manager データ読込: ${msg}`);
    } finally {
      if (fileInputRef?.current) fileInputRef.current.value = "";
    }
  };

  return { handleShiftManagerImport };
}
