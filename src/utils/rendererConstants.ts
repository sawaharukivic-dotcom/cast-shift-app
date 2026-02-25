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

// 16:9 レイアウト（2400×1350 — 2x解像度）
export const LAYOUT_16_9 = {
  CANVAS_WIDTH: 2400,
  CANVAS_HEIGHT: 1350,
  HEADER_BAND_HEIGHT: 180,
  DATE_BOX_WIDTH: 156,
  DATE_BOX_HEIGHT: 130,
  DATE_LINE1_SIZE: 50,
  DATE_LINE2_SIZE: 26,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 82,
  TIME_LABEL_WIDTH: 166,
  TIME_FONT_SIZE: 32,
  TIME_CELL_HEIGHT: 72,
  BLOCK_PADDING_Y: 8,
  BLOCK_PADDING_X: 12,
  BLOCK_GAP: 0,
  CARD_SIZE: 56,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 8,
  CARD_GAP_Y: 8,
  IMAGE_RADIUS: 12,
  CARD_RADIUS: 12,
  NAME_FONT_SIZE: 20,
  NAME_LABEL_HEIGHT: 32,
  ROW_HEIGHT: 64,
};

// 1:1 レイアウト（2400×2400 — 2x解像度）
export const LAYOUT_1_1 = {
  CANVAS_WIDTH: 2400,
  CANVAS_HEIGHT: 2400,
  HEADER_BAND_HEIGHT: 240,
  DATE_BOX_WIDTH: 176,
  DATE_BOX_HEIGHT: 148,
  DATE_LINE1_SIZE: 60,
  DATE_LINE2_SIZE: 30,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 92,
  TIME_LABEL_WIDTH: 196,
  TIME_FONT_SIZE: 44,
  TIME_CELL_HEIGHT: 144,
  BLOCK_PADDING_Y: 16,
  BLOCK_PADDING_X: 20,
  BLOCK_GAP: 0,
  CARD_SIZE: 112,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 16,
  CARD_GAP_Y: 16,
  IMAGE_RADIUS: 20,
  CARD_RADIUS: 20,
  NAME_FONT_SIZE: 28,
  NAME_LABEL_HEIGHT: 44,
  ROW_HEIGHT: 128,
};

export type Layout = typeof LAYOUT_16_9;

export function getLayout(aspectRatio: AspectRatio): Layout {
  return aspectRatio === "16:9" ? LAYOUT_1_1 : LAYOUT_16_9;
}
