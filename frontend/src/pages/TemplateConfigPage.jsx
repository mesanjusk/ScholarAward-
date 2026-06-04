import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export const TEMPLATE_STORAGE_KEY = 'bk_template_config';

export const TEMPLATE_DEFAULTS = {
  cx: 0.50,
  cy: 0.41,
  r: 0.26,
  textY: 73.5,
  templateSrc: null, // null = use bundled default
};

function clamp(min, val, max) { return Math.min(max, Math.max(min, val)); }

export function loadTemplateConfig() {
  try {
    const s = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return s ? { ...TEMPLATE_DEFAULTS, ...JSON.parse(s) } : { ...TEMPLATE_DEFAULTS };
  } catch { return { ...TEMPLATE_DEFAULTS }; }
}

async function compressImage(file, maxWidth = 1400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function TemplateConfigPage() {
  const [config,   setConfig]   = useState(loadTemplateConfig);
  const [imgRatio, setImgRatio] = useState(0.80);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  const containerRef = useRef(null);
  const fileInputRef  = useRef(null);

  // ── CSS geometry ──────────────────────────────────────────────────────────
  // All vertical positions expressed as % of container WIDTH (via margin-top),
  // because margin percentages always reference parent width — even margin-top.
  // This avoids Safari's unreliable top:Y% resolution when parent height is auto.
  const ratio        = imgRatio;
  const boxLeft      = (config.cx - config.r) * 100;
  const boxMarginTop = (config.cy / ratio - config.r) * 100;
  const boxWidth     = config.r * 2 * 100;
  const textMarginTop = config.textY / ratio;

  // ── Circle drag ───────────────────────────────────────────────────────────
  const handleCircleDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origCX = config.cx, origCY = config.cy, snapRatio = ratio;
    const onMove = (ev) => {
      ev.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;
      setConfig(p => ({
        ...p,
        cx: clamp(p.r + 0.01, origCX + dx, 1 - p.r - 0.01),
        cy: clamp(p.r * snapRatio + 0.01, origCY + dy, 1 - p.r * snapRatio - 0.01),
      }));
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  // ── Text Y drag ───────────────────────────────────────────────────────────
  const handleTextDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startY = e.clientY, origY = config.textY;
    const onMove = (ev) => {
      ev.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dy = (ev.clientY - startY) / rect.height * 100;
      setConfig(p => ({ ...p, textY: clamp(5, origY + dy, 95) }));
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  // ── Template upload ───────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      // Rough size check: ~2MB max to stay under localStorage quota
      if (dataUrl.length > 2_200_000) {
        setError('Image too large after compression. Try a smaller file.');
        return;
      }
      setConfig(p => ({ ...p, templateSrc: dataUrl }));
    } catch {
      setError('Failed to load image.');
    }
    e.target.value = '';
  };

  // ── Save / Reset ──────────────────────────────────────────────────────────
  const handleSave = () => {
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(config));
      setSaved(true);
    } catch (err) {
      setError('Save failed — localStorage may be full. Try removing the custom template.');
    }
  };

  const handleReset = () => {
    localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    setConfig({ ...TEMPLATE_DEFAULTS });
    setSaved(false);
  };

  const templateSrc = config.templateSrc || '/badhte-kadam-2026.jpg';

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Photo Template Config</Typography>
          <Typography variant="caption" color="text.secondary">
            Drag the circle overlay to align it with the template ring · drag the T marker to set text box position
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<RestoreIcon />} color="warning" onClick={handleReset}>
            Reset defaults
          </Button>
          <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave}>
            Save
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">

        {/* ── Template preview with interactive overlays ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            ref={containerRef}
            sx={{ position: 'relative', width: '100%', borderRadius: 2, overflow: 'hidden', boxShadow: 4, userSelect: 'none' }}
          >
            <img
              src={templateSrc}
              alt="template"
              onLoad={(e) => {
                const { naturalWidth: nw, naturalHeight: nh } = e.target;
                if (nh > 0) setImgRatio(nw / nh);
              }}
              style={{ display: 'block', width: '100%', height: 'auto' }}
              draggable={false}
            />

            {/* Draggable circle positioning overlay */}
            <Box
              onPointerDown={handleCircleDown}
              sx={{
                position: 'absolute',
                left: `${boxLeft}%`, top: 0, marginTop: `${boxMarginTop}%`,
                width: `${boxWidth}%`, paddingBottom: `${boxWidth}%`, height: 0,
                touchAction: 'none', cursor: 'move',
              }}
            >
              <Box sx={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                border: '2.5px dashed #FFD700',
                bgcolor: 'rgba(255,215,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'rgba(255,215,0,0.22)' },
              }}>
                <Typography sx={{ color: '#FFD700', fontWeight: 700, fontSize: '0.6rem', textShadow: '0 1px 4px rgba(0,0,0,0.9)', userSelect: 'none', textAlign: 'center', px: 1 }}>
                  ⊕ drag to move
                </Typography>
              </Box>
            </Box>

            {/* Draggable text position marker */}
            <Box
              onPointerDown={handleTextDown}
              sx={{
                position: 'absolute',
                left: '50%', top: 0, marginTop: `${textMarginTop}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'ns-resize',
                touchAction: 'none',
                bgcolor: 'rgba(255,215,0,0.92)',
                borderRadius: 1, px: 1.5, py: 0.4,
                display: 'flex', alignItems: 'center', gap: 0.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#000', whiteSpace: 'nowrap', userSelect: 'none' }}>
                T  text position — drag up/down
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Controls panel ── */}
        <Paper variant="outlined" sx={{ p: 2.5, minWidth: 270, flex: '0 0 270px' }}>
          <Stack spacing={2.5}>

            {/* Template image */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Template Image</Typography>
              <Button variant="outlined" size="small" fullWidth startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}>
                Upload template
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              {config.templateSrc
                ? <Chip label="Custom template" color="success" size="small" sx={{ mt: 0.8 }}
                    onDelete={() => setConfig(p => ({ ...p, templateSrc: null }))} />
                : <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Using default template</Typography>
              }
            </Box>

            <Divider />

            {/* Circle controls */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Circle Position & Size</Typography>
              <Typography variant="caption" color="text.secondary">X (left ↔ right): {(config.cx * 100).toFixed(1)}%</Typography>
              <Slider size="small" value={config.cx} min={0.05} max={0.95} step={0.005}
                onChange={(_, v) => setConfig(p => ({ ...p, cx: v }))} sx={{ mb: 1 }} />

              <Typography variant="caption" color="text.secondary">Y (up ↕ down): {(config.cy * 100).toFixed(1)}%</Typography>
              <Slider size="small" value={config.cy} min={0.05} max={0.95} step={0.005}
                onChange={(_, v) => setConfig(p => ({ ...p, cy: v }))} sx={{ mb: 1 }} />

              <Typography variant="caption" color="text.secondary">Radius (size): {(config.r * 100).toFixed(1)}%</Typography>
              <Slider size="small" value={config.r} min={0.08} max={0.45} step={0.005}
                onChange={(_, v) => setConfig(p => ({ ...p, r: v }))} />
            </Box>

            <Divider />

            {/* Text Y */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Text Box Position</Typography>
              <Typography variant="caption" color="text.secondary">Y position: {config.textY.toFixed(1)}%</Typography>
              <Slider size="small" value={config.textY} min={5} max={95} step={0.5}
                onChange={(_, v) => setConfig(p => ({ ...p, textY: v }))} />
            </Box>

            <Divider />

            {/* Current values summary */}
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
              <Typography variant="caption" color="text.secondary" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', lineHeight: 1.8 }}>
                {`cx   = ${config.cx.toFixed(3)}\ncy   = ${config.cy.toFixed(3)}\nr    = ${config.r.toFixed(3)}\ntextY = ${config.textY.toFixed(1)}%`}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Settings are saved to this browser and apply to the public /photo-template page immediately.
            </Typography>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSaved(false)} sx={{ width: '100%' }}>
          Settings saved — public page updated.
        </Alert>
      </Snackbar>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
    </Container>
  );
}
