import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Slider,
  Stack,
  Typography
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import PanToolAltIcon from '@mui/icons-material/PanToolAlt';
import CropFreeIcon from '@mui/icons-material/CropFree';
import TuneIcon from '@mui/icons-material/Tune';
import defaultTemplate from '../../assets/certificates/bk-awards-2026.jpg';

const PLACEHOLDER = {
  top: 12.1,
  left: 62.7,
  size: 32.2
};

const initialTouchState = {
  mode: null,
  startX: 0,
  startY: 0,
  initialPhotoX: 0,
  initialPhotoY: 0,
  initialScale: 1,
  initialRotation: 0,
  initialDistance: 0,
  initialAngle: 0
};

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getAngle(t1, t2) {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
}

function clampScale(value) {
  return Math.max(0.6, Math.min(3, value));
}

function formatPercentage(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).includes('%') ? String(value) : `${value}%`;
}

export default function StudentCertificatePreviewSection({
  form,
  setForm,
  categories = []
}) {
  const editorRef = useRef(null);
  const touchStateRef = useRef(initialTouchState);
  const [isDragging, setIsDragging] = useState(false);

  const photoUrl =
    form?.certificatePhotoUrl ||
    form?.studentPhotoUrl ||
    form?.photoUrl ||
    '';

  const adjustments = {
    photoScale: form?.certificateAdjustments?.photoScale ?? 1,
    photoX: form?.certificateAdjustments?.photoX ?? 0,
    photoY: form?.certificateAdjustments?.photoY ?? 0,
    photoRotation: form?.certificateAdjustments?.photoRotation ?? 0
  };

  const categoryLabel = useMemo(() => {
    const selected = categories.find(
      (c) => String(c._id) === String(form?.categoryId)
    );

    return (
      form?.className ||
      form?.studentClass ||
      selected?.name ||
      form?.categoryName ||
      ''
    );
  }, [categories, form]);

  const displayName =
    form?.studentName ||
    form?.name ||
    form?.fullName ||
    'Student Name';

  const displayPercentage =
    formatPercentage(form?.percentage || form?.marksPercentage || form?.resultPercentage);

  const updateAdjustments = (patch) => {
    setForm((prev) => ({
      ...prev,
      certificateAdjustments: {
        photoScale: prev?.certificateAdjustments?.photoScale ?? 1,
        photoX: prev?.certificateAdjustments?.photoX ?? 0,
        photoY: prev?.certificateAdjustments?.photoY ?? 0,
        photoRotation: prev?.certificateAdjustments?.photoRotation ?? 0,
        ...patch
      },
      certificatePhotoUrl:
        prev?.certificatePhotoUrl || prev?.studentPhotoUrl || prev?.photoUrl || ''
    }));
  };

  const handlePointerDown = (event) => {
    if (!photoUrl) return;
    event.preventDefault();

    setIsDragging(true);
    touchStateRef.current = {
      ...initialTouchState,
      mode: 'mouse',
      startX: event.clientX,
      startY: event.clientY,
      initialPhotoX: adjustments.photoX,
      initialPhotoY: adjustments.photoY
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (event) => {
    const state = touchStateRef.current;
    if (state.mode !== 'mouse') return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    updateAdjustments({
      photoX: state.initialPhotoX + dx,
      photoY: state.initialPhotoY + dy
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    touchStateRef.current = initialTouchState;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleTouchStart = (event) => {
    if (!photoUrl) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchStateRef.current = {
        ...initialTouchState,
        mode: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        initialPhotoX: adjustments.photoX,
        initialPhotoY: adjustments.photoY
      };
    }

    if (event.touches.length === 2) {
      const [t1, t2] = event.touches;
      touchStateRef.current = {
        ...initialTouchState,
        mode: 'pinch',
        initialPhotoX: adjustments.photoX,
        initialPhotoY: adjustments.photoY,
        initialScale: adjustments.photoScale,
        initialRotation: adjustments.photoRotation,
        initialDistance: getDistance(t1, t2),
        initialAngle: getAngle(t1, t2)
      };
    }
  };

  const handleTouchMove = (event) => {
    if (!photoUrl) return;

    const state = touchStateRef.current;

    if (state.mode === 'pan' && event.touches.length === 1) {
      const touch = event.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      updateAdjustments({
        photoX: state.initialPhotoX + dx,
        photoY: state.initialPhotoY + dy
      });
    }

    if (state.mode === 'pinch' && event.touches.length === 2) {
      const [t1, t2] = event.touches;
      const distance = getDistance(t1, t2);
      const angle = getAngle(t1, t2);

      const scaleRatio = distance / (state.initialDistance || 1);
      const angleDelta = angle - state.initialAngle;

      updateAdjustments({
        photoScale: clampScale(state.initialScale * scaleRatio),
        photoRotation: state.initialRotation + angleDelta
      });
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = initialTouchState;
  };

  const resetAdjustments = () => {
    updateAdjustments({
      photoScale: 1,
      photoX: 0,
      photoY: 0,
      photoRotation: 0
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: { md: 'calc(100vh - 120px)' },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Alert
        severity="info"
        sx={{
          mb: 2,
          borderRadius: 3,
          alignItems: 'center',
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.75, sm: 1.5 }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <Typography fontWeight={700} fontSize={{ xs: 13, sm: 14 }}>
            Drag photo inside the circle. Use pinch on mobile and sliders for exact adjustment.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Desktop: 2-column view
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mobile: single-column
            </Typography>
          </Stack>
        </Stack>
      </Alert>

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(320px, 420px)' },
          gap: { xs: 2, md: 2.5 },
          alignItems: 'stretch'
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            bgcolor: '#fff',
            minHeight: { xs: 'auto', md: 'calc(100vh - 230px)' },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderBottom: '1px solid #eef2f7',
              bgcolor: '#f8fafc'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <CropFreeIcon fontSize="small" />
              <Typography fontWeight={800}>Certificate Preview</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Fit screen preview
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              p: { xs: 1, sm: 2, md: 2.5 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f8fafc'
            }}
          >
            <Box
              ref={editorRef}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: 1100 },
                maxHeight: { md: 'calc(100vh - 290px)' },
                position: 'relative',
                userSelect: 'none',
                touchAction: 'none',
                borderRadius: { xs: 2, md: 3 },
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
              }}
            >
              <Box
                component="img"
                src={defaultTemplate}
                alt="Certificate Template"
                draggable={false}
                sx={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: `${PLACEHOLDER.top}%`,
                  left: `${PLACEHOLDER.left}%`,
                  width: `${PLACEHOLDER.size}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, 0)',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 0 4px rgba(0, 116, 133, 0.28)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  background:
                    'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(228,237,239,0.95) 100%)'
                }}
                onPointerDown={handlePointerDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {photoUrl ? (
                  <Box
                    component="img"
                    src={photoUrl}
                    alt="Student"
                    draggable={false}
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: `${adjustments.photoScale * 100}%`,
                      height: `${adjustments.photoScale * 100}%`,
                      objectFit: 'cover',
                      transform: `translate(calc(-50% + ${adjustments.photoX}px), calc(-50% + ${adjustments.photoY}px)) rotate(${adjustments.photoRotation}deg)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'none'
                    }}
                  />
                ) : (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                    sx={{
                      width: '100%',
                      height: '100%',
                      color: '#64748b',
                      textAlign: 'center',
                      px: 1.5
                    }}
                  >
                    <Typography fontWeight={700} fontSize={{ xs: 12, sm: 14 }}>
                      Upload student photo
                    </Typography>
                    <Typography fontSize={{ xs: 11, sm: 12 }}>
                      Then drag, zoom, and rotate here
                    </Typography>
                  </Stack>
                )}
              </Box>

              <Typography
                sx={{
                  position: 'absolute',
                  top: '60.8%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '62%',
                  textAlign: 'center',
                  fontWeight: 800,
                  color: '#0f172a',
                  fontSize: {
                    xs: 'clamp(0.8rem, 2.6vw, 1.05rem)',
                    sm: 'clamp(1.05rem, 2.2vw, 1.55rem)',
                    md: 'clamp(1.3rem, 2vw, 1.9rem)'
                  },
                  lineHeight: 1.1
                }}
              >
                {displayName}
              </Typography>

              <Typography
                sx={{
                  position: 'absolute',
                  top: '71.2%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '52%',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#0f766e',
                  fontSize: {
                    xs: 'clamp(0.7rem, 2vw, 0.85rem)',
                    sm: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                    md: 'clamp(1rem, 1.5vw, 1.25rem)'
                  },
                  lineHeight: 1.1
                }}
              >
                {categoryLabel}
              </Typography>

              <Typography
                sx={{
                  position: 'absolute',
                  top: '75.8%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32%',
                  textAlign: 'center',
                  fontWeight: 800,
                  color: '#1d4ed8',
                  fontSize: {
                    xs: 'clamp(0.7rem, 2vw, 0.85rem)',
                    sm: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                    md: 'clamp(1rem, 1.5vw, 1.25rem)'
                  },
                  lineHeight: 1.1
                }}
              >
                {displayPercentage}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid #e5e7eb',
            p: { xs: 2, sm: 2.5 },
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content',
            position: { lg: 'sticky' },
            top: { lg: 88 }
          }}
        >
          <Stack spacing={2.25}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ color: '#0f172a' }}
            >
              <TuneIcon fontSize="small" />
              <Typography fontWeight={800}>Photo Controls</Typography>
            </Stack>

            <Divider />

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>
                  Zoom
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {adjustments.photoScale.toFixed(2)}x
                </Typography>
              </Stack>
              <Slider
                min={0.6}
                max={3}
                step={0.01}
                value={adjustments.photoScale}
                onChange={(_, value) => updateAdjustments({ photoScale: value })}
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>
                  Horizontal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(adjustments.photoX)} px
                </Typography>
              </Stack>
              <Slider
                min={-250}
                max={250}
                step={1}
                value={adjustments.photoX}
                onChange={(_, value) => updateAdjustments({ photoX: value })}
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>
                  Vertical
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(adjustments.photoY)} px
                </Typography>
              </Stack>
              <Slider
                min={-250}
                max={250}
                step={1}
                value={adjustments.photoY}
                onChange={(_, value) => updateAdjustments({ photoY: value })}
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="body2" fontWeight={700}>
                  Rotation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(adjustments.photoRotation)}°
                </Typography>
              </Stack>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={adjustments.photoRotation}
                onChange={(_, value) => updateAdjustments({ photoRotation: value })}
              />
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row', lg: 'column' }}
              spacing={1.25}
            >
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={resetAdjustments}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2.5,
                  minHeight: 46
                }}
              >
                Reset Photo
              </Button>
            </Stack>

            <Divider />

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #eef2f7'
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PanToolAltIcon fontSize="small" sx={{ color: '#475569' }} />
                  <Typography variant="body2" fontWeight={700}>
                    Usage Tips
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  On large screen preview stays left and tools stay right.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  On mobile everything automatically stacks into one screen flow.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}