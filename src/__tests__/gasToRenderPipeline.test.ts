import { describe, it, expect } from "vitest";
import { parseGasResponse } from "../utils/masterSheetLoader";
import { buildScheduleRenderInput } from "../utils/scheduleAdapter";
import type { TimeSlot } from "../types/schedule";

// ── GAS レスポンスのモック ──

const GAS_RESPONSE = {
  casts: [
    { name: "鹿鳴りあ", rank: "gold", type: "専属", imageFileId: "abc123" },
    { name: "天使ちよむ", rank: "silver", type: "専属", imageFileId: "def456" },
    { name: "琴葉", rank: "bronze", type: "専属", imageFileId: "ghi789" },
    { name: "蒼井 せと", rank: "", type: "専属" },
    { name: "白玉おもち", rank: "", type: "専属", imageFileId: "jkl012" },
  ],
  rankLists: {
    gold: ["鹿鳴りあ"],
    silver: ["天使ちよむ"],
    bronze: ["琴葉"],
  },
};

// ── parseGasResponse テスト ──

describe("parseGasResponse", () => {
  it("GASレスポンスからCastMaster[]を正しく生成する", () => {
    const { masters } = parseGasResponse(GAS_RESPONSE);
    expect(masters).toHaveLength(5);
    expect(masters[0].name).toBe("鹿鳴りあ");
    expect(masters[3].name).toBe("蒼井 せと");
  });

  it("imageFileIdがある場合はthumbnail URLに変換される", () => {
    const { masters } = parseGasResponse(GAS_RESPONSE);
    expect(masters[0].imageUrl).toBe(
      "https://drive.google.com/thumbnail?id=abc123&sz=w1000"
    );
  });

  it("imageFileIdがない場合はプレースホルダー画像になる", () => {
    const { masters } = parseGasResponse(GAS_RESPONSE);
    const seto = masters.find((m) => m.name === "蒼井 せと");
    expect(seto?.imageUrl).toContain("placeholder");
  });

  it("rankListsが正しくパースされる", () => {
    const { rankLists } = parseGasResponse(GAS_RESPONSE);
    expect(rankLists.gold).toEqual(["鹿鳴りあ"]);
    expect(rankLists.silver).toEqual(["天使ちよむ"]);
    expect(rankLists.bronze).toEqual(["琴葉"]);
  });

  it("空のGASレスポンスを処理できる", () => {
    const { masters, rankLists } = parseGasResponse({
      casts: [],
      rankLists: { gold: [], silver: [], bronze: [] },
    });
    expect(masters).toHaveLength(0);
    expect(rankLists.gold).toHaveLength(0);
  });

  it("errorフィールドがある場合は例外を投げる", () => {
    expect(() =>
      parseGasResponse({
        casts: [],
        rankLists: { gold: [], silver: [], bronze: [] },
        error: "シートが見つかりません",
      })
    ).toThrow("GAS API エラー");
  });
});

// ── GAS → adapter E2E データフローテスト ──

describe("GAS → scheduleAdapter E2E", () => {
  const { masters, rankLists } = parseGasResponse(GAS_RESPONSE);

  const makeCast = (name: string) => ({
    id: name,
    name,
    imageUrl: "",
  });

  it("goldキャストがランク付きでレンダーデータに反映される", () => {
    const slots: TimeSlot[] = [
      { time: "11", casts: [makeCast("鹿鳴りあ")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    const cast = result.timeSlots[0].casts[0];

    expect(cast.name).toBe("鹿鳴りあ");
    expect(cast.rank).toBe("gold");
    expect(cast.imageUrl).toBe(
      "https://drive.google.com/thumbnail?id=abc123&sz=w1000"
    );
  });

  it("silverキャストが正しく解決される", () => {
    const slots: TimeSlot[] = [
      { time: "12", casts: [makeCast("天使ちよむ")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    expect(result.timeSlots[0].casts[0].rank).toBe("silver");
  });

  it("bronzeキャストが正しく解決される", () => {
    const slots: TimeSlot[] = [
      { time: "13", casts: [makeCast("琴葉")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    expect(result.timeSlots[0].casts[0].rank).toBe("bronze");
  });

  it("ランクなしキャストはnormalになる", () => {
    const slots: TimeSlot[] = [
      { time: "14", casts: [makeCast("蒼井 せと")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    expect(result.timeSlots[0].casts[0].rank).toBe("normal");
  });

  it("画像なしキャストはマスターのプレースホルダーが使われる", () => {
    const slots: TimeSlot[] = [
      { time: "15", casts: [makeCast("蒼井 せと")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    expect(result.timeSlots[0].casts[0].imageUrl).toContain("placeholder");
  });

  it("複数時間帯に同じキャストが正しく表示される", () => {
    const slots: TimeSlot[] = [
      { time: "11", casts: [makeCast("鹿鳴りあ")] },
      { time: "12", casts: [makeCast("鹿鳴りあ")] },
      { time: "13", casts: [makeCast("鹿鳴りあ")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);

    result.timeSlots.forEach((slot) => {
      expect(slot.casts[0].rank).toBe("gold");
      expect(slot.casts[0].imageUrl).toContain("abc123");
    });
  });

  it("1つの時間帯に複数キャストが混在する場合、各キャストのランクが正しい", () => {
    const slots: TimeSlot[] = [
      {
        time: "11",
        casts: [
          makeCast("鹿鳴りあ"),
          makeCast("天使ちよむ"),
          makeCast("琴葉"),
          makeCast("蒼井 せと"),
        ],
      },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    const casts = result.timeSlots[0].casts;

    expect(casts[0].rank).toBe("gold");
    expect(casts[1].rank).toBe("silver");
    expect(casts[2].rank).toBe("bronze");
    expect(casts[3].rank).toBe("normal");
  });

  it("マスター未登録のキャストもnormalとして表示される", () => {
    const slots: TimeSlot[] = [
      { time: "11", casts: [makeCast("新人キャスト")] },
    ];
    const result = buildScheduleRenderInput("", slots, rankLists, masters);
    const cast = result.timeSlots[0].casts[0];

    expect(cast.name).toBe("新人キャスト");
    expect(cast.rank).toBe("normal");
    expect(cast.imageUrl).toBe("");
  });
});
