/**
 * キャストマスター画像プリロードフック
 *
 * 1. ブラウザから直接thumbnail URLで取得を試みる（高速）
 * 2. 失敗した画像はGAS経由でBase64取得（確実）
 * 3. メイン画面表示後、バックグラウンドで全画像のBase64をプリフェッチ
 */

import { useState, useEffect, useRef } from "react";
import type { CastMaster } from "../types/schedule";
import { PLACEHOLDER_IMAGE } from "../constants";
import { loadCanvasImages } from "../utils/canvasImageLoader";
import { fetchImagesViaGas } from "../utils/gasFetchImages";
import { setCachedImage } from "../utils/imagePreloadCache";
import { logger } from "../utils/logger";

const TIMEOUT_MS = 60_000;

export function useImagePreloader(
  castMasters: CastMaster[],
  masterFetchDone: boolean
) {
  const [imagesReady, setImagesReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [prefetchProgress, setPrefetchProgress] = useState<{ loaded: number; total: number } | null>(null);
  const started = useRef(false);
  const mountedRef = useRef(true);

  // アンマウント時にフラグを落とす
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!masterFetchDone || started.current) return;
    started.current = true;

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

    const timer = setTimeout(() => {
      if (mountedRef.current) setImagesReady(true);
    }, TIMEOUT_MS);

    /** Step 3: バックグラウンドで全画像のBase64をGAS経由でプリフェッチ */
    function startPrefetch() {
      if (!mountedRef.current) return;
      setPrefetchProgress({ loaded: 0, total: unique.length });
      fetchImagesViaGas(unique, (fetched, total) => {
        if (mountedRef.current) setPrefetchProgress({ loaded: fetched, total });
      })
        .then(() => {
          if (mountedRef.current) setPrefetchProgress(null);
        })
        .catch((err) => {
          logger.warn("[useImagePreloader] Base64 prefetch failed:", err);
          if (mountedRef.current) setPrefetchProgress(null);
        });
    }

    (async () => {
      // ── Step 1: ブラウザから直接取得 ──
      let loaded = 0;
      const promises = unique.map((url) =>
        loadCanvasImages([url]).then(({ imageMap }) => {
          loaded++;
          if (mountedRef.current) setLoadedCount(loaded);
          return { url, ok: imageMap.size > 0 };
        })
      );
      const results = await Promise.all(promises);

      const failedUrls = results.filter((r) => !r.ok).map((r) => r.url);

      if (failedUrls.length === 0) {
        if (mountedRef.current) {
          clearTimeout(timer);
          setImagesReady(true);
        }
        // 全部HTTPで取れてもBase64プリフェッチは走らせる
        startPrefetch();
        return;
      }

      // ── Step 2: 失敗分をGAS経由で取得 ──
      logger.warn(`[useImagePreloader] ${failedUrls.length}枚をGAS経由でリトライ`);
      try {
        const dataUrlMap = await fetchImagesViaGas(failedUrls, (fetched) => {
          if (mountedRef.current) setLoadedCount(unique.length - failedUrls.length + fetched);
        });

        if (!mountedRef.current) return;

        await Promise.all(
          failedUrls.map(async (originalUrl) => {
            const dataUrl = dataUrlMap.get(originalUrl);
            if (!dataUrl) return;
            try {
              const img = new Image();
              img.src = dataUrl;
              await img.decode();
              setCachedImage(originalUrl, img);
            } catch {
              // skip
            }
          })
        );
      } catch (err) {
        logger.warn("[useImagePreloader] GASフォールバック失敗:", err);
      }

      if (mountedRef.current) {
        clearTimeout(timer);
        setLoadedCount(unique.length);
        setImagesReady(true);
      }

      // Step 2で失敗分を取った場合も残り全部のプリフェッチを走らせる
      startPrefetch();
    })();

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterFetchDone]);

  return { imagesReady, loadedCount, totalCount, prefetchProgress };
}
