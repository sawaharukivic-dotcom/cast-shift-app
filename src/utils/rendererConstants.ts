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

// 16:9 レイアウト（4800×2700 — 4x解像度）
export const LAYOUT_16_9 = {
  CANVAS_WIDTH: 4800,
  CANVAS_HEIGHT: 2700,
  HEADER_BAND_HEIGHT: 360,
  DATE_BOX_WIDTH: 312,
  DATE_BOX_HEIGHT: 260,
  DATE_LINE1_SIZE: 100,
  DATE_LINE2_SIZE: 52,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 164,
  TIME_LABEL_WIDTH: 332,
  TIME_FONT_SIZE: 64,
  TIME_CELL_HEIGHT: 144,
  BLOCK_PADDING_Y: 16,
  BLOCK_PADDING_X: 24,
  BLOCK_GAP: 0,
  CARD_SIZE: 112,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 16,
  CARD_GAP_Y: 16,
  IMAGE_RADIUS: 24,
  CARD_RADIUS: 24,
  NAME_FONT_SIZE: 40,
  NAME_LABEL_HEIGHT: 64,
  ROW_HEIGHT: 128,
};

// 1:1 レイアウト（4800×4800 — 4x解像度）
export const LAYOUT_1_1 = {
  CANVAS_WIDTH: 4800,
  CANVAS_HEIGHT: 4800,
  HEADER_BAND_HEIGHT: 480,
  DATE_BOX_WIDTH: 352,
  DATE_BOX_HEIGHT: 296,
  DATE_LINE1_SIZE: 120,
  DATE_LINE2_SIZE: 60,
  LOGO_MAX_WIDTH_RATIO: 0.5,
  LOGO_MAX_HEIGHT_RATIO: 0.8,
  RANK_HEADER_HEIGHT: 184,
  TIME_LABEL_WIDTH: 392,
  TIME_FONT_SIZE: 88,
  TIME_CELL_HEIGHT: 288,
  BLOCK_PADDING_Y: 32,
  BLOCK_PADDING_X: 40,
  BLOCK_GAP: 0,
  CARD_SIZE: 224,
  CARD_COLUMNS: 4,
  CARD_GAP_X: 32,
  CARD_GAP_Y: 32,
  IMAGE_RADIUS: 40,
  CARD_RADIUS: 40,
  NAME_FONT_SIZE: 56,
  NAME_LABEL_HEIGHT: 88,
  ROW_HEIGHT: 256,
};

export type Layout = typeof LAYOUT_16_9;

export function getLayout(aspectRatio: AspectRatio): Layout {
  return aspectRatio === "16:9" ? LAYOUT_1_1 : LAYOUT_16_9;
}
