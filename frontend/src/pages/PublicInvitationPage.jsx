import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Alert, Box, Button, Card, CardContent, Checkbox,
  Chip, CircularProgress, Container, FormControlLabel,
  Grid, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import DownloadIcon      from '@mui/icons-material/Download';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon  from '@mui/icons-material/NavigateNext';
import SendIcon          from '@mui/icons-material/Send';
import UploadFileIcon    from '@mui/icons-material/UploadFile';
import WhatsAppIcon      from '@mui/icons-material/WhatsApp';

// ── Constants ──────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { value: 'serif',           label: 'Serif'           },
  { value: 'sans-serif',      label: 'Sans-serif'      },
  { value: 'cursive',         label: 'Cursive'         },
  { value: 'monospace',       label: 'Monospace'       },
  { value: 'Arial',           label: 'Arial'           },
  { value: 'Georgia',         label: 'Georgia'         },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana',         label: 'Verdana'         },
  { value: 'Impact',          label: 'Impact'          },
];

const defaultForm = {
  recipientMode: 'single',
  singleName: '',
  singleNumber: '',
  imageUrl: '',
  eventName: '',
  date: '',
  time: '',
  venue: '',
  customMessage: '',
};

const defaultFontStyle = {
  x: 0.5,
  y: 0.88,
  fontFamily: 'serif',
  fontSize: 48,
  color: '#ffffff',
  fontWeight: 'bold',
  textAlign: 'center',
  shadow: true,
};

const normalizePhone = (v) => String(v || '').replace(/[^\d]/g, '').trim();

function parseRowsToRecipients(rows = []) {
  return rows.map(row => ({
    name: String(
      row.name || row.fullName || row.studentName || row.guestName || row.Name || ''
    ).trim() || 'Guest',
    mobile: normalizePhone(
      row.mobile || row.phone || row.number || row.whatsapp ||
      row.Mobile || row.Phone || row.Number || row.WhatsApp || ''
    ),
  })).filter(item => item.mobile);
}

// ── Canvas helper ─────────────────────────────────────────────────────────────

function drawNameOnCanvas(canvas, imageEl, name, fontStyle) {
  if (!canvas || !imageEl) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(imageEl, 0, 0, W, H);

  if (!name) return;

  const {
    x          = 0.5,
    y          = 0.88,
    fontFamily = 'serif',
    fontSize   = 48,
    color      = '#ffffff',
    fontWeight = 'bold',
    textAlign  = 'center',
    shadow     = true,
  } = fontStyle;

  const scaledSize = Math.round(fontSize * (W / 600));

  ctx.font         = `${fontWeight} ${scaledSize}px ${fontFamily}`;
  ctx.fillStyle    = color;
  ctx.textAlign    = textAlign;
  ctx.textBaseline = 'middle';

  if (shadow) {
    ctx.shadowColor   = 'rgba(0,0,0,0.75)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur    = 6;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  ctx.fillText(name, x * W, y * H);
}

function buildMessage(form, name) {
  if (form.customMessage) {
    return form.customMessage.replace(/\{name\}/gi, name);
  }
  const parts = [`Hi ${name}! 🎉`];
  if (form.eventName) parts.push(`You're invited to *${form.eventName}*`);
  if (form.date)      parts.push(`📅 ${new Date(form.date).toLocaleDateString()}`);
  if (form.time)      parts.push(`⏰ ${form.time}`);
  if (form.venue)     parts.push(`📍 ${form.venue}`);
  parts.push('\n_(Please attach the personalized image below)_');
  return parts.join('\n');
}

function generatePersonalisedBlob(imageEl, name, fontStyle) {
  return new Promise((resolve) => {
    if (!imageEl) { resolve(null); return; }
    const off = document.createElement('canvas');
    off.width  = 1200;
    off.height = Math.round(1200 * (imageEl.naturalHeight / imageEl.naturalWidth)) || 800;
    drawNameOnCanvas(off, imageEl, name, fontStyle);
    off.toBlob(blob => resolve(blob), 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function openWALink(phone, message) {
  const clean = normalizePhone(phone);
  if (!clean) return;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PublicInvitationPage() {
  const [form, setForm]             = useState(defaultForm);
  const [fontStyle, setFontStyle]   = useState(defaultFontStyle);
  const [recipients, setRecipients] = useState([]);
  const [fileName, setFileName]     = useState('');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef     = useRef(null);
  const imageElRef    = useRef(null);
  const isDraggingRef = useRef(false);

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = form.imageUrl;
    if (!url) { setImageLoaded(false); imageElRef.current = null; return; }
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { imageElRef.current = img; setImageLoaded(true); };
    img.onerror = () => { imageElRef.current = null; setImageLoaded(false); };
    img.src = url;
  }, [form.imageUrl]);

  // ── Redraw canvas ───────────────────────────────────────────────────────────
  const checkedRecipients = recipients.filter(r => r.checked !== false);

  const redraw = useCallback(() => {
    if (!imageLoaded || !canvasRef.current || !imageElRef.current) return;
    const name = form.recipientMode === 'single'
      ? form.singleName || 'Guest'
      : checkedRecipients[previewIdx]?.name || '';
    drawNameOnCanvas(canvasRef.current, imageElRef.current, name, fontStyle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLoaded, previewIdx, fontStyle, form.singleName, form.recipientMode, recipients]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const getCanvasFraction = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect    = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top)  / rect.height)),
    };
  };

  const onDragStart = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const pos = getCanvasFraction(e);
    if (pos) setFontStyle(p => ({ ...p, x: pos.x, y: pos.y }));
  };
  const onDragMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const pos = getCanvasFraction(e);
    if (pos) setFontStyle(p => ({ ...p, x: pos.x, y: pos.y }));
  };
  const onDragEnd = () => { isDraggingRef.current = false; };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer   = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows     = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    setRecipients(parseRowsToRecipients(rows).map(r => ({ ...r, checked: true, status: 'pending' })));
    setPreviewIdx(0);
  };

  // ── Download preview ────────────────────────────────────────────────────────
  const handleDownloadPreview = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `invite_preview.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // ── Single: generate + download + open WA ──────────────────────────────────
  const [singleWorking, setSingleWorking] = useState(false);

  const handleSingleSend = async () => {
    if (!imageElRef.current && !form.imageUrl) return;
    setSingleWorking(true);
    try {
      const name    = form.singleName || 'Guest';
      const phone   = form.singleNumber;
      const message = buildMessage(form, name);

      if (imageElRef.current) {
        const blob = await generatePersonalisedBlob(imageElRef.current, name, fontStyle);
        if (blob) downloadBlob(blob, `invite_${name}.png`);
      }
      openWALink(phone, message);
    } finally {
      setSingleWorking(false);
    }
  };

  // ── Bulk: per-row download + open WA ───────────────────────────────────────
  const [bulkWorking, setBulkWorking] = useState({});

  const handleBulkRow = async (idx) => {
    const r = checkedRecipients[idx];
    if (!r) return;
    setBulkWorking(p => ({ ...p, [idx]: true }));
    try {
      const message = buildMessage(form, r.name);
      if (imageElRef.current) {
        const blob = await generatePersonalisedBlob(imageElRef.current, r.name, fontStyle);
        if (blob) downloadBlob(blob, `invite_${r.name}.png`);
      }
      openWALink(r.mobile, message);
      setRecipients(prev => prev.map((x, i) => {
        const globalIdx = prev.filter((_x, pi) => pi <= i && prev[pi].checked !== false).length - 1;
        return globalIdx === idx ? { ...x, status: 'opened' } : x;
      }));
      // update status by matching name+mobile
      setRecipients(prev => prev.map(x =>
        x.name === r.name && x.mobile === r.mobile ? { ...x, status: 'opened' } : x
      ));
    } finally {
      setBulkWorking(p => ({ ...p, [idx]: false }));
    }
  };

  const isSingleMode = form.recipientMode === 'single';
  const canSendSingle = isSingleMode && form.singleNumber;
  const canSendBulk   = !isSingleMode && checkedRecipients.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header bar */}
      <Box sx={{ bgcolor: '#25D366', color: '#fff', py: 2, px: 3, boxShadow: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <WhatsAppIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={900} lineHeight={1.1}>
              Invitation Sender
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Personalize &amp; send invitations via WhatsApp — no login required
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>

          {/* How it works */}
          <Alert severity="info" icon={<WhatsAppIcon />}>
            <strong>How it works:</strong> Fill in event details, upload your invitation image,
            position the guest's name on it, then click <strong>"Download &amp; Open WhatsApp"</strong> for each recipient.
            The personalized image auto-downloads — attach it in WhatsApp and hit Send.
          </Alert>

          {/* Event details */}
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>Event Details</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Event Name" value={form.eventName}
                    onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }}
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth type="time" label="Time" InputLabelProps={{ shrink: true }}
                    value={form.time}
                    onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Venue" value={form.venue}
                    onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth multiline minRows={2}
                    label="Custom message (optional)"
                    helperText="Use {name} as a placeholder for the recipient's name. Leave blank to use the default."
                    value={form.customMessage}
                    onChange={e => setForm(p => ({ ...p, customMessage: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Image + canvas */}
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>Invitation Image &amp; Preview</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Image URL"
                    value={form.imageUrl}
                    onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                    helperText="Paste a public image URL (must allow CORS)." />
                </Grid>

                {form.imageUrl && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      ✋ Drag or tap on the image to reposition the name text
                    </Typography>
                    <Box
                      sx={{
                        border: '2px solid', borderColor: 'divider', borderRadius: 2,
                        overflow: 'hidden', bgcolor: '#111',
                        display: 'inline-block', maxWidth: '100%',
                        cursor: 'crosshair', userSelect: 'none', touchAction: 'none',
                      }}
                      onMouseDown={onDragStart} onMouseMove={onDragMove}
                      onMouseUp={onDragEnd}     onMouseLeave={onDragEnd}
                      onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
                    >
                      <canvas
                        ref={canvasRef}
                        width={600} height={400}
                        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Position: {Math.round(fontStyle.x * 100)}% left · {Math.round(fontStyle.y * 100)}% top
                    </Typography>

                    {/* Preview nav for bulk */}
                    {!isSingleMode && checkedRecipients.length > 0 && (
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <Button size="small" variant="outlined" startIcon={<NavigateBeforeIcon />}
                          disabled={previewIdx === 0}
                          onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}>
                          Prev
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                          {previewIdx + 1} / {checkedRecipients.length} — <strong>{checkedRecipients[previewIdx]?.name}</strong>
                        </Typography>
                        <Button size="small" variant="outlined" endIcon={<NavigateNextIcon />}
                          disabled={previewIdx >= checkedRecipients.length - 1}
                          onClick={() => setPreviewIdx(i => Math.min(checkedRecipients.length - 1, i + 1))}>
                          Next
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                          onClick={handleDownloadPreview}>
                          Download
                        </Button>
                      </Stack>
                    )}

                    {isSingleMode && (
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                        sx={{ mt: 1 }} onClick={handleDownloadPreview}>
                        Download Preview
                      </Button>
                    )}

                    {!imageLoaded && form.imageUrl && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Image could not be loaded. Make sure the URL is publicly accessible (CORS-friendly).
                      </Alert>
                    )}
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Font style */}
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>Text Style on Image</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth select label="Font Family" value={fontStyle.fontFamily}
                    onChange={e => setFontStyle(p => ({ ...p, fontFamily: e.target.value }))}>
                    {FONT_FAMILIES.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth type="number" label="Font Size (px)" value={fontStyle.fontSize}
                    inputProps={{ min: 10, max: 200 }}
                    onChange={e => setFontStyle(p => ({ ...p, fontSize: Number(e.target.value) }))} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Font Color</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <input
                        type="color"
                        value={fontStyle.color}
                        onChange={e => setFontStyle(p => ({ ...p, color: e.target.value }))}
                        style={{ width: 48, height: 40, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                      />
                      <Typography variant="body2">{fontStyle.color}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button size="small"
                      variant={fontStyle.fontWeight === 'bold' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setFontStyle(p => ({ ...p, fontWeight: p.fontWeight === 'bold' ? 'normal' : 'bold' }))}>
                      <strong>B</strong>
                    </Button>
                    {['left', 'center', 'right'].map(a => (
                      <Button key={a} size="small"
                        variant={fontStyle.textAlign === a ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => setFontStyle(p => ({ ...p, textAlign: a }))}>
                        {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                      </Button>
                    ))}
                    <Tooltip title="Text shadow — improves readability on busy backgrounds">
                      <Button size="small"
                        variant={fontStyle.shadow ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => setFontStyle(p => ({ ...p, shadow: !p.shadow }))}>
                        Shadow
                      </Button>
                    </Tooltip>
                    <Tooltip title="Reset text position to default (bottom-centre)">
                      <Button size="small" variant="outlined"
                        onClick={() => setFontStyle(p => ({ ...p, x: 0.5, y: 0.88 }))}>
                        Reset Pos
                      </Button>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>Recipients</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField fullWidth select label="Recipient Source" value={form.recipientMode}
                    onChange={e => { setForm(p => ({ ...p, recipientMode: e.target.value })); setPreviewIdx(0); }}>
                    <MenuItem value="single">Single Number</MenuItem>
                    <MenuItem value="csv">CSV File</MenuItem>
                    <MenuItem value="excel">Excel File</MenuItem>
                  </TextField>
                </Grid>

                {isSingleMode && (
                  <>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label="Name" value={form.singleName}
                        onChange={e => setForm(p => ({ ...p, singleName: e.target.value }))} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth label="WhatsApp Number" value={form.singleNumber}
                        onChange={e => setForm(p => ({ ...p, singleNumber: e.target.value }))}
                        helperText="With country code e.g. 919876543210" />
                    </Grid>
                  </>
                )}

                {['csv', 'excel'].includes(form.recipientMode) && (
                  <Grid size={{ xs: 12 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                        Upload {form.recipientMode.toUpperCase()}
                        <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                      </Button>
                      {fileName && (
                        <Typography variant="body2" color="text.secondary">
                          📄 {fileName} — <strong>{recipients.length}</strong> recipients found
                        </Typography>
                      )}
                    </Stack>
                    <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                      CSV/Excel must have columns: <strong>name</strong> and <strong>mobile</strong> (or phone / number / whatsapp)
                    </Alert>
                  </Grid>
                )}
              </Grid>

              {/* Checklist for bulk */}
              {recipients.length > 0 && !isSingleMode && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography fontWeight={700}>
                      {checkedRecipients.length} of {recipients.length} selected
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setRecipients(prev => prev.map(r => ({ ...r, checked: true })))}>All</Button>
                      <Button size="small" onClick={() => setRecipients(prev => prev.map(r => ({ ...r, checked: false })))}>None</Button>
                    </Stack>
                  </Stack>
                  <Box sx={{ maxHeight: 180, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    <Grid container>
                      {recipients.map((r, idx) => (
                        <Grid key={idx} size={{ xs: 12, md: 6 }}>
                          <FormControlLabel
                            label={<Typography variant="body2"><strong>{r.name}</strong> — {r.mobile}</Typography>}
                            control={
                              <Checkbox size="small" checked={r.checked !== false}
                                onChange={() => setRecipients(prev => prev.map((x, i) =>
                                  i === idx ? { ...x, checked: x.checked === false } : x
                                ))} />
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Single send button */}
          {isSingleMode && (
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography fontWeight={700}>Ready to send?</Typography>
                    <Typography variant="body2" color="text.secondary">
                      1) The personalized image will auto-download. &nbsp;
                      2) WhatsApp will open in a new tab with a pre-filled message. &nbsp;
                      3) Attach the downloaded image and hit Send.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1ebe57' }, whiteSpace: 'nowrap', minWidth: 220 }}
                    startIcon={singleWorking ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <WhatsAppIcon />}
                    disabled={!canSendSingle || singleWorking}
                    onClick={handleSingleSend}
                  >
                    {singleWorking ? 'Generating…' : 'Download & Open WhatsApp'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Bulk send list */}
          {!isSingleMode && checkedRecipients.length > 0 && (
            <Card>
              <CardContent>
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  Send to {checkedRecipients.length} recipient{checkedRecipients.length !== 1 ? 's' : ''}
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }} icon={false}>
                  For each person: click the button → the personalized image downloads &amp; WhatsApp opens.
                  Attach the image in WhatsApp and tap Send, then move to the next.
                </Alert>
                <Stack spacing={1}>
                  {checkedRecipients.map((r, idx) => (
                    <Stack
                      key={idx}
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        px: 2, py: 1.5, border: '1px solid', borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: r.status === 'opened' ? '#e8f5e9' : 'background.paper',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.mobile}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {r.status === 'opened' && (
                          <Chip label="WA Opened ✓" color="success" size="small" />
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            bgcolor: r.status === 'opened' ? '#81c784' : '#25D366',
                            '&:hover': { bgcolor: r.status === 'opened' ? '#66bb6a' : '#1ebe57' },
                            whiteSpace: 'nowrap',
                          }}
                          startIcon={
                            bulkWorking[idx]
                              ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                              : <WhatsAppIcon />
                          }
                          disabled={!!bulkWorking[idx] || !form.imageUrl}
                          onClick={() => handleBulkRow(idx)}
                        >
                          {bulkWorking[idx]
                            ? 'Generating…'
                            : r.status === 'opened'
                              ? 'Resend'
                              : 'Download & Open WhatsApp'}
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>

                {/* Summary */}
                {checkedRecipients.some(r => r.status === 'opened') && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {checkedRecipients.filter(r => r.status === 'opened').length} of {checkedRecipients.length} WhatsApp chats opened.
                    Remember to attach the downloaded image before hitting Send in each chat.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <Box sx={{ textAlign: 'center', pb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              All image processing happens in your browser — no data is sent to any server.
            </Typography>
          </Box>

        </Stack>
      </Container>
    </Box>
  );
}
