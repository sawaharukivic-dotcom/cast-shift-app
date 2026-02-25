/**
 * GAS Webアプリ経由でスプレッドシートにキャストを追加する
 */

import { MASTER_SHEET_WRITE_URL } from "../config";
import type { CastMaster } from "../types/schedule";
import { logger } from "./logger";

export function appendToMasterSheet(casts: CastMaster[]): void {
  if (!MASTER_SHEET_WRITE_URL || casts.length === 0) return;

  fetch(MASTER_SHEET_WRITE_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({ casts }),
  }).catch((err) => {
    logger.warn("[masterSheetWriter] スプレッドシートへの書き込みに失敗:", err);
  });
}
