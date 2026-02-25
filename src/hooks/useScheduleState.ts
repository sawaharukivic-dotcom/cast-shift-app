/**
 * スケジュール状態管理フック
 *
 * scheduleByDate, selectedDateKey, weekDateKeys,
 * timeSlots, displayDate を一元管理する。
 */

import { useState, useEffect } from "react";
import type { Cast, TimeSlot, DayKey, CastMaster, RankLists } from "../types/schedule";
import {
  MULTI_SCHEDULE_KEY,
  DATE_KEY,
  PLACEHOLDER_IMAGE,
} from "../constants";
import { normalizeCastName } from "../utils/castNameNormalizer";
import { formatDateForDisplay } from "../utils/dateFormatter";
import { parseWeekText } from "../utils/weekTextParser";
import { createDefaultSlots } from "../utils/scheduleDefaults";
import { parseBulkTextToSlots } from "../utils/bulkTextParser";
import { toast } from "sonner@2.0.3";
import { logger } from "../utils/logger";

// re-export for backward compatibility
export { createDefaultSlots } from "../utils/scheduleDefaults";

const normalizeCasts = (casts: Cast[] | undefined): Cast[] => {
  if (!casts || !Array.isArray(casts)) return [];
  return casts.map((cast) => ({
    id: cast.id || `${Date.now()}_${Math.random()}`,
    name: cast.name || "",
    imageUrl:
      cast.imageUrl?.trim() && cast.imageUrl.trim().length > 0
        ? cast.imageUrl.trim()
        : PLACEHOLDER_IMAGE,
  }));
};

export function useScheduleState(
  castMasters: CastMaster[],
  rankLists: RankLists,
  safeSetItem: (key: string, value: string) => boolean
) {
  // 週一括入力で反映された日付配列（昇順）
  const [weekDateKeys, setWeekDateKeys] = useState<string[]>([]);

  // 複数日のスケジュール管理（起動時は常に空 → 前回シフトを引き継がない）
  const [scheduleByDate, setScheduleByDate] = useState<{ [dateKey: string]: TimeSlot[] }>(() => {
    localStorage.removeItem(MULTI_SCHEDULE_KEY);
    localStorage.removeItem(DATE_KEY);
    return {};
  });

  // 今プレビューしている日付キー（起動時は空）
  const [selectedDateKey, setSelectedDateKey] = useState<DayKey | null>(null);

  // 表示用の日付文字列（M/D（曜日）形式）
  const displayDate = (() => {
    if (!selectedDateKey) {
      return formatDateForDisplay(new Date());
    }
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return formatDateForDisplay(new Date(year, month - 1, day));
  })();

  // 現在選択中の日付のスケジュール
  const timeSlots = selectedDateKey
    ? scheduleByDate[selectedDateKey] || createDefaultSlots()
    : createDefaultSlots();

  // castMasters変更時のスケジュール同期
  useEffect(() => {
    if (castMasters.length === 0) return;

    const normalizedNameToMaster = new Map<string, CastMaster>();
    castMasters.forEach((master) => {
      const normalized = normalizeCastName(master.name);
      if (normalized) {
        const existing = normalizedNameToMaster.get(normalized);
        if (!existing || !existing.imageUrl || existing.imageUrl === PLACEHOLDER_IMAGE) {
          normalizedNameToMaster.set(normalized, master);
        }
      }
    });

    setScheduleByDate((prev) => {
      let anyChanged = false;
      const updated: typeof prev = {};

      for (const dateKey of Object.keys(prev)) {
        const slots = prev[dateKey];
        if (!slots) { updated[dateKey] = slots; continue; }

        let slotChanged = false;
        const nextSlots = slots.map((slot) => {
          const nextCasts = slot.casts.map((cast) => {
            const normalizedCastName = normalizeCastName(cast.name);
            const master = normalizedCastName ? normalizedNameToMaster.get(normalizedCastName) : null;
            if (master) {
              const nextName = master.name;
              const nextImageUrl = master.imageUrl?.trim() || PLACEHOLDER_IMAGE;
              if (nextName !== cast.name || nextImageUrl !== cast.imageUrl) {
                slotChanged = true;
                return { ...cast, name: nextName, imageUrl: nextImageUrl };
              }
            } else {
              const nextImageUrl = cast.imageUrl || PLACEHOLDER_IMAGE;
              if (nextImageUrl !== cast.imageUrl) {
                slotChanged = true;
                return { ...cast, imageUrl: nextImageUrl };
              }
            }
            return cast;
          });
          return { ...slot, casts: nextCasts };
        });

        updated[dateKey] = slotChanged ? nextSlots : slots;
        if (slotChanged) anyChanged = true;
      }

      if (!anyChanged) return prev;
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [castMasters, safeSetItem]);

  // selectedDateKey → localStorage
  useEffect(() => {
    if (selectedDateKey) {
      safeSetItem(DATE_KEY, selectedDateKey);
    }
  }, [selectedDateKey, safeSetItem]);

  // ---- ハンドラ群 ----

  const applyBulkText = (text: string, dateKey: DayKey, options?: { overwrite?: boolean }): Set<string> => {
    const currentSlots = scheduleByDate[dateKey] || createDefaultSlots();
    const result = parseBulkTextToSlots(text, currentSlots, castMasters, rankLists, options?.overwrite);

    if (!result) {
      if (text.trim()) logger.warn("[applyBulkText] テキスト形式が不正:", text.substring(0, 100));
      return new Set();
    }

    setScheduleByDate((prev) => {
      const updated = { ...prev, [dateKey]: result.slots };
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (result.invalidTimes.size > 0) {
      logger.warn("[applyBulkText] 未対応の時間:", Array.from(result.invalidTimes));
    }
    if (result.unknownNames.size > 0) {
      logger.warn("[applyBulkText] 未登録キャスト:", Array.from(result.unknownNames));
    }

    return result.unknownNames;
  };

  const handleSetCasts = (timeIndex: number, casts: Cast[]) => {
    if (!selectedDateKey) return;
    const newSlots = timeSlots.map((slot, i) =>
      i === timeIndex ? { ...slot, casts } : slot
    );
    setScheduleByDate((prev) => {
      const updated = { ...prev, [selectedDateKey]: newSlots };
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveCast = (timeIndex: number, castId: string) => {
    if (!selectedDateKey) return;
    const newSlots = timeSlots.map((slot, i) =>
      i === timeIndex
        ? { ...slot, casts: slot.casts.filter((c) => c.id !== castId) }
        : slot
    );
    setScheduleByDate((prev) => {
      const updated = { ...prev, [selectedDateKey]: newSlots };
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllCasts = () => {
    if (!selectedDateKey) return;
    const newSlots = timeSlots.map((slot) => ({ ...slot, casts: [] }));
    setScheduleByDate((prev) => {
      const updated = { ...prev, [selectedDateKey]: newSlots };
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success("すべてのスケジュールを削除しました");
  };

  const handleDeleteDate = (dateKey: DayKey) => {
    setScheduleByDate((prev) => {
      const updated = { ...prev };
      delete updated[dateKey];
      safeSetItem(MULTI_SCHEDULE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (selectedDateKey === dateKey) {
      const remainingKeys = Object.keys(scheduleByDate).filter((k) => k !== dateKey).sort();
      setSelectedDateKey(remainingKeys.length > 0 ? remainingKeys[0] : null);
    }
    toast.success("日付を削除しました");
  };

  const handleDeleteAll = () => {
    setScheduleByDate({});
    setSelectedDateKey(null);
    localStorage.removeItem(MULTI_SCHEDULE_KEY);
    toast.success("すべてのデータを削除しました");
  };

  const handleWeekTextApply = async (weekText: string) => {
    if (!weekText.trim()) {
      toast.error("週テキストを入力してください");
      return;
    }

    const startTime = Date.now();
    toast.info("読み込み中...");

    try {
      const blocks = parseWeekText(weekText);

      if (blocks.length === 0) {
        toast.error("日付ブロックが見つかりませんでした。## YYYY/MM/DD 形式で日付を指定してください。");
        return;
      }

      blocks.forEach(({ dateKey, text }) => {
        applyBulkText(text, dateKey, { overwrite: true });
      });

      const dateKeys = blocks.map((b) => b.dateKey).sort();
      setWeekDateKeys(dateKeys);

      if (dateKeys.length > 0) {
        setSelectedDateKey(dateKeys[0]);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 200) {
        await new Promise((resolve) => setTimeout(resolve, 200 - elapsed));
      }

      toast.success(`${blocks.length}日分を反映しました`);
    } catch (error) {
      logger.error("[週一括入力] エラー:", error);
      toast.error("週テキストの解析に失敗しました");
    }
  };

  return {
    weekDateKeys,
    setWeekDateKeys,
    selectedDateKey,
    setSelectedDateKey,
    displayDate,
    scheduleByDate,
    setScheduleByDate,
    timeSlots,
    createDefaultSlots,
    applyBulkText,
    handleSetCasts,
    handleRemoveCast,
    handleClearAllCasts,
    handleDeleteDate,
    handleDeleteAll,
    handleWeekTextApply,
  };
}
