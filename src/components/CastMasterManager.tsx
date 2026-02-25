import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Trash2, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ExternalLink } from 'lucide-react';
import { RankListEditor } from './RankListEditor';
import { CastListItem } from './CastListItem';
import { MASTER_SHEET_URL } from '../config';

// 型定義は src/types/schedule.ts に集約（後方互換のため再エクスポート）
export type { CastRank, CastMaster, RankLists } from '../types/schedule';
import type { CastMaster, RankLists } from '../types/schedule';

// getCastRank は src/utils/castRank.ts に移動（後方互換のため再エクスポート）
export { getCastRank } from '../utils/castRank';
import { getCastRank } from '../utils/castRank';

interface CastMasterManagerProps {
  castMasters: CastMaster[];
  onCastMastersChange: (masters: CastMaster[]) => void;
  rankLists: RankLists;
  onRankListsChange: (lists: RankLists) => void;
}

// CSVエクスポートURLからスプレッドシートの閲覧用URLを生成
const SHEET_VIEW_URL = MASTER_SHEET_URL
  ? MASTER_SHEET_URL.replace(/\/export\?.*$/, '')
  : '';

export function CastMasterManager({ castMasters, onCastMastersChange, rankLists, onRankListsChange }: CastMasterManagerProps) {
  const handleRemove = (index: number) => {
    const newMasters = castMasters.filter((_, i) => i !== index);
    onCastMastersChange(newMasters);
    toast.success('キャストを削除しました');
  };

  const handleExportCSV = () => {
    const csvContent = castMasters
      .map(m => `${m.name},${m.color || ''}`)
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cast_master.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSVをエクスポートしました');
  };

  const handleClearAll = () => {
    if (confirm('すべてのキャストマスターを削除しますか？')) {
      onCastMastersChange([]);
      toast.success('すべてのキャストを削除しました');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>キャストマスター管理</span>
          <div className="flex gap-2">
            {castMasters.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="size-4 mr-2" />
                  CSV書き出し
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  <Trash2 className="size-4 mr-2" />
                  全削除
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SHEET_VIEW_URL && (
          <a
            href={SHEET_VIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            参照スプレッドシートを開く
          </a>
        )}

        <RankListEditor
          rankLists={rankLists}
          onRankListsChange={onRankListsChange}
        />

        {/* 登録済みキャスト一覧 */}
        {castMasters.length > 0 && (
          <div className="border-t pt-4">
            <Label>登録済みキャスト（{castMasters.length}人）</Label>
            <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
              {castMasters.map((master, index) => {
                const rank = getCastRank(master.name, rankLists);
                return (
                  <CastListItem
                    key={index}
                    name={master.name}
                    imageUrl={master.imageUrl}
                    rank={rank}
                    color={master.color}
                    showColor
                    onRemove={() => handleRemove(index)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
