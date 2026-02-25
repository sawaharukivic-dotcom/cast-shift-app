import { describe, it, expect } from "vitest";
import { parseBulkTextToSlots } from "../utils/bulkTextParser";
import { createDefaultSlots } from "../utils/scheduleDefaults";
import type { CastMaster, RankLists } from "../types/schedule";

const emptyRanks: RankLists = { gold: [], silver: [], bronze: [] };

const makeMaster = (name: string, imageUrl = "data:image/png;base64,test"): CastMaster => ({
  name,
  imageUrl,
  color: "#e5e7eb",
});

describe("parseBulkTextToSlots", () => {
  it("空テキストの場合はnullを返す", () => {
    const result = parseBulkTextToSlots("", createDefaultSlots(), [], emptyRanks);
    expect(result).toBeNull();
  });

  it("空白のみのテキストの場合はnullを返す", () => {
    const result = parseBulkTextToSlots("   ", createDefaultSlots(), [], emptyRanks);
    expect(result).toBeNull();
  });

  it("【HH:00】パターンがないテキストの場合はnullを返す", () => {
    const result = parseBulkTextToSlots("キャスト名1 キャスト名2", createDefaultSlots(), [], emptyRanks);
    expect(result).toBeNull();
  });

  it("単一タイムブロックを正しくパースする", () => {
    const masters = [makeMaster("太郎"), makeMaster("花子")];
    const result = parseBulkTextToSlots(
      "【11:00】太郎 花子",
      createDefaultSlots(),
      masters,
      emptyRanks
    );
    expect(result).not.toBeNull();
    expect(result!.updatedSlots).toBe(1);
    expect(result!.slots[0].casts).toHaveLength(2);
    expect(result!.slots[0].casts[0].name).toBe("太郎");
    expect(result!.slots[0].casts[1].name).toBe("花子");
  });

  it("複数タイムブロックを正しくパースする", () => {
    const masters = [makeMaster("太郎"), makeMaster("花子"), makeMaster("次郎")];
    const result = parseBulkTextToSlots(
      "【11:00】太郎 花子 【12:00】次郎",
      createDefaultSlots(),
      masters,
      emptyRanks
    );
    expect(result).not.toBeNull();
    expect(result!.updatedSlots).toBe(2);
    expect(result!.slots[0].casts).toHaveLength(2);
    expect(result!.slots[1].casts).toHaveLength(1);
    expect(result!.slots[1].casts[0].name).toBe("次郎");
  });

  it("マスター未登録のキャスト名をunknownNamesに記録する", () => {
    const masters = [makeMaster("太郎")];
    const result = parseBulkTextToSlots(
      "【11:00】太郎 未知キャスト",
      createDefaultSlots(),
      masters,
      emptyRanks
    );
    expect(result).not.toBeNull();
    expect(result!.unknownNames.has("未知キャスト")).toBe(true);
    expect(result!.slots[0].casts).toHaveLength(2);
  });

  it("対応範囲外の時刻をinvalidTimesに記録する", () => {
    const result = parseBulkTextToSlots(
      "【10:00】太郎",
      createDefaultSlots(),
      [],
      emptyRanks
    );
    expect(result).not.toBeNull();
    expect(result!.invalidTimes.has("10:00")).toBe(true);
    expect(result!.updatedSlots).toBe(0);
  });

  it("overwrite=trueの場合、ベーススロットではなくデフォルトスロットから開始する", () => {
    const baseSlotsWithData = createDefaultSlots();
    baseSlotsWithData[0].casts = [{ id: "existing", name: "既存キャスト", imageUrl: "" }];

    const masters = [makeMaster("新キャスト")];
    const result = parseBulkTextToSlots(
      "【12:00】新キャスト",
      baseSlotsWithData,
      masters,
      emptyRanks,
      true
    );
    expect(result).not.toBeNull();
    // 11:00のキャストはクリアされている
    expect(result!.slots[0].casts).toHaveLength(0);
    // 12:00に新キャストが入っている
    expect(result!.slots[1].casts).toHaveLength(1);
    expect(result!.slots[1].casts[0].name).toBe("新キャスト");
  });

  it("overwrite=falseの場合、未更新スロットのベースデータを保持する", () => {
    const baseSlotsWithData = createDefaultSlots();
    baseSlotsWithData[0].casts = [{ id: "existing", name: "既存キャスト", imageUrl: "" }];

    const masters = [makeMaster("新キャスト")];
    const result = parseBulkTextToSlots(
      "【12:00】新キャスト",
      baseSlotsWithData,
      masters,
      emptyRanks,
      false
    );
    expect(result).not.toBeNull();
    // 11:00のキャストは保持されている
    expect(result!.slots[0].casts).toHaveLength(1);
    expect(result!.slots[0].casts[0].name).toBe("既存キャスト");
  });

  it("ランクが正しく設定される", () => {
    const masters = [makeMaster("ゴールドキャスト")];
    const ranks: RankLists = { gold: ["ゴールドキャスト"], silver: [], bronze: [] };
    const result = parseBulkTextToSlots(
      "【11:00】ゴールドキャスト",
      createDefaultSlots(),
      masters,
      ranks
    );
    expect(result).not.toBeNull();
    expect(result!.slots[0].casts[0].rank).toBe("gold");
  });

  it("全角スペースで区切られたキャスト名を正しく分割する", () => {
    const masters = [makeMaster("太郎"), makeMaster("花子")];
    const result = parseBulkTextToSlots(
      "【11:00】太郎\u3000花子",
      createDefaultSlots(),
      masters,
      emptyRanks
    );
    expect(result).not.toBeNull();
    expect(result!.slots[0].casts).toHaveLength(2);
  });
});
