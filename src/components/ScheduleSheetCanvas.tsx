import { forwardRef, useEffect, useRef } from "react";
import type { ScheduleRenderInput } from "../types/renderTypes";
import { loadCanvasImages } from "../utils/canvasImageLoader";
import {
  SHEET_CANVAS_WIDTH,
  SHEET_MIN_HEIGHT,
  SHEET_TITLE_HEIGHT,
  SHEET_HEADER_HEIGHT,
  SHEET_ROW_HEIGHT,
  SHEET_BOTTOM_PADDING,
  buildSheetRows,
  renderScheduleSheet,
} from "../utils/scheduleSheetRenderer";

interface ScheduleSheetCanvasProps {
  input: ScheduleRenderInput;
  onRenderComplete?: () => void;
}

export const ScheduleSheetCanvas = forwardRef<
  HTMLCanvasElement,
  ScheduleSheetCanvasProps
>(({ input, onRenderComplete }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rows = buildSheetRows(input.timeSlots);
    const calculatedHeight =
      SHEET_TITLE_HEIGHT +
      SHEET_HEADER_HEIGHT +
      rows.length * SHEET_ROW_HEIGHT +
      SHEET_BOTTOM_PADDING;
    canvas.width = SHEET_CANVAS_WIDTH;
    canvas.height = Math.max(SHEET_MIN_HEIGHT, calculatedHeight);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageUrls = Array.from(
      new Set(rows.map((r) => r.imageUrl).filter((url) => url?.trim()))
    );

    loadCanvasImages(imageUrls).then(({ imageMap }) => {
      renderScheduleSheet(ctx, input, imageMap);
      onRenderComplete?.();
    });
  }, [input, canvasRef, onRenderComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
});

ScheduleSheetCanvas.displayName = "ScheduleSheetCanvas";
