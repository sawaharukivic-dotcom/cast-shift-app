import { formatDateForDisplay } from "../utils/dateFormatter";

export function ImportInfoDisplay({
  dateKey,
  hourSlots,
  sourceName,
}: {
  dateKey: string;
  hourSlots?: { [hour: number]: number };
  sourceName: string;
}) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const displayDate = formatDateForDisplay(dateObj);

  const hours = hourSlots
    ? Object.keys(hourSlots)
        .map(Number)
        .sort((a, b) => a - b)
    : [];
  const totalCount = hourSlots
    ? Object.values(hourSlots).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
      <div className="font-semibold text-blue-900 mb-2">読み込み成功</div>
      <div className="space-y-1 text-blue-800">
        <div>
          抽出日付: <span className="font-semibold">{displayDate}</span>
        </div>
        <div>
          ファイル名: <span className="font-semibold">{sourceName}</span>
        </div>
        {hourSlots && (
          <>
            <div className="mt-2">
              <div className="font-semibold mb-1">時間帯ごとの人数:</div>
              <div className="grid grid-cols-3 gap-1">
                {hours.map((hour) => (
                  <div key={hour} className="text-xs">
                    {hour}:00 →{" "}
                    <span className="font-semibold">{hourSlots[hour]}</span>人
                  </div>
                ))}
              </div>
              {hours.length === 0 && (
                <div className="text-red-600 font-semibold">
                  0件（データが見つかりませんでした）
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-blue-300">
              合計: <span className="font-semibold">{totalCount}</span>件のシフト
            </div>
          </>
        )}
      </div>
    </div>
  );
}
