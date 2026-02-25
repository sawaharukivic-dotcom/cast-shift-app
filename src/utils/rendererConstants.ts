/**
 * スケジュールレンダラー用の定数定義
 */

import type { CastRank, AspectRatio } from "../types/renderTypes";

// ランクの並び順
export const RANK_ORDER: CastRank[] = ["normal", "bronze", "silver", "gold"];

// ランク表示名
export const RANK_LABELS: Record<CastRank, string> = {
  normal: "",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

// ランク別の横幅比率（40% / 30% / 15% / 15%）
export const RANK_WIDTH_RATIOS: Record<CastRank, number> = {
  normal: 0.4,
  bronze: 0.3,
  silver: 0.15,
  gold: 0.15,
};

// ランク別の色（見出し用）
export const RANK_COLORS: Record<CastRank, string> = {
  normal: "#3b82f6",
  bronze: "#ea580c",
  silver: "#64748b",
  gold: "#eab308",
};

// ランク別のヘッダーテキスト色
export const RANK_TEXT_COLORS: Record<CastRank, string> = {
  normal: "#3b82f6",
  bronze: "#9A5B2E",
  silver: "#475569",
  gold: "#9A7A19",
};

// ランク別の背景色（カード用・薄め）
export const RANK_BG_COLORS: Record<CastRank, string> = {
  normal: "#dbeafe",
  bronze: "#fed7aa",
  silver: "#e2e8f0",
  gold: "#fef3c7",
};

// 16:9 レイアウト（1200×675）
export const LAYOUT_16_9 = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 675,
  HEADER_BAND_HEIGHT: 90,
  DATE_BOX_WIDTH: 78,
  DATE_BOX_HEIGHT: 65,
  DATE_LINE1_SIZE: 25,
  DATE_LINE2_SIZE: 13,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 41,
  TIME_LABEL_WIDTH: 83,
  TIME_FONT_SIZE: 16,
  TIME_CELL_HEIGHT: 36,
  BLOCK_PADDING_Y: 4,
  BLOCK_PADDING_X: 6,
  BLOCK_GAP: 0,
  CARD_SIZE: 28,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 4,
  CARD_GAP_Y: 4,
  IMAGE_RADIUS: 6,
  CARD_RADIUS: 6,
  NAME_FONT_SIZE: 10,
  NAME_LABEL_HEIGHT: 16,
  ROW_HEIGHT: 32,
};

// 1:1 レイアウト（1200×1200）
export const LAYOUT_1_1 = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 1200,
  HEADER_BAND_HEIGHT: 120,
  DATE_BOX_WIDTH: 88,
  DATE_BOX_HEIGHT: 74,
  DATE_LINE1_SIZE: 30,
  DATE_LINE2_SIZE: 15,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 46,
  TIME_LABEL_WIDTH: 98,
  TIME_FONT_SIZE: 22,
  TIME_CELL_HEIGHT: 72,
  BLOCK_PADDING_Y: 8,
  BLOCK_PADDING_X: 10,
  BLOCK_GAP: 0,
  CARD_SIZE: 56,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 8,
  CARD_GAP_Y: 8,
  IMAGE_RADIUS: 10,
  CARD_RADIUS: 10,
  NAME_FONT_SIZE: 14,
  NAME_LABEL_HEIGHT: 22,
  ROW_HEIGHT: 64,
};

export type Layout = typeof LAYOUT_16_9;

export function getLayout(aspectRatio: AspectRatio): Layout {
  return aspectRatio === "16:9" ? LAYOUT_1_1 : LAYOUT_16_9;
}
