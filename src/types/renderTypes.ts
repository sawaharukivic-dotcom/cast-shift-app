/**
 * スケジュールレンダラーへの入力インターフェース
 *
 * このファイルの型が「入力側」と「出力側（レンダラー）」の境界となる。
 * 入力方法（手動入力・XLSX・テキスト等）がどう変わっても、
 * レンダラーはこの型だけを知っていれば動作する。
 */

/** アスペクト比 */
export type AspectRatio = "16:9" | "1:1";

/** キャストランク（schedule.ts から再エクスポート） */
export type { CastRank } from "./schedule";

/**
 * レンダリングに必要なキャスト1人分のデータ。
 * ランクや色はアプリ側で解決済みの値として受け取る。
 */
export interface RenderCast {
  id: string;
  name: string;
  imageUrl: string;
  rank: CastRank;
  color: string; // 表形式で使用するカラー（デフォルト: '#e5e7eb'）
}

/**
 * レンダリングに必要な時間帯1つ分のデータ。
 */
export interface RenderTimeSlot {
  time: string; // "HH:00" 形式
  casts: RenderCast[];
}

/**
 * スケジュールレンダラーへの入力インターフェース（境界型）。
 *
 * - タイムライン・表形式の両レンダラーはこの型だけを入力として受け取る
 * - アプリの内部状態（TimeSlot[], RankLists, CastMaster[]）は
 *   adapter（scheduleAdapter.ts）でこの型に変換される
 */
export interface ScheduleRenderInput {
  date: string; // "M/D（曜日）" 形式の表示用文字列
  timeSlots: RenderTimeSlot[];
  logoImage?: HTMLImageElement | null;
}
