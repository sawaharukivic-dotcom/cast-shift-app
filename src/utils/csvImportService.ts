/**
 * CSV一括インポートサービス
 */

import type { CastMaster } from "../types/schedule";
import { DEFAULT_COLOR, PLACEHOLDER_IMAGE } from "../constants";
import { isValidImageUrl } from "./imageHelper";
import { normalizeCastName } from "./castNameNormalizer";

export interface CsvImportResult {
  masters: CastMaster[];
  added: number;
  removedCount: number;
  skipped: number;
}

export function processCsvImport(
  text: string,
  currentMasters: CastMaster[]
): CsvImportResult {
  const lines = text.split("\n").filter((line) => line.trim());

  const nextMasters = [...currentMasters];
  const normalizedNameToIndex = new Map<string, number>();
  nextMasters.forEach((master, index) => {
    const normalized = normalizeCastName(master.name);
    if (normalized) {
      normalizedNameToIndex.set(normalized, index);
    }
  });

  let added = 0;
  let skipped = 0;

  lines.forEach((line) => {
    const [name, color] = line.split(",").map((s) => s.trim());
    if (!name) {
      skipped++;
      return;
    }

    const normalized = normalizeCastName(name);
    if (!normalized) {
      skipped++;
      return;
    }

    const existingIndex = normalizedNameToIndex.get(normalized);
    if (existingIndex !== undefined) {
      if (color) {
        nextMasters[existingIndex] = {
          ...nextMasters[existingIndex],
          color: color || nextMasters[existingIndex].color || DEFAULT_COLOR,
        };
      }
    } else {
      nextMasters.push({
        name: normalized,
        imageUrl: PLACEHOLDER_IMAGE,
        color: color || DEFAULT_COLOR,
      });
      normalizedNameToIndex.set(normalized, nextMasters.length - 1);
      added++;
    }
  });

  const filteredMasters = nextMasters.filter(
    (master) => isValidImageUrl(master.imageUrl) || master.imageUrl === PLACEHOLDER_IMAGE
  );
  const removedCount = nextMasters.length - filteredMasters.length;

  return { masters: filteredMasters, added, removedCount, skipped };
}
