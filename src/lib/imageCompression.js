/**
 * Detect device type based on screen width.
 * - mobile: < 768px
 * - tablet: 768 - 1024px
 * - desktop: > 1024px
 */
export function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

/**
 * Compress an image file using Canvas API.
 * Returns a new File or Blob.
 *
 * @param {File} file - original image file
 * @param {number} maxWidth - max pixel width (longest side)
 * @param {number} quality - JPEG quality 0-1
 * @returns {Promise<Blob>} compressed image blob
 */
export function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    // Skip non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // If image is already smaller than target, skip compression
      if (img.width <= maxWidth && img.height <= maxWidth) {
        resolve(file);
        return;
      }

      // Calculate new dimensions (keep aspect ratio)
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
      } else {
        if (h > maxWidth) { w *= maxWidth / h; h = maxWidth; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback: canvas.toBlob failed, return original
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // On error, return original file
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Get compression params based on device type.
 */
export function getCompressionParams() {
  const device = getDeviceType();
  switch (device) {
    case 'mobile':
      return { maxWidth: 1080, quality: 0.7 };
    case 'tablet':
      return { maxWidth: 1440, quality: 0.8 };
    default:
      return null; // no compression for desktop
  }
}

/**
 * Auto-compress based on device type. Desktop returns original file.
 * @param {File} file
 * @returns {Promise<Blob|File>}
 */
export async function autoCompress(file) {
  const params = getCompressionParams();
  if (!params) return file; // desktop: no compression
  return compressImage(file, params.maxWidth, params.quality);
}
