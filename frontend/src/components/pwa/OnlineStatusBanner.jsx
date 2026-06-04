import { Alert, Chip, Stack } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';

export default function OnlineStatusBanner({ isOnline, isLiveMode }) {
  if (isOnline && !isLiveMode) return null;

  if (!isOnline && isLiveMode) {
    return (
      <Alert severity="error" variant="filled" icon={<WifiOffIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
        Live mode is offline. Stage actions are limited until connection is restored.
      </Alert>
    );
  }

  if (!isOnline) {
    return (
      <Alert severity="warning" variant="filled" icon={<WifiOffIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
        Offline planning mode: cached pages are available. Use manual refresh when back online.
      </Alert>
    );
  }

  return (
    <Stack direction="row" justifyContent="flex-end">
      <Chip color="success" icon={<WifiIcon />} label="Live mode online" size="small" />
    </Stack>
  );
}
