/**
 * XLSXインポートフック
 */

import { toast } from "sonner@2.0.3";
import type { DayKey, CastMaster } from "../types/schedule";
import { logger } from "../utils/logger";
import { PLACEHOLDER_IMAGE, DEFAULT_COLOR } from "../constants";
import { normalizeCastName } from "../utils/castNameNormalizer";
import { parseXlsxToText } from "../utils/xlsxParser";
import { appendToMasterSheet } from "../utils/masterSheetWriter";

interface UseXlsxImportDeps {
  setSelectedDateKey: React.Dispatch<React.SetStateAction<DayKey | null>>;
  applyBulkText: (text: string, dateKey: DayKey, options?: { overwrite?: boolean }) => Set<string>;
  castMasters: CastMaster[];
  setCastMasters: React.Dispatch<React.SetStateAction<CastMaster[]>>;
}

export function useXlsxImport(deps: UseXlsxImportDeps) {
  const { setSelectedDateKey, applyBulkText, castMasters, setCastMasters } = deps;

  const handleXlsxImport = async (
    files: FileList | null,
    fileInputRef?: React.RefObject<HTMLInputElement>
  ) => {
    if (!files || files.length === 0) return;

    const results: Array<{ success: boolean; date: string; error?: string }> = [];
    let lastDateKey: DayKey | null = null;
    const allUnknownNames = new Set<string>();

    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const isCsv = file.name.endsWith(".csv");

      if (!isXlsx && !isCsv) {
        results.push({ success: false, date: file.name, error: "対応していないファイル形式です" });
        continue;
      }

      if (isCsv) {
        results.push({ success: false, date: file.name, error: "CSVは未対応です" });
        continue;
      }

      try {
        const parsed = await parseXlsxToText(file);

        const unknownNames = applyBulkText(parsed.text, parsed.dateKey, { overwrite: true });
        unknownNames.forEach((name) => allUnknownNames.add(name));

        lastDateKey = parsed.dateKey;
        results.push({ success: true, date: parsed.date });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "読み込みエラー";
        logger.error("[XLSX Import] エラー:", errorMessage);
        results.push({ success: false, date: file.name, error: errorMessage });
        toast.error(`${file.name}: ${errorMessage}`);
      }
    }

    // マスター未登録のキャスト名を自動追加
    if (allUnknownNames.size > 0) {
      const existingNormalized = new Set(
        castMasters.map((m) => normalizeCastName(m.name)).filter(Boolean)
      );
      const newMasters: CastMaster[] = [];
      allUnknownNames.forEach((name) => {
        const normalized = normalizeCastName(name) || name;
        if (!existingNormalized.has(normalized)) {
          newMasters.push({
            name: normalized,
            imageUrl: PLACEHOLDER_IMAGE,
            color: DEFAULT_COLOR,
          });
          existingNormalized.add(normalized);
        }
      });
      if (newMasters.length > 0) {
        setCastMasters((prev) => [...prev, ...newMasters]);
        appendToMasterSheet(newMasters);
        toast.info(`未登録キャスト ${newMasters.length}人をマスターに追加しました`);
      }
    }

    if (lastDateKey) {
      setSelectedDateKey(lastDateKey);
    }

    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    if (successCount > 0) {
      toast.success(`${successCount}件のファイルを読み込みました。プレビューを更新しました。`);
    }
    if (failCount > 0 && successCount === 0) {
      toast.error(`${failCount}件のファイルの読み込みに失敗しました`);
    }
  };

  return { handleXlsxImport };
}
