/**
 * PNG / ZIP エクスポートサービス
 */

import JSZip from "jszip";
import { toast } from "sonner@2.0.3";
import type { TimeSlot, CastMaster, RankLists } from "../types/schedule";
import type { AspectRatio } from "../types/renderTypes";
import { PLACEHOLDER_IMAGE } from "../constants";
import { buildScheduleRenderInput } from "./scheduleAdapter";
import { formatDateForDisplay } from "./dateFormatter";
import { createDefaultSlots } from "./scheduleDefaults";
import { canvasToBlob, downloadBlob, triggerDownload } from "./downloadHelper";
import { uploadToDrive } from "./driveUploader";
import { loadCanvasImages } from "./canvasImageLoader";
import { logger } from "./logger";
import {
  getCanvasWidth,
  calculateCanvasHeight,
  renderSchedule,
} from "./scheduleRenderer";
import {
  SHEET_CANVAS_WIDTH,
  SHEET_MIN_HEIGHT,
  SHEET_TITLE_HEIGHT,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_HEIGHT,
  SHEET_BOTTOM_PADDING,
  buildSheetRows,
  renderScheduleSheet,
} from "./scheduleSheetRenderer";

interface ExportContext {
  displayDate: string;
  timeSlots: TimeSlot[];
  rankLists: RankLists;
  castMasters: CastMaster[];
  logoImgRef: React.RefObject<HTMLImageElement | null>;
  logoDataUrl: string;
  previewMode: "timeline" | "sheet";
  aspectRatio: AspectRatio;
  timelineCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  sheetCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * 単一PNG書き出し
 */
export async function handleExport(ctx: ExportContext) {
  const canvas =
    ctx.previewMode === "sheet"
      ? ctx.sheetCanvasRef.current
      : ctx.timelineCanvasRef.current;
  if (!canvas) return;

  await new Promise((resolve) => setTimeout(resolve, 500));

  const fileName = `schedule_${ctx.displayDate.replace(/[\/\(\)]/g, "_")}.png`;

  const blob = await canvasToBlob(canvas);

  if (blob) {
    downloadBlob(blob, fileName);
    toast.success("PNG画像を書き出しました");
    return;
  }

  try {
    const href = canvas.toDataURL("image/png");
    triggerDownload(href, fileName);
    toast.success("PNG画像を書き出しました");
    return;
  } catch {
    // fall through to safe export
  }

  const safeCanvas = document.createElement("canvas");
  const safeInput = buildScheduleRenderInput(
    ctx.displayDate,
    ctx.timeSlots,
    ctx.rankLists,
    ctx.castMasters,
    ctx.logoImgRef.current
  );
  if (ctx.previewMode === "sheet") {
    const rows = buildSheetRows(safeInput.timeSlots);
    const calculatedHeight =
      SHEET_TITLE_HEIGHT +
      SHEET_HEADER_HEIGHT +
      rows.length * SHEET_ROW_HEIGHT +
      SHEET_BOTTOM_PADDING;
    safeCanvas.width = SHEET_CANVAS_WIDTH;
    safeCanvas.height = Math.max(SHEET_MIN_HEIGHT, calculatedHeight);
  } else {
    safeCanvas.width = getCanvasWidth(ctx.aspectRatio);
    safeCanvas.height = calculateCanvasHeight(safeInput.timeSlots, ctx.aspectRatio);
  }
  const safeCtx = safeCanvas.getContext("2d");
  if (!safeCtx) {
    toast.error("PNG書き出しに失敗しました");
    return;
  }

  if (ctx.previewMode === "sheet") {
    renderScheduleSheet(safeCtx, safeInput, new Map());
  } else {
    renderSchedule(safeCtx, safeInput, new Map(), ctx.aspectRatio);
  }
  const safeBlob = await canvasToBlob(safeCanvas);

  if (safeBlob) {
    downloadBlob(safeBlob, fileName);
    toast.success("PNG画像を書き出しました");
    return;
  }

  try {
    const href = safeCanvas.toDataURL("image/png");
    triggerDownload(href, fileName);
    toast.success("PNG画像を書き出しました");
  } catch {
    toast.error("PNG書き出しに失敗しました");
  }
}

/**
 * PNG書き出し + Google Driveアップロード
 */
export async function handleExportAndUpload(ctx: ExportContext) {
  const canvas =
    ctx.previewMode === "sheet"
      ? ctx.sheetCanvasRef.current
      : ctx.timelineCanvasRef.current;
  if (!canvas) {
    toast.error("キャンバスが見つかりません");
    return;
  }

  toast.info("画像を生成中...");
  await new Promise((resolve) => setTimeout(resolve, 500));

  const fileName = `schedule_${ctx.displayDate.replace(/[\/\(\)]/g, "_")}.png`;

  // ステップ1: 表示中canvasからBlob化を試行（3秒タイムアウト）
  toast.info("[1/4] キャンバスからBlob化中...");
  let blob = await Promise.race([
    canvasToBlob(canvas).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 3000)),
  ]);

  // ステップ2: 失敗時はCORS専用画像でクリーンcanvasを再生成
  if (!blob) {
    toast.info("[2/4] CORS画像を読み込み中...");
    blob = await _buildSafeBlob(ctx);
  }

  if (!blob) {
    toast.error("画像の生成に失敗しました");
    return;
  }

  // ステップ3: ローカルDL
  toast.info("[3/4] ダウンロード中...");
  downloadBlob(blob, fileName);

  // ステップ4: Google Driveアップロード
  toast.info("[4/4] Google Driveにアップロード中...");
  try {
    const result = await uploadToDrive(blob, fileName);
    if (result.success) {
      toast.success("Google Driveにアップロードしました");
    } else {
      toast.error(`Driveアップロード失敗: ${result.error ?? "不明なエラー"}`);
    }
  } catch (err) {
    logger.error("[exportService] Drive upload failed:", err);
    toast.error("Driveアップロードに失敗しました");
  }
}

/** tainted canvas 時にクリーンな canvas から Blob を生成する */
async function _buildSafeBlob(ctx: ExportContext): Promise<Blob | null> {
  const safeInput = buildScheduleRenderInput(
    ctx.displayDate,
    ctx.timeSlots,
    ctx.rankLists,
    ctx.castMasters,
    ctx.logoImgRef.current
  );

  // CORS専用モードで画像を再読み込み（Canvas汚染を防止）
  const castUrlMap = new Map<string, string>();
  safeInput.timeSlots.forEach((slot) => {
    slot.casts.forEach((cast) => {
      if (cast.imageUrl?.trim() && cast.imageUrl !== PLACEHOLDER_IMAGE) {
        castUrlMap.set(cast.imageUrl, cast.name);
      }
    });
  });
  toast.info(`[2a] ${castUrlMap.size}枚の画像をCORS読み込み中...`);
  const { imageMap, failedNames } = await loadCanvasImages(
    castUrlMap.keys(), castUrlMap, undefined, true /* corsOnly */
  );
  toast.info(`[2b] 読み込み完了: 成功${imageMap.size}枚, 失敗${failedNames.length}枚`);

  const safeCanvas = document.createElement("canvas");
  if (ctx.previewMode === "sheet") {
    const rows = buildSheetRows(safeInput.timeSlots);
    const calculatedHeight =
      SHEET_TITLE_HEIGHT +
      SHEET_HEADER_HEIGHT +
      rows.length * SHEET_ROW_HEIGHT +
      SHEET_BOTTOM_PADDING;
    safeCanvas.width = SHEET_CANVAS_WIDTH;
    safeCanvas.height = Math.max(SHEET_MIN_HEIGHT, calculatedHeight);
  } else {
    safeCanvas.width = getCanvasWidth(ctx.aspectRatio);
    safeCanvas.height = calculateCanvasHeight(safeInput.timeSlots, ctx.aspectRatio, imageMap);
  }
  const safeCtx = safeCanvas.getContext("2d");
  if (!safeCtx) return null;

  if (ctx.previewMode === "sheet") {
    renderScheduleSheet(safeCtx, safeInput, imageMap);
  } else {
    renderSchedule(safeCtx, safeInput, imageMap, ctx.aspectRatio);
  }

  toast.info("[2c] safeCanvas Blob化中...");
  const result = await Promise.race([
    canvasToBlob(safeCanvas).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 5000)),
  ]);
  if (!result) {
    toast.error("[2c] safeCanvas Blob化失敗（タイムアウトまたはエラー）");
  }
  return result;
}

interface WeekBatchExportContext {
  weekDateKeys: string[];
  scheduleByDate: { [dateKey: string]: TimeSlot[] };
  rankLists: RankLists;
  castMasters: CastMaster[];
  logoImgRef: React.RefObject<HTMLImageElement | null>;
}

/**
 * 週一括PNG書き出し
 */
export async function handleWeekBatchExport(ctx: WeekBatchExportContext) {
  if (ctx.weekDateKeys.length === 0) {
    toast.error("書き出す日付がありません");
    return;
  }

  const zip = new JSZip();
  const aspectRatios: AspectRatio[] = ["16:9", "1:1"];
  const errors: string[] = [];
  let completed = 0;

  for (const dateKey of ctx.weekDateKeys) {
    try {
      toast.info(`${completed + 1}/${ctx.weekDateKeys.length} 生成中...`);

      const [year, month, day] = dateKey.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateStr = formatDateForDisplay(dateObj);

      const slots = ctx.scheduleByDate[dateKey] || createDefaultSlots();

      const weekInput = buildScheduleRenderInput(
        dateStr,
        slots,
        ctx.rankLists,
        ctx.castMasters,
        ctx.logoImgRef.current
      );

      // adapter 出力から画像 URL を収集（キー不一致を防ぐ）
      const castUrlMap = new Map<string, string>();
      weekInput.timeSlots.forEach((slot) => {
        slot.casts.forEach((cast) => {
          if (cast.imageUrl?.trim() && cast.imageUrl !== PLACEHOLDER_IMAGE) {
            castUrlMap.set(cast.imageUrl, cast.name);
          }
        });
      });

      const { imageMap } = await loadCanvasImages(castUrlMap.keys(), castUrlMap);

      for (const ar of aspectRatios) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const canvas = document.createElement("canvas");
        canvas.width = getCanvasWidth(ar);
        canvas.height = calculateCanvasHeight(weekInput.timeSlots, ar, imageMap);
        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) continue;

        renderSchedule(canvasCtx, weekInput, imageMap, ar);

        const blob = await canvasToBlob(canvas);
        if (blob) {
          zip.file(`${dateKey}_${ar.replace(":", "-")}.png`, blob);
        }
      }

      completed++;
    } catch (error) {
      logger.error(`Failed to export ${dateKey}:`, error);
      errors.push(dateKey);
    }
  }

  if (errors.length > 0) {
    toast.error(`失敗: ${errors.join(", ")}`);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `schedules_${ctx.weekDateKeys.length}days.zip`);

  toast.success(`${completed}日分のPNGをZIPで書き出しました`);
}
