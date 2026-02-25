// Google Sheets の「ウェブに公開」CSVのURL
// 空文字の場合はリモート取得をスキップ（localStorageのみ使用）
export const MASTER_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/10G4th4r5bHqi8iSVgOGWTqYP1NfkxmRESecfHm9ZueU/export?format=csv&gid=0";

// GAS WebアプリのURL（スプレッドシートへの書き込み用）
// 空文字の場合はリモート書き込みをスキップ（localStorageのみ使用）
export const MASTER_SHEET_WRITE_URL = "https://script.google.com/macros/s/AKfycbydLtRQCy89eE7c-BPA7qGcvNswsp0Iaey3C9zjXTB6x8tL3aur1TugaQM58i5mfZO2vQ/exec";
