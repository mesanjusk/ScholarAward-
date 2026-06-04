export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

export async function getCroppedImageFile(imageSrc, cropPixels, fileName = 'cropped-photo.png') {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to crop image'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  const previewUrl = URL.createObjectURL(blob);
  const file = new File([blob], fileName, { type: 'image/png' });

  return { blob, file, previewUrl };
}
