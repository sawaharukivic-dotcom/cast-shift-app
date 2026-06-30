import { describe, it, expect } from "vitest";
import { parseShiftManagerJson } from "./shiftManagerImport";
import type { CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";

const EMPTY_RANKS: RankLists = { gold: [], silver: [], bronze: [] };

function sampleJson(): string {
  return JSON.stringify({
    version: 1,
    weekStart: "2026-07-06",
    days: [
      {
        date: "2026-07-06",
        slots: [
          { time: "11:00", names: ["キャストA", "白由黄 フィア"] },
          { time: "12:00", names: [] },
          { time: "23:00", names: ["キャストC"] },
          { time: "0:00", names: ["キャストD"] },
          { time: "3:00", names: ["キャストE"] },
        ],
      },
    ],
  });
}

describe("parseShiftManagerJson", () => {
  it("スロットの並び順（夜順）をそのまま保持する", () => {
    const { days } = parseShiftManagerJson(sampleJson(), [], EMPTY_RANKS);
    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe("2026-07-06");
    expect(days[0].slots.map((s) => s.time)).toEqual([
      "11:00",
      "12:00",
      "23:00",
      "0:00",
      "3:00",
    ]);
  });

  it("内部に空白を含む氏名を分割しない", () => {
    const { days } = parseShiftManagerJson(sampleJson(), [], EMPTY_RANKS);
    const slot11 = days[0].slots.find((s) => s.time === "11:00")!;
    expect(slot11.casts.map((c) => c.name)).toEqual(["キャストA", "白由黄 フィア"]);
  });

  it("空の names はキャスト0人のスロットになる", () => {
    const { days } = parseShiftManagerJson(sampleJson(), [], EMPTY_RANKS);
    const slot12 = days[0].slots.find((s) => s.time === "12:00")!;
    expect(slot12.casts).toEqual([]);
  });

  it("深夜帯（0:00, 3:00）の time をそのまま使う（落とさない）", () => {
    const { days } = parseShiftManagerJson(sampleJson(), [], EMPTY_RANKS);
    expect(days[0].slots.find((s) => s.time === "0:00")!.casts[0].name).toBe("キャストD");
    expect(days[0].slots.find((s) => s.time === "3:00")!.casts[0].name).toBe("キャストE");
  });

  it("マスター未登録の名前は unknownNames に入りプレースホルダー画像になる", () => {
    const { days, unknownNames } = parseShiftManagerJson(sampleJson(), [], EMPTY_RANKS);
    expect(unknownNames.has("キャストA")).toBe(true);
    const slot11 = days[0].slots.find((s) => s.time === "11:00")!;
    expect(slot11.casts[0].imageUrl).toBe(PLACEHOLDER_IMAGE);
  });

  it("マスター登録済みの名前は master の画像を使い unknownNames に入らない", () => {
    const masters: CastMaster[] = [
      { name: "キャストA", imageUrl: "https://example.com/a.png", color: "#fff" },
    ];
    const { days, unknownNames } = parseShiftManagerJson(sampleJson(), masters, EMPTY_RANKS);
    const slot11 = days[0].slots.find((s) => s.time === "11:00")!;
    const a = slot11.casts.find((c) => c.name === "キャストA")!;
    expect(a.imageUrl).toBe("https://example.com/a.png");
    expect(unknownNames.has("キャストA")).toBe(false);
  });

  it("不正なJSONは例外を投げる", () => {
    expect(() => parseShiftManagerJson("{ not json", [], EMPTY_RANKS)).toThrow();
  });

  it("days プロパティが無いオブジェクトは例外を投げる", () => {
    expect(() => parseShiftManagerJson(JSON.stringify({ version: 1 }), [], EMPTY_RANKS)).toThrow();
  });
});
