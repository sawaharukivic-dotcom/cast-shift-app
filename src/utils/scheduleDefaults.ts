/**
 * スケジュールのデフォルトタイムスロット生成
 */

import type { TimeSlot } from "../types/schedule";

/** 11:00〜24:00 の14スロットを生成 */
export const createDefaultSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let i = 11; i <= 24; i++) {
    slots.push({ time: `${i}:00`, casts: [] });
  }
  return slots;
};
