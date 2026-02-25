import { useState } from "react";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X } from "lucide-react";
import { toast } from "sonner@2.0.3";
import type { TimeSlot, Cast, CastMaster, RankLists } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";
import { getCastRank } from "../utils/castRank";
import { normalizeCastName, findCastMasterByNormalizedName } from "../utils/castNameNormalizer";
import { CastImage } from "./CastImage";

export interface TimeSlotEditorProps {
  slot: TimeSlot;
  index: number;
  castMasters: CastMaster[];
  rankLists: RankLists;
  isExpanded: boolean;
  onToggle: () => void;
  onSetCasts: (casts: Cast[]) => void;
  onRemoveCast: (castId: string) => void;
}

export function TimeSlotEditor({
  slot,
  castMasters,
  rankLists,
  isExpanded,
  onToggle,
  onSetCasts,
  onRemoveCast,
}: TimeSlotEditorProps) {
  const [nameInput, setNameInput] = useState("");

  const handleBulkAdd = () => {
    if (!nameInput.trim()) return;

    const names = nameInput
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n);

    const newCasts: Cast[] = [];
    const notFoundNames: string[] = [];

    names.forEach((name) => {
      const normalizedName = normalizeCastName(name);
      const masterIndex = normalizedName
        ? findCastMasterByNormalizedName(castMasters, normalizedName)
        : -1;
      const master = masterIndex !== -1 ? castMasters[masterIndex] : null;
      const rank = getCastRank(normalizedName || name, rankLists);
      if (master) {
        newCasts.push({
          id: `${Date.now()}_${Math.random()}`,
          name: master.name,
          imageUrl: master.imageUrl?.trim() || PLACEHOLDER_IMAGE,
          rank,
        });
      } else {
        notFoundNames.push(name);
      }
    });

    if (newCasts.length > 0) {
      onSetCasts([...slot.casts, ...newCasts]);
      toast.success(`${newCasts.length}人追加しました`);
    }

    if (notFoundNames.length > 0) {
      toast.error(`未登録: ${notFoundNames.join(", ")}`);
    }

    setNameInput("");
  };

  return (
    <Card>
      <CardHeader className="p-3 cursor-pointer" onClick={onToggle}>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="font-bold">{slot.time}</span>
          <span className="text-sm font-normal text-gray-500">
            {slot.casts.length > 0 ? `${slot.casts.length}人` : "未設定"}
          </span>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          {slot.casts.length > 0 && (
            <div className="space-y-2">
              {slot.casts.map((cast) => (
                <div
                  key={`${slot.time}-${cast.id}`}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                >
                  <CastImage imageUrl={cast.imageUrl} name={cast.name} />
                  <span className="flex-1 text-sm">{cast.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCast(cast.id)}
                    className="size-6 p-0"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetCasts([])}
                className="w-full"
              >
                全削除
              </Button>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-gray-600">
              キャスト名を入力（カンマ or 改行区切り）
            </Label>
            <Textarea
              placeholder="例: 太郎,花子,次郎&#10;または&#10;太郎&#10;花子&#10;次郎"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleBulkAdd}
              size="sm"
              className="w-full"
              disabled={!nameInput.trim()}
            >
              一括追加
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
