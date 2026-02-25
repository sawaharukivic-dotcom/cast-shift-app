/**
 * ロゴ画像状態管理フック
 */

import { useState, useRef, useEffect } from "react";
import { LOGO_KEY } from "../constants";

export function useLogoState(
  safeSetItem: (key: string, value: string) => boolean
) {
  const [logoDataUrl, setLogoDataUrl] = useState(() => {
    return localStorage.getItem(LOGO_KEY) || "";
  });

  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (logoDataUrl) {
      safeSetItem(LOGO_KEY, logoDataUrl);
    } else {
      localStorage.removeItem(LOGO_KEY);
    }
  }, [logoDataUrl, safeSetItem]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      logoImgRef.current = null;
      setLogoDataUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      logoImgRef.current = img;
      URL.revokeObjectURL(url);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result?.toString() || "";
        setLogoDataUrl(result);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      logoImgRef.current = null;
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleLogoClear = () => {
    logoImgRef.current = null;
    setLogoDataUrl("");
  };

  return {
    logoDataUrl,
    logoImgRef,
    handleLogoFileChange,
    handleLogoClear,
  };
}
