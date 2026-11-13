export type CropRect = { x: number; y: number; width: number; height: number };

/**
 * Görseli hedef orana kırpar; odak noktası (0-1) kadrajın ortasında kalmaya
 * çalışır, kenarlara taşarsa kadraj içeri itilir.
 */
export function computeCrop(
  width: number,
  height: number,
  focusX: number,
  focusY: number,
  aspect = 16 / 9,
): CropRect {
  const fx = Math.min(1, Math.max(0, focusX));
  const fy = Math.min(1, Math.max(0, focusY));

  let cropWidth = width;
  let cropHeight = Math.round(width / aspect);
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(height * aspect);
  }

  const x = Math.round(Math.min(width - cropWidth, Math.max(0, fx * width - cropWidth / 2)));
  const y = Math.round(Math.min(height - cropHeight, Math.max(0, fy * height - cropHeight / 2)));

  return { x, y, width: cropWidth, height: cropHeight };
}

/** Kültür ekranında dönen alanın oranı (1920×1080 ekranda 1388×808). */
export const SLIDE_ASPECT = 1388 / 808;

/** TV slayt alanı için yeterli çözünürlük alt sınırı. */
export const MIN_IMAGE_WIDTH = 1100;
export const OUTPUT_IMAGE_WIDTH = 1600;
