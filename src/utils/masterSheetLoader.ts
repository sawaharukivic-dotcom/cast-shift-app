import type { CastMaster, RankLists } from "../types/schedule";
import { logger } from "./logger";

export interface ParsedMasterData {
  masters: CastMaster[];
  rankLists: RankLists;
}

/**
 * Google Sheets から取得したCSV文字列をパースして
 * CastMaster[] と RankLists に変換する。
 *
 * 期待するカラム（順不同）:
 *   name | color | imageUrl | rank
 */
export function parseMasterCSV(csv: string): ParsedMasterData {
  // BOM除去
  const normalized = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length === 0) {
    return { masters: [], rankLists: { gold: [], silver: [], bronze: [] } };
  }

  // ヘッダー行で列インデックスを解決（英語・日本語ヘッダー両対応）
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const findCol = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.includes(h));

  const nameIdx = findCol("name", "名前");
  const colorIdx = findCol("color", "色");
  const imageUrlIdx = findCol("imageurl", "googledriveのurl", "画像url", "画像");
  const rankIdx = findCol("rank", "ランク");

  if (nameIdx === -1) {
    logger.warn("[masterSheetLoader] 'name' カラムが見つかりません");
    return { masters: [], rankLists: { gold: [], silver: [], bronze: [] } };
  }

  const masters: CastMaster[] = [];
  const rankLists: RankLists = { gold: [], silver: [], bronze: [] };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCsvLine(line);
    const name = nameIdx !== -1 ? (cols[nameIdx] ?? "").trim() : "";
    if (!name) continue;

    const color = colorIdx !== -1 ? (cols[colorIdx] ?? "").trim() : "";
    const imageUrl = imageUrlIdx !== -1 ? (cols[imageUrlIdx] ?? "").trim() : "";
    const rank = rankIdx !== -1 ? (cols[rankIdx] ?? "").trim().toLowerCase() : "";

    const master: CastMaster = {
      name,
      imageUrl,
      ...(color ? { color } : {}),
    };
    masters.push(master);

    if (rank === "gold" || rank === "silver" || rank === "bronze") {
      rankLists[rank].push(name);
    }
  }

  return { masters, rankLists };
}

/**
 * CSVの1行をカラム配列に分割する（ダブルクォートを考慮）。
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * 指定URLのGoogle Sheets CSVを取得してパースする。
 */
export async function fetchMasterSheet(url: string): Promise<ParsedMasterData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`マスターシートの取得に失敗: ${response.status} ${response.statusText}`);
  }
  const csv = await response.text();
  return parseMasterCSV(csv);
}
