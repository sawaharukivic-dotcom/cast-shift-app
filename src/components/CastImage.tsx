/**
 * キャスト画像コンポーネント（フォールバック付き）
 *
 * プリロードキャッシュに解決済みURLがあればそれを使い、
 * なければ getImageSrc → handleImageError のフォールバックチェーンで表示する。
 */

import { PLACEHOLDER_IMAGE } from "../constants";
import { getImageSrc, handleImageError } from "../utils/imageHelper";
import { getResolvedUrl } from "../utils/imagePreloadCache";

interface CastImageProps {
  imageUrl: string;
  name: string;
  className?: string;
}

export function CastImage({ imageUrl, name, className = "size-8 rounded object-cover bg-gray-200" }: CastImageProps) {
  const raw = imageUrl?.trim() || PLACEHOLDER_IMAGE;
  const cached = getResolvedUrl(raw);
  const src = cached || getImageSrc(raw);
  return (
    <img
      src={src}
      alt={name}
      className={className}
      data-fallback-index="0"
      onError={(e) => handleImageError(e, raw)}
    />
  );
}
