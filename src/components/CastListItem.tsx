/**
 * キャスト一覧行コンポーネント（画像+名前+ランク+アクション）
 */

import { Button } from "./ui/button";
import { X } from "lucide-react";
import type { CastRank } from "../types/schedule";
import { CastImage } from "./CastImage";
import { RankBadge } from "./RankBadge";
import { DEFAULT_COLOR } from "../constants";

interface CastListItemProps {
  name: string;
  imageUrl: string;
  rank: CastRank;
  color?: string;
  showColor?: boolean;
  onRemove: () => void;
}

export function CastListItem({ name, imageUrl, rank, color, showColor = false, onRemove }: CastListItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
      {showColor && (
        <span
          className="size-4 rounded border"
          style={{ backgroundColor: color || DEFAULT_COLOR }}
          aria-label="color"
        />
      )}
      <CastImage imageUrl={imageUrl} name={name} />
      <span className="flex-1 text-sm">{name}</span>
      <RankBadge rank={rank} />
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="size-6 p-0"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
