/**
 * GAS経由でGoogle Driveに画像をアップロードする
 */

import { IMAGE_UPLOAD_GAS_URL } from "../config";
import { logger } from "./logger";

export async function uploadToDrive(
  blob: Blob,
  fileName: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  if (!IMAGE_UPLOAD_GAS_URL) {
    return { success: false, error: "IMAGE_UPLOAD_GAS_URL が未設定です" };
  }

  const base64 = await blobToBase64(blob);

  const res = await fetch(IMAGE_UPLOAD_GAS_URL, {
    method: "POST",
    body: JSON.stringify({ fileName, imageBase64: base64 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("[driveUploader] HTTP error:", res.status, text);
    return { success: false, error: `HTTP ${res.status}` };
  }

  const json = await res.json();
  return json;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // "data:image/png;base64," プレフィックスを除去
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
