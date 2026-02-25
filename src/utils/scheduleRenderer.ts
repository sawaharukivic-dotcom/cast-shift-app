import type { ScheduleRenderInput, RenderCast, RenderTimeSlot, CastRank, AspectRatio } from "../types/renderTypes";
import { PLACEHOLDER_IMAGE } from "../constants";
import { normalizeCastName } from "./castNameNormalizer";
import { roundRect } from "./canvasHelpers";
import {
  RANK_ORDER,
  RANK_LABELS,
  RANK_WIDTH_RATIOS,
  RANK_COLORS,
  RANK_TEXT_COLORS,
  RANK_BG_COLORS,
  getLayout,
  type Layout,
} from "./rendererConstants";

// re-export for backward compat
export type { AspectRatio };

function getRankFromCast(cast: RenderCast): CastRank {
  return cast.rank;
}

/** キャストの重複を排除し、画像URLが未設定のものを除外 */
function deduplicateCasts(
  casts: RenderCast[],
  _imageMap: Map<string, HTMLImageElement>,
  _skipImageCheck = false
): RenderCast[] {
  const seen = new Set<string>();
  const result: RenderCast[] = [];
  for (const cast of casts) {
    if (!cast.name?.trim()) continue;
    const key = cast.id || normalizeCastName(cast.name);
    if (!key || seen.has(key)) continue;
    // imageUrl が未設定またはプレースホルダーのみ除外
    // 画像の読み込み成否は問わない（失敗時はグレー矩形で表示）
    if (!cast.imageUrl || cast.imageUrl.trim().length === 0 ||
        cast.imageUrl === PLACEHOLDER_IMAGE) continue;
    seen.add(key);
    result.push(cast);
  }
  return result;
}

/** 各時間帯の描画高さを計算（内容に応じて動的） */
function calculateTimeSlotHeight(
  slot: RenderTimeSlot,
  layout: Layout,
  imageMap: Map<string, HTMLImageElement>,
  skipImageCheck = false
): number {
  const uniqueCasts = deduplicateCasts(slot.casts, imageMap, skipImageCheck);
  const castsByRank: Record<CastRank, RenderCast[]> = {
    normal: [],
    bronze: [],
    silver: [],
    gold: [],
  };
  uniqueCasts.forEach((cast) => {
    castsByRank[getRankFromCast(cast)].push(cast);
  });

  const startX = layout.TIME_LABEL_WIDTH + layout.BLOCK_PADDING_X;
  const availableWidth =
    layout.CANVAS_WIDTH - startX - layout.BLOCK_PADDING_X - layout.TIME_LABEL_WIDTH;

  let maxNeededHeight = layout.TIME_CELL_HEIGHT;
  RANK_ORDER.forEach((rank) => {
    const rankedCasts = castsByRank[rank];
    const rankWidth = availableWidth * RANK_WIDTH_RATIOS[rank];
    const cardsPerRow = Math.min(
      4,
      Math.floor(rankWidth / (layout.CARD_SIZE + layout.CARD_GAP_X))
    );
    if (cardsPerRow > 0 && rankedCasts.length > 0) {
      const rows = Math.ceil(rankedCasts.length / cardsPerRow);
      const neededHeight =
        rows * layout.CARD_SIZE +
        (rows - 1) * layout.CARD_GAP_Y +
        layout.BLOCK_PADDING_Y * 2;
      maxNeededHeight = Math.max(maxNeededHeight, neededHeight);
    }
  });
  return maxNeededHeight;
}

/** キャンバス高さを計算（全時間帯を合計） */
export function calculateCanvasHeight(
  timeSlots: RenderTimeSlot[],
  aspectRatio: AspectRatio = "16:9",
  imageMap: Map<string, HTMLImageElement> = new Map()
): number {
  const layout = getLayout(aspectRatio);
  const headerTotalHeight =
    layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT;
  let totalHeight = headerTotalHeight;
  // imageMap が空の場合は imageUrl の存在だけで高さを計算する（事前サイズ計算用）
  const skipImageCheck = imageMap.size === 0;
  timeSlots.forEach((slot) => {
    totalHeight += calculateTimeSlotHeight(slot, layout, imageMap, skipImageCheck);
  });
  return totalHeight;
}

export function getCanvasWidth(aspectRatio: AspectRatio = "16:9"): number {
  return getLayout(aspectRatio).CANVAS_WIDTH;
}

/**
 * タイムライン形式のスケジュール画像を描画する。
 *
 * @param ctx         描画先の Canvas コンテキスト
 * @param input       ScheduleRenderInput（境界型）
 * @param imageMap    事前ロード済み画像マップ
 * @param aspectRatio アスペクト比
 */
export function renderSchedule(
  ctx: CanvasRenderingContext2D,
  input: ScheduleRenderInput,
  imageMap: Map<string, HTMLImageElement> = new Map(),
  aspectRatio: AspectRatio = "16:9"
) {
  const { date, timeSlots, logoImage } = input;
  const layout = getLayout(aspectRatio);

  const canvasHeight = calculateCanvasHeight(timeSlots, aspectRatio, imageMap);
  if (ctx.canvas.width !== layout.CANVAS_WIDTH) ctx.canvas.width = layout.CANVAS_WIDTH;
  if (ctx.canvas.height !== canvasHeight) ctx.canvas.height = canvasHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.CANVAS_WIDTH, canvasHeight);

  drawHeader(ctx, date, layout);

  const headerTotalHeight = layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT;
  let currentY = headerTotalHeight;

  timeSlots.forEach((slot, index) => {
    const cellHeight = calculateTimeSlotHeight(slot, layout, imageMap);
    ctx.fillStyle = index % 2 === 0 ? "#fafafa" : "#ffffff";
    ctx.fillRect(0, currentY, layout.CANVAS_WIDTH, cellHeight);
    drawTimeBlock(ctx, slot, currentY, cellHeight, imageMap, layout, index);
    currentY += cellHeight;
  });

  // ロゴをオーバーレイ（ヘッダー帯内のみ）
  if (logoImage && logoImage.naturalWidth > 0 && logoImage.naturalHeight > 0) {
    const imgW = logoImage.naturalWidth;
    const imgH = logoImage.naturalHeight;
    const headerH = layout.HEADER_BAND_HEIGHT;
    const maxW = layout.CANVAS_WIDTH * 0.85;
    const maxH = headerH * 0.75;
    let logoW = maxW;
    let logoH = logoW * (imgH / imgW);
    if (logoH > maxH) {
      logoH = maxH;
      logoW = logoH * (imgW / imgH);
    }
    const x = (layout.CANVAS_WIDTH - logoW) / 2;
    const y = (headerH - logoH) / 2;
    ctx.drawImage(logoImage, x, y, logoW, logoH);
  }
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  date: string,
  layout: Layout
) {
  // ヘッダー帯背景
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, layout.CANVAS_WIDTH, layout.HEADER_BAND_HEIGHT);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, layout.HEADER_BAND_HEIGHT);
  ctx.lineTo(layout.CANVAS_WIDTH, layout.HEADER_BAND_HEIGHT);
  ctx.stroke();

  // 日付ボックス
  const dateBoxMargin = 48;
  const dateBoxY = (layout.HEADER_BAND_HEIGHT - layout.DATE_BOX_HEIGHT) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  roundRect(ctx, dateBoxMargin, dateBoxY, layout.DATE_BOX_WIDTH, layout.DATE_BOX_HEIGHT, 52);
  ctx.fill();
  ctx.restore();

  // 日付テキスト
  const dateParts = date.split("（");
  const line1 = dateParts[0];
  const dayMap: Record<string, string> = {
    "月）": "MON", "火）": "TUE", "水）": "WED", "木）": "THU",
    "金）": "FRI", "土）": "SAT", "日）": "SUN",
  };
  const line2 = dateParts[1] ? dayMap[dateParts[1]] || "MON" : "MON";
  const centerX = dateBoxMargin + layout.DATE_BOX_WIDTH / 2;
  const line1Y = dateBoxY + layout.DATE_BOX_HEIGHT * 0.38;
  const line2Y = dateBoxY + layout.DATE_BOX_HEIGHT * 0.72;
  ctx.fillStyle = "#1f2937";
  ctx.font = `600 ${layout.DATE_LINE1_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(line1, centerX, line1Y);
  ctx.fillStyle = "#64748b";
  ctx.font = `500 ${layout.DATE_LINE2_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const chars = line2.split("");
  const charSpacing = 4.8;
  const totalWidth =
    ctx.measureText(line2).width + (chars.length - 1) * charSpacing;
  let charX = centerX - totalWidth / 2;
  chars.forEach((char) => {
    const cw = ctx.measureText(char).width;
    ctx.fillText(char, charX + cw / 2, line2Y);
    charX += cw + charSpacing;
  });

  // ランク見出し
  const rankHeaderY = layout.HEADER_BAND_HEIGHT;
  const rankStartX = layout.TIME_LABEL_WIDTH + layout.BLOCK_PADDING_X;
  const availableWidth =
    layout.CANVAS_WIDTH - rankStartX - layout.BLOCK_PADDING_X - layout.TIME_LABEL_WIDTH;
  const normalEndX = rankStartX + availableWidth * RANK_WIDTH_RATIOS.normal;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, rankHeaderY, layout.CANVAS_WIDTH, layout.RANK_HEADER_HEIGHT);

  const headerFontSize = layout.RANK_HEADER_HEIGHT >= 184 ? 96 : 88;
  let currentX = rankStartX;

  RANK_ORDER.forEach((rank) => {
    const rankWidth = availableWidth * RANK_WIDTH_RATIOS[rank];
    const headerWidth = rankWidth - layout.CARD_GAP_X;
    if (rank !== "normal") {
      ctx.fillStyle = RANK_BG_COLORS[rank];
      ctx.fillRect(currentX, rankHeaderY, headerWidth, layout.RANK_HEADER_HEIGHT);
      ctx.fillStyle = RANK_TEXT_COLORS[rank];
      ctx.font = `700 ${headerFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = RANK_LABELS[rank].toUpperCase();
      const letterSpacing = headerFontSize * 0.04;
      const textWidth = ctx.measureText(text).width;
      const tw = textWidth + (text.length - 1) * letterSpacing;
      let cx = currentX + rankWidth / 2 - tw / 2;
      for (const char of text) {
        const cw = ctx.measureText(char).width;
        ctx.fillText(
          char,
          cx + cw / 2,
          rankHeaderY + layout.RANK_HEADER_HEIGHT / 2
        );
        cx += cw + letterSpacing;
      }
    }
    currentX += rankWidth;
  });

  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT);
  ctx.lineTo(rankStartX, layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT);
  ctx.moveTo(normalEndX, layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT);
  ctx.lineTo(layout.CANVAS_WIDTH, layout.HEADER_BAND_HEIGHT + layout.RANK_HEADER_HEIGHT);
  ctx.stroke();
}

function calculateMaxRowsForTimeSlot(
  casts: RenderCast[],
  layout: Layout
): { maxRows: number; normalRows: number } {
  const castsByRank: Record<CastRank, RenderCast[]> = {
    normal: [], bronze: [], silver: [], gold: [],
  };
  casts.forEach((cast) => { castsByRank[getRankFromCast(cast)].push(cast); });

  const startX = layout.TIME_LABEL_WIDTH + layout.BLOCK_PADDING_X;
  const availableWidth =
    layout.CANVAS_WIDTH - startX - layout.BLOCK_PADDING_X - layout.TIME_LABEL_WIDTH;

  let maxRows = 1;
  let normalRows = 0;
  RANK_ORDER.forEach((rank) => {
    const rankedCasts = castsByRank[rank];
    const rankWidth = availableWidth * RANK_WIDTH_RATIOS[rank];
    const cardsPerRow = Math.min(
      4,
      Math.floor(rankWidth / (layout.CARD_SIZE + layout.CARD_GAP_X))
    );
    if (cardsPerRow > 0 && rankedCasts.length > 0) {
      const rows = Math.ceil(rankedCasts.length / cardsPerRow);
      maxRows = Math.max(maxRows, rows);
      if (rank === "normal") normalRows = rows;
    }
  });
  return { maxRows, normalRows };
}

function drawTimeBlock(
  ctx: CanvasRenderingContext2D,
  slot: RenderTimeSlot,
  y: number,
  blockHeight: number,
  imageMap: Map<string, HTMLImageElement>,
  layout: Layout,
  index: number
) {
  // 左カラム
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, y, layout.TIME_LABEL_WIDTH, blockHeight);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(layout.TIME_LABEL_WIDTH, y);
  ctx.lineTo(layout.TIME_LABEL_WIDTH, y + blockHeight);
  ctx.stroke();
  ctx.fillStyle = "#374151";
  ctx.font = `600 ${layout.TIME_FONT_SIZE}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(slot.time, layout.TIME_LABEL_WIDTH / 2, y + blockHeight / 2);

  // 右カラム
  const rightX = layout.CANVAS_WIDTH - layout.TIME_LABEL_WIDTH;
  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(rightX, y, layout.TIME_LABEL_WIDTH, blockHeight);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX, y);
  ctx.lineTo(rightX, y + blockHeight);
  ctx.stroke();
  ctx.fillStyle = "#374151";
  ctx.font = `600 ${layout.TIME_FONT_SIZE}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(slot.time, rightX + layout.TIME_LABEL_WIDTH / 2, y + blockHeight / 2);

  // 下部区切り線
  ctx.strokeStyle = "#f3f4f6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, y + blockHeight);
  ctx.lineTo(layout.CANVAS_WIDTH, y + blockHeight);
  ctx.stroke();

  // キャストカード
  const cardsX = layout.TIME_LABEL_WIDTH + layout.BLOCK_PADDING_X;
  const cardsY = y + layout.BLOCK_PADDING_Y;
  const uniqueCasts = deduplicateCasts(slot.casts, imageMap);
  const { maxRows, normalRows } = calculateMaxRowsForTimeSlot(uniqueCasts, layout);
  const cellHeight = maxRows * layout.ROW_HEIGHT;

  drawCastCards(ctx, uniqueCasts, cardsX, cardsY, imageMap, layout, blockHeight, maxRows, normalRows, cellHeight, y);
}

function drawCastCards(
  ctx: CanvasRenderingContext2D,
  casts: RenderCast[],
  startX: number,
  startY: number,
  imageMap: Map<string, HTMLImageElement>,
  layout: Layout,
  blockHeight: number,
  maxRows: number,
  normalRows: number,
  cellHeight: number,
  slotTop: number
) {
  const castsByRank: Record<CastRank, RenderCast[]> = {
    normal: [], bronze: [], silver: [], gold: [],
  };
  casts.forEach((cast) => { castsByRank[getRankFromCast(cast)].push(cast); });

  const availableWidth =
    layout.CANVAS_WIDTH - startX - layout.BLOCK_PADDING_X - layout.TIME_LABEL_WIDTH;

  let currentSectionX = startX;
  RANK_ORDER.forEach((rank) => {
    const rankedCasts = castsByRank[rank];
    const rankWidth = availableWidth * RANK_WIDTH_RATIOS[rank];

    ctx.fillStyle = RANK_BG_COLORS[rank] + "30";
    ctx.fillRect(
      currentSectionX,
      startY - layout.BLOCK_PADDING_Y,
      rankWidth - layout.CARD_GAP_X,
      cellHeight
    );

    const cardsPerRow = Math.min(
      4,
      Math.floor(rankWidth / (layout.CARD_SIZE + layout.CARD_GAP_X))
    );
    const rows =
      rankedCasts.length > 0 && cardsPerRow > 0
        ? Math.ceil(rankedCasts.length / cardsPerRow)
        : 0;
    const shouldCenterVertically = maxRows >= 2 && rows > 0 && rows < maxRows;

    if (rankedCasts.length > 0 && cardsPerRow > 0) {
      let blockStartY = startY;
      if (shouldCenterVertically) {
        const blockH = rows * layout.CARD_SIZE + (rows - 1) * layout.CARD_GAP_Y;
        blockStartY = slotTop + (cellHeight - blockH) / 2;
      }

      rankedCasts.forEach((cast, castIndex) => {
        const col = castIndex % cardsPerRow;
        const row = Math.floor(castIndex / cardsPerRow);
        const rowStartIndex = row * cardsPerRow;
        const rowEndIndex = Math.min(rowStartIndex + cardsPerRow, rankedCasts.length);
        const cardsInThisRow = rowEndIndex - rowStartIndex;
        const rowCardsWidth =
          cardsInThisRow * layout.CARD_SIZE +
          (cardsInThisRow - 1) * layout.CARD_GAP_X;
        const rowStartX =
          currentSectionX + (rankWidth - rowCardsWidth) / 2;
        const cardX = rowStartX + col * (layout.CARD_SIZE + layout.CARD_GAP_X);
        const baseY = shouldCenterVertically ? blockStartY : startY;
        const cardY = baseY + row * (layout.CARD_SIZE + layout.CARD_GAP_Y);

        const img = imageMap.get(cast.imageUrl);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.06)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        roundRect(ctx, cardX, cardY, layout.CARD_SIZE, layout.CARD_SIZE, layout.CARD_RADIUS);
        ctx.clip();
        if (img) {
          const aspect = img.width / img.height;
          if (aspect > 1) {
            const dw = layout.CARD_SIZE * aspect;
            ctx.drawImage(img, cardX - (dw - layout.CARD_SIZE) / 2, cardY, dw, layout.CARD_SIZE);
          } else {
            const dh = layout.CARD_SIZE / aspect;
            ctx.drawImage(img, cardX, cardY - (dh - layout.CARD_SIZE) / 2, layout.CARD_SIZE, dh);
          }
        } else {
          ctx.fillStyle = "#d1d5db";
          ctx.fillRect(cardX, cardY, layout.CARD_SIZE, layout.CARD_SIZE);
        }
        ctx.restore();

        ctx.strokeStyle = RANK_COLORS[getRankFromCast(cast)] + "60";
        ctx.lineWidth = 6;
        roundRect(ctx, cardX, cardY, layout.CARD_SIZE, layout.CARD_SIZE, layout.CARD_RADIUS);
        ctx.stroke();
      });
    }
    currentSectionX += rankWidth;
  });
}

