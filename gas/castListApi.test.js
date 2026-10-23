// 実行方法: node gas/castListApi.test.js
// castListApi.gs の照合ロジック（純粋関数部分）のサニティテスト
const fs = require("fs");
const src = fs.readFileSync(
  "" + __dirname + "/castListApi.gs",
  "utf8"
);
// eval はこのリポジトリ内の自作 .gs ソース（信頼済み・外部入力なし）を
// 使い捨てテストで読み込むためだけに使用（.gs はモジュールではないため require 不可）。
// GAS専用API（SpreadsheetApp等）は関数内でしか使われないため eval で読み込める
eval(src);

let failed = 0;
function check(label, cond, detail) {
  if (cond) console.log("PASS:", label);
  else {
    failed++;
    console.log("FAIL:", label, detail ?? "");
  }
}

const KON = "千灯こん⋆͛💛";

// ── 事故の再現: 別キャストのファイルに誤った番号（539）が付いて重複 ──
{
  const casts = [{ name: KON, rank: "", type: "専属", id: "539" }];
  const files = [
    parseFileEntry(`539_${KON}`, "FILE_CORRECT"),
    parseFileEntry("539_水久良かなる", "FILE_WRONG"),
  ];
  const r = matchIconsToCasts(casts, files);
  check("重複時は名前が一致する方を選ぶ", r.assignments[KON] === "FILE_CORRECT", r);
  check("重複の警告が出る", r.warnings.length === 1 && r.warnings[0].includes("複数"), r.warnings);
}

// ── 誤番号ファイルしか無い場合（本人の正しいファイルが未アップロード） ──
{
  const casts = [{ name: KON, rank: "", type: "専属", id: "539" }];
  const files = [parseFileEntry("539_水久良かなる", "FILE_WRONG")];
  const r = matchIconsToCasts(casts, files);
  check("番号一致・名前不一致は使いつつ警告", r.assignments[KON] === "FILE_WRONG", r);
  check(
    "名前不一致の警告が出る",
    r.warnings.length === 1 && r.warnings[0].includes("一致しません"),
    r.warnings
  );
}

// ── 重複していて名前がどちらも一致しない → アイコンなし＋警告 ──
{
  const casts = [{ name: KON, rank: "", type: "専属", id: "539" }];
  const files = [
    parseFileEntry("539_別人A", "FILE_A"),
    parseFileEntry("539_別人B", "FILE_B"),
  ];
  const r = matchIconsToCasts(casts, files);
  check("判別不能ならアイコンを設定しない", r.assignments[KON] === undefined, r);
  check("判別不能の警告が出る", r.warnings.length === 1 && r.warnings[0].includes("判別できません"), r.warnings);
}

// ── 正常系: 番号＋名前が一致（警告なし） ──
{
  const casts = [{ name: KON, rank: "gold", type: "専属", id: "539" }];
  const files = [parseFileEntry(`539_${KON}`, "FILE_OK")];
  const r = matchIconsToCasts(casts, files);
  check("正常系は警告なしで照合", r.assignments[KON] === "FILE_OK" && r.warnings.length === 0, r);
}

// ── 旧形式（番号なしファイル名）: 名前照合にフォールバック ──
{
  const casts = [{ name: "山岸紫苑", rank: "", type: "", id: "12" }];
  const files = [parseFileEntry("山岸紫苑", "FILE_LEGACY")];
  const r = matchIconsToCasts(casts, files);
  check("旧形式ファイルは名前で照合", r.assignments["山岸紫苑"] === "FILE_LEGACY", r);
}

// ── ID列が無いシート（id空）: 名前照合のみで動く ──
{
  const casts = [{ name: "陽紬 ひなた", rank: "", type: "", id: "" }];
  const files = [parseFileEntry("77_陽紬ひなた", "FILE_77")];
  const r = matchIconsToCasts(casts, files);
  check(
    "id無しでも名前部分（空白ゆれ吸収）で照合",
    r.assignments["陽紬 ひなた"] === "FILE_77",
    r
  );
}

// ── 全角数字の番号・シート側が数値セルの場合 ──
{
  const casts = [{ name: KON, rank: "", type: "", id: normalizeDigits(String(539)) }];
  const files = [parseFileEntry(`５３９_${KON}`, "FILE_ZENKAKU")];
  const r = matchIconsToCasts(casts, files);
  check("全角数字の番号も照合できる", r.assignments[KON] === "FILE_ZENKAKU", r);
}

// ── ID設定済みだがDriveのファイルが旧形式（名前のみ）→ 名前で救済 ──
// （デプロイ版v1はIDがあると名前照合しなかったため、この場合アイコンが消えていた）
{
  const casts = [{ name: "7_ko", rank: "", type: "", id: "612" }];
  const files = [parseFileEntry("7_ko", "FILE_NANAKO")];
  const r = matchIconsToCasts(casts, files);
  check(
    "ID設定済み＋旧形式ファイルは名前でフォールバック",
    r.assignments["7_ko"] === "FILE_NANAKO",
    r
  );
}

// ── 別キャスト同士は影響しない ──
{
  const casts = [
    { name: KON, rank: "", type: "", id: "539" },
    { name: "水久良かなる", rank: "", type: "", id: "612" },
  ];
  const files = [
    parseFileEntry(`539_${KON}`, "FILE_KON"),
    parseFileEntry("612_水久良かなる", "FILE_KANARU"),
  ];
  const r = matchIconsToCasts(casts, files);
  check(
    "2人とも正しく照合",
    r.assignments[KON] === "FILE_KON" &&
      r.assignments["水久良かなる"] === "FILE_KANARU" &&
      r.warnings.length === 0,
    r
  );
}

process.exit(failed === 0 ? 0 : 1);
