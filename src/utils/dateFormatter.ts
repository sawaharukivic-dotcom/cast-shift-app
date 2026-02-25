/**
 * 日付フォーマットユーティリティ
 * 日付から曜日を自動計算して表示形式に変換
 */

const DAY_NAMES_JP = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_NAMES_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * 日付文字列（YYYY/MM/DD または M/D）をDateオブジェクトに変換
 * @param dateStr 日付文字列
 * @returns Dateオブジェクト、パース失敗時はnull
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  // YYYY/MM/DD 形式
  const ymdMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 月は0ベース
    const day = parseInt(ymdMatch[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // M/D 形式（現在の年を使用）
  const mdMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdMatch) {
    const currentYear = new Date().getFullYear();
    const month = parseInt(mdMatch[1], 10) - 1;
    const day = parseInt(mdMatch[2], 10);
    const date = new Date(currentYear, month, day);
    if (date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  return null;
}

/**
 * Dateオブジェクトを表示用文字列に変換（例: "2/9（月）"）
 * @param date Dateオブジェクト
 * @returns 表示用文字列
 */
export function formatDateForDisplay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = DAY_NAMES_JP[date.getDay()];
  return `${month}/${day}（${dayOfWeek}）`;
}

/**
 * Dateオブジェクトを英語曜日付き文字列に変換（例: "2/9 MON"）
 * @param date Dateオブジェクト
 * @returns 英語曜日付き文字列
 */
export function formatDateWithEnglishDay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = DAY_NAMES_EN[date.getDay()];
  return `${month}/${day} ${dayOfWeek}`;
}

/**
 * 日付文字列を表示用文字列に変換（既存形式との互換性のため）
 * @param dateStr 日付文字列（YYYY/MM/DD または M/D または既存形式 "M/D（曜日）"）
 * @returns 表示用文字列（"M/D（曜日）"形式）
 */
export function normalizeDateString(dateStr: string): string {
  // 既に "M/D（曜日）" 形式の場合はそのまま返す
  if (dateStr.match(/^\d{1,2}\/\d{1,2}（[日月火水木金土]）$/)) {
    return dateStr;
  }

  // 日付文字列をパース
  const date = parseDateString(dateStr);
  if (!date) {
    // パース失敗時は元の文字列を返す
    return dateStr;
  }

  return formatDateForDisplay(date);
}

/**
 * 日付をYYYY-MM-DD形式のキーに正規化
 * @param date Dateオブジェクトまたは日付文字列
 * @returns YYYY-MM-DD形式の文字列
 */
export function normalizeDateKey(date: Date | string): string {
  let dateObj: Date | null = null;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = parseDateString(date);
  }
  
  if (!dateObj) {
    // パース失敗時は現在の日付を使用
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

/**
 * ファイル名から日付を抽出（例: "2_9.xlsx" → Date）
 * @param filename ファイル名
 * @returns Dateオブジェクト、抽出失敗時はnull
 */
export function extractDateFromFilename(filename: string): Date | null {
  const currentYear = new Date().getFullYear();

  // "2026-02-09.xlsx" 形式（YYYY-MM-DD）
  const ymdDashMatch = filename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdDashMatch) {
    const year = parseInt(ymdDashMatch[1], 10);
    const month = parseInt(ymdDashMatch[2], 10) - 1;
    const day = parseInt(ymdDashMatch[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // "2026_2_9.xlsx" 形式（YYYY_M_D）
  const ymdUnderscoreMatch = filename.match(/^(\d{4})_(\d{1,2})_(\d{1,2})/);
  if (ymdUnderscoreMatch) {
    const year = parseInt(ymdUnderscoreMatch[1], 10);
    const month = parseInt(ymdUnderscoreMatch[2], 10) - 1;
    const day = parseInt(ymdUnderscoreMatch[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // "2-9.xlsx" 形式（M-D）
  const mdDashMatch = filename.match(/^(\d{1,2})-(\d{1,2})/);
  if (mdDashMatch) {
    const month = parseInt(mdDashMatch[1], 10) - 1;
    const day = parseInt(mdDashMatch[2], 10);
    const date = new Date(currentYear, month, day);
    if (date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // "2_9.xlsx" 形式（M_D）
  const mdUnderscoreMatch = filename.match(/^(\d{1,2})_(\d{1,2})/);
  if (mdUnderscoreMatch) {
    const month = parseInt(mdUnderscoreMatch[1], 10) - 1;
    const day = parseInt(mdUnderscoreMatch[2], 10);
    const date = new Date(currentYear, month, day);
    if (date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  return null;
}
