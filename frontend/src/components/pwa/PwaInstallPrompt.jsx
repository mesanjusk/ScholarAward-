import { useState } from 'react';
import { Alert, Button, Collapse } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import usePwaInstallPrompt from '../../hooks/usePwaInstallPrompt';

export default function PwaInstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  const onInstall = async () => {
    const result = await promptInstall();
    if (result?.outcome === 'accepted') {
      setDismissed(true);
    }
  };

  return (
    <Collapse in={canInstall && !dismissed}>
      <Alert
        severity="info"
        sx={{ borderRadius: 2 }}
        action={
          <>
            <Button color="inherit" size="small" startIcon={<DownloadIcon />} onClick={onInstall}>
              Install
            </Button>
            <Button color="inherit" size="small" onClick={() => setDismissed(true)}>
              Later
            </Button>
          </>
        }
      >
        Install BK Scholar Awards 2026 for a faster mobile app experience.
      </Alert>
    </Collapse>
  );
}
