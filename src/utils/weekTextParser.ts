/**
 * 週一括入力テキストをパースして日付ごとのテキストに分割
 */

import { normalizeDateKey, parseDateString } from './dateFormatter';
import { logger } from './logger';

export interface DayBlock {
  dateKey: string; // YYYY-MM-DD
  text: string;    // 【11:00】... 形式
}

/**
 * 週テキストをパースして日付ブロックの配列を返す
 * @param weekText 週一括入力テキスト
 * @returns 日付ブロックの配列（dateKey昇順）
 */
export function parseWeekText(weekText: string): DayBlock[] {
  if (!weekText.trim()) {
    return [];
  }

  const blocks: DayBlock[] = [];
  const lines = weekText.split('\n');
  
  let currentDateKey: string | null = null;
  let currentLines: string[] = [];

  const flushBlock = () => {
    if (currentDateKey) {
      const text = currentLines.join('\n').trim();
      blocks.push({ dateKey: currentDateKey, text });
      currentLines = [];
    }
  };

  for (const line of lines) {
    // 日付行の検出: ## で始まる行
    const dateMatch = line.match(/^##\s*(.+)/);
    if (dateMatch) {
      // 前のブロックを保存
      flushBlock();
      
      // 新しい日付を解析
      const dateStr = dateMatch[1].trim();
      const dateObj = parseDateString(dateStr);
      if (dateObj) {
        currentDateKey = normalizeDateKey(dateObj);
      } else {
        logger.warn('[weekTextParser] 日付解析失敗:', dateStr);
        currentDateKey = null;
      }
    } else if (currentDateKey) {
      // 日付が設定されている場合、本文として追加
      currentLines.push(line);
    }
  }

  // 最後のブロックを保存
  flushBlock();

  // dateKey昇順でソート
  blocks.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return blocks;
}
