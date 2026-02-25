/**
 * キャストマスター・ランクリスト状態管理フック
 */

import { useState, useEffect } from "react";
import type { CastMaster, RankLists } from "../types/schedule";
import { logger } from "../utils/logger";
import {
  STORAGE_KEY,
  RANK_LISTS_KEY,
  PLACEHOLDER_IMAGE,
  DEFAULT_COLOR,
} from "../constants";
import { MASTER_SHEET_URL } from "../config";
import { fetchMasterSheet } from "../utils/masterSheetLoader";
import { normalizeCastName } from "../utils/castNameNormalizer";

export function useCastMasterState(
  safeSetItem: (key: string, value: string) => boolean
) {
  const [rankLists, setRankLists] = useState<RankLists>(() => {
    const saved = localStorage.getItem(RANK_LISTS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* corrupted */ }
    }
    return { gold: [], silver: [], bronze: [] };
  });

  const [masterFetchDone, setMasterFetchDone] = useState(!MASTER_SHEET_URL);

  const [castMasters, setCastMasters] = useState<CastMaster[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    let parsed: CastMaster[];
    try { parsed = JSON.parse(saved) as CastMaster[]; } catch { return []; }
    return parsed.map((master) => {
      const { rank, ...masterWithoutRank } = master as CastMaster & { rank?: string };
      return {
        ...masterWithoutRank,
        imageUrl:
          master.imageUrl?.trim() &&
          master.imageUrl.trim().length > 0 &&
          master.imageUrl !== "undefined"
            ? master.imageUrl.trim()
            : PLACEHOLDER_IMAGE,
        color: master.color || DEFAULT_COLOR,
      };
    });
  });

  // castMasters → localStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(castMasters));
  }, [castMasters, safeSetItem]);

  // rankLists → localStorage
  useEffect(() => {
    safeSetItem(RANK_LISTS_KEY, JSON.stringify(rankLists));
  }, [rankLists, safeSetItem]);

  // 起動時マスターシート取得
  useEffect(() => {
    if (!MASTER_SHEET_URL) return;
    fetchMasterSheet(MASTER_SHEET_URL)
      .then(({ masters: remoteMasters, rankLists: newRankLists }) => {
        setCastMasters((prev) => {
          const existingImageMap = new Map<string, string>();
          prev.forEach((m) => {
            const n = normalizeCastName(m.name);
            if (n && m.imageUrl?.startsWith("data:image/")) {
              existingImageMap.set(n, m.imageUrl);
            }
          });
          return remoteMasters.map((rm) => {
            const n = normalizeCastName(rm.name);
            const existingDataUrl = n ? existingImageMap.get(n) : undefined;
            if (existingDataUrl && !rm.imageUrl?.startsWith("data:image/")) {
              return { ...rm, imageUrl: existingDataUrl };
            }
            return rm;
          });
        });
        setRankLists(newRankLists);
      })
      .catch((err) => {
        logger.warn("マスターデータの取得に失敗（キャッシュを使用）", err);
      })
      .finally(() => {
        setMasterFetchDone(true);
      });
  }, []);

  return { castMasters, setCastMasters, rankLists, setRankLists, masterFetchDone };
}
