// GAS WebアプリのURL（キャストリスト取得用）
// 空文字の場合はリモート取得をスキップ（localStorageのみ使用）
export const CAST_LIST_API_URL =
  "https://script.google.com/macros/s/AKfycbyXZ3Tn1NXQbaLXEeC-S6uMMogdbIQHuyc1b9dNBtun6nFzRKxI4r54ZhBWSvaktRU/exec";

// キャストリストの参照スプレッドシートURL（UI上のリンク用）
export const CAST_LIST_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/10G4th4r5bHqi8iSVgOGWTqYP1NfkxmRESecfHm9ZueU/edit?gid=1636854384#gid=1636854384";

// --- 後方互換: 旧名を維持（段階的に移行） ---
export const MASTER_SHEET_URL = CAST_LIST_API_URL;
