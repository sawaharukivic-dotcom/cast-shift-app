/**
 * ダウンロードヘルパー
 */

/** Canvas を Blob に変換する */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((created) => resolve(created), "image/png");
  });
}

/** Blob をダウンロードする */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  URL.revokeObjectURL(url);
}

/** href をダウンロードとしてトリガーする */
export function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
