import type { CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE, DEFAULT_COLOR } from "../constants";
import { logger } from "./logger";

export interface ParsedMasterData {
  masters: CastMaster[];
  rankLists: RankLists;
}

// ── GAS API レスポンス型 ──

interface GasCastEntry {
  name: string;
  rank?: string;
  type?: string;
  imageFileId?: string;
}

interface GasApiResponse {
  casts: GasCastEntry[];
  rankLists: { gold: string[]; silver: string[]; bronze: string[] };
  error?: string;
}

/**
 * Google Drive の fileId から画像URLを生成（CORS対応の thumbnail URL）
 */
function driveFileIdToImageUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

/**
 * GAS API のレスポンスを ParsedMasterData に変換する。
 */
export function parseGasResponse(data: GasApiResponse): ParsedMasterData {
  if (data.error) {
    throw new Error(`GAS API エラー: ${data.error}`);
  }

  const masters: CastMaster[] = (data.casts ?? [])
    .filter((c) => c.name?.trim())
    .map((c) => ({
      name: c.name.trim(),
      imageUrl: c.imageFileId
        ? driveFileIdToImageUrl(c.imageFileId)
        : PLACEHOLDER_IMAGE,
      color: DEFAULT_COLOR,
    }));

  const rankLists: RankLists = data.rankLists ?? {
    gold: [],
    silver: [],
    bronze: [],
  };

  return { masters, rankLists };
}

/**
 * GAS WebアプリURL からキャストデータを取得してパースする。
 */
export async function fetchMasterSheet(url: string): Promise<ParsedMasterData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `キャストリストの取得に失敗: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  // GAS API（JSON）
  if (contentType.includes("application/json")) {
    const data: GasApiResponse = await response.json();
    return parseGasResponse(data);
  }

  // フォールバック: 旧CSV形式（移行期間中の互換用）
  const text = await response.text();
  try {
    const data: GasApiResponse = JSON.parse(text);
    return parseGasResponse(data);
  } catch {
    logger.warn("[masterSheetLoader] JSONパース失敗、CSVとして処理");
    return parseMasterCSV(text);
  }
}

// ── 旧CSV パーサー（フォールバック用に残す） ──

export function parseMasterCSV(csv: string): ParsedMasterData {
  const normalized = csv
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length === 0) {
    return { masters: [], rankLists: { gold: [], silver: [], bronze: [] } };
  }

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
    const imageUrl =
      imageUrlIdx !== -1 ? (cols[imageUrlIdx] ?? "").trim() : "";
    const rank =
      rankIdx !== -1 ? (cols[rankIdx] ?? "").trim().toLowerCase() : "";

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
