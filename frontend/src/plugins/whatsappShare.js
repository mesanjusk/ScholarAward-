// Unified WhatsApp share: uses native JID intent in APK, Web Share API in PWA, download+wa.me on desktop

export async function shareWhatsApp({ phone, message, blobUrl, name }) {
  const isNative = window?.Capacitor?.isNativePlatform?.();

  // ── Native APK (Capacitor): JID intent → specific contact + image + message ──
  if (isNative) {
    try {
      const { default: WhatsAppShare } = await import('./WhatsAppShare');
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      let imagePath = undefined;
      if (blobUrl) {
        const resp = await fetch(blobUrl);
        const blob = await resp.blob();
        const base64 = await blobToBase64(blob);
        const fileName = `invite_${name.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        imagePath = result.uri;
      }

      await WhatsAppShare.sendToContact({ phone, message, imagePath });
      return;
    } catch (e) {
      console.warn('Native WhatsApp share failed, falling back:', e);
    }
  }

  // ── PWA / Mobile browser: Web Share API → native share sheet ─────────────────
  if (blobUrl && navigator.canShare) {
    try {
      const resp = await fetch(blobUrl);
      const blob = await resp.blob();
      const file = new File([blob], `invite_${name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
        return;
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Web Share failed, falling back:', e);
      else return; // user cancelled
    }
  }

  // ── Desktop fallback: download image + open wa.me link ───────────────────────
  if (blobUrl) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `invite_${name.replace(/\s+/g, '_')}.png`;
    a.click();
  }
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
