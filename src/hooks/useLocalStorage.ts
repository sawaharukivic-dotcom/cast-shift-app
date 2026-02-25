/**
 * localStorage への安全な書き込みフック
 */

import { useRef, useCallback } from "react";
import { toast } from "sonner@2.0.3";
import { logger } from "../utils/logger";

export function useLocalStorage() {
  const storageErrorShownRef = useRef(false);

  const safeSetItem = useCallback((key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logger.error(`[localStorage] setItem failed (${key})`, error);
      if (!storageErrorShownRef.current) {
        storageErrorShownRef.current = true;
        toast.error("保存容量を超えたため、一部の保存ができませんでした。");
      }
      return false;
    }
  }, []);

  return { safeSetItem };
}
