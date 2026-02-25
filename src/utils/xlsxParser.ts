/**
 * XLSXファイルパーサー（グレーセル検出版）
 * セルの背景色（#999999 = グレー）で勤務時間を判定する
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

/** セル値から時間（hour）を抽出。文字列 "11:00" やExcel時刻値に対応 */
function parseTimeToHour(cellValue: unknown): number | null {
  if (typeof cellValue === 'string') {
    const match = cellValue.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match) return parseInt(match[1], 10);
  }
  if (typeof cellValue === 'number' && cellValue > 0 && cellValue < 2) {
    const totalHours = (cellValue % 1) * 24;
    const hours = Math.round(totalHours);
    if (hours >= 11 && hours <= 25) return hours;
  }
  return null;
}

/**
 * グレーセル検出関数を構築
 * wb.Styles.Fills から #999999 の fillId を特定し、
 * wb.Styles.CellXf から対応する style index を収集
 */
function buildGreyCellDetector(
  workbook: XLSX.WorkBook,
  worksheet: XLSX.WorkSheet,
  rangeOffset: { r: number; c: number }
): (row: number, col: number) => boolean {
  const greyStyleIndices = new Set<number>();
  const wb = workbook as any;

  if (wb.Styles?.Fills && wb.Styles?.CellXf) {
    const greyFillIds = new Set<number>();
    wb.Styles.Fills.forEach((fill: any, idx: number) => {
      const rgb = (fill.fgColor?.rgb || '').toString().toLowerCase();
      // FF999999 (with alpha) or 999999
      if (rgb === '999999' || rgb === 'ff999999') {
        greyFillIds.add(idx);
        logger.info('[XLSX] グレーfill検出: fillId=%d rgb=%s', idx, rgb);
      }
    });
    wb.Styles.CellXf.forEach((xf: any, idx: number) => {
      if (greyFillIds.has(xf.fillId)) {
        greyStyleIndices.add(idx);
      }
    });
    logger.info('[XLSX] グレースタイルインデックス: [%s]', Array.from(greyStyleIndices).join(', '));
  } else {
    logger.warn('[XLSX] wb.Styles が見つかりません — グレーセル検出不可');
  }

  return (row: number, col: number): boolean => {
    // jsonData indices → absolute cell address (range offset)
    const addr = XLSX.utils.encode_cell({ r: row + rangeOffset.r, c: col + rangeOffset.c });
    const cell = worksheet[addr] as any;
    if (!cell || cell.s === undefined || cell.s === null) return false;
    if (typeof cell.s === 'number') {
      return greyStyleIndices.has(cell.s);
    }
    // フォールバック: cell.s がオブジェクトの場合（SheetJSバージョン差異）
    if (typeof cell.s === 'object') {
      const rgb = (cell.s?.fgColor?.rgb || cell.s?.fill?.fgColor?.rgb || '').toString().toLowerCase();
      if (rgb === '999999' || rgb === 'ff999999') return true;
    }
    return false;
  };
}

/**
 * マージセルと時刻ヘッダー行から、全列→時間のマッピングを構築
 * 4列=1時間（15分刻み）のマージセルを展開して全56列をマッピング
 */
function buildColToHourMap(
  worksheet: XLSX.WorkSheet,
  jsonData: (string | number)[][],
  headerRow: number,
  rangeOffset: { r: number; c: number }
): Map<number, number> {
  const map = new Map<number, number>();

  // 時刻ヘッダー行を見つける（headerRow手前で時刻値が最も多い行）
  let bestTimeRow = -1;
  let maxTimeCount = 0;
  for (let r = Math.max(0, headerRow - 10); r < headerRow; r++) {
    const row = jsonData[r];
    if (!row) continue;
    let count = 0;
    for (let c = 0; c < row.length; c++) {
      if (parseTimeToHour(row[c]) !== null) count++;
    }
    if (count > maxTimeCount) {
      maxTimeCount = count;
      bestTimeRow = r;
    }
  }
  const timeRow = bestTimeRow >= 0 ? bestTimeRow : headerRow - 1;
  if (timeRow < 0) return map;
  logger.info('[XLSX] 時刻ヘッダー行: %d (検出数: %d)', timeRow, maxTimeCount);

  // マージセルから列→時間をマッピング（全4列を同じhourに展開）
  // mergeの座標は絶対座標、jsonDataはrangeOffset分ずれた相対座標
  const absTimeRow = timeRow + rangeOffset.r;
  const merges = worksheet['!merges'] || [];
  for (const merge of merges) {
    if (merge.s.r !== absTimeRow) continue;
    const relCol = merge.s.c - rangeOffset.c;
    const cellValue = jsonData[timeRow]?.[relCol];
    const hour = parseTimeToHour(cellValue);
    if (hour === null || hour < 11 || hour > 25) continue;
    for (let col = merge.s.c; col <= merge.e.c; col++) {
      map.set(col - rangeOffset.c, hour); // 相対座標で格納
    }
  }

  // マージされていない単独セルもチェック
  const timeRowData = jsonData[timeRow] || [];
  for (let col = 0; col < timeRowData.length; col++) {
    if (map.has(col)) continue;
    const hour = parseTimeToHour(timeRowData[col]);
    if (hour !== null && hour >= 11 && hour <= 25) {
      map.set(col, hour);
    }
  }

  return map;
}

/** スキップ対象の名前キーワード */
const SKIP_NAMES = ['社員コード', 'イベント情報', '合計', '備考', '全店舗'];

/**
 * XLSXファイルをパースしてテキスト形式のスケジュールを生成
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

        const workbook = XLSX.read(data, { type: 'binary', cellStyles: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('シートが見つかりません'));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const rangeOffset = { r: range.s.r, c: range.s.c };

        logger.info('[XLSX] ===== パース開始 =====');
        logger.info('[XLSX] ファイル名:', file.name);
        logger.info('[XLSX] シート名:', firstSheetName);
        logger.info('[XLSX] range offset: row=%d col=%d', rangeOffset.r, rangeOffset.c);

        // 1) グレーセル検出関数を構築
        const isGreyCell = buildGreyCellDetector(workbook, worksheet, rangeOffset);

        // 2) 日付を取得
        const shiftDate = extractDateFromXlsx(jsonData, file.name);
        if (!shiftDate) {
          reject(new Error('日付を取得できませんでした'));
          return;
        }
        const dateKey = normalizeDateKey(shiftDate);
        logger.info('[XLSX] dateKey:', dateKey);

        // 3) 氏名ヘッダー行を探す
        let headerRow = -1;
        let nameCol = -1;
        for (let r = 0; r < jsonData.length; r++) {
          const row = jsonData[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            if (String(row[c] || '').trim().includes('氏名')) {
              headerRow = r;
              nameCol = c;
              break;
            }
          }
          if (headerRow !== -1) break;
        }
        if (headerRow === -1) {
          reject(new Error('氏名ヘッダーが見つかりませんでした'));
          return;
        }
        logger.info('[XLSX] headerRow:', headerRow, 'nameCol:', nameCol);

        // 4) 時刻列マップを構築（マージセルから全列→時間）
        const colToHourMap = buildColToHourMap(worksheet, jsonData, headerRow, rangeOffset);
        if (colToHourMap.size === 0) {
          reject(new Error('時刻列が見つかりませんでした'));
          return;
        }
        const allTimeCols = Array.from(colToHourMap.keys());
        const firstTimeCol = Math.min(...allTimeCols);
        const lastTimeCol = Math.max(...allTimeCols);
        logger.info('[XLSX] 時刻列: firstCol=%d lastCol=%d mapSize=%d', firstTimeCol, lastTimeCol, colToHourMap.size);

        // 5) キャスト行を処理（グレーセルで勤務時間を判定）
        const hourSlots: { [hour: number]: Set<string> } = {};
        for (let h = 11; h <= 25; h++) {
          hourSlots[h] = new Set<string>();
        }

        let castCount = 0;
        for (let r = headerRow + 1; r <= range.e.r; r++) {
          const row = jsonData[r];
          if (!row) continue;

          const name = String(row[nameCol] || '').trim();
          if (!name) continue;
          if (SKIP_NAMES.some((s) => name.includes(s))) continue;

          // このキャストのグレーセルをチェック
          const workingHours = new Set<number>();
          for (let col = firstTimeCol; col <= lastTimeCol; col++) {
            if (isGreyCell(r, col)) {
              const hour = colToHourMap.get(col);
              if (hour !== undefined && hour >= 11 && hour <= 25) {
                workingHours.add(hour);
              }
            }
          }

          // グレーセルなし = 非勤務 → スキップ
          if (workingHours.size === 0) continue;

          castCount++;
          const sortedHours = Array.from(workingHours).sort((a, b) => a - b);
          logger.info(
            '[XLSX] キャスト[%d]: %s → %s',
            castCount,
            name,
            sortedHours.map((h) => `${h}:00`).join(', ')
          );

          for (const hour of sortedHours) {
            hourSlots[hour].add(name);
          }
        }

        // 6) 結果ログ
        logger.info('[XLSX] === 各時間の人数 ===');
        const hourSlotsCount: { [hour: number]: number } = {};
        for (let hour = 11; hour <= 25; hour++) {
          hourSlotsCount[hour] = hourSlots[hour].size;
          if (hourSlots[hour].size > 0) {
            logger.info(
              '[XLSX] %d:00 → %d人: [%s]',
              hour,
              hourSlots[hour].size,
              Array.from(hourSlots[hour]).join(', ')
            );
          }
        }

        // 7) テキスト形式に変換
        const textParts: string[] = [];
        for (let hour = 11; hour <= 25; hour++) {
          const names = Array.from(hourSlots[hour]);
          if (names.length > 0) {
            textParts.push(`【${hour}:00】`);
            textParts.push(names.join(' '));
          }
        }
        const text = textParts.join(' ');

        logger.info('[XLSX] 出力text (先頭200文字):', text.substring(0, 200));
        logger.info('[XLSX] === パース完了 (キャスト%d人) ===', castCount);

        if (text.trim().length === 0) {
          logger.warn('[XLSX] グレーセルが検出されませんでした');
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
