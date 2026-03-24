/**
 * GAS経由でGoogle Drive画像をBase64 data URLとして取得する
 */

import { CAST_LIST_API_URL } from "../config";
import { extractGoogleDriveFileId } from "./imageUrl";
import { logger } from "./logger";

/** fileId → data URL のキャッシュ（セッション中有効） */
const base64Cache = new Map<string, string>();

/**
 * Google Drive URL群からfileIDを抽出し、GAS経由でBase64画像を取得。
 * 返却: originalUrl → data URL の Map
 */
export async function fetchImagesViaGas(
  urls: Iterable<string>,
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (!CAST_LIST_API_URL) return result;

  // URL → fileId のマッピングを作成
  const urlToFileId = new Map<string, string>();
  const uncachedFileIds: string[] = [];

  for (const url of urls) {
    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) continue;
    urlToFileId.set(url, fileId);

    // キャッシュにあればそのまま使う
    if (base64Cache.has(fileId)) {
      result.set(url, base64Cache.get(fileId)!);
    } else {
      if (!uncachedFileIds.includes(fileId)) {
        uncachedFileIds.push(fileId);
      }
    }
  }

  // 全部キャッシュ済みなら即返す
  if (uncachedFileIds.length === 0) return result;

  // バッチに分割して並列でGASに問い合わせ
  const BATCH_SIZE = 10;
  let totalLoaded = 0;

  const batches: string[][] = [];
  for (let i = 0; i < uncachedFileIds.length; i += BATCH_SIZE) {
    batches.push(uncachedFileIds.slice(i, i + BATCH_SIZE));
  }

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(CAST_LIST_API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "fetchImages",
            fileIds: batch,
          }),
        });

        if (!res.ok) {
          logger.error("[gasFetchImages] HTTP error:", res.status);
          return;
        }

        const json = await res.json();
        if (!json.success || !json.images) {
          logger.error("[gasFetchImages] GAS error:", json.error);
          return;
        }

        for (const [fileId, dataUrl] of Object.entries(json.images)) {
          base64Cache.set(fileId, dataUrl as string);
        }
      } catch (err) {
        logger.error("[gasFetchImages] batch failed:", err);
      } finally {
        totalLoaded += batch.length;
        onProgress?.(totalLoaded, uncachedFileIds.length);
      }
    })
  );

  // 全URLにマッピング
  for (const [url, fileId] of urlToFileId) {
    const dataUrl = base64Cache.get(fileId);
    if (dataUrl) {
      result.set(url, dataUrl);
    }
  }

  return result;
}
