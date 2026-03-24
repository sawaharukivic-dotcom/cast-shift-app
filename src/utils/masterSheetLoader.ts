import type { CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE, DEFAULT_COLOR } from "../constants";

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

  // フォールバック: text/html 等の場合でもJSONパースを試行
  const text = await response.text();
  const data: GasApiResponse = JSON.parse(text);
  return parseGasResponse(data);
}
