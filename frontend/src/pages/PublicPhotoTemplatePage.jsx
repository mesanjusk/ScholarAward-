import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import OpenWithIcon from '@mui/icons-material/OpenWith';

import { loadTemplateConfig, TEMPLATE_DEFAULTS } from './TemplateConfigPage';
import { PHOTO_SCALE, loadImage, buildFinalCanvas, downloadPhoto } from '../utils/photoTemplate';

const DEF_CX     = TEMPLATE_DEFAULTS.cx;
const DEF_CY     = TEMPLATE_DEFAULTS.cy;
const DEF_R      = TEMPLATE_DEFAULTS.r;
const DEF_TEXT_Y = TEMPLATE_DEFAULTS.textY;
const DEFAULT_TEMPLATE_SRC = '/badhte-kadam-2026.jpg';

function clamp(min, val, max) { return Math.min(max, Math.max(min, val)); }

async function getCroppedBlob(imageSrc, cropPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  canvas.getContext('2d').drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  );
  return new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Crop dialog
// ─────────────────────────────────────────────────────────────────────────────
function CropDialog({ open, imageSrc, onClose, onDone }) {
  const [crop, setCrop]   = useState({ x: 0, y: 0 });
  const [zoom, setZoom]   = useState(1);
  const [croppedPx, setCroppedPx] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, px) => setCroppedPx(px), []);

  const handleDone = useCallback(async () => {
    if (!imageSrc || !croppedPx) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedPx);
      onDone(URL.createObjectURL(blob));
    } finally { setSaving(false); }
  }, [imageSrc, croppedPx, onDone]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,215,0,0.3)' } }}>
      <DialogTitle sx={{ color: '#FFD700' }}>Fit your photo</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box sx={{ position: 'relative', width: '100%', height: { xs: 300, sm: 400 }, bgcolor: '#111', borderRadius: 2, overflow: 'hidden' }}>
            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1}
              cropShape="round" showGrid={false}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ZoomInIcon fontSize="small" sx={{ color: '#FFD700' }} />
            <Slider value={zoom} min={1} max={3} step={0.05} onChange={(_, v) => setZoom(v)}
              sx={{ color: '#FFD700', '& .MuiSlider-thumb': { bgcolor: '#FFD700' } }} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ color: '#aaa' }}>Cancel</Button>
        <Button variant="contained" onClick={handleDone} disabled={saving}
          sx={{ bgcolor: '#FFD700', color: '#000', '&:hover': { bgcolor: '#FFC300' } }}>
          {saving ? <CircularProgress size={20} /> : 'Use photo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function PublicPhotoTemplatePage() {
  const [searchParams] = useSearchParams();
  const nameFromUrl  = searchParams.get('name')     || '';
  const photoFromUrl = searchParams.get('photoUrl') || '';

  const fileInputRef  = useRef(null);
  const containerRef  = useRef(null);

  // Read saved config from localStorage (set by TemplateConfigPage)
  const _cfg = loadTemplateConfig();

  const [imgRatio,     setImgRatio]     = useState(0.80);
  const [rawSrc,       setRawSrc]       = useState(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState(photoFromUrl || null);
  const [photoOffset,  setPhotoOffset]  = useState({ x: 0, y: 0 });
  const [templateSrc]                   = useState(_cfg.templateSrc || DEFAULT_TEMPLATE_SRC);
  const [defTextY]                      = useState(_cfg.textY ?? DEF_TEXT_Y);

  // Circle geometry from saved config (admin-only via /template-config)
  const [circle] = useState({ cx: _cfg.cx ?? DEF_CX, cy: _cfg.cy ?? DEF_CY, r: _cfg.r ?? DEF_R });

  const [cropOpen,    setCropOpen]    = useState(false);
  const [text,        setText]        = useState(nameFromUrl);
  const [showText,    setShowText]    = useState(Boolean(nameFromUrl));
  const [textSize,    setTextSize]    = useState('medium');
  const [textPos,     setTextPos]     = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleTemplateLoad = (e) => {
    const { naturalWidth: nw, naturalHeight: nh } = e.target;
    if (nh > 0) setImgRatio(nw / nh);
  };

  const openPicker = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setRawSrc(reader.result); setCropOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = (blobUrl) => {
    if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl);
    setPhotoBlobUrl(blobUrl);
    setPhotoOffset({ x: 0, y: 0 });
    setCropOpen(false); setRawSrc(null);
  };

  // ── CSS geometry ──────────────────────────────────────────────────────────
  // All vertical positions expressed as % of container WIDTH (via margin-top),
  // because margin percentages always reference parent width — even margin-top.
  // This avoids Safari's unreliable top:Y% resolution when parent height is auto.
  const ratio        = imgRatio;
  const boxLeft      = (circle.cx - circle.r) * 100;
  const boxMarginTop = (circle.cy / ratio - circle.r) * 100;
  const boxWidth     = circle.r * 2 * 100;
  const textX = textPos?.x ?? 50;
  const textY = textPos?.y ?? defTextY;
  const textMarginTop = textY / ratio;

  // ── Photo pan drag ────────────────────────────────────────────────────────
  const handlePhotoPointerDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origX = photoOffset.x, origY = photoOffset.y;
    const circleDiamPx = (containerRef.current?.offsetWidth ?? 0) * circle.r * 2;
    if (!circleDiamPx) return;
    const onMove = (ev) => {
      ev.preventDefault();
      const dx = (ev.clientX - startX) / circleDiamPx * 100;
      const dy = (ev.clientY - startY) / circleDiamPx * 100;
      setPhotoOffset({
        x: clamp(-18, origX + dx, 18),
        y: clamp(-18, origY + dy, 18),
      });
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  // ── Text drag ─────────────────────────────────────────────────────────────
  const handleTextPointerDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX, startY = e.clientY;
    const origX = textX, origY = textY;
    const w = rect.width, h = rect.height;
    const onMove = (ev) => {
      ev.preventDefault();
      const dx = (ev.clientX - startX) / w * 100;
      const dy = (ev.clientY - startY) / h * 100;
      setTextPos({
        x: clamp(8, origX + dx, 92),
        y: clamp(5, origY + dy, 95),
      });
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  // ── Download / Share ─────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await buildFinalCanvas(
        templateSrc, photoBlobUrl, photoOffset, circle,
        text, { x: textX, y: textY }, textSize,
      );
      await downloadPhoto(canvas, 'bk-awards-2026.jpg');
    } finally { setDownloading(false); }
  };

  const cssFontSize = {
    small:  { xs: '2.5vw', sm: '0.85rem' },
    medium: { xs: '3.8vw', sm: '1.1rem'  },
    large:  { xs: '5.5vw', sm: '1.6rem'  },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0d0d1a', pb: 4 }}>

      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)', borderBottom: '2px solid #B8860B', py: 2, mb: 2 }}>
        <Container maxWidth="sm">
          <Typography variant="h5" align="center"
            sx={{ color: '#FFD700', fontWeight: 800, letterSpacing: 3, textShadow: '0 2px 12px rgba(255,215,0,0.4)', fontFamily: 'serif' }}>
            BK AWARDS 2026
          </Typography>
          <Typography variant="caption" display="block" align="center" sx={{ color: '#B8860B', letterSpacing: 2, mt: 0.3 }}>
            Vision · Focus · Achievement
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm">

        {/* Template preview */}
        <Box
          ref={containerRef}
          sx={{
            position: 'relative', width: '100%', borderRadius: 3, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,215,0,0.2)',
            userSelect: 'none',
          }}
        >
          <img src={templateSrc} alt="BK Awards template" onLoad={handleTemplateLoad}
            style={{ display: 'block', width: '100%', height: 'auto' }} draggable={false} />

          {/* Circle overlay — all positioning uses margin-top (width-relative) not top (height-relative), so Safari renders identically to Chrome */}
          <Box
            sx={{
              position: 'absolute',
              left: `${boxLeft}%`, top: 0, marginTop: `${boxMarginTop}%`,
              width: `${boxWidth}%`, paddingBottom: `${boxWidth}%`, height: 0,
            }}
          >
            {/* Inner div: fills the padded square and clips to circle */}
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
              {photoBlobUrl ? (
                <>
                  <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '50%' }}>
                    <img src={photoBlobUrl} alt="your photo"
                      style={{
                        width: `${PHOTO_SCALE * 100}%`, height: `${PHOTO_SCALE * 100}%`,
                        objectFit: 'cover', position: 'absolute',
                        left: `${50 + photoOffset.x}%`, top: `${50 + photoOffset.y}%`,
                        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                      }} />
                  </Box>

                  {/* Photo pan drag layer */}
                  <Box
                    onPointerDown={handlePhotoPointerDown}
                    sx={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      cursor: 'grab',
                      touchAction: 'none',
                      '&:hover .pan-hint': { opacity: 1 },
                    }}
                  >
                    <Box className="pan-hint" sx={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.35)', opacity: 0, transition: 'opacity 0.2s', color: '#FFD700', gap: 0.3,
                    }}>
                      <OpenWithIcon sx={{ fontSize: '1.6rem' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 700 }}>Drag to reposition</Typography>
                    </Box>
                  </Box>

                  {/* Change photo button */}
                  <Box onClick={openPicker} sx={{
                    position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,215,0,0.6)',
                    borderRadius: 5, px: 0.8, py: 0.3, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 0.3,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }, zIndex: 2,
                  }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: '0.75rem', color: '#FFD700' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.5rem', color: '#FFD700', fontWeight: 600, whiteSpace: 'nowrap' }}>Change</Typography>
                  </Box>
                </>
              ) : (
                <Box onClick={openPicker} sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', gap: 0.5,
                  bgcolor: 'rgba(0,0,0,0.4)', border: '2px dashed rgba(255,215,0,0.5)',
                  transition: 'background 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}>
                  <AddPhotoAlternateIcon sx={{ fontSize: '2.2rem', color: '#FFD700', opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.55rem', color: '#FFD700', textAlign: 'center', px: 0.5, lineHeight: 1.3 }}>
                    Tap to add photo
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Draggable text */}
          {showText && text.trim() && (
            <Box
              onPointerDown={handleTextPointerDown}
              sx={{
                position: 'absolute', left: `${textX}%`, top: 0, marginTop: `${textMarginTop}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'grab', '&:active': { cursor: 'grabbing' },
                display: 'flex', alignItems: 'center', gap: 0.4,
                px: 1, py: 0.4, borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,215,0,0.5)',
                touchAction: 'none',
              }}
            >
              <Typography sx={{
                color: '#FFD700', fontWeight: 800, fontSize: cssFontSize[textSize],
                textShadow: '0 2px 10px rgba(0,0,0,0.95)', letterSpacing: 1, whiteSpace: 'nowrap', fontFamily: 'serif',
              }}>
                {text}
              </Typography>
            </Box>
          )}

        </Box>

        {/* Controls */}
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>

          {/* Text row */}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={() => setShowText(v => !v)}
              sx={{ color: showText ? '#FFD700' : '#666', border: '1px solid', borderColor: showText ? '#FFD700' : '#444', borderRadius: 1.5, p: 0.8, flexShrink: 0 }}>
              <TextFieldsIcon fontSize="small" />
            </IconButton>

            {showText && (
              <>
                <TextField size="small" placeholder="Your name / text…" value={text}
                  onChange={(e) => setText(e.target.value)} inputProps={{ maxLength: 60 }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255,215,0,0.4)' },
                      '&:hover fieldset': { borderColor: '#FFD700' },
                      '&.Mui-focused fieldset': { borderColor: '#FFD700' },
                    },
                    '& input::placeholder': { color: '#555' },
                  }} />
                <ButtonGroup size="small">
                  {[['small','S'],['medium','M'],['large','L']].map(([sz, lbl]) => (
                    <Button key={sz} onClick={() => setTextSize(sz)}
                      variant={textSize === sz ? 'contained' : 'outlined'}
                      sx={textSize === sz
                        ? { bgcolor: '#FFD700', color: '#000', fontWeight: 700, borderColor: '#FFD700', minWidth: 30, px: 0.5, '&:hover': { bgcolor: '#FFC300' } }
                        : { borderColor: '#444', color: '#666', minWidth: 30, px: 0.5, '&:hover': { borderColor: '#FFD700', color: '#FFD700' } }
                      }>{lbl}</Button>
                  ))}
                </ButtonGroup>
                <IconButton size="small" onClick={() => { setShowText(false); setText(''); }}
                  sx={{ color: '#555', border: '1px solid #333', borderRadius: 1.5, p: 0.8, flexShrink: 0 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>

          {/* Download */}
          <Button variant="contained" fullWidth size="large"
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            disabled={!photoBlobUrl || downloading}
            onClick={handleDownload}
            sx={{
              mt: 1.5,
              background: photoBlobUrl ? 'linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #B8860B 100%)' : undefined,
              color: '#000', fontWeight: 800, letterSpacing: 1, fontSize: '1rem',
              '&:hover': { background: 'linear-gradient(135deg, #FFD700 0%, #FFC300 50%, #FFD700 100%)' },
              '&:disabled': { bgcolor: '#222', color: '#444' },
            }}>
            {downloading ? 'Preparing…' : 'Download Photo'}
          </Button>
        </Box>

        {photoBlobUrl && (
          <Typography variant="caption" align="center" display="block" sx={{ mt: 1, color: '#444', letterSpacing: 0.5 }}>
            Drag inside circle to reposition photo · Drag text to move it
          </Typography>
        )}
      </Container>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <CropDialog open={cropOpen} imageSrc={rawSrc}
        onClose={() => { setCropOpen(false); setRawSrc(null); }}
        onDone={handleCropDone} />
    </Box>
  );
}
