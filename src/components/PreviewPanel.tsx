import { useState, useRef } from "react";
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
  onExport: () => void;
  onWeekBatchExport: () => void;
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
  onExport,
  onWeekBatchExport,
  timelineCanvasRef,
  sheetCanvasRef,
  previewMode,
  onPreviewModeChange,
  aspectRatio,
  onAspectRatioChange,
}: PreviewPanelProps) {
  const [missingImages, setMissingImages] = useState<string[]>([]);

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
      <div className="border rounded overflow-hidden">
        {previewMode === "sheet" ? (
          <ScheduleSheetCanvas ref={sheetCanvasRef} input={renderInput} />
        ) : (
          <ScheduleCanvas
            ref={timelineCanvasRef}
            input={renderInput}
            aspectRatio={aspectRatio}
            onMissingImages={setMissingImages}
          />
        )}
      </div>
    </div>
  );
}
