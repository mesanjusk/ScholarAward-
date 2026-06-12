// Unified WhatsApp share utility
// APK: native JID intent (specific contact + image + message, just tap Send)
// PWA: Web Share API (native share sheet)
// Desktop: download image + open wa.me link

export async function shareWhatsApp({ phone, message, blobUrl, name }) {
  const isNative = window?.Capacitor?.isNativePlatform?.();

  // ── Native APK ────────────────────────────────────────────────────────────────
  if (isNative) {
    try {
      const { default: WhatsAppShare } = await import('./WhatsAppShare');

      let imageBase64 = undefined;
      if (blobUrl) {
        const resp = await fetch(blobUrl);
        const blob = await resp.blob();
        imageBase64 = await blobToBase64(blob); // raw base64, no prefix
      }

      await WhatsAppShare.sendToContact({ phone, message, imageBase64 });
      return;
    } catch (e) {
      console.warn('Native WhatsApp share failed:', e);
    }
  }

  // ── PWA / Mobile browser ──────────────────────────────────────────────────────
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
      if (e.name === 'AbortError') return;
    }
  }

  // ── Desktop fallback ──────────────────────────────────────────────────────────
  if (blobUrl) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `invite_${name.replace(/\s+/g, '_')}.png`;
    a.click();
  }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Open a URL via Android intent system (routes to WhatsApp, browser etc.)
export async function openExternalUrl(url) {
  const isNative = window?.Capacitor?.isNativePlatform?.();
  if (isNative) {
    try {
      const { default: WhatsAppShare } = await import('./WhatsAppShare');
      await WhatsAppShare.openUrl({ url });
      return;
    } catch (_) {}
  }
  window.open(url, '_blank');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(result.split(',')[1]); // strip data:image/png;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
