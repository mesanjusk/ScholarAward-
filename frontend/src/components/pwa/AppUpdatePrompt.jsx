import { Button, Snackbar, Alert } from '@mui/material';
import usePwaUpdatePrompt from '../../hooks/usePwaUpdatePrompt';

export default function AppUpdatePrompt() {
  const { needRefresh, offlineReady, applyUpdate, dismiss } = usePwaUpdatePrompt();

  return (
    <>
      <Snackbar open={offlineReady} autoHideDuration={4000} onClose={dismiss} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={dismiss} sx={{ width: '100%' }}>
          App is ready for offline planning.
        </Alert>
      </Snackbar>
      <Snackbar open={needRefresh} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity="info"
          sx={{ width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={applyUpdate}>
              Update
            </Button>
          }
        >
          New version available. Refresh to update now.
        </Alert>
      </Snackbar>
    </>
  );
}
