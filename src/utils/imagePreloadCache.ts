/**
 * プリロード済み画像キャッシュ
 *
 * useImagePreloader で解決した URL と HTMLImageElement を保存し、
 * Canvas描画時に再リクエストせず即座に使えるようにする。
 */

/** originalUrl → 実際に読み込み成功した候補URL */
const resolvedUrlCache = new Map<string, string>();

/** originalUrl → 読み込み済み HTMLImageElement */
const imageElementCache = new Map<string, HTMLImageElement>();

export function setResolvedUrl(originalUrl: string, resolvedUrl: string): void {
  resolvedUrlCache.set(originalUrl, resolvedUrl);
}

export function getResolvedUrl(originalUrl: string): string | undefined {
  return resolvedUrlCache.get(originalUrl);
}

export function setCachedImage(originalUrl: string, img: HTMLImageElement): void {
  imageElementCache.set(originalUrl, img);
}

export function getCachedImage(originalUrl: string): HTMLImageElement | undefined {
  return imageElementCache.get(originalUrl);
}
