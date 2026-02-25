/**
 * Googleドライブの共有リンクからFILE_IDを抽出
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('drive.google.com')) return null;

  const trimmed = url.trim();

  // パターン1: /file/d/FILE_ID/view (または /file/d/FILE_ID)
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // パターン2: ?id=FILE_ID (uc, open, thumbnail など)
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  return null;
}

/**
 * GoogleドライブのURLを画像として直接読み込める候補リストに変換
 */
export function getGoogleDriveUrlCandidates(url: string): string[] {
  if (!url || typeof url !== 'string') return [];

  const trimmed = url.trim();
  const fileId = extractGoogleDriveFileId(trimmed);

  if (!fileId) return [trimmed];

  // CORSヘッダーを返すURLを先に試す（thumbnail/lh3 → Canvas汚染なし → PNG書き出しOK）
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];
}

/**
 * GoogleドライブのURLを画像として直接読み込める形式に変換（先頭候補を返す）
 */
export function convertGoogleDriveUrl(url: string): string {
  const candidates = getGoogleDriveUrlCandidates(url);
  return candidates[0] ?? url;
}

export function isGoogleDriveUrl(url: string): boolean {
  return extractGoogleDriveFileId(url) !== null;
}

/**
 * 指定URLに対して crossOrigin="anonymous" を設定すべきかどうかを返す。
 *
 * - thumbnail URL         → true（CORSサポートあり）
 * - lh3.googleusercontent → true（CORSサポートあり）
 * - 他のDrive URL          → false（CORSなし、表示はできるがCanvas汚染）
 * - 非Drive http(s) URL    → true
 */
export function shouldSetCrossOrigin(url: string): boolean {
  if (!url) return false;
  if (url.includes("drive.google.com/thumbnail")) return true;
  if (url.includes("lh3.googleusercontent.com")) return true;
  if (url.includes("drive.google.com")) return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  return false;
}
