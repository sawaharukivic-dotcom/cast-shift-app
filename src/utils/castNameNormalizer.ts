/**
 * キャスト名の正規化ユーティリティ
 * 
 * 正規化ルール:
 * - 前後空白除去
 * - NFC正規化（Unicode正規化）
 * - 先頭の装飾記号を除去
 * - 連続空白を1つに
 */

// 先頭から除去する記号のリスト
const LEADING_SYMBOLS_TO_REMOVE = [
  '_', '-', '・', '.', ',', ':', '；', '|', '@', '#',
  // 必要に応じて追加
];

/**
 * キャスト名を正規化する
 * @param name 元のキャスト名
 * @returns 正規化されたキャスト名
 */
export function normalizeCastName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // 前後空白除去
  let normalized = name.trim();

  // NFC正規化（Unicode正規化）
  try {
    normalized = normalized.normalize('NFC');
  } catch (e) {
    // normalizeがサポートされていない環境ではスキップ
  }

  // 先頭の装飾記号を除去
  let removed = true;
  while (removed && normalized.length > 0) {
    removed = false;
    for (const symbol of LEADING_SYMBOLS_TO_REMOVE) {
      if (normalized.startsWith(symbol)) {
        normalized = normalized.slice(symbol.length).trim();
        removed = true;
        break;
      }
    }
  }

  // 連続空白を1つに
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * 正規化された名前でキャストマスターを検索する
 * @param castMasters キャストマスターの配列
 * @param searchName 検索する名前（正規化前）
 * @returns 見つかったキャストマスターのインデックス、見つからない場合は-1
 */
export function findCastMasterByNormalizedName(
  castMasters: Array<{ name: string }>,
  searchName: string
): number {
  const normalizedSearch = normalizeCastName(searchName);
  if (!normalizedSearch) {
    return -1;
  }

  return castMasters.findIndex((master) => {
    const normalizedMaster = normalizeCastName(master.name);
    return normalizedMaster === normalizedSearch;
  });
}
