import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';
import type { TimeSlot, Cast, CastMaster, RankLists } from '../types/schedule';
import { parseDateString, formatDateForDisplay } from '../utils/dateFormatter';
import { TimeSlotEditor } from './TimeSlotEditor';

interface ScheduleEditorProps {
  date: string;
  timeSlots: TimeSlot[];
  castMasters: CastMaster[];
  rankLists: RankLists;
  onDateChange: (date: string) => void;
  onSetCasts: (timeIndex: number, casts: Cast[]) => void;
  onRemoveCast: (timeIndex: number, castId: string) => void;
  onXlsxImport: (files: FileList | null, fileInputRef?: React.RefObject<HTMLInputElement>) => void;
}

export function ScheduleEditor({
  date,
  timeSlots,
  castMasters,
  rankLists,
  onDateChange,
  onSetCasts,
  onRemoveCast,
  onXlsxImport,
}: ScheduleEditorProps) {
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
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
