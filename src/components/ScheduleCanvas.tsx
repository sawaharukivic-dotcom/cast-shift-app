import { forwardRef, useEffect, useRef, useMemo } from "react";
import type { ScheduleRenderInput, AspectRatio } from "../types/renderTypes";
import { loadCanvasImages } from "../utils/canvasImageLoader";
import {
  getCanvasWidth,
  calculateCanvasHeight,
  renderSchedule,
} from "../utils/scheduleRenderer";

interface ScheduleCanvasProps {
  input: ScheduleRenderInput;
  aspectRatio?: AspectRatio;
  onMissingImages?: (names: string[]) => void;
  onRenderComplete?: () => void;
}

export const ScheduleCanvas = forwardRef<HTMLCanvasElement, ScheduleCanvasProps>(
  ({ input, aspectRatio = "16:9", onMissingImages, onRenderComplete }, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

    const canvasWidth = useMemo(() => getCanvasWidth(aspectRatio), [aspectRatio]);
    const canvasHeight = useMemo(
      () => calculateCanvasHeight(input.timeSlots, aspectRatio, new Map()),
      [input.timeSlots, aspectRatio]
    );

    useEffect(() => {
      const cancelledRef = { current: false };

      const timerId = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas || cancelledRef.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 全キャストの imageUrl を収集（重複除去）
        const castUrlMap = new Map<string, string>(); // url → name
        input.timeSlots.forEach((slot) => {
          slot.casts.forEach((cast) => {
            if (cast.imageUrl?.trim() && cast.imageUrl !== "undefined") {
              castUrlMap.set(cast.imageUrl, cast.name);
            }
          });
        });

        loadCanvasImages(castUrlMap.keys(), castUrlMap, cancelledRef).then(
          ({ imageMap, failedNames }) => {
            if (cancelledRef.current) return;
            renderSchedule(ctx, input, imageMap, aspectRatio);
            onMissingImages?.(Array.from(new Set(failedNames)));
            onRenderComplete?.();
          }
        );
      }, 100); // 100ms debounce

      return () => {
        cancelledRef.current = true;
        clearTimeout(timerId);
      };
    }, [input, aspectRatio, canvasRef, onMissingImages, onRenderComplete]);

    return (
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-auto"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    );
  }
);

ScheduleCanvas.displayName = "ScheduleCanvas";
