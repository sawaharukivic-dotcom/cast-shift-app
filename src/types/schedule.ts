/**
 * アプリ全体で使用される型定義
 *
 * Cast, TimeSlot: スケジュールの基本型（元 App.tsx）
 * DayKey, ImportedDay: 日付・インポート管理型（元 App.tsx）
 * CastMaster, RankLists, CastRank: キャストマスター関連型（元 CastMasterManager.tsx）
 */

export interface Cast {
  id: string;
  name: string;
  imageUrl: string;
  rank?: string;
}

export interface TimeSlot {
  time: string;
  casts: Cast[];
}

export type DayKey = string; // "YYYY-MM-DD"

export type CastRank = "normal" | "bronze" | "silver" | "gold";

export interface CastMaster {
  name: string;
  imageUrl: string;
  color?: string;
}

export interface RankLists {
  gold: string[];
  silver: string[];
  bronze: string[];
}
