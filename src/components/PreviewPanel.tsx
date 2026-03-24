import { useState, useRef, useEffect, useCallback } from "react";
import { ScheduleCanvas } from "./ScheduleCanvas";
import { ScheduleSheetCanvas } from "./ScheduleSheetCanvas";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Download, Trash2 } from "lucide-react";
import type { ScheduleRenderInput, AspectRatio } from "../types/renderTypes";

interface PreviewPanelProps {
  renderInput: ScheduleRenderInput;
  displayDate: string;
  weekDateKeys: string[];
  selectedDateKey: string | null;
  onSelectedDateKeyChange: (key: string) => void;
  onClearAllCasts: () => void;
  onWeekBatchExport: () => void;
  onExportAndUpload: () => void;
  prefetchProgress: { loaded: number; total: number } | null;
  /** 外部からcanvasRefを受け取るためのコールバック */
  timelineCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  sheetCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** 親に現在のpreviewMode/aspectRatioを通知 */
  previewMode: "timeline" | "sheet";
  onPreviewModeChange: (mode: "timeline" | "sheet") => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

export function PreviewPanel({
  renderInput,
  displayDate,
  weekDateKeys,
  selectedDateKey,
  onSelectedDateKeyChange,
  onClearAllCasts,
  onWeekBatchExport,
  onExportAndUpload,
  prefetchProgress,
  timelineCanvasRef,
  sheetCanvasRef,
  previewMode,
  onPreviewModeChange,
  aspectRatio,
  onAspectRatioChange,
}: PreviewPanelProps) {
  const [missingImages, setMissingImages] = useState<string[]>([]);
  const [rendering, setRendering] = useState(true);

  // renderInput や表示モードが変わったら描画中に戻す
  useEffect(() => {
    setRendering(true);
  }, [renderInput, previewMode, aspectRatio]);

  const handleRenderComplete = useCallback(() => {
    setRendering(false);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-8 self-start">
      {/* 週スライドナビ */}
      {weekDateKeys.length > 0 && selectedDateKey && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const currentIndex = weekDateKeys.indexOf(selectedDateKey);
                if (currentIndex > 0) {
                  onSelectedDateKeyChange(weekDateKeys[currentIndex - 1]);
                }
              }}
              disabled={weekDateKeys.indexOf(selectedDateKey) === 0}
            >
              ◀ 前日
            </Button>
            <div className="text-sm font-semibold text-blue-900">
              {displayDate}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const currentIndex = weekDateKeys.indexOf(selectedDateKey);
                if (currentIndex < weekDateKeys.length - 1) {
                  onSelectedDateKeyChange(weekDateKeys[currentIndex + 1]);
                }
              }}
              disabled={weekDateKeys.indexOf(selectedDateKey) === weekDateKeys.length - 1}
            >
              翌日 ▶
            </Button>
          </div>
          <div className="mt-2 text-xs text-blue-700 text-center">
            {weekDateKeys.indexOf(selectedDateKey) + 1} / {weekDateKeys.length}
          </div>
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onWeekBatchExport}
              className="w-full gap-2"
            >
              <Download className="size-4" />
              週一括PNG出力（{weekDateKeys.length}日分）
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">プレビュー</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onClearAllCasts}
            size="sm"
            variant="destructive"
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            全削除
          </Button>
          <div className="flex gap-2">
            <Tabs
              value={previewMode}
              onValueChange={(value) =>
                onPreviewModeChange(value as "timeline" | "sheet")
              }
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="timeline">一覧</TabsTrigger>
                <TabsTrigger value="sheet">表形式</TabsTrigger>
              </TabsList>
            </Tabs>
            {previewMode === "timeline" && (
              <Tabs
                value={aspectRatio}
                onValueChange={(value) =>
                  onAspectRatioChange(value as AspectRatio)
                }
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="16:9">16:9</TabsTrigger>
                  <TabsTrigger value="1:1">1:1</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
      </div>
      {previewMode === "timeline" && missingImages.length > 0 && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">画像未登録:</span>{" "}
          {missingImages.join("、")}
        </div>
      )}
      <div className="border rounded overflow-hidden relative">
        {rendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="flex items-center gap-2 rounded-md bg-white px-4 py-2 shadow text-sm text-gray-600">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              描画中...
            </div>
          </div>
        )}
        {!rendering && prefetchProgress && (
          <div className="absolute top-2 right-2 z-10">
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-700">
              エクスポート準備中 {prefetchProgress.loaded}/{prefetchProgress.total}
            </div>
          </div>
        )}
        {previewMode === "sheet" ? (
          <ScheduleSheetCanvas
            ref={sheetCanvasRef}
            input={renderInput}
            onRenderComplete={handleRenderComplete}
          />
        ) : (
          <ScheduleCanvas
            ref={timelineCanvasRef}
            input={renderInput}
            aspectRatio={aspectRatio}
            onMissingImages={setMissingImages}
            onRenderComplete={handleRenderComplete}
          />
        )}
      </div>
      <div className="mt-3 flex justify-center">
        <Button
          onClick={onExportAndUpload}
          className="gap-2"
          disabled={rendering}
        >
          <Download className="size-4" />
          保存 & Drive送信
        </Button>
      </div>
    </div>
  );
}
