import { useState, useRef, useMemo, lazy, Suspense } from "react";
import { ScheduleEditor } from "./components/ScheduleEditor";
const CastMasterManager = lazy(() =>
  import("./components/CastMasterManager").then((m) => ({ default: m.CastMasterManager }))
);
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { PreviewPanel } from "./components/PreviewPanel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import type { AspectRatio } from "./types/renderTypes";
import { buildScheduleRenderInput } from "./utils/scheduleAdapter";
import { normalizeDateString, normalizeDateKey } from "./utils/dateFormatter";
import { handleWeekBatchExport as doWeekBatchExport } from "./utils/exportService";

import { useLocalStorage } from "./hooks/useLocalStorage";
import { useCastMasterState } from "./hooks/useCastMasterState";
import { useScheduleState } from "./hooks/useScheduleState";
import { useLogoState } from "./hooks/useLogoState";
import { useXlsxImport } from "./hooks/useXlsxImport";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { LoadingScreen } from "./components/LoadingScreen";

// 後方互換のための再エクスポート
export type { Cast, TimeSlot } from "./types/schedule";

export default function App() {
  const { safeSetItem } = useLocalStorage();
  const { castMasters, setCastMasters, rankLists, setRankLists, masterFetchDone } =
    useCastMasterState(safeSetItem);
  const { imagesReady, loadedCount, totalCount } = useImagePreloader(castMasters, masterFetchDone);

  const schedule = useScheduleState(castMasters, rankLists, safeSetItem);
  const {
    weekDateKeys,
    selectedDateKey,
    setSelectedDateKey,
    displayDate,
    scheduleByDate,
    timeSlots,
    applyBulkText,
    handleSetCasts,
    handleRemoveCast,
    handleClearAllCasts,
  } = schedule;

  const logo = useLogoState(safeSetItem);
  const { logoDataUrl, logoImgRef, handleLogoFileChange, handleLogoClear } = logo;

  const { handleXlsxImport } = useXlsxImport({
    setSelectedDateKey,
    applyBulkText,
    castMasters,
    setCastMasters,
  });

  const [previewMode, setPreviewMode] = useState<"timeline" | "sheet">("timeline");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderInput = useMemo(
    () =>
      buildScheduleRenderInput(
        displayDate,
        timeSlots,
        rankLists,
        castMasters,
        logoImgRef.current
      ),
    [displayDate, timeSlots, rankLists, castMasters, logoDataUrl] // eslint-disable-line
  );

  const handleWeekBatchExport = () =>
    doWeekBatchExport({
      weekDateKeys,
      scheduleByDate,
      rankLists,
      castMasters,
      logoImgRef,
    });

  if (!masterFetchDone || !imagesReady) {
    return (
      <LoadingScreen
        masterFetchDone={masterFetchDone}
        loadedCount={loadedCount}
        totalCount={totalCount}
      />
    );
  }

  return (
    <AppErrorBoundary>
      <div className="size-full bg-gray-50 overflow-auto">
      <Toaster />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            スケジュール画像作成
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 左側: 編集エリア */}
          <div className="space-y-6">
            <Tabs defaultValue="schedule">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">
                  スケジュール編集
                </TabsTrigger>
                <TabsTrigger value="master">
                  キャストマスター
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="mt-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <ScheduleEditor
                    date={displayDate}
                    timeSlots={timeSlots}
                    castMasters={castMasters}
                    rankLists={rankLists}
                    onDateChange={(newDate) => {
                      const normalized = normalizeDateString(newDate);
                      const dateKey = normalizeDateKey(normalized);
                      setSelectedDateKey(dateKey);
                    }}
                    onSetCasts={handleSetCasts}
                    onRemoveCast={handleRemoveCast}
                    onXlsxImport={handleXlsxImport}
                  />
                  <div className="mt-6 border-t pt-4">
                    <label className="text-sm font-semibold">ロゴ画像</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="block text-sm"
                      />
                      {logoDataUrl && (
                        <button
                          type="button"
                          className="text-xs text-gray-500 underline"
                          onClick={handleLogoClear}
                        >
                          クリア
                        </button>
                      )}
                    </div>
                    {logoDataUrl && (
                      <img
                        src={logoDataUrl}
                        alt="logo preview"
                        className="mt-2 h-8 w-auto rounded border"
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="master" className="mt-6">
                <Suspense fallback={<div className="p-4 text-center text-gray-500">読み込み中...</div>}>
                  <CastMasterManager
                    castMasters={castMasters}
                    onCastMastersChange={setCastMasters}
                    rankLists={rankLists}
                    onRankListsChange={setRankLists}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右側: プレビュー */}
          <PreviewPanel
            renderInput={renderInput}
            displayDate={displayDate}
            weekDateKeys={weekDateKeys}
            selectedDateKey={selectedDateKey}
            onSelectedDateKeyChange={setSelectedDateKey}
            onClearAllCasts={handleClearAllCasts}
            onWeekBatchExport={handleWeekBatchExport}
            timelineCanvasRef={timelineCanvasRef}
            sheetCanvasRef={sheetCanvasRef}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
          />
        </div>
      </div>
      </div>
    </AppErrorBoundary>
  );
}
