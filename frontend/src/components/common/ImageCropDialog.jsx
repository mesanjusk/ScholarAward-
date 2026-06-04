import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography
} from '@mui/material';
import ResponsiveDialog from '../ResponsiveDialog';
import { getCroppedImageFile } from '../../utils/imageCrop';

export default function ImageCropDialog({
  open,
  imageSrc,
  title = 'Crop photo',
  cropShape = 'round',
  aspect = 1,
  onClose,
  onDone
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleDone = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setSaving(true);
    try {
      const result = await getCroppedImageFile(imageSrc, croppedAreaPixels, 'student-photo.png');
      onDone?.(result);
    } finally {
      setSaving(false);
    }
  }, [croppedAreaPixels, imageSrc, onDone]);

  return (
    <ResponsiveDialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 300, sm: 380 },
              bgcolor: '#111827',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Zoom
            </Typography>
            <Slider value={zoom} min={1} max={3} step={0.1} onChange={(_, value) => setZoom(value)} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleDone} disabled={saving}>
          {saving ? 'Cropping...' : 'Use cropped photo'}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
