/**
 * Canvas 用画像ローダー
 *
 * ScheduleCanvas.tsx と ScheduleSheetCanvas.tsx で共有する
 * Google Drive URL候補を順番に試行する画像ロード処理。
 */

import { getGoogleDriveUrlCandidates, shouldSetCrossOrigin } from "./imageUrl";
import {
  getResolvedUrl,
  setResolvedUrl,
  getCachedImage,
  setCachedImage,
} from "./imagePreloadCache";

/** 1つの候補URLに対するタイムアウト（ms） */
const PER_ATTEMPT_TIMEOUT_MS = 8_000;

/** 同時に読み込む画像の最大数（モジュール全体で共有） */
const MAX_CONCURRENCY = 6;

// ── モジュールレベルのセマフォ ──
let semRunning = 0;
const semQueue: Array<() => void> = [];

function semAcquire(): Promise<void> {
  if (semRunning < MAX_CONCURRENCY) {
    semRunning++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => semQueue.push(resolve));
}

function semRelease(): void {
  semRunning--;
  if (semQueue.length > 0) {
    semRunning++;
    semQueue.shift()!();
  }
}

// ── 単一URLの画像ロード ──

function tryLoadImage(
  url: string,
  timeoutMs: number,
  useCors: boolean
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (useCors) {
      img.crossOrigin = "anonymous";
    }
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
      resolve(null);
    }, timeoutMs);

    img.onload = async () => {
      clearTimeout(timer);
      // Googleのプレースホルダー「?」は小さい画像
      if (img.naturalWidth < 50 || img.naturalHeight < 50) {
        resolve(null);
        return;
      }
      try {
        await img.decode();
      } catch {
        resolve(null);
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * CORS対応URLはまずCORS付きで試行し、失敗したらCORSなしでリトライ。
 * これにより Canvas 汚染を防ぎつつ、CORS 非対応の場合も表示を維持する。
 */
async function loadSingleImage(
  url: string,
  timeoutMs: number
): Promise<HTMLImageElement | null> {
  if (shouldSetCrossOrigin(url)) {
    const corsImg = await tryLoadImage(url, timeoutMs, true);
    if (corsImg) return corsImg;
    // CORS失敗 → CORSなしでリトライ（Canvas汚染するが表示は可能）
    return tryLoadImage(url, timeoutMs, false);
  }
  return tryLoadImage(url, timeoutMs, false);
}

// ── メインエントリ ──

export async function loadCanvasImages(
  urls: Iterable<string>,
  urlToNameMap?: Map<string, string>,
  cancelled?: { current: boolean }
): Promise<{ imageMap: Map<string, HTMLImageElement>; failedNames: string[] }> {
  const imageMap = new Map<string, HTMLImageElement>();
  const failedNames: string[] = [];

  await Promise.all(
    Array.from(urls).map(async (originalUrl) => {
      if (!originalUrl?.trim()) return;

      // キャッシュ済み Image があれば即返す
      const cachedImg = getCachedImage(originalUrl);
      if (cachedImg) {
        imageMap.set(originalUrl, cachedImg);
        return;
      }

      // 候補URL構築（キャッシュ済みURLを先頭に）
      const cachedUrl = getResolvedUrl(originalUrl);
      const baseCandidates = getGoogleDriveUrlCandidates(originalUrl);
      let candidates: string[];
      if (cachedUrl && cachedUrl !== baseCandidates[0]) {
        candidates = [cachedUrl, ...baseCandidates.filter((c) => c !== cachedUrl)];
      } else {
        candidates = baseCandidates;
      }

      // セマフォ取得
      await semAcquire();
      if (cancelled?.current) { semRelease(); return; }

      try {
        for (const candidate of candidates) {
          if (cancelled?.current) return;

          const img = await loadSingleImage(candidate, PER_ATTEMPT_TIMEOUT_MS);
          if (img) {
            imageMap.set(originalUrl, img);
            if (candidate !== originalUrl) imageMap.set(candidate, img);
            setResolvedUrl(originalUrl, candidate);
            setCachedImage(originalUrl, img);
            return;
          }
        }

        // 全候補失敗
        const name = urlToNameMap?.get(originalUrl);
        if (name) failedNames.push(name);
      } finally {
        semRelease();
      }
    })
  );

  return { imageMap, failedNames };
}
