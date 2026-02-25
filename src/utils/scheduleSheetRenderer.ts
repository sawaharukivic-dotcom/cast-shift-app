import type { ScheduleRenderInput, RenderTimeSlot, RenderCast } from "../types/renderTypes";
import { roundRect } from "./canvasHelpers";

// 4x解像度（CSSで縮小表示）
export const SHEET_CANVAS_WIDTH = 7200;
export const SHEET_MIN_HEIGHT = 2400;
export const SHEET_TITLE_HEIGHT = 160;
export const SHEET_HEADER_HEIGHT = 160;
export const SHEET_ROW_HEIGHT = 560;
export const SHEET_BOTTOM_PADDING = 80;

const PROFILE_COL_WIDTH = 1200;
const LEFT_PADDING = 80;
const RIGHT_PADDING = 80;
const IMAGE_SIZE_LARGE = 360;
const NAME_FONT_SIZE_LARGE = 80;
import { DEFAULT_COLOR } from "../constants";

interface SheetRow {
  name: string;
  imageUrl: string;
  color: string;
  hours: number[];
}

/**
 * ScheduleRenderInput からシート表示用の行データを構築する。
 * キャストの並び順は timeSlots での初出順（アダプターがマスター順でソート済みであること前提）。
 */
export function buildSheetRows(timeSlots: RenderTimeSlot[]): SheetRow[] {
  const hoursByName = new Map<string, Set<number>>();
  const castByName = new Map<string, RenderCast>();

  timeSlots.forEach((slot) => {
    const hour = parseInt(slot.time, 10);
    slot.casts.forEach((cast) => {
      if (!hoursByName.has(cast.name)) {
        hoursByName.set(cast.name, new Set());
        castByName.set(cast.name, cast);
      }
      hoursByName.get(cast.name)?.add(hour);
    });
  });

  const names = Array.from(hoursByName.keys()); // 初出順（アダプターがマスター順を保証）

  return names.map((name) => {
    const cast = castByName.get(name)!;
    const hours = Array.from(hoursByName.get(name) || []).sort((a, b) => a - b);
    return {
      name,
      imageUrl: cast.imageUrl || "",
      color: cast.color || DEFAULT_COLOR,
      hours,
    };
  });
}

/**
 * 表形式のスケジュール画像を描画する。
 *
 * @param ctx    描画先の Canvas コンテキスト
 * @param input  ScheduleRenderInput（境界型）
 * @param imageMap 事前ロード済み画像マップ
 */
export function renderScheduleSheet(
  ctx: CanvasRenderingContext2D,
  input: ScheduleRenderInput,
  imageMap: Map<string, HTMLImageElement> = new Map()
) {
  const { date, timeSlots } = input;
  const rows = buildSheetRows(timeSlots);
  const hours = timeSlots.map((slot) => parseInt(slot.time, 10));
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 96px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(date, LEFT_PADDING, 40);

  const headerY = SHEET_TITLE_HEIGHT;
  const tableStartY = headerY + SHEET_HEADER_HEIGHT;
  const leftWidth = PROFILE_COL_WIDTH;
  const hourWidth =
    (canvasWidth - LEFT_PADDING - RIGHT_PADDING - leftWidth) / hours.length;

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, headerY, canvasWidth, SHEET_HEADER_HEIGHT);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, headerY);
  ctx.lineTo(canvasWidth, headerY);
  ctx.moveTo(0, tableStartY);
  ctx.lineTo(canvasWidth, tableStartY);
  ctx.stroke();

  drawHeaderCell(ctx, LEFT_PADDING, headerY, PROFILE_COL_WIDTH, "キャスト");
  hours.forEach((hour, index) => {
    const x = LEFT_PADDING + leftWidth + Math.floor(index * hourWidth + 0.5);
    drawHeaderCell(ctx, x, headerY, hourWidth, `${hour}:00`);
  });

  rows.forEach((row, rowIndex) => {
    const y = tableStartY + rowIndex * SHEET_ROW_HEIGHT;
    if (rowIndex % 2 === 0) {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, y, canvasWidth, SHEET_ROW_HEIGHT);
    }
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();

    const imgX = LEFT_PADDING + (PROFILE_COL_WIDTH - IMAGE_SIZE_LARGE) / 2;
    const imgY = y + 40;
    const img = imageMap.get(row.imageUrl);
    if (img) {
      ctx.save();
      roundRect(ctx, imgX, imgY, IMAGE_SIZE_LARGE, IMAGE_SIZE_LARGE, 48);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, IMAGE_SIZE_LARGE, IMAGE_SIZE_LARGE);
      ctx.restore();
    } else {
      ctx.fillStyle = "#d1d5db";
      roundRect(ctx, imgX, imgY, IMAGE_SIZE_LARGE, IMAGE_SIZE_LARGE, 48);
      ctx.fill();
    }

    ctx.fillStyle = "#111827";
    ctx.font = `bold ${NAME_FONT_SIZE_LARGE}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      row.name,
      LEFT_PADDING + PROFILE_COL_WIDTH / 2,
      y + IMAGE_SIZE_LARGE + 60
    );

    row.hours.forEach((hour) => {
      const hourIndex = hours.indexOf(hour);
      if (hourIndex === -1) return;
      const cellX =
        LEFT_PADDING + leftWidth + Math.floor(hourIndex * hourWidth + 0.5);
      const cellY = y + 32;
      const cellWidth = Math.max(hourWidth - 8, 8);
      const cellHeight = SHEET_ROW_HEIGHT - 64;
      ctx.fillStyle = row.color || DEFAULT_COLOR;
      ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
    });
  });
}

function drawHeaderCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, text: string
) {
  ctx.fillStyle = "#111827";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + SHEET_HEADER_HEIGHT / 2);
}

