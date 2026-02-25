import { describe, it, expect } from "vitest";
import { createDefaultSlots } from "../utils/scheduleDefaults";

describe("createDefaultSlots", () => {
  it("14個のタイムスロットを生成する（11:00〜24:00）", () => {
    const slots = createDefaultSlots();
    expect(slots).toHaveLength(14);
  });

  it("最初のスロットは11:00", () => {
    const slots = createDefaultSlots();
    expect(slots[0].time).toBe("11:00");
  });

  it("最後のスロットは24:00", () => {
    const slots = createDefaultSlots();
    expect(slots[13].time).toBe("24:00");
  });

  it("各スロットのcastsは空配列", () => {
    const slots = createDefaultSlots();
    slots.forEach((slot) => {
      expect(slot.casts).toEqual([]);
    });
  });

  it("連続した時刻が1時間刻みで生成される", () => {
    const slots = createDefaultSlots();
    const times = slots.map((s) => s.time);
    expect(times).toEqual([
      "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
      "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00",
    ]);
  });

  it("毎回新しいインスタンスを返す", () => {
    const slots1 = createDefaultSlots();
    const slots2 = createDefaultSlots();
    expect(slots1).not.toBe(slots2);
    expect(slots1[0]).not.toBe(slots2[0]);
  });
});
