/**
 * キャストマスター インポートUI（ZIP/CSV/手動追加）
 */

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Upload, Plus } from "lucide-react";
import { toast } from "sonner@2.0.3";
import type { CastMaster } from "../types/schedule";
import { DEFAULT_COLOR, PLACEHOLDER_IMAGE } from "../constants";
import { normalizeCastName, findCastMasterByNormalizedName } from "../utils/castNameNormalizer";
import { processZipImport } from "../utils/zipImportService";
import { processCsvImport } from "../utils/csvImportService";
import { logger } from "../utils/logger";

interface CastMasterImportProps {
  castMasters: CastMaster[];
  onCastMastersChange: (masters: CastMaster[]) => void;
}

export function CastMasterImport({ castMasters, onCastMastersChange }: CastMasterImportProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = processCsvImport(text, castMasters);
      onCastMastersChange(result.masters);

      const messages: string[] = [];
      if (result.added > 0) messages.push(`${result.added}件追加`);
      if (result.removedCount > 0) messages.push(`${result.removedCount}件削除（画像なし）`);
      if (result.skipped > 0) messages.push(`${result.skipped}件スキップ`);

      if (messages.length > 0) {
        toast.success(messages.join(" / "));
      } else {
        toast.info("変更がありませんでした");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await processZipImport(file, castMasters);

      if (result.updated === 0 && result.added === 0) {
        toast.error("ZIP内に有効な画像が見つかりませんでした");
        return;
      }

      onCastMastersChange(result.masters);

      const messages: string[] = [];
      if (result.updated > 0) messages.push(`更新${result.updated}件`);
      if (result.added > 0) messages.push(`追加${result.added}件`);
      if (result.removedCount > 0) messages.push(`削除${result.removedCount}件（画像なし/重複統合）`);
      if (result.skippedCount > 0) messages.push(`スキップ${result.skippedCount}件`);

      toast.success(messages.join(" / "));
    } catch (error) {
      logger.error("ZIP読み込みエラー:", error);
      toast.error("ZIPの読み込みに失敗しました");
    } finally {
      if (zipInputRef.current) {
        zipInputRef.current.value = "";
      }
    }
  };

  const handleAddManual = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const normalizedName = normalizeCastName(trimmedName);
    if (!normalizedName) {
      toast.error("有効なキャスト名を入力してください");
      return;
    }

    const existingIndex = findCastMasterByNormalizedName(castMasters, normalizedName);

    if (existingIndex !== -1) {
      const updatedMasters = [...castMasters];
      updatedMasters[existingIndex] = {
        ...updatedMasters[existingIndex],
        color: newColor.trim() || updatedMasters[existingIndex].color || DEFAULT_COLOR,
      };
      onCastMastersChange(updatedMasters);
      toast.success("キャスト情報を更新しました");
    } else {
      onCastMastersChange([
        ...castMasters,
        {
          name: normalizedName,
          imageUrl: PLACEHOLDER_IMAGE,
          color: newColor.trim() || DEFAULT_COLOR,
        },
      ]);
      toast.success("キャストを追加しました");
    }

    setNewName("");
    setNewColor("");
  };

  return (
    <>
      {/* 画像ZIP読み込み */}
      <div>
        <Label>画像ZIPの読み込み</Label>
        <div className="mt-2">
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => zipInputRef.current?.click()}
            className="w-full gap-2"
          >
            <Upload className="size-4" />
            ZIPファイルを選択
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            画像のファイル名がキャスト名になります（拡張子は不要）
          </p>
        </div>
      </div>

      {/* CSV一括アップロード */}
      <div className="border-t pt-4">
        <Label>CSV一括インポート</Label>
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2"
          >
            <Upload className="size-4" />
            CSVファイルを選択
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            形式: キャスト名,カラー（1行1人）
          </p>
        </div>
      </div>

      {/* 手動追加 */}
      <div className="border-t pt-4">
        <Label>手動追加</Label>
        <div className="mt-2 space-y-2">
          <Input
            placeholder="キャスト名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
          />
          <Input
            placeholder="カラー（例: #ff6aa2）"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
          />
          <Button
            onClick={handleAddManual}
            disabled={!newName.trim()}
            className="w-full gap-2"
          >
            <Plus className="size-4" />
            追加
          </Button>
        </div>
      </div>
    </>
  );
}
