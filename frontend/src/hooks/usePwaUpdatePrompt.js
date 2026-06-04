import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyServiceWorkerUpdate } from '../pwa/registerServiceWorker';

export default function usePwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const onUpdateAvailable = () => setNeedRefresh(true);
    const onOfflineReady = () => setOfflineReady(true);

    window.addEventListener('pwa:update-available', onUpdateAvailable);
    window.addEventListener('pwa:offline-ready', onOfflineReady);

    return () => {
      window.removeEventListener('pwa:update-available', onUpdateAvailable);
      window.removeEventListener('pwa:offline-ready', onOfflineReady);
    };
  }, []);

  const dismiss = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  return useMemo(
    () => ({
      needRefresh,
      offlineReady,
      dismiss,
      applyUpdate: () => applyServiceWorkerUpdate()
    }),
    [dismiss, needRefresh, offlineReady]
  );
}
