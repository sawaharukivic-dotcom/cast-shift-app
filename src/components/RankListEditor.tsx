/**
 * ランクリスト編集UIコンポーネント
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner@2.0.3";
import type { RankLists } from "../types/schedule";

interface RankListEditorProps {
  rankLists: RankLists;
  onRankListsChange: (lists: RankLists) => void;
}

export function RankListEditor({ rankLists, onRankListsChange }: RankListEditorProps) {
  const [goldInput, setGoldInput] = useState(rankLists.gold.join("\n"));
  const [silverInput, setSilverInput] = useState(rankLists.silver.join("\n"));
  const [bronzeInput, setBronzeInput] = useState(rankLists.bronze.join("\n"));

  const handleApplyRankLists = () => {
    const newRankLists: RankLists = {
      gold: goldInput.split("\n").map((s) => s.trim()).filter((s) => s),
      silver: silverInput.split("\n").map((s) => s.trim()).filter((s) => s),
      bronze: bronzeInput.split("\n").map((s) => s.trim()).filter((s) => s),
    };
    onRankListsChange(newRankLists);
    toast.success("ランクリストを更新しました");
  };

  return (
    <div className="border-t pt-4">
      <Label className="text-base font-bold">当月のランクリスト</Label>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        各ランクに該当するキャスト名を1行に1人ずつ入力してください
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-sm flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">ゴールド</span>
          </Label>
          <Textarea
            value={goldInput}
            onChange={(e) => setGoldInput(e.target.value)}
            placeholder="ゴールドキャストの名前を入力"
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div>
          <Label className="text-sm flex items-center gap-2">
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">シルバー</span>
          </Label>
          <Textarea
            value={silverInput}
            onChange={(e) => setSilverInput(e.target.value)}
            placeholder="シルバーキャストの名前を入力"
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div>
          <Label className="text-sm flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">ブロンズ</span>
          </Label>
          <Textarea
            value={bronzeInput}
            onChange={(e) => setBronzeInput(e.target.value)}
            placeholder="ブロンズキャストの名前を入力"
            className="mt-1 min-h-[80px]"
          />
        </div>

        <Button onClick={handleApplyRankLists} className="w-full">
          ランクリストを反映
        </Button>
      </div>
    </div>
  );
}
