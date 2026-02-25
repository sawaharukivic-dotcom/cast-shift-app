import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { TimeSlot, Cast, CastMaster, RankLists } from '../types/schedule';
import { parseDateString, formatDateForDisplay } from '../utils/dateFormatter';
import { TimeSlotEditor } from './TimeSlotEditor';

interface ScheduleEditorProps {
  date: string;
  timeSlots: TimeSlot[];
  castMasters: CastMaster[];
  rankLists: RankLists;
  dateKeys: string[];
  selectedDateKey: string | null;
  weekDateKeys: string[];
  onDateChange: (date: string) => void;
  onSetCasts: (timeIndex: number, casts: Cast[]) => void;
  onRemoveCast: (timeIndex: number, castId: string) => void;
  onClearAllCasts: () => void;
  onXlsxImport: (files: FileList | null, fileInputRef?: React.RefObject<HTMLInputElement>) => void;
  onWeekTextApply: (weekText: string) => Promise<void>;
  onWeekBatchExport: () => Promise<void>;
  onDateKeySelect: (dateKey: string) => void;
  onDeleteDate: (dateKey: string) => void;
  onDeleteAll: () => void;
  onBulkTextApply: (text: string) => void;
}

export function ScheduleEditor({
  date,
  timeSlots,
  castMasters,
  rankLists,
  dateKeys,
  selectedDateKey,
  weekDateKeys,
  onDateChange,
  onSetCasts,
  onRemoveCast,
  onClearAllCasts,
  onXlsxImport,
  onWeekTextApply,
  onWeekBatchExport,
  onDateKeySelect,
  onDeleteDate,
  onDeleteAll,
  onBulkTextApply,
}: ScheduleEditorProps) {
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [weekInput, setWeekInput] = useState('');
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDateInputValue = () => {
    const dateObj = parseDateString(date);
    if (dateObj) {
      return `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    }
    const match = date.match(/^(\d{1,2})\/(\d{1,2})/);
    if (match) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}/${match[1]}/${match[2]}`;
    }
    return '';
  };

  const [dateInputValue, setDateInputValue] = useState(getDateInputValue());

  useEffect(() => {
    const newValue = getDateInputValue();
    setDateInputValue(newValue);
  }, [date]);

  const displayDate = (() => {
    const dateObj = parseDateString(date);
    return dateObj ? formatDateForDisplay(dateObj) : date;
  })();

  const handleDateInputChange = (value: string) => {
    setDateInputValue(value);
    const dateObj = parseDateString(value);
    if (dateObj) {
      onDateChange(formatDateForDisplay(dateObj));
    }
  };

  const handleWeekApply = async () => {
    if (!weekInput.trim()) return;
    setIsWeekLoading(true);
    await onWeekTextApply(weekInput);
    setIsWeekLoading(false);
  };

  const handleBulkApply = () => {
    if (!bulkInput.trim()) return;

    const timePattern = /【(\d{1,2}):00】/;
    if (!timePattern.test(bulkInput)) {
      toast.error('【11:00】の形式で時間を入力してください');
      return;
    }

    onBulkTextApply(bulkInput);
    toast.success('反映しました');
  };

  return (
    <div className="space-y-6">
      {/* 日付入力 */}
      <div>
        <Label htmlFor="date">日付</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            id="date"
            type="text"
            value={dateInputValue}
            onChange={(e) => handleDateInputChange(e.target.value)}
            placeholder="YYYY/MM/DD または M/D"
            className="flex-1"
          />
          <div className="text-sm text-gray-600 min-w-[100px]">
            {displayDate}
          </div>
        </div>
        {dateKeys.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500">読込済み:</span>
              {dateKeys.map((dateKey) => {
                const [year, month, day] = dateKey.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const display = formatDateForDisplay(dateObj);
                const isActive = selectedDateKey === dateKey;
                return (
                  <div key={dateKey} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDateKeySelect(dateKey);
                        handleDateInputChange(`${year}/${month}/${day}`);
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {display}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDate(dateKey)}
                      className="text-xs text-red-600 hover:text-red-800"
                      title="この日付を削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onDeleteAll}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              全削除
            </button>
          </div>
        )}
      </div>

      {/* 週一括入力 */}
      <div>
        <h3 className="font-bold mb-2">週一括入力</h3>
        <Label className="text-xs text-gray-600">
          形式: ## YYYY/MM/DD で日付を区切り、その下に【11:00】... を記入
        </Label>
        <Textarea
          placeholder={`例:\n## 2026/02/09\n【11:00】 美琴 メラノソフィア\n【12:00】 真白ひなた\n\n## 2026/02/10\n【11:00】 東雲鈴弥`}
          value={weekInput}
          onChange={(e) => setWeekInput(e.target.value)}
          className="min-h-[200px] mt-2 font-mono text-xs"
        />
        <p className="text-xs text-gray-500 mt-2">
          日付の曜日は自動計算されます。
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleWeekApply}
            size="sm"
            className="flex-1"
            disabled={!weekInput.trim() || isWeekLoading}
          >
            {isWeekLoading ? '読み込み中...' : '週をパースして反映'}
          </Button>
          <Button
            onClick={() => setWeekInput('')}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            クリア
          </Button>
        </div>
        {weekDateKeys.length > 0 && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <span className="font-semibold text-green-800">反映済み: </span>
            <span className="text-green-700">{weekDateKeys.length}日分</span>
          </div>
        )}
      </div>

      {/* XLSX読込 */}
      <div>
        <h3 className="font-bold mb-2">XLSX読込</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          onChange={(e) => onXlsxImport(e.target.files, fileInputRef)}
          className="hidden"
          id="xlsx-input"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          variant="outline"
          className="w-full gap-2"
        >
          <Upload className="size-4" />
          XLSX読込
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          7日分まとめて選択できます
        </p>
      </div>

      {/* 1日分一括入力 */}
      <div>
        <h3 className="font-bold mb-2">1日分一括入力</h3>
        <Label className="text-xs text-gray-600">
          形式: 【11:00】 美琴 メラノソフィア 【12:00】 真白ひなた ...
        </Label>
        <Textarea
          placeholder="例: 【11:00】 美琴 メラノソフィア 【12:00】 真白ひなた 東雲鈴弥"
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          className="min-h-[120px] mt-2"
        />
        <p className="text-xs text-gray-500 mt-2">
          未入力の時間は変更しません。
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleBulkApply}
            size="sm"
            className="flex-1"
            disabled={!bulkInput.trim()}
          >
            一括反映
          </Button>
          <Button
            onClick={onClearAllCasts}
            size="sm"
            variant="destructive"
            className="flex-1"
          >
            全削除
          </Button>
        </div>
      </div>

      {/* 時間帯ごとのキャスト入力 */}
      <div>
        <h3 className="font-bold mb-4">時間帯ごとのキャスト</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {timeSlots.map((slot, index) => (
            <TimeSlotEditor
              key={slot.time}
              slot={slot}
              index={index}
              castMasters={castMasters}
              rankLists={rankLists}
              isExpanded={expandedSlot === index}
              onToggle={() => setExpandedSlot(expandedSlot === index ? null : index)}
              onSetCasts={(casts) => onSetCasts(index, casts)}
              onRemoveCast={(castId) => onRemoveCast(index, castId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
