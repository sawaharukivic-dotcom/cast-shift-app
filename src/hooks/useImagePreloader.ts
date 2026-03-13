/**
 * キャストマスター画像プリロードフック
 *
 * masterFetchDone 後に全キャスト画像を並列ロードし、
 * 完了状態と進捗を返す。
 */

import { useState, useEffect, useRef } from "react";
import type { CastMaster } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";
import { loadCanvasImages } from "../utils/canvasImageLoader";
import { fetchImagesViaGas } from "../utils/gasFetchImages";
import { logger } from "../utils/logger";

const TIMEOUT_MS = 30_000;

export function useImagePreloader(
  castMasters: CastMaster[],
  masterFetchDone: boolean
) {
  const [imagesReady, setImagesReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!masterFetchDone || started.current) return;
    started.current = true;

    // 実画像 URL のみ収集（placeholder / data: はスキップ）
    const urls = castMasters
      .map((m) => m.imageUrl)
      .filter(
        (url): url is string =>
          !!url &&
          url !== PLACEHOLDER_IMAGE &&
          !url.startsWith("data:image/")
      );

    const unique = [...new Set(urls)];
    setTotalCount(unique.length);

    if (unique.length === 0) {
      setImagesReady(true);
      return;
    }

    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setImagesReady(true);
      }
    }, TIMEOUT_MS);

    // 個別にプリロードして進捗を追跡
    let loaded = 0;
    const promises = unique.map((url) =>
      loadCanvasImages([url]).then(() => {
        loaded++;
        if (mounted) setLoadedCount(loaded);
      })
    );

    Promise.all(promises).finally(() => {
      if (mounted) {
        clearTimeout(timer);
        setImagesReady(true);
      }
      // バックグラウンドでGAS経由のBase64取得を先行実行（エクスポート高速化）
      fetchImagesViaGas(unique).catch((err) =>
        logger.warn("[useImagePreloader] Base64 prefetch failed:", err)
      );
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterFetchDone]);

  return { imagesReady, loadedCount, totalCount };
}
