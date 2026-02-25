import { Progress } from "./ui/progress";

interface LoadingScreenProps {
  masterFetchDone: boolean;
  loadedCount: number;
  totalCount: number;
}

export function LoadingScreen({
  masterFetchDone,
  loadedCount,
  totalCount,
}: LoadingScreenProps) {
  const percent =
    !masterFetchDone || totalCount === 0
      ? 0
      : Math.round((loadedCount / totalCount) * 100);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-72 space-y-4 text-center">
        <p className="text-sm text-gray-600">
          {!masterFetchDone
            ? "マスターデータを取得中..."
            : `画像を読み込み中... (${loadedCount}/${totalCount})`}
        </p>
        <Progress value={percent} />
      </div>
    </div>
  );
}
