/**
 * React コンポーネント向け画像ヘルパー
 *
 * isValidImageUrl / getImageSrc / handleImageError を
 * CastMasterManager.tsx と ScheduleEditor.tsx で共有する。
 */

import type { SyntheticEvent } from "react";
import { PLACEHOLDER_IMAGE, ERROR_IMG_SRC } from "../constants";
import { getGoogleDriveUrlCandidates } from "./imageUrl";

/**
 * 画像URLが有効かどうかを判定する
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === PLACEHOLDER_IMAGE || trimmed === ERROR_IMG_SRC) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  return false;
}

/**
 * Google Drive URL候補の先頭を返す（フォールバック付き）
 */
export function getImageSrc(url: string): string {
  const candidates = getGoogleDriveUrlCandidates(url);
  return candidates[0] ?? url;
}

/**
 * <img> の onError ハンドラ — Google Drive URL候補を順番に試行し、
 * すべて失敗したら ERROR_IMG_SRC にフォールバック。
 */
export function handleImageError(
  event: SyntheticEvent<HTMLImageElement>,
  originalUrl: string
): void {
  const target = event.currentTarget;
  const candidates = getGoogleDriveUrlCandidates(originalUrl);
  const currentIndex = Number(target.dataset.fallbackIndex || 0);
  const nextIndex = currentIndex + 1;

  if (nextIndex < candidates.length) {
    target.dataset.fallbackIndex = String(nextIndex);
    target.src = candidates[nextIndex];
    return;
  }

  target.src = ERROR_IMG_SRC;
}
