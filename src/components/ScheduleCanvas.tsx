import { forwardRef, useEffect, useRef, useMemo } from "react";
import type { ScheduleRenderInput, AspectRatio } from "../types/renderTypes";
import { loadCanvasImages } from "../utils/canvasImageLoader";
import { getAllCachedImages } from "../utils/imagePreloadCache";
import { PLACEHOLDER_IMAGE } from "../constants";
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
      () => calculateCanvasHeight(input.timeSlots, aspectRatio),
      [input.timeSlots, aspectRatio]
    );

    useEffect(() => {
      const cancelledRef = { current: false };

      // 全キャストの imageUrl を収集（重複除去）+ 画像未登録キャストを検出
      const castUrlMap = new Map<string, string>();
      const noImageCasts: string[] = [];
      input.timeSlots.forEach((slot) => {
        slot.casts.forEach((cast) => {
          if (cast.imageUrl?.trim() && cast.imageUrl !== "undefined" && cast.imageUrl !== PLACEHOLDER_IMAGE) {
            castUrlMap.set(cast.imageUrl, cast.name);
          } else if (cast.name) {
            noImageCasts.push(cast.name);
          }
        });
      });
      const uniqueNoImage = Array.from(new Set(noImageCasts));

      // キャッシュに全画像あれば即描画（debounceもセマフォもスキップ）
      const cached = getAllCachedImages(castUrlMap.keys());
      if (cached) {
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          if (!canvas || cancelledRef.current) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          renderSchedule(ctx, input, cached, aspectRatio);
          onMissingImages?.(uniqueNoImage);
          onRenderComplete?.();
        });
        return () => { cancelledRef.current = true; };
      }

      // キャッシュミスがある場合は従来のフロー（debounce + loadCanvasImages）
      const timerId = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas || cancelledRef.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        loadCanvasImages(castUrlMap.keys(), castUrlMap, cancelledRef).then(
          ({ imageMap, failedNames }) => {
            if (cancelledRef.current) return;
            renderSchedule(ctx, input, imageMap, aspectRatio);
            onMissingImages?.(Array.from(new Set(failedNames)));
            onRenderComplete?.();
          }
        );
      }, 100);

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
