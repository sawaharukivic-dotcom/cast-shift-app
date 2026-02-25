/**
 * XLSXファイルパーサー（テキスト形式出力版）
 * Excelファイルからスケジュール情報を抽出して既存のテキスト形式に変換
 */

import * as XLSX from 'xlsx';
import { extractDateFromFilename, normalizeDateKey } from './dateFormatter';
import { formatDateForDisplay } from './dateFormatter';
import { logger } from './logger';

export interface ParsedScheduleText {
  date: string; // 表示用文字列（例: "2/9（月）"）
  dateKey: string; // YYYY-MM-DD形式
  dateObj: Date;
  text: string; // 既存の一括入力形式（例: "【11:00】名前1 名前2 【12:00】名前3"）
  hourSlots: { [hour: number]: number }; // 時間帯ごとの人数（11-25）
}

/**
 * Excel時刻値（number）を時刻文字列に変換
 * Excelの時刻は0.0=1900/1/1 00:00:00からの日数
 * 時刻だけが入っている場合、0.0-1.0の範囲の値になる
 */
function excelTimeToHour(timeValue: number): number | null {
  // Excel時刻は0.0 = 1900/1/1 00:00:00
  // 時刻部分だけを取り出す（小数部分、または0.0-1.0の範囲）
  let timeFraction: number;
  
  if (timeValue < 1.0) {
    // 0.0-1.0の範囲なら時刻のみ（日付0基準）
    timeFraction = timeValue;
  } else {
    // 1.0以上なら日付+時刻、時刻部分だけを取り出す
    const days = Math.floor(timeValue);
    timeFraction = timeValue - days;
  }
  
  // 時刻部分から時間を計算（24時間 = 1.0）
  const totalHours = timeFraction * 24;
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((totalHours - hours) * 60);
  
  // 11:00-25:00の範囲に丸める
  let finalHour = hours;
  if (finalHour < 11) {
    // 11時未満は11時に丸める
    finalHour = 11;
  } else if (finalHour > 25) {
    // 25時超過は25時に丸める
    finalHour = 25;
  }
  
  // 11-25の範囲内なら返す
  if (finalHour >= 11 && finalHour <= 25) {
    return finalHour;
  }
  
  return null;
}

/**
 * XLSXファイルをパースしてテキスト形式のスケジュールを生成
 * @param file XLSXファイル
 * @returns パース結果（テキスト形式）
 */
export async function parseXlsxToText(file: File): Promise<ParsedScheduleText> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('ファイルの読み込みに失敗しました'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('シートが見つかりません'));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];

        const sourceName = file.name;
        logger.info('[XLSX] ===== パース開始 =====');
        logger.info('[XLSX] sourceName:', sourceName);

        // 1) 最初の100セルくらいを (row,col,value) でログ出力
        logger.info('[XLSX] === 最初の100セル（row, col, value, type） ===');
        let cellCount = 0;
        for (let rowIndex = 0; rowIndex < Math.min(jsonData.length, 20) && cellCount < 100; rowIndex++) {
          const row = jsonData[rowIndex];
          if (!row) continue;
          for (let colIndex = 0; colIndex < Math.min(row.length, 20) && cellCount < 100; colIndex++) {
            const value = row[colIndex];
            const type = typeof value;
            const strValue = String(value ?? '');
            logger.info(`[XLSX] [${rowIndex},${colIndex}] = "${strValue}" (${type})`);
            cellCount++;
          }
        }

        // 日付を取得
        const shiftDate = extractDateFromXlsx(jsonData, file.name);
        if (!shiftDate) {
          reject(new Error('日付を取得できませんでした'));
          return;
        }

        const dateKey = normalizeDateKey(shiftDate);
        logger.info('[XLSX] dateKey:', dateKey);

        // 2) 氏名ヘッダー行を探す
        let headerRow = -1;
        let nameCol = -1;
        let workTimeCol = -1;
        for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
          const row = jsonData[rowIndex];
          if (!row) continue;
          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cellValue = String(row[colIndex] || '').trim();
            if (cellValue.includes('氏名')) {
              headerRow = rowIndex;
              nameCol = colIndex;
              // 勤務時間列も探す
              for (let c = colIndex + 1; c < row.length; c++) {
                const workTimeCell = String(row[c] || '').trim();
                if (workTimeCell.includes('勤務時間')) {
                  workTimeCol = c;
                  break;
                }
              }
              break;
            }
          }
          if (headerRow !== -1) break;
        }

        if (headerRow === -1) {
          reject(new Error('氏名ヘッダーが見つかりませんでした'));
          return;
        }

        // 3) 時刻行を動的に検出：11〜25時のヘッダが最も多い行を探す
        let bestTimeRow = -1;
        let maxTimeCount = 0;
        
        // headerRowより前の行をチェック（最大10行前まで）
        for (let candidateRow = Math.max(0, headerRow - 10); candidateRow < headerRow; candidateRow++) {
          const rowData = jsonData[candidateRow];
          if (!rowData) continue;
          
          let timeCount = 0;
          for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
            const cellValue = rowData[colIndex];
            
            // 文字列形式の時刻をチェック
            if (typeof cellValue === 'string') {
              const timeMatch = cellValue.trim().match(/^(\d{1,2}):(\d{2})$/);
              if (timeMatch) {
                const hour = parseInt(timeMatch[1], 10);
                if (hour >= 11 && hour <= 25) {
                  timeCount++;
                }
              }
            }
            
            // Excel時刻値（number）をチェック
            if (typeof cellValue === 'number') {
              const hour = excelTimeToHour(cellValue);
              if (hour !== null && hour >= 11 && hour <= 25) {
                timeCount++;
              }
            }
          }
          
          if (timeCount > maxTimeCount) {
            maxTimeCount = timeCount;
            bestTimeRow = candidateRow;
          }
        }
        
        // 見つからなかった場合は headerRow - 1 をデフォルトとして使用
        const timeRow = bestTimeRow >= 0 ? bestTimeRow : headerRow - 1;
        if (timeRow < 0) {
          reject(new Error('時刻行が見つかりませんでした'));
          return;
        }

        logger.info('[XLSX] === ヘッダー情報 ===');
        logger.info('[XLSX] headerRow:', headerRow, 'nameCol:', nameCol, 'workTimeCol:', workTimeCol);
        logger.info('[XLSX] timeRow:', timeRow, '(検出された時刻数:', maxTimeCount, ')');

        // 時刻ヘッダの検出：文字列("11:00")だけでなく Excel時刻(number)も対応
        const timeRowData = jsonData[timeRow];
        if (!timeRowData) {
          reject(new Error('時刻行のデータが見つかりませんでした'));
          return;
        }

        // 11〜25時の列indexマップを作成
        const hourToColMap: Map<number, number> = new Map(); // hour -> colIndex
        const colToHourMap: Map<number, number> = new Map(); // colIndex -> hour
        
        for (let colIndex = 0; colIndex < timeRowData.length; colIndex++) {
          const cellValue = timeRowData[colIndex];
          
          // 文字列形式の時刻をチェック
          if (typeof cellValue === 'string') {
            const timeMatch = cellValue.trim().match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
              const hour = parseInt(timeMatch[1], 10);
              if (hour >= 11 && hour <= 25) {
                hourToColMap.set(hour, colIndex);
                colToHourMap.set(colIndex, hour);
              }
            }
          }
          
          // Excel時刻値（number）をチェック
          if (typeof cellValue === 'number') {
            const hour = excelTimeToHour(cellValue);
            if (hour !== null) {
              hourToColMap.set(hour, colIndex);
              colToHourMap.set(colIndex, hour);
            }
          }
        }

        const firstTimeCol = Math.min(...Array.from(colToHourMap.keys()));
        const lastTimeCol = Math.max(...Array.from(colToHourMap.keys()));

        logger.info('[XLSX] === 時刻列マップ ===');
        logger.info('[XLSX] firstTimeCol:', firstTimeCol, 'lastTimeCol:', lastTimeCol);
        logger.info('[XLSX] hourToColMap:', Object.fromEntries(hourToColMap));
        logger.info('[XLSX] colToHourMap:', Object.fromEntries(colToHourMap));

        if (hourToColMap.size === 0) {
          reject(new Error('時刻列が見つかりませんでした'));
          return;
        }

        // 4) キャスト行を取得（連続で空の氏名が5行続いたら終了）
        const castRows: Array<{ rowIndex: number; name: string; workTime: string }> = [];
        let emptyNameCount = 0;
        const MAX_EMPTY_ROWS = 5;

        for (let rowIndex = headerRow + 1; rowIndex < jsonData.length; rowIndex++) {
          const row = jsonData[rowIndex];
          if (!row) {
            emptyNameCount++;
            if (emptyNameCount >= MAX_EMPTY_ROWS) break;
            continue;
          }
          
          const nameCell = String(row[nameCol] || '').trim();
          if (!nameCell) {
            emptyNameCount++;
            if (emptyNameCount >= MAX_EMPTY_ROWS) break;
            continue;
          }

          // 氏名が見つかったら空行カウントをリセット
          emptyNameCount = 0;
          const workTimeCell = workTimeCol >= 0 ? String(row[workTimeCol] || '').trim() : '';
          castRows.push({
            rowIndex,
            name: nameCell,
            workTime: workTimeCell,
          });
        }

        logger.info('[XLSX] === キャスト行 ===');
        logger.info('[XLSX] castRows.length:', castRows.length);
        if (castRows.length > 0) {
          logger.info('[XLSX] 最初の3行:', castRows.slice(0, 3).map(r => ({ name: r.name, workTime: r.workTime })));
        }

        if (castRows.length === 0) {
          reject(new Error('キャスト行が見つかりませんでした'));
          return;
        }

        // 開始判定関数（「未指定」のみ、trim+正規化で強化）
        const isStart = (v: any): boolean => {
          const normalized = String(v ?? '').trim().replace(/\s+/g, ' '); // 連続空白を1つに
          return normalized === '未指定';
        };

        // 各キャストのシフト開始位置を取得
        const hourSlots: { [hour: number]: Set<string> } = {};
        for (let h = 11; h <= 25; h++) {
          hourSlots[h] = new Set<string>();
        }

        // 6) 各キャストごとに詳細ログ出力
        castRows.forEach(({ rowIndex, name, workTime }, castIdx) => {
          const row = jsonData[rowIndex];
          if (!row) return;

          // 勤務時間をパース（"X時間Y分"形式）
          let durationHours = 8; // デフォルト8時間
          if (workTime) {
            const workTimeMatch = workTime.match(/(\d+)時間(?:\s*(\d+))?分?/);
            if (workTimeMatch) {
              const hours = parseInt(workTimeMatch[1], 10) || 0;
              const minutes = parseInt(workTimeMatch[2] || '0', 10);
              durationHours = hours + minutes / 60;
            } else {
              logger.info(`[XLSX] 勤務時間パース失敗 (${name}): "${workTime}" → デフォルト8時間を使用`);
            }
          }

          // 5) 開始判定：時刻列マップに基づいて開始時刻を決める（4列=1時間に依存しない）
          const startTimes: number[] = [];
          
          // 各時刻列をチェック（colToHourMapに基づく）
          for (const [colIndex, hour] of colToHourMap.entries()) {
            const cellValue = row[colIndex];
            
            // 「未指定」が入ってるセルを開始として扱う
            if (isStart(cellValue)) {
              startTimes.push(hour);
            }
          }
          
          // 開始時刻をソート
          startTimes.sort((a, b) => a - b);

          // 区間化
          const k = startTimes.length;
          const durationPerStart = k > 0 ? durationHours / k : 0;
          const intervals: Array<{ start: number; end: number }> = [];

          startTimes.forEach((start, idx) => {
            const duration = idx === k - 1 
              ? durationHours - (durationPerStart * (k - 1)) // 最後は端数調整
              : durationPerStart;
            const end = Math.min(start + duration, 26); // 26時まで
            intervals.push({ start, end });
          });

          // 6) 各キャストごとにログ出力
          logger.info(`[XLSX] === キャスト[${castIdx}]: ${name} ===`);
          logger.info(`[XLSX]   durationHours: ${durationHours.toFixed(2)}`);
          logger.info(`[XLSX]   startTimes: [${startTimes.join(', ')}]`);
          logger.info(`[XLSX]   intervals:`, intervals.map(i => `[${i.start.toFixed(1)}, ${i.end.toFixed(1)})`).join(', '));

          if (startTimes.length === 0) {
            logger.warn(`[XLSX]   開始時刻が見つかりません（スキップ）`);
            return;
          }

          // 毎時在籍判定
          intervals.forEach(({ start, end }) => {
            for (let hour = Math.floor(start); hour < Math.ceil(end) && hour <= 25; hour++) {
              if (hour >= 11 && hour <= 25) {
                hourSlots[hour].add(name);
              }
            }
          });
        });

        // 6) hourSlotsの各時間の人数をログ出力
        logger.info('[XLSX] === hourSlots（各時間の人数） ===');
        const hourSlotsCount: { [hour: number]: number } = {};
        for (let hour = 11; hour <= 25; hour++) {
          const count = hourSlots[hour].size;
          hourSlotsCount[hour] = count;
          if (count > 0) {
            const names = Array.from(hourSlots[hour]);
            logger.info(`[XLSX] ${hour}:00 → ${count}人: [${names.join(', ')}]`);
          }
        }

        // 開始判定の検証：全キャストで「未指定」が見つからなかった場合の警告
        let totalStartTimesFound = 0;
        castRows.forEach(({ rowIndex }) => {
          const row = jsonData[rowIndex];
          if (!row) return;
          for (const [colIndex] of colToHourMap.entries()) {
            const cellValue = row[colIndex];
            if (isStart(cellValue)) {
              totalStartTimesFound++;
              break; // 1キャストにつき1回だけカウント
            }
          }
        });
        
        if (totalStartTimesFound === 0) {
          logger.warn('[XLSX] 警告: どの時間列にも「未指定」が見つかりませんでした');
        }

        // テキスト形式に変換（既存の一括入力形式）
        const textParts: string[] = [];
        for (let hour = 11; hour <= 25; hour++) {
          const names = Array.from(hourSlots[hour]);
          if (names.length > 0) {
            textParts.push(`【${hour}:00】`);
            textParts.push(names.join(' '));
          }
        }

        const text = textParts.join(' ');
        logger.info('[XLSX] === 出力text（先頭200文字） ===');
        logger.info('[XLSX]', text.substring(0, 200));
        logger.info('[XLSX] === パース完了 ===');

        if (text.trim().length === 0) {
          logger.warn('[XLSX] xlsx内に印がない可能性があります');
        }

        resolve({
          date: formatDateForDisplay(shiftDate),
          dateKey,
          dateObj: shiftDate,
          text,
          hourSlots: hourSlotsCount,
        });
      } catch (error) {
        logger.error('[XLSX] パースエラー:', error);
        reject(error instanceof Error ? error : new Error('パースエラーが発生しました'));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * XLSXデータから日付を抽出
 */
function extractDateFromXlsx(jsonData: (string | number)[][], filename: string): Date | null {
  // 「シフト日」というセルを探す
  for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
    const row = jsonData[rowIndex];
    if (!row) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').trim();
      if (cellValue.includes('シフト日')) {
        // 右隣のセルを取得
        const dateCell = String(row[colIndex + 1] || '').trim();
        if (dateCell) {
          // "2026/2/9 (月)" 形式から日付を抽出
          const dateMatch = dateCell.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
          if (dateMatch) {
            const year = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1;
            const day = parseInt(dateMatch[3], 10);
            const date = new Date(year, month, day);
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
              return date;
            }
          }

          // "M/D" 形式も試す
          const mdMatch = dateCell.match(/(\d{1,2})\/(\d{1,2})/);
          if (mdMatch) {
            const currentYear = new Date().getFullYear();
            const month = parseInt(mdMatch[1], 10) - 1;
            const day = parseInt(mdMatch[2], 10);
            const date = new Date(currentYear, month, day);
            if (date.getMonth() === month && date.getDate() === day) {
              return date;
            }
          }
        }
      }
    }
  }

  // フォールバック: ファイル名から日付を抽出
  return extractDateFromFilename(filename);
}
