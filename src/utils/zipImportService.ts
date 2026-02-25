/**
 * ZIP画像インポートサービス
 */

import JSZip from "jszip";
import type { CastMaster } from "../types/schedule";
import { DEFAULT_COLOR } from "../constants";
import { isValidImageUrl } from "./imageHelper";
import { normalizeCastName } from "./castNameNormalizer";

export interface ZipImportResult {
  masters: CastMaster[];
  updated: number;
  added: number;
  removedCount: number;
  skippedCount: number;
}

export async function processZipImport(
  file: File,
  currentMasters: CastMaster[]
): Promise<ZipImportResult> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const supported = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  const updates = new Map<string, string>();

  let skippedCount = 0;

  for (const entry of entries) {
    if (entry.name.includes("__MACOSX/") || entry.name.includes(".DS_Store")) {
      skippedCount++;
      continue;
    }

    const baseName = entry.name.split("/").pop() || "";

    if (baseName.startsWith(".")) {
      skippedCount++;
      continue;
    }

    const ext = baseName.split(".").pop()?.toLowerCase() || "";
    if (!supported.has(ext)) {
      skippedCount++;
      continue;
    }

    const rawName = baseName.replace(/\.[^.]+$/, "").trim();
    if (!rawName) {
      skippedCount++;
      continue;
    }

    const normalizedName = normalizeCastName(rawName);
    if (!normalizedName) {
      skippedCount++;
      continue;
    }

    try {
      const base64 = await entry.async("base64");
      if (!base64 || base64.length === 0) {
        skippedCount++;
        continue;
      }

      const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      const dataUrl = `data:${mime};base64,${base64}`;
      updates.set(normalizedName, dataUrl);
    } catch {
      skippedCount++;
      continue;
    }
  }

  if (updates.size === 0) {
    return { masters: currentMasters, updated: 0, added: 0, removedCount: 0, skippedCount };
  }

  const nextMasters = [...currentMasters];
  const normalizedNameToIndex = new Map<string, number>();
  nextMasters.forEach((master, index) => {
    const normalized = normalizeCastName(master.name);
    if (normalized) {
      normalizedNameToIndex.set(normalized, index);
    }
  });

  let updated = 0;
  let added = 0;

  updates.forEach((dataUrl, normalizedName) => {
    const existingIndex = normalizedNameToIndex.get(normalizedName);

    if (existingIndex !== undefined) {
      const existing = nextMasters[existingIndex];
      nextMasters[existingIndex] = {
        ...existing,
        name: normalizedName,
        imageUrl: dataUrl,
      };
      updated += 1;
    } else {
      nextMasters.push({
        name: normalizedName,
        imageUrl: dataUrl,
        color: DEFAULT_COLOR,
      });
      normalizedNameToIndex.set(normalizedName, nextMasters.length - 1);
      added += 1;
    }
  });

  // 正規化後の名前で重複チェック
  const normalizedGroups = new Map<string, number[]>();
  nextMasters.forEach((master, index) => {
    const normalized = normalizeCastName(master.name);
    if (normalized) {
      if (!normalizedGroups.has(normalized)) {
        normalizedGroups.set(normalized, []);
      }
      normalizedGroups.get(normalized)!.push(index);
    }
  });

  const indicesToRemove = new Set<number>();
  normalizedGroups.forEach((indices) => {
    if (indices.length <= 1) return;

    let imageIndex = -1;
    const noImageIndices: number[] = [];

    indices.forEach((idx) => {
      if (isValidImageUrl(nextMasters[idx].imageUrl)) {
        if (imageIndex === -1) {
          imageIndex = idx;
        } else {
          noImageIndices.push(idx);
        }
      } else {
        noImageIndices.push(idx);
      }
    });

    if (imageIndex !== -1) {
      const master = nextMasters[imageIndex];
      const normalized = normalizeCastName(master.name);
      nextMasters[imageIndex] = {
        ...master,
        name: normalized || master.name,
      };
      noImageIndices.forEach((idx) => indicesToRemove.add(idx));
    } else {
      for (let i = 1; i < indices.length; i++) {
        indicesToRemove.add(indices[i]);
      }
    }
  });

  const finalMasters = nextMasters.filter((master, index) => {
    if (indicesToRemove.has(index)) return false;
    return isValidImageUrl(master.imageUrl);
  });

  const removedCount = nextMasters.length - finalMasters.length;

  return { masters: finalMasters, updated, added, removedCount, skippedCount };
}
