import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { shareWhatsApp, openExternalUrl } from '../plugins/whatsappShare';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Avatar, Box, Button, Card, CardContent, Checkbox, Chip,
  CircularProgress, Divider, FormControlLabel, Grid, LinearProgress,
  List, ListItemButton, ListItemText, MenuItem, Stack, Switch,
  Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import SendIcon             from '@mui/icons-material/Send';
import UploadFileIcon       from '@mui/icons-material/UploadFile';
import LinkIcon             from '@mui/icons-material/Link';
import LinkOffIcon          from '@mui/icons-material/LinkOff';
import QrCode2Icon          from '@mui/icons-material/QrCode2';
import PauseIcon            from '@mui/icons-material/Pause';
import PlayArrowIcon        from '@mui/icons-material/PlayArrow';
import StopIcon             from '@mui/icons-material/Stop';
import DownloadIcon         from '@mui/icons-material/Download';
import ExpandMoreIcon       from '@mui/icons-material/ExpandMore';
import NavigateNextIcon     from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon   from '@mui/icons-material/NavigateBefore';
import HistoryIcon          from '@mui/icons-material/History';
import PageHeader    from '../components/PageHeader';
import PageSurface   from '../components/PageSurface';
import ResponsiveDialog from '../components/ResponsiveDialog';
import ResponsiveTable  from '../components/ResponsiveTable';
import whatsappService  from '../services/whatsappService';
import { useAuth }      from '../context/AuthContext';
import { isInvitationOnly } from '../utils/accessControl';

// ── Tab definitions ───────────────────────────────────────────────────────────

const officialTabs = [
  ['inbox',      'Inbox'],
  ['rules',      'Auto Reply'],
  ['send',       'Quick Send'],
  ['invite',     'Invitation'],
  ['manual',          '📱 Manual'],
  ['manual-saved',    '📱 Saved'],
  ['campaigns',       '🗓 Campaigns'],
  ['blasts',          'Blast History'],
  ['templates',  'Templates'],
  ['connections','Connections'],
  ['logs',       'Logs'],
];

const baileysTabs = [
  ['inbox',     'Inbox'],
  ['rules',     'Auto Reply'],
  ['send',      'Quick Send'],
  ['invite',    'Invitation'],
  ['manual',       '📱 Manual'],
  ['manual-saved', '📱 Saved'],
  ['campaigns',    '🗓 Campaigns'],
  ['blasts',       'Blast History'],
  ['logs',      'Logs'],
  ['setup',     'Setup / QR'],
];

// ── Constants ─────────────────────────────────────────────────────────────────

const emptyInvitationForm = {
  recipientMode: 'single', singleName: '', singleNumber: '',
  imageUrl: '', message: '',
  includeRsvp: false, rsvpYesLabel: "Yes, I'll attend ✅", rsvpNoLabel: "Sorry, can't make it ❌",
};

// Default font style
// x, y are fractions 0–1 of canvas size so position is resolution-independent
const emptyFontStyle = {
  x:          0.5,         // horizontal fraction (0=left edge, 1=right edge)
  y:          0.88,        // vertical fraction (0=top, 1=bottom)
  fontFamily: 'serif',
  fontSize:   48,
  color:      '#ffffff',
  fontWeight: 'bold',      // 'bold' | 'normal'
  textAlign:  'center',    // 'left' | 'center' | 'right'
  shadow:     true,
};

const recipientModeOptions = [
  { value: 'students',    label: 'Students'     },
  { value: 'parents',     label: 'Parents'      },
  { value: 'teamMembers', label: 'Team Members' },
  { value: 'volunteers',  label: 'Volunteers'   },
  { value: 'guests',      label: 'Guests'       },
  { value: 'single',      label: 'Single Number'},
  { value: 'csv',         label: 'CSV File'     },
  { value: 'excel',       label: 'Excel File'   },
];

const emptyRule = {
  name: '', matchType: 'CONTAINS', triggerText: '',
  replyType: 'TEXT', replyText: '', templateName: '',
  templateLanguage: 'en_US', isActive: true, priority: 100, stopAfterMatch: true,
};

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

const MAX_RECIPIENTS  = 999;
const DELAY_MIN_S     = 12;    // 60s ÷ 5 messages = 12s minimum gap
const DELAY_MAX_S     = 20;    // randomised upper bound
const MAX_PER_MINUTE  = 5;     // WhatsApp anti-ban: max 5 per minute
const MAX_PER_HOUR    = 150;   // WhatsApp anti-ban: max 150 per hour

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizePhone   = (v) => {
  const d = String(v || '').replace(/[^\d]/g, '').trim();
  return d.length === 10 ? '91' + d : d;   // auto-prefix India code
};
const formatWhen       = (v) => v ? new Date(v).toLocaleString() : '-';
const conversationName = (item) => item?.contactName || item?.name || item?.phone || 'Unknown';
const sleep            = (ms) => new Promise(r => setTimeout(r, ms));
const randDelay        = () =>
  (Math.floor(Math.random() * (DELAY_MAX_S - DELAY_MIN_S + 1)) + DELAY_MIN_S) * 1000;

function parseRowsToRecipients(rows = []) {
  return rows.map(row => ({
    name: String(
      row.name || row.fullName || row.studentName || row.guestName || row.Name || ''
    ).trim() || 'Guest',
    mobile: normalizePhone(
      row.mobile || row.phone || row.number || row.whatsapp ||
      row.Mobile || row.Phone || row.Number || row.WhatsApp || ''
    ),
    source: 'FILE',
  })).filter(item => item.mobile);
}

function fmtSecs(s) {
  if (!s || s < 0) return '0s';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// ── Canvas drawing helper ─────────────────────────────────────────────────────
// x, y are fractions 0-1 of canvas dimensions

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

// ── Shared sub-components ─────────────────────────────────────────────────────

function CollectionSection({ title, subtitle, rows, onAdd, children }) {
  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between"
          spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
            <Typography color="text.secondary">{subtitle}</Typography>
          </Box>
          {onAdd && <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>Add</Button>}
        </Stack>
      </CardContent></Card>
      {children}
      <Card><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <ResponsiveTable columns={rows.columns} rows={rows.data} />
      </CardContent></Card>
    </Stack>
  );
}

function MessageBubble({ message }) {
  const isOut = message.direction === 'OUTGOING';
  return (
    <Box sx={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
      <Box sx={{
        maxWidth: '75%', px: 1.5, py: 1, borderRadius: 2,
        bgcolor: isOut ? '#dcf8c6' : '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.13)',
      }}>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.bodyText || message.text || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', textAlign: 'right', mt: 0.25 }}>
          {formatWhen(message.createdAt)} · {message.status || ''}
          {message.source === 'AUTO_REPLY' ? ' · 🤖 auto' : ''}
        </Typography>
      </Box>
    </Box>
  );
}

function ProviderToggle({ useBaileys, onToggle, baileysStatus }) {
  const statusColor =
    baileysStatus === 'CONNECTED'  ? 'success' :
    baileysStatus === 'QR_PENDING' ? 'warning' : 'default';
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {useBaileys
              ? <QrCode2Icon sx={{ color: 'warning.main' }} />
              : <LinkIcon    sx={{ color: 'success.main' }} />}
            <Box>
              <Typography fontWeight={800}>
                {useBaileys ? '🐝 Baileys Mode' : '✅ Official Cloud API'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {useBaileys
                  ? 'Messages go through Baileys — scan QR in Setup tab to connect.'
                  : 'Messages sent via Meta Graph API. Configure env vars in backend.'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {useBaileys && (
              <Chip label={`Baileys: ${baileysStatus || 'UNKNOWN'}`} color={statusColor} size="small" />
            )}
            <Tooltip title={useBaileys ? 'Switch to Official API' : 'Switch to Baileys'}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="caption" color={!useBaileys ? 'primary' : 'text.secondary'} fontWeight={!useBaileys ? 800 : 400}>Official</Typography>
                <Switch checked={useBaileys} onChange={onToggle} color="warning" />
                <Typography variant="caption" color={useBaileys ? 'warning.main' : 'text.secondary'} fontWeight={useBaileys ? 800 : 400}>Baileys</Typography>
              </Stack>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Inbox panel ───────────────────────────────────────────────────────────────

function InboxPanel({ inbox, selectedKey, onSelect, conversationMessages,
  replyForm, setReplyForm, onSend, saving, isBaileys, templates }) {
  const accentBg       = isBaileys ? '#b37a00' : '#1976d2';
  const accentSelected = isBaileys ? '#fff8e1'  : '#e3f2fd';
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <PageSurface>
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: accentBg, color: '#fff' }}>
                <Typography fontWeight={800}>
                  {isBaileys ? '🐝 Baileys Inbox' : '📬 Official Inbox'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {inbox.length} conversations
                </Typography>
              </Box>
              <List sx={{ py: 0, maxHeight: { xs: 'unset', lg: '68vh' }, overflow: 'auto' }}>
                {inbox.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary" variant="body2">
                      {isBaileys
                        ? 'No conversations yet. Connect via QR and receive a message first.'
                        : 'No conversations yet.'}
                    </Typography>
                  </Box>
                )}
                {inbox.map(item => (
                  <ListItemButton
                    key={item.conversationKey}
                    selected={item.conversationKey === selectedKey}
                    onClick={() => onSelect(item.conversationKey)}
                    sx={{
                      alignItems: 'flex-start',
                      borderBottom: '1px solid', borderColor: 'divider',
                      '&.Mui-selected': { bgcolor: accentSelected },
                    }}>
                    <Avatar sx={{ bgcolor: isBaileys ? 'warning.main' : 'primary.main', mr: 1.5 }}>
                      {conversationName(item).slice(0, 1)}
                    </Avatar>
                    <ListItemText
                      primary={conversationName(item)}
                      primaryTypographyProps={{ fontWeight: 800 }}
                      secondary={`${item.phone || ''}${item.lastMessage ? ` • ${item.lastMessage}` : ''}`}
                    />
                    <Stack alignItems="flex-end" spacing={0.75}>
                      <Typography variant="caption" color="text.secondary">
                        {formatWhen(item.lastMessageAt)}
                      </Typography>
                      {item.unreadCount > 0 && (
                        <Chip label={item.unreadCount} size="small"
                          color={isBaileys ? 'warning' : 'primary'} />
                      )}
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </PageSurface>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <PageSurface>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography fontWeight={800}>
                  {selectedKey
                    ? conversationName(inbox.find(i => i.conversationKey === selectedKey)) || selectedKey
                    : 'Select a chat'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedKey || 'Choose a conversation from the left list.'}
                </Typography>
              </Box>
              <Box sx={{
                p: 2, minHeight: 360,
                maxHeight: { xs: 'unset', lg: '52vh' }, overflow: 'auto',
                bgcolor: isBaileys ? '#fef9e7' : '#efeae2',
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}>
                <Stack spacing={1.2}>
                  {conversationMessages.length
                    ? conversationMessages.map(msg =>
                        <MessageBubble key={msg._id || msg.baileysMessageId || Math.random()} message={msg} />)
                    : <Typography color="text.secondary">No messages yet.</Typography>}
                </Stack>
              </Box>
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f0f2f5' }}>
                {!isBaileys && (
                  <TextField select label="Template" value={replyForm.templateName || ''} sx={{ mb: 1.5 }}
                    onChange={e => setReplyForm(p => ({ ...p, templateName: e.target.value }))}>
                    <MenuItem value="">No Template</MenuItem>
                    {(templates || []).map(item => (
                      <MenuItem key={item._id} value={item.name}>{item.displayName || item.name}</MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField fullWidth label="Reply message" multiline minRows={2} value={replyForm.text}
                  onChange={e => setReplyForm(p => ({ ...p, text: e.target.value }))} />
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                  <Button variant="contained" color={isBaileys ? 'warning' : 'primary'}
                    startIcon={<SendIcon />}
                    disabled={saving || !selectedKey || !replyForm.text.trim()} onClick={onSend}>
                    {isBaileys ? 'Send via Baileys' : 'Send Reply'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </PageSurface>
      </Grid>
    </Grid>
  );
}

// ── Quick Send ────────────────────────────────────────────────────────────────

function QuickSendPanel({ onSend, saving, isBaileys, templates }) {
  const [form, setForm] = useState({ to: '', contactName: '', text: '', templateName: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <PageSurface>
      <Card><CardContent>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          {isBaileys ? '🐝 Baileys Quick Send' : '📤 Quick Send'}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="To (phone number)" value={form.to}
              onChange={e => set('to', e.target.value)}
              helperText="Country code required e.g. 919876543210" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Contact Name (optional)" value={form.contactName}
              onChange={e => set('contactName', e.target.value)} />
          </Grid>
          {!isBaileys && templates?.length > 0 && (
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select label="Template" value={form.templateName}
                onChange={e => set('templateName', e.target.value)}>
                <MenuItem value="">No Template</MenuItem>
                {templates.map(t =>
                  <MenuItem key={t._id} value={t.name}>{t.displayName || t.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <TextField label="Message" multiline minRows={3} value={form.text}
              onChange={e => set('text', e.target.value)} />
          </Grid>
        </Grid>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" color={isBaileys ? 'warning' : 'primary'}
            startIcon={<SendIcon />}
            disabled={saving || !form.to || !form.text.trim()}
            onClick={() => {
              onSend(form);
              setForm({ to: '', contactName: '', text: '', templateName: '' });
            }}>
            Send
          </Button>
        </Stack>
      </CardContent></Card>
    </PageSurface>
  );
}

// ── Auto Reply panel ──────────────────────────────────────────────────────────

function AutoReplyPanel({ rules, onAdd, onEdit, isBaileys }) {
  const ruleRows = {
    columns: [
      { key: 'name',    label: 'Rule'    },
      { key: 'trigger', label: 'Trigger' },
      { key: 'reply',   label: 'Reply'   },
      { key: 'status',  label: 'Status'  },
      { key: 'action',  label: 'Action'  },
    ],
    data: rules.map(item => ({
      title:   item.name || 'Rule',
      name:    item.name || '-',
      trigger: `${item.matchType || '-'} • ${item.triggerText || 'ALL'}`,
      reply:   item.replyType === 'TEMPLATE' ? item.templateName || '-' : item.replyText || '-',
      status:  () => <Chip label={item.isActive ? 'Active' : 'Inactive'}
                      color={item.isActive ? 'success' : 'default'} size="small" />,
      action:  () => <Button size="small" variant="contained"
                      color={isBaileys ? 'warning' : 'primary'}
                      onClick={() => onEdit(item)}>Edit</Button>,
    })),
  };
  return (
    <CollectionSection
      title={isBaileys ? '🐝 Baileys Auto Reply Rules' : 'Auto Reply Rules'}
      subtitle={isBaileys
        ? 'Rules applied to incoming Baileys messages automatically.'
        : 'Rules trigger after customer message is stored by webhook.'}
      rows={ruleRows}
      onAdd={onAdd}
    >
      {!isBaileys && (
        <Card><CardContent>
          <Typography fontWeight={700}>Webhook setup</Typography>
          <Typography variant="body2" color="text.secondary">
            Meta webhook URL: <strong>/api/whatsapp/webhook</strong>.
          </Typography>
        </CardContent></Card>
      )}
      {isBaileys && (
        <Card><CardContent>
          <Typography fontWeight={700}>How Baileys auto-reply works</Typography>
          <Typography variant="body2" color="text.secondary">
            Rules are evaluated on every incoming Baileys message. Matching rules send a text
            reply automatically and log it with source AUTO_REPLY.
          </Typography>
        </CardContent></Card>
      )}
    </CollectionSection>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Invitation Panel (Enhanced) ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Save Campaign Button — shared by InvitationPanel and ManualInvitePanel ────

function SaveCampaignButton({ getPayload, disabled = false }) {
  const [open,        setOpen]        = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [scheduleOn,  setScheduleOn]  = useState(false);
  const [scheduleAt,  setScheduleAt]  = useState('');
  const [savedOk,     setSavedOk]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = getPayload();
      if (scheduleOn && scheduleAt) {
        payload.scheduledAt = new Date(scheduleAt).toISOString();
        payload.status = 'SCHEDULED';
      } else {
        payload.status = 'DRAFT';
      }
      await whatsappService.saveCampaign(payload);
      setSavedOk(true);
      setTimeout(() => { setSavedOk(false); setOpen(false); setScheduleOn(false); setScheduleAt(''); }, 1500);
    } catch (e) {
      alert(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  // min datetime = now (local) formatted for datetime-local input
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <>
      <Button variant="outlined" size="large" startIcon={<span>🗓</span>}
        disabled={disabled} onClick={() => setOpen(true)}>
        Save Campaign
      </Button>
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <CardContent>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Save Campaign</Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={scheduleOn} color="primary"
                onChange={e => setScheduleOn(e.target.checked)} />}
              label={<Typography variant="body2" fontWeight={600}>Schedule for later</Typography>}
            />
            {scheduleOn && (
              <TextField fullWidth size="small" type="datetime-local" label="Send at"
                inputProps={{ min: minDateTime }}
                value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                InputLabelProps={{ shrink: true }} />
            )}
            {!scheduleOn && (
              <Typography variant="body2" color="text.secondary">
                Campaign saved as <strong>DRAFT</strong>. Go to 🗓 Campaigns tab to send it anytime.
              </Typography>
            )}
            {scheduleOn && scheduleAt && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Will auto-send via Baileys at {new Date(scheduleAt).toLocaleString()}.<br />
                Server must be running at that time.
              </Alert>
            )}
            {savedOk && <Alert severity="success">Campaign saved ✅</Alert>}
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving || (scheduleOn && !scheduleAt)}>
                {saving ? <CircularProgress size={18} /> : scheduleOn ? 'Schedule' : 'Save Draft'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </ResponsiveDialog>
    </>
  );
}

function InvitationPanel({
  isBaileys,
  invitationForm, setInvitationForm,
  selectedRecipients, setSelectedRecipients,
  fontStyle, setFontStyle,
  onUploadImage, uploadingImage,
  sendServiceFn,
  fileName, setFileName,
  blasts = [],
}) {
  // ── Canvas / drag state ─────────────────────────────────────────────────────
  const canvasRef      = useRef(null);
  const imageElRef     = useRef(null);
  const isDraggingRef  = useRef(false);
  const [previewIdx,   setPreviewIdx]   = useState(0);
  const [imageLoaded,  setImageLoaded]  = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400);

  // ── Accordion state ─────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState('image');
  const handleAccordion = (panel) => (_, isExp) => setExpanded(isExp ? panel : false);

  // ── Queue state ─────────────────────────────────────────────────────────────
  const [queue,       setQueue]       = useState([]);
  const [queueActive, setQueueActive] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [queueDone,   setQueueDone]   = useState(false);
  const [queueIdx,    setQueueIdx]    = useState(0);
  const [cooldown,    setCooldown]    = useState(null);
  const pauseRef  = useRef(false);
  const cancelRef = useRef(false);

  // ── Rate-limiting refs ───────────────────────────────────────────────────────
  const sentThisMinuteRef = useRef(0);
  const minuteWindowRef   = useRef(Date.now());
  const sentThisHourRef   = useRef(0);
  const hourWindowRef     = useRef(Date.now());

  // ── Blast save / load campaign ───────────────────────────────────────────────
  const [blastTitle,     setBlastTitle]     = useState('');
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const blastIdRef      = useRef('');
  const localResultsRef = useRef([]);

  const loadCampaign = (blast) => {
    setInvitationForm(p => ({
      ...p,
      imageUrl:     blast.imageUrl     || p.imageUrl,
      message:      blast.message      || p.message,
      includeRsvp:  blast.includeRsvp  ?? p.includeRsvp,
      rsvpYesLabel: blast.rsvpYesLabel || p.rsvpYesLabel,
      rsvpNoLabel:  blast.rsvpNoLabel  || p.rsvpNoLabel,
    }));
    if (blast.fontStyle) setFontStyle(blast.fontStyle);
    setBlastTitle(blast.title || '');
    setLoadDialogOpen(false);
    setExpanded('image');
  };

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = invitationForm.imageUrl;
    if (!url) { setImageLoaded(false); imageElRef.current = null; return; }
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => {
      imageElRef.current = img;
      const h = img.naturalHeight && img.naturalWidth
        ? Math.round(600 * img.naturalHeight / img.naturalWidth)
        : 400;
      setCanvasHeight(Math.max(200, Math.min(h, 900)));
      setImageLoaded(true);
    };
    img.onerror = () => { imageElRef.current = null; setImageLoaded(false); };
    img.src = url;
  }, [invitationForm.imageUrl]);

  // ── Redraw canvas ───────────────────────────────────────────────────────────
  const redraw = useCallback((overrideName) => {
    if (!imageLoaded || !canvasRef.current || !imageElRef.current) return;
    const checked = getCheckedRecipients();
    const name = overrideName !== undefined ? overrideName
      : invitationForm.recipientMode === 'single'
        ? invitationForm.singleName || 'Guest'
        : checked[previewIdx]?.name || '';
    drawNameOnCanvas(canvasRef.current, imageElRef.current, name, fontStyle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLoaded, previewIdx, fontStyle, invitationForm.singleName,
      invitationForm.recipientMode, selectedRecipients]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Drag handlers — mouse + touch ───────────────────────────────────────────
  const getCanvasFraction = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect    = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // clamp 0–1
    const x = Math.min(1, Math.max(0, (clientX - rect.left)  / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top)   / rect.height));
    return { x, y };
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getCheckedRecipients = () =>
    invitationForm.recipientMode === 'single'
      ? [{ name: invitationForm.singleName || 'Guest', mobile: normalizePhone(invitationForm.singleNumber), source: 'MANUAL' }]
      : selectedRecipients.filter(r => r.checked !== false).map(r => ({ ...r, mobile: normalizePhone(r.mobile) }));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer   = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows     = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    setSelectedRecipients(parseRowsToRecipients(rows).map(r => ({ ...r, checked: true })));
    setPreviewIdx(0);
  };

  const handleDownloadPreview = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `invite_preview_${previewIdx + 1}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // ── Generate personalised image for one recipient & upload it ───────────────
  // Returns a public URL with the name baked into the image.
  const buildPersonalisedImageUrl = (recipientName) => new Promise((resolve, reject) => {
    if (!imageElRef.current) { resolve(invitationForm.imageUrl); return; }
    // Draw onto a fresh off-screen canvas so we don't disturb the preview
    const off = document.createElement('canvas');
    off.width  = 1200;   // higher resolution for actual send
    off.height = Math.round(1200 * (imageElRef.current.naturalHeight / imageElRef.current.naturalWidth)) || 800;
    drawNameOnCanvas(off, imageElRef.current, recipientName, fontStyle);
    off.toBlob(async (blob) => {
      if (!blob) { resolve(invitationForm.imageUrl); return; }
      try {
        const { default: api } = await import('../api');
        const fd = new FormData();
        fd.append('file', blob, `invite_${Date.now()}.png`);
        fd.append('folder', 'bk_award_invites');
        const res = await api.post('/uploads/public', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        resolve(res?.data?.url || invitationForm.imageUrl);
      } catch (err) {
        // Fall back to original image if upload fails
        resolve(invitationForm.imageUrl);
      }
    }, 'image/png');
  });

  const checkedRecipients = getCheckedRecipients();
  const totalCount        = checkedRecipients.length;
  const overLimit         = totalCount > MAX_RECIPIENTS;

  // ── Queue ───────────────────────────────────────────────────────────────────
  const startQueue = async () => {
    const recipients = getCheckedRecipients().slice(0, MAX_RECIPIENTS);
    if (!recipients.length) return;
    pauseRef.current  = false;
    cancelRef.current = false;
    blastIdRef.current = '';

    // Save blast to backend for history/report
    try {
      const form = invFormRef.current;
      const res = await whatsappService.saveBlast({
        title:        blastTitle.trim() || `Blast ${new Date().toLocaleDateString()}`,
        message:      form.message || '',
        imageUrl:     form.imageUrl || '',
        includeRsvp:  form.includeRsvp,
        rsvpYesLabel: form.rsvpYesLabel,
        rsvpNoLabel:  form.rsvpNoLabel,
        fontStyle:    fontStyleRef.current,
        status:       'SENDING',
        totalRecipients: recipients.length,
        recipients:   recipients.map(r => ({ name: r.name, mobile: r.mobile, source: r.source, status: 'PENDING' })),
      });
      blastIdRef.current = res?.data?._id || '';
    } catch (_) { /* blast save failure is non-blocking */ }

    setQueue(recipients.map(r => ({ ...r, status: 'pending', error: '' })));
    setQueueIdx(0);
    setQueueActive(true);
    setQueuePaused(false);
    setQueueDone(false);
    setCooldown(null);
  };

  const pauseQueue  = () => { pauseRef.current = true;  setQueuePaused(true);  };
  const resumeQueue = () => { pauseRef.current = false; setQueuePaused(false); };
  const cancelQueue = () => { cancelRef.current = true; pauseRef.current = false; };
  const resetQueue  = () => {
    setQueue([]); setQueueActive(false); setQueuePaused(false);
    setQueueDone(false); setQueueIdx(0); setCooldown(null);
    pauseRef.current = false; cancelRef.current = false;
    blastIdRef.current = ''; localResultsRef.current = [];
  };

  // Capture stable refs so the async loop sees latest invitationForm / fontStyle
  const invFormRef   = useRef(invitationForm);
  const fontStyleRef = useRef(fontStyle);
  useEffect(() => { invFormRef.current   = invitationForm; }, [invitationForm]);
  useEffect(() => { fontStyleRef.current = fontStyle;      }, [fontStyle]);

  useEffect(() => {
    if (!queueActive || queueDone) return;

    const run = async () => {
      const recipients = queue;
      let i = queueIdx;

      // Reset rate-limit windows for this blast run
      sentThisMinuteRef.current = 0;
      minuteWindowRef.current   = Date.now();
      sentThisHourRef.current   = 0;
      hourWindowRef.current     = Date.now();

      const checkCancel = () => {
        if (cancelRef.current) { setQueueActive(false); setQueueDone(true); setCooldown(null); return true; }
        return false;
      };
      const waitWhilePaused = async () => {
        while (pauseRef.current) {
          await sleep(500);
          if (checkCancel()) return false;
        }
        return true;
      };

      const localResults = []; // track results locally — avoids stale React state
      localResultsRef.current = localResults;

      while (i < recipients.length) {
        if (checkCancel()) return;
        if (!await waitWhilePaused()) return;

        // ── Enforce hour cap ────────────────────────────────────────────
        {
          const now = Date.now();
          if (now - hourWindowRef.current >= 3600000) {
            sentThisHourRef.current = 0;
            hourWindowRef.current   = now;
          }
          if (sentThisHourRef.current >= MAX_PER_HOUR) {
            const waitUntil = hourWindowRef.current + 3600000;
            while (Date.now() < waitUntil) {
              if (checkCancel()) return;
              if (!await waitWhilePaused()) return;
              setCooldown({ type: 'hour', seconds: Math.ceil((waitUntil - Date.now()) / 1000) });
              await sleep(1000);
            }
            sentThisHourRef.current = 0;
            hourWindowRef.current   = Date.now();
            setCooldown(null);
          }
        }

        // ── Enforce minute cap ──────────────────────────────────────────
        {
          const now = Date.now();
          if (now - minuteWindowRef.current >= 60000) {
            sentThisMinuteRef.current = 0;
            minuteWindowRef.current   = now;
          }
          if (sentThisMinuteRef.current >= MAX_PER_MINUTE) {
            const waitUntil = minuteWindowRef.current + 60000;
            while (Date.now() < waitUntil) {
              if (checkCancel()) return;
              if (!await waitWhilePaused()) return;
              setCooldown({ type: 'minute', seconds: Math.ceil((waitUntil - Date.now()) / 1000) });
              await sleep(1000);
            }
            sentThisMinuteRef.current = 0;
            minuteWindowRef.current   = Date.now();
            setCooldown(null);
          }
        }

        setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sending' } : item));
        setQueueIdx(i);

        const recipientName = recipients[i].name;
        try {
          const personalisedUrl = await buildPersonalisedImageUrl(recipientName);
          await sendServiceFn({
            ...invFormRef.current,
            imageUrl:     personalisedUrl,
            recipients:   [{ name: recipientName, mobile: recipients[i].mobile, source: recipients[i].source }],
            textPosition: fontStyleRef.current,
          });
          setQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'delivered' } : item));
          localResults.push({ name: recipientName, mobile: recipients[i].mobile, source: recipients[i].source, status: 'SENT', error: '' });
          sentThisMinuteRef.current++;
          sentThisHourRef.current++;
        } catch (err) {
          const errMsg = err?.response?.data?.message || 'Failed';
          setQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'failed', error: errMsg } : item));
          localResults.push({ name: recipientName, mobile: recipients[i].mobile, source: recipients[i].source, status: 'FAILED', error: errMsg });
        }

        i++;
        if (i < recipients.length && !cancelRef.current) await sleep(randDelay());
      }

      // ── Save blast report using local results (no stale state issue) ──
      if (blastIdRef.current) {
        const sent   = localResults.filter(r => r.status === 'SENT').length;
        const failed = localResults.filter(r => r.status === 'FAILED').length;
        whatsappService.updateBlast(blastIdRef.current, {
          status:     'COMPLETED',
          sentCount:  sent,
          failedCount: failed,
          recipients:  localResults,
        }).catch(() => null);
      }

      setQueueActive(false);
      setQueueDone(true);
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueActive]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  // When done, read from localResultsRef so the final tally is never stale
  const delivered = queueDone
    ? localResultsRef.current.filter(r => r.status === 'SENT').length
    : queue.filter(r => r.status === 'delivered').length;
  const failed = queueDone
    ? localResultsRef.current.filter(r => r.status === 'FAILED').length
    : queue.filter(r => r.status === 'failed').length;
  const pending      = queue.filter(r => r.status === 'pending').length;
  const progress     = queue.length ? Math.round(((delivered + failed) / queue.length) * 100) : 0;
  const avgDelay     = (DELAY_MIN_S + DELAY_MAX_S) / 2;
  // Add estimated hour-pause time
  const hourPauses   = Math.floor(pending / MAX_PER_HOUR);
  const etaSecs      = Math.round(pending * avgDelay + hourPauses * 3600);

  const accentColor  = isBaileys ? 'warning' : 'primary';
  const accentBgHex  = isBaileys ? '#fffde7' : '#e3f2fd';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <PageSurface sx={{ pb: { xs: 10, sm: 3 } }}>
      <Stack spacing={1.5}>

        {/* ── Header + Load Campaign ── */}
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ py: '10px !important', px: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={800}>
              {isBaileys ? '🐝 Invitation Blast' : '📨 Invitation Blast'}
            </Typography>
            {blasts.length > 0 && (
              <Tooltip title="Load previous campaign">
                <Button variant="outlined" size="small" startIcon={<HistoryIcon />}
                  color={accentColor} onClick={() => setLoadDialogOpen(true)}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                  Load Previous
                </Button>
              </Tooltip>
            )}
            {blasts.length > 0 && (
              <Tooltip title="Load previous campaign">
                <Button variant="outlined" size="small" color={accentColor}
                  onClick={() => setLoadDialogOpen(true)}
                  sx={{ display: { xs: 'inline-flex', sm: 'none' }, minWidth: 0, px: 1 }}>
                  <HistoryIcon fontSize="small" />
                </Button>
              </Tooltip>
            )}
          </Stack>
        </CardContent></Card>

        {/* ── Load Campaign Dialog ── */}
        <ResponsiveDialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} fullWidth maxWidth="sm">
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Load Previous Campaign</Typography>
            <Stack spacing={1}>
              {blasts.slice(0, 20).map(b => (
                <Card key={b._id} variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: accentBgHex } }}
                  onClick={() => loadCampaign(b)}>
                  <CardContent sx={{ py: '10px !important' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight={700} variant="body2">{b.title || 'Untitled'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(b.createdAt).toLocaleDateString()} · {b.totalRecipients || 0} recipients
                          {b.imageUrl && ' · 🖼 Image'}
                          {b.message && ` · 💬 ${b.message.slice(0, 30)}…`}
                        </Typography>
                      </Box>
                      <Chip label={b.status} size="small"
                        color={b.status === 'COMPLETED' ? 'success' : 'default'} />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
            </Stack>
          </CardContent>
        </ResponsiveDialog>

        {/* ══ ACCORDION 1 — Image & Preview ══ */}
        <Accordion expanded={expanded === 'image'} onChange={handleAccordion('image')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={22}>🖼</Typography>
              <Box>
                <Typography fontWeight={700}>Image &amp; Name Preview</Typography>
                {invitationForm.imageUrl
                  ? <Typography variant="caption" color="success.main">✓ Image set</Typography>
                  : <Typography variant="caption" color="text.secondary">Upload or paste URL</Typography>}
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth size="small" label="Image URL" value={invitationForm.imageUrl}
                  onChange={e => setInvitationForm(p => ({ ...p, imageUrl: e.target.value }))}
                  helperText="Paste a Cloudinary/public URL, or upload below." />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button component="label" variant="outlined" fullWidth sx={{ height: 40 }}
                  startIcon={uploadingImage ? <CircularProgress size={16} /> : <UploadFileIcon />}
                  disabled={uploadingImage} color={accentColor}>
                  {uploadingImage ? 'Uploading…' : 'Upload'}
                  <input hidden accept="image/*" type="file" onChange={onUploadImage} />
                </Button>
              </Grid>

              {invitationForm.imageUrl && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    ✋ Drag / tap on image to place name text
                  </Typography>
                  <Box sx={{
                    border: '2px solid', borderColor: 'divider', borderRadius: 2,
                    overflow: 'hidden', bgcolor: '#111', width: '100%',
                    cursor: 'crosshair', userSelect: 'none', touchAction: 'none',
                  }}
                    onMouseDown={onDragStart} onMouseMove={onDragMove}
                    onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                    onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
                  >
                    <canvas ref={canvasRef} width={600} height={canvasHeight}
                      style={{ display: 'block', width: '100%', height: 'auto' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Name at {Math.round(fontStyle.x * 100)}% · {Math.round(fontStyle.y * 100)}%
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                    {invitationForm.recipientMode !== 'single' && checkedRecipients.length > 1 && (<>
                      <Button size="small" variant="outlined" startIcon={<NavigateBeforeIcon />}
                        disabled={previewIdx === 0}
                        onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}>Prev</Button>
                      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {previewIdx + 1}/{checkedRecipients.length} · <strong>{checkedRecipients[previewIdx]?.name}</strong>
                      </Typography>
                      <Button size="small" variant="outlined" endIcon={<NavigateNextIcon />}
                        disabled={previewIdx >= checkedRecipients.length - 1}
                        onClick={() => setPreviewIdx(i => Math.min(checkedRecipients.length - 1, i + 1))}>Next</Button>
                    </>)}
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                      onClick={handleDownloadPreview}>Download</Button>
                  </Stack>
                  {!imageLoaded && (
                    <Typography variant="caption" color="error">⚠️ Image not loaded — check URL / CORS.</Typography>
                  )}
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ══ ACCORDION 2 — Text Style ══ */}
        <Accordion expanded={expanded === 'style'} onChange={handleAccordion('style')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={22}>✏️</Typography>
              <Box>
                <Typography fontWeight={700}>Name Text Style</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fontStyle.fontFamily} · {fontStyle.fontSize}px · {fontStyle.color}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth select size="small" label="Font Family" value={fontStyle.fontFamily}
                  onChange={e => setFontStyle(p => ({ ...p, fontFamily: e.target.value }))}>
                  {FONT_FAMILIES.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField fullWidth size="small" type="number" label="Size (px)" value={fontStyle.fontSize}
                  inputProps={{ min: 10, max: 200 }}
                  onChange={e => setFontStyle(p => ({ ...p, fontSize: Number(e.target.value) }))} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Color</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <input type="color" value={fontStyle.color}
                      onChange={e => setFontStyle(p => ({ ...p, color: e.target.value }))}
                      style={{ width: 44, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                    <Typography variant="body2">{fontStyle.color}</Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" sx={{ minWidth: 40 }}
                    variant={fontStyle.fontWeight === 'bold' ? 'contained' : 'outlined'} color={accentColor}
                    onClick={() => setFontStyle(p => ({ ...p, fontWeight: p.fontWeight === 'bold' ? 'normal' : 'bold' }))}>
                    <strong>B</strong>
                  </Button>
                  {['left', 'center', 'right'].map(a => (
                    <Button key={a} size="small" sx={{ minWidth: 40 }}
                      variant={fontStyle.textAlign === a ? 'contained' : 'outlined'} color={accentColor}
                      onClick={() => setFontStyle(p => ({ ...p, textAlign: a }))}>
                      {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                    </Button>
                  ))}
                  <Button size="small" variant={fontStyle.shadow ? 'contained' : 'outlined'} color={accentColor}
                    onClick={() => setFontStyle(p => ({ ...p, shadow: !p.shadow }))}>Shadow</Button>
                  <Button size="small" variant="outlined"
                    onClick={() => setFontStyle(p => ({ ...p, x: 0.5, y: 0.88 }))}>Reset</Button>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ══ ACCORDION 3 — Message & RSVP ══ */}
        <Accordion expanded={expanded === 'message'} onChange={handleAccordion('message')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={22}>💬</Typography>
              <Box>
                <Typography fontWeight={700}>Message</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, display: 'block' }}>
                  {invitationForm.message ? invitationForm.message.slice(0, 50) + '…' : 'Write your message here'}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={2}>
              <TextField fullWidth multiline minRows={5}
                label="Message" value={invitationForm.message}
                onChange={e => setInvitationForm(p => ({ ...p, message: e.target.value }))}
                helperText="Use {name} — replaced with each recipient's name."
                placeholder="Dear {name}, you are cordially invited…" />
              <FormControlLabel
                control={<Switch checked={!!invitationForm.includeRsvp} color="success"
                  onChange={e => setInvitationForm(p => ({ ...p, includeRsvp: e.target.checked }))} />}
                label={<Typography variant="body2" fontWeight={600}>Request RSVP confirmation</Typography>}
              />
              {invitationForm.includeRsvp && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth size="small" label="Yes Label" value={invitationForm.rsvpYesLabel}
                      onChange={e => setInvitationForm(p => ({ ...p, rsvpYesLabel: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth size="small" label="No Label" value={invitationForm.rsvpNoLabel}
                      onChange={e => setInvitationForm(p => ({ ...p, rsvpNoLabel: e.target.value }))} />
                  </Grid>
                </Grid>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* ══ ACCORDION 4 — Recipients ══ */}
        <Accordion expanded={expanded === 'recipients'} onChange={handleAccordion('recipients')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={22}>👥</Typography>
              <Box>
                <Typography fontWeight={700}>Recipients</Typography>
                <Typography variant="caption" color="text.secondary">
                  {totalCount > 0 ? `${totalCount} selected` : 'Choose who to send to'}
                  {overLimit && ` (max ${MAX_RECIPIENTS})`}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select size="small" label="Recipient Source" value={invitationForm.recipientMode}
                  onChange={e => { setInvitationForm(p => ({ ...p, recipientMode: e.target.value })); setPreviewIdx(0); }}>
                  {recipientModeOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>

              {invitationForm.recipientMode === 'single' && (<>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Name" value={invitationForm.singleName}
                    onChange={e => setInvitationForm(p => ({ ...p, singleName: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Mobile Number" value={invitationForm.singleNumber}
                    onChange={e => setInvitationForm(p => ({ ...p, singleNumber: e.target.value }))}
                    onBlur={() => {
                      const n = invitationForm.singleNumber.replace(/[^\d]/g, '');
                      if (n.length === 10) setInvitationForm(p => ({ ...p, singleNumber: '91' + n }));
                    }}
                    helperText="10-digit auto-prefixed with 91 · or enter full e.g. 919876543210" />
                </Grid>
              </>)}

              {['csv', 'excel'].includes(invitationForm.recipientMode) && (
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                    <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />} color={accentColor}>
                      Upload {invitationForm.recipientMode.toUpperCase()}
                      <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </Button>
                    {fileName && (
                      <Typography variant="body2" color="text.secondary">
                        📄 {fileName} — <strong>{selectedRecipients.length}</strong> found
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              )}
            </Grid>

            {selectedRecipients.length > 0 && invitationForm.recipientMode !== 'single' && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {checkedRecipients.length} / {selectedRecipients.length} selected
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setSelectedRecipients(prev => prev.map(r => ({ ...r, checked: true })))}>All</Button>
                    <Button size="small" onClick={() => setSelectedRecipients(prev => prev.map(r => ({ ...r, checked: false })))}>None</Button>
                  </Stack>
                </Stack>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                  <Grid container>
                    {selectedRecipients.map((r, idx) => (
                      <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          label={<Typography variant="body2"><strong>{r.name}</strong> · {r.mobile}</Typography>}
                          control={<Checkbox size="small" checked={r.checked !== false}
                            onChange={() => setSelectedRecipients(prev =>
                              prev.map((x, i) => i === idx ? { ...x, checked: x.checked === false } : x))} />}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* ── Queue status (shown after Send is clicked) ── */}
        {queue.length > 0 && (
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography fontWeight={700}>
                📬 Sending Queue — {delivered} delivered · {failed} failed · {pending} pending
              </Typography>
              <Stack direction="row" spacing={1}>
                {queueActive && !queuePaused && (
                  <Button size="small" variant="outlined" color="warning" startIcon={<PauseIcon />}
                    onClick={pauseQueue}>Pause</Button>
                )}
                {queueActive && queuePaused && (
                  <Button size="small" variant="outlined" color="success" startIcon={<PlayArrowIcon />}
                    onClick={resumeQueue}>Resume</Button>
                )}
                {queueActive && (
                  <Button size="small" variant="outlined" color="error" startIcon={<StopIcon />}
                    onClick={cancelQueue}>Cancel</Button>
                )}
                {queueDone && (
                  <Button size="small" variant="outlined" onClick={resetQueue}>Clear Queue</Button>
                )}
              </Stack>
            </Stack>

            {/* Rate-limit cooldown banner */}
            {cooldown && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                {cooldown.type === 'hour'
                  ? `⏸ Hour cap reached (${MAX_PER_HOUR}/hr). Resuming in ${fmtSecs(cooldown.seconds)}…`
                  : `⏳ Minute cap reached (${MAX_PER_MINUTE}/min). Resuming in ${fmtSecs(cooldown.seconds)}…`}
              </Alert>
            )}

            {/* Progress bar */}
            <Box sx={{ mb: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {progress}% complete
                </Typography>
                {queueActive && !queueDone && (
                  <Typography variant="caption" color="text.secondary">
                    ETA ~{fmtSecs(etaSecs)} · {DELAY_MIN_S}–{DELAY_MAX_S}s gap · max {MAX_PER_MINUTE}/min · {MAX_PER_HOUR}/hr
                  </Typography>
                )}
                {queueDone && (
                  <Typography variant="caption" color={failed > 0 ? 'error' : 'success.main'} fontWeight={700}>
                    {cancelRef.current ? 'Cancelled' : 'Done'} — {delivered} sent, {failed} failed
                  </Typography>
                )}
              </Stack>
              <LinearProgress
                variant="determinate" value={progress}
                color={failed > 0 ? 'error' : queueDone ? 'success' : accentColor}
                sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Queue table */}
            <Box sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {queue.map((item, idx) => {
                // When done, use localResultsRef for accurate final status
                const finalStatus = queueDone && localResultsRef.current[idx]
                  ? (localResultsRef.current[idx].status === 'SENT' ? 'delivered' : 'failed')
                  : item.status;
                const finalError = queueDone && localResultsRef.current[idx]
                  ? localResultsRef.current[idx].error
                  : item.error;
                return (
                <Stack key={idx} direction="row" alignItems="center" spacing={1.5}
                  sx={{
                    px: 1.5, py: 0.75,
                    borderBottom: idx < queue.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor: finalStatus === 'sending' ? (isBaileys ? '#fffde7' : '#e3f2fd') : 'transparent',
                  }}>
                  <Typography variant="body2" sx={{ minWidth: 24, color: 'text.secondary' }}>
                    {idx + 1}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={finalStatus === 'sending' ? 700 : 400}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.mobile}</Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={
                      finalStatus === 'pending'   ? '⏳ Pending'   :
                      finalStatus === 'sending'   ? '🔄 Sending'   :
                      finalStatus === 'delivered' ? '✅ Delivered' : '❌ Failed'
                    }
                    color={
                      finalStatus === 'delivered' ? 'success' :
                      finalStatus === 'failed'    ? 'error'   :
                      finalStatus === 'sending'   ? (isBaileys ? 'warning' : 'primary') : 'default'
                    }
                  />
                  {finalStatus === 'failed' && finalError && (
                    <Tooltip title={finalError}>
                      <Typography variant="caption" color="error" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {finalError}
                      </Typography>
                    </Tooltip>
                  )}
                </Stack>
                );
              })}
            </Box>
          </CardContent></Card>
        )}

        {/* ── Blast title + send button ── */}
        {!queueActive && !queueDone && (
          <Card><CardContent>
            <Stack spacing={2}>
              <TextField fullWidth size="small" label="Blast Title (saved to history)"
                value={blastTitle} onChange={e => setBlastTitle(e.target.value)}
                placeholder={`Blast ${new Date().toLocaleDateString()}`} />
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  {totalCount} recipient{totalCount !== 1 ? 's' : ''} selected
                  {overLimit && ` — only first ${MAX_RECIPIENTS} will be sent`}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                  <SaveCampaignButton
                    getPayload={() => ({
                      title:       blastTitle.trim() || `Blast ${new Date().toLocaleDateString()}`,
                      imageUrl:    invFormRef.current.imageUrl,
                      message:     invFormRef.current.message,
                      fontStyle:   fontStyleRef.current,
                      includeRsvp: invFormRef.current.includeRsvp,
                      rsvpYesLabel:invFormRef.current.rsvpYesLabel,
                      rsvpNoLabel: invFormRef.current.rsvpNoLabel,
                      recipients:  getCheckedRecipients().slice(0, MAX_RECIPIENTS).map(r => ({ name: r.name, mobile: r.mobile })),
                      type: isBaileys ? 'AUTO' : 'MANUAL',
                    })}
                    disabled={totalCount === 0 || (!invitationForm.imageUrl && !invitationForm.message.trim())}
                  />
                  <Tooltip title={`Max ${MAX_PER_MINUTE}/min · ${MAX_PER_HOUR}/hr · ${DELAY_MIN_S}–${DELAY_MAX_S}s gap`}>
                    <span>
                      <Button variant="contained" color={accentColor} size="large" startIcon={<SendIcon />}
                        disabled={totalCount === 0 || (!invitationForm.imageUrl && !invitationForm.message.trim())}
                        onClick={startQueue}>
                        Start Blast {totalCount > 0 ? `(${Math.min(totalCount, MAX_RECIPIENTS)})` : ''}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Stack>
          </CardContent></Card>
        )}

        {/* After queue done — option to send again */}
        {queueDone && (
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="outlined" color={accentColor} onClick={resetQueue}>
              Send Another Blast
            </Button>
          </Stack>
        )}

      </Stack>
    </PageSurface>
  );
}

// ── Manual Invite Panel (wa.me links — works even when API is banned) ─────────

function ManualInvitePanel() {
  const canvasRef    = useRef(null);
  const imageElRef   = useRef(null);
  const isDragging   = useRef(false);

  const [fileName,      setFileName]      = useState('');
  const [recipients,    setRecipients]    = useState([]);
  const [imageUrl,      setImageUrl]      = useState('');
  const [message,       setMessage]       = useState('');
  const [fontStyle,     setFontStyle]     = useState(emptyFontStyle);
  const [imageLoaded,   setImageLoaded]   = useState(false);
  const [canvasHeight,  setCanvasHeight]  = useState(400);
  const [links,         setLinks]         = useState([]);   // generated wa.me entries
  const [generating,    setGenerating]    = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState(null);
  const [autoSaving,    setAutoSaving]    = useState(false);
  const [sentSet,       setSentSet]       = useState(new Set());
  const [linkTab,       setLinkTab]       = useState('tosend');
  const [linkSearch,    setLinkSearch]    = useState('');
  const [uploadingImg,  setUploadingImg]  = useState(false);
  const [expanded,      setExpanded]      = useState('excel');
  const [previewIdx,    setPreviewIdx]    = useState(0);

  const handleAccordion = (panel) => (_, isOpen) => setExpanded(isOpen ? panel : false);

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageUrl) { setImageLoaded(false); imageElRef.current = null; return; }
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElRef.current = img;
      const h = img.naturalHeight && img.naturalWidth
        ? Math.round(600 * img.naturalHeight / img.naturalWidth) : 400;
      setCanvasHeight(Math.max(200, Math.min(h, 900)));
      setImageLoaded(true);
    };
    img.onerror = () => { imageElRef.current = null; setImageLoaded(false); };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── Redraw canvas ───────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    if (!imageLoaded || !canvasRef.current || !imageElRef.current) return;
    const name = recipients[previewIdx]?.name || 'Guest';
    drawNameOnCanvas(canvasRef.current, imageElRef.current, name, fontStyle);
  }, [imageLoaded, previewIdx, fontStyle, recipients]);
  useEffect(() => { redraw(); }, [redraw]);

  // ── Drag to position ────────────────────────────────────────────────────────
  const getFrac = (e) => {
    const c = canvasRef.current; if (!c) return null;
    const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };
  const onDragStart = (e) => { e.preventDefault(); isDragging.current = true; const p = getFrac(e); if (p) setFontStyle(f => ({ ...f, ...p })); };
  const onDragMove  = (e) => { if (!isDragging.current) return; e.preventDefault(); const p = getFrac(e); if (p) setFontStyle(f => ({ ...f, ...p })); };
  const onDragEnd   = () => { isDragging.current = false; };

  // ── Upload image ────────────────────────────────────────────────────────────
  const onUploadImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImg(true);
    try {
      const { default: api } = await import('../api');
      const fd = new FormData(); fd.append('file', file); fd.append('folder', 'bk_award_invites');
      const res = await api.post('/uploads/public', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(res?.data?.url || '');
    } finally { setUploadingImg(false); }
  };

  // ── Parse Excel ─────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    setRecipients(parseRowsToRecipients(rows));
    setLinks([]);
    setPreviewIdx(0);
    setExpanded('image');
  };

  // ── Build personalised image blob URL for one recipient ─────────────────────
  const buildBlobUrl = (name) => new Promise((resolve) => {
    if (!imageElRef.current) { resolve(null); return; }
    const off = document.createElement('canvas');
    off.width  = 1200;
    off.height = Math.round(1200 * (imageElRef.current.naturalHeight / imageElRef.current.naturalWidth)) || 800;
    drawNameOnCanvas(off, imageElRef.current, name, fontStyle);
    off.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
  });

  // ── Generate wa.me links for all recipients ──────────────────────────────────
  const generateLinks = async () => {
    if (!recipients.length) return;
    setGenerating(true);
    const result = [];
    for (const r of recipients) {
      const personalMsg = (message || '').replace(/\{name\}/gi, r.name);
      const waUrl = `https://wa.me/${r.mobile}?text=${encodeURIComponent(personalMsg)}`;
      const imgBlobUrl = imageLoaded ? await buildBlobUrl(r.name) : null;
      result.push({ ...r, waUrl, imgBlobUrl, personalMsg });
    }
    setLinks(result);
    setGenerating(false);
    setExpanded('links');

    // Auto-save to DB so links are accessible in "📱 Saved" tab
    setAutoSaving(true);
    try {
      const payload = {
        title:      `Manual — ${new Date().toLocaleDateString()}`,
        imageUrl,
        message,
        fontStyle,
        type:       'MANUAL',
        status:     'DRAFT',
        recipients: result.map(r => ({ name: r.name, mobile: r.mobile, waUrl: r.waUrl })),
      };
      let res;
      if (savedCampaignId) {
        res = await whatsappService.updateCampaign(savedCampaignId, payload);
      } else {
        res = await whatsappService.saveCampaign(payload);
        setSavedCampaignId(res.data?._id || null);
      }
    } catch (_) { /* silent — links still shown in UI */ }
    setAutoSaving(false);
  };

  const downloadImage = (blobUrl, name) => {
    const a = document.createElement('a');
    a.href = blobUrl; a.download = `invite_${name.replace(/\s+/g, '_')}.png`; a.click();
  };

  return (
    <PageSurface sx={{ pb: { xs: 10, sm: 3 } }}>
      <Stack spacing={1.5}>

        {/* Header */}
        <Card sx={{ borderRadius: 3 }}><CardContent sx={{ py: '10px !important', px: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography fontSize={22}>📱</Typography>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>Manual Invitation — wa.me Links</Typography>
              <Typography variant="caption" color="text.secondary">
                Works even when API is banned · Upload Excel → generate links → tap to send from your phone
              </Typography>
            </Box>
          </Stack>
        </CardContent></Card>

        {/* Step 1 — Excel Upload */}
        <Accordion expanded={expanded === 'excel'} onChange={handleAccordion('excel')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={20}>1️⃣</Typography>
              <Box>
                <Typography fontWeight={700}>Upload Recipients Excel</Typography>
                <Typography variant="caption" color="text.secondary">
                  {recipients.length > 0 ? `✓ ${recipients.length} recipients loaded` : 'Columns: name, mobile (or phone/number/whatsapp)'}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={2}>
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ alignSelf: 'flex-start' }}>
                Choose Excel / CSV
                <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
              </Button>
              {fileName && (
                <Typography variant="body2" color="text.secondary">📄 {fileName} — <strong>{recipients.length}</strong> recipients found</Typography>
              )}
              {recipients.length > 0 && (
                <Box sx={{ maxHeight: 180, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {recipients.map((r, i) => (
                    <Stack key={i} direction="row" spacing={2} sx={{ px: 1.5, py: 0.75, borderBottom: i < recipients.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ minWidth: 24, color: 'text.secondary' }}>{i + 1}</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{r.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{r.mobile}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Step 2 — Image */}
        <Accordion expanded={expanded === 'image'} onChange={handleAccordion('image')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={20}>2️⃣</Typography>
              <Box>
                <Typography fontWeight={700}>Invitation Image</Typography>
                <Typography variant="caption" color="text.secondary">
                  {imageUrl ? '✓ Image set · drag to position name' : 'Optional — paste URL or upload'}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField fullWidth size="small" label="Image URL" value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)} />
                <Button component="label" variant="outlined" sx={{ whiteSpace: 'nowrap', minWidth: 100 }}
                  startIcon={uploadingImg ? <CircularProgress size={16} /> : <UploadFileIcon />} disabled={uploadingImg}>
                  {uploadingImg ? 'Uploading…' : 'Upload'}
                  <input hidden accept="image/*" type="file" onChange={onUploadImage} />
                </Button>
              </Stack>

              {imageUrl && (
                <>
                  <Typography variant="caption" color="text.secondary">✋ Drag to position name text on image</Typography>
                  <Box sx={{ border: '2px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#111', cursor: 'crosshair', userSelect: 'none', touchAction: 'none' }}
                    onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                    onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
                    <canvas ref={canvasRef} width={600} height={canvasHeight} style={{ display: 'block', width: '100%', height: 'auto' }} />
                  </Box>
                  {recipients.length > 1 && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<NavigateBeforeIcon />}
                        disabled={previewIdx === 0} onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}>Prev</Button>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>
                        {previewIdx + 1} / {recipients.length} · <strong>{recipients[previewIdx]?.name}</strong>
                      </Typography>
                      <Button size="small" variant="outlined" endIcon={<NavigateNextIcon />}
                        disabled={previewIdx >= recipients.length - 1} onClick={() => setPreviewIdx(i => Math.min(recipients.length - 1, i + 1))}>Next</Button>
                    </Stack>
                  )}
                  {/* Font style controls */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <TextField select size="small" label="Font" value={fontStyle.fontFamily} sx={{ minWidth: 130 }}
                      onChange={e => setFontStyle(f => ({ ...f, fontFamily: e.target.value }))}>
                      {FONT_FAMILIES.map(ff => <MenuItem key={ff.value} value={ff.value}>{ff.label}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="number" label="Size" value={fontStyle.fontSize} sx={{ width: 80 }}
                      inputProps={{ min: 10, max: 200 }}
                      onChange={e => setFontStyle(f => ({ ...f, fontSize: Number(e.target.value) }))} />
                    <Stack spacing={0.25} justifyContent="center">
                      <Typography variant="caption" color="text.secondary">Color</Typography>
                      <input type="color" value={fontStyle.color}
                        onChange={e => setFontStyle(f => ({ ...f, color: e.target.value }))}
                        style={{ width: 44, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                    </Stack>
                    <Button size="small" variant={fontStyle.fontWeight === 'bold' ? 'contained' : 'outlined'}
                      onClick={() => setFontStyle(f => ({ ...f, fontWeight: f.fontWeight === 'bold' ? 'normal' : 'bold' }))}><strong>B</strong></Button>
                    <Button size="small" variant={fontStyle.shadow ? 'contained' : 'outlined'}
                      onClick={() => setFontStyle(f => ({ ...f, shadow: !f.shadow }))}>Shadow</Button>
                  </Stack>
                </>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Step 3 — Message */}
        <Accordion expanded={expanded === 'message'} onChange={handleAccordion('message')}
          sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography fontSize={20}>3️⃣</Typography>
              <Box>
                <Typography fontWeight={700}>WhatsApp Message</Typography>
                <Typography variant="caption" color="text.secondary">
                  {message ? message.slice(0, 50) + '…' : 'Write your message — {name} replaced per recipient'}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <TextField fullWidth multiline minRows={5} label="Message"
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Dear {name}, you are cordially invited to our event…"
              helperText="{name} is automatically replaced with each recipient's name." />
          </AccordionDetails>
        </Accordion>

        {/* Generate + Save Campaign buttons */}
        {recipients.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <SaveCampaignButton
              getPayload={() => ({
                title:      `Manual — ${new Date().toLocaleDateString()}`,
                imageUrl,
                message,
                fontStyle,
                recipients: recipients.map(r => ({ name: r.name, mobile: r.mobile })),
                type: 'MANUAL',
              })}
              disabled={!message.trim() && !imageUrl}
            />
            <Button variant="contained" size="large" color="success" sx={{ flex: 1, borderRadius: 3 }}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              disabled={generating || (!message.trim() && !imageUrl)}
              onClick={generateLinks}>
              {generating ? `Generating… (${links.length}/${recipients.length})` : `Generate ${recipients.length} wa.me Links`}
            </Button>
            {autoSaving && <Typography variant="caption" color="text.secondary" alignSelf="center">💾 Saving…</Typography>}
            {!autoSaving && savedCampaignId && <Typography variant="caption" color="success.main" alignSelf="center">✅ Auto-saved</Typography>}
          </Stack>
        )}

        {/* Step 4 — Links list with To Send / Sent tabs */}
        {links.length > 0 && (
          <Accordion expanded={expanded === 'links'} onChange={handleAccordion('links')}
            sx={{ borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography fontSize={20}>4️⃣</Typography>
                <Box>
                  <Typography fontWeight={700}>Send Links ({links.length})</Typography>
                  <Typography variant="caption" color="text.secondary">
                    📤 To Send: {links.length - sentSet.size} &nbsp;·&nbsp; ✅ Sent: {sentSet.size}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={1.5}>
                {/* Search */}
                <TextField size="small" fullWidth placeholder="Search by name or number…"
                  value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>🔍</Typography> }} />
                {/* Sub-tabs */}
                <Stack direction="row" spacing={1}>
                  <Button size="small"
                    variant={linkTab === 'tosend' ? 'contained' : 'outlined'}
                    onClick={() => setLinkTab('tosend')}>
                    📤 To Send ({links.length - sentSet.size})
                  </Button>
                  <Button size="small"
                    variant={linkTab === 'sent' ? 'contained' : 'outlined'}
                    color={linkTab === 'sent' ? 'success' : 'inherit'}
                    onClick={() => setLinkTab('sent')}>
                    ✅ Sent ({sentSet.size})
                  </Button>
                  {sentSet.size > 0 && (
                    <Button size="small" variant="text" color="warning"
                      onClick={() => setSentSet(new Set())}>
                      Reset
                    </Button>
                  )}
                </Stack>

                {/* Recipient cards */}
                {links
                  .map((r, idx) => ({ r, idx }))
                  .filter(({ r, idx }) => {
                    const tabMatch = linkTab === 'tosend' ? !sentSet.has(idx) : sentSet.has(idx);
                    const q = linkSearch.trim().toLowerCase();
                    const searchMatch = !q || r.name.toLowerCase().includes(q) || r.mobile.includes(q);
                    return tabMatch && searchMatch;
                  })
                  .map(({ r, idx }) => (
                  <Card key={idx} variant="outlined"
                    sx={{ borderRadius: 2, opacity: sentSet.has(idx) ? 0.75 : 1 }}>
                    <CardContent sx={{ py: '10px !important', px: 1.5 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {sentSet.has(idx) && <Typography fontSize={14}>✅</Typography>}
                            <Typography variant="body2" fontWeight={700}>{r.name}</Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{r.mobile}</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {/* Download image */}
                          {r.imgBlobUrl && (
                            <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                              onClick={() => downloadImage(r.imgBlobUrl, r.name)}>
                              Image
                            </Button>
                          )}
                          {/* Share: native JID intent (APK) / Web Share (PWA) / download+wa.me (desktop) */}
                          {r.imgBlobUrl && (
                            <Button size="small" variant="contained" color="secondary"
                              onClick={async () => {
                                setSentSet(prev => new Set([...prev, idx]));
                                await shareWhatsApp({ phone: r.mobile, message: r.personalMsg, blobUrl: r.imgBlobUrl, name: r.name });
                              }}>
                              📤 Share
                            </Button>
                          )}
                          {/* Send WhatsApp wa.me */}
                          <Button size="small" variant="contained" color="success"
                            onClick={() => { setSentSet(prev => new Set([...prev, idx])); openExternalUrl(r.waUrl); }}>
                            📱 Send WA
                          </Button>
                          {/* Toggle sent/unsent */}
                          {sentSet.has(idx) ? (
                            <Button size="small" variant="text" color="warning"
                              onClick={() => setSentSet(prev => { const s = new Set(prev); s.delete(idx); return s; })}>
                              Undo
                            </Button>
                          ) : (
                            <Button size="small" variant="text" color="success"
                              onClick={() => setSentSet(prev => new Set([...prev, idx]))}>
                              Mark Sent
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {links.filter((_, i) => linkTab === 'tosend' ? !sentSet.has(i) : sentSet.has(i)).length === 0 && (
                  <Typography color="text.secondary" textAlign="center" py={1.5} variant="body2">
                    {linkTab === 'tosend' ? '🎉 All links sent!' : 'No sent links yet — tap Send WA to mark as sent.'}
                  </Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

      </Stack>
    </PageSurface>
  );
}

// ── Manual Campaigns Panel (saved wa.me link campaigns) ───────────────────────

function ManualCampaignsPanel() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [imgCache,  setImgCache]  = useState({});
  const [sentSet,   setSentSet]   = useState(new Set());
  const [linkTab,   setLinkTab]   = useState('tosend');
  const [linkSearch, setLinkSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await whatsappService.listCampaigns();
      const all = Array.isArray(r.data) ? r.data : [];
      setCampaigns(all.filter(c => c.type === 'MANUAL'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved campaign?')) return;
    await whatsappService.deleteCampaign(id).catch(() => null);
    load();
  };

  // Re-generate personalised image blob for a recipient (uses saved imageUrl + fontStyle)
  const getImg = useCallback(async (campaign, recipientName) => {
    const cacheKey = `${campaign._id}__${recipientName}`;
    if (imgCache[cacheKey]) return imgCache[cacheKey];
    if (!campaign.imageUrl) return null;
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const off = document.createElement('canvas');
        off.width  = 1200;
        off.height = Math.round(1200 * (img.naturalHeight / img.naturalWidth)) || 800;
        drawNameOnCanvas(off, img, recipientName, campaign.fontStyle || emptyFontStyle);
        off.toBlob((blob) => {
          const url = blob ? URL.createObjectURL(blob) : null;
          setImgCache(prev => ({ ...prev, [cacheKey]: url }));
          resolve(url);
        }, 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = campaign.imageUrl;
    });
  }, [imgCache]);

  const downloadImg = async (campaign, name) => {
    const url = await getImg(campaign, name);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `invite_${name.replace(/\s+/g,'_')}.png`; a.click();
  };

  const shareImg = async (campaign, r) => {
    const url = await getImg(campaign, r.name);
    if (!url) return;
    const personalMsg = (campaign.message || '').replace(/\{name\}/gi, r.name);
    await shareWhatsApp({ phone: r.mobile, message: personalMsg, blobUrl: url, name: r.name });
  };

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selected) {
    const recs = selected.recipients || [];
    const filtered = recs.filter((_, i) => linkTab === 'tosend' ? !sentSet.has(i) : sentSet.has(i));
    return (
      <PageSurface sx={{ pb: { xs: 10, sm: 3 } }}>
        <Stack spacing={2}>
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" fontWeight={800}>{selected.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {recs.length} recipients · saved {new Date(selected.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => { setSelected(null); setSentSet(new Set()); setLinkTab('tosend'); }}>← Back</Button>
            </Stack>
          </CardContent></Card>

          {selected.message && (
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Message</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                {selected.message}
              </Typography>
            </CardContent></Card>
          )}

          {selected.imageUrl && (
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Base Image</Typography>
              <Box component="img" src={selected.imageUrl} alt="base"
                sx={{ width: '100%', maxWidth: 320, borderRadius: 1, objectFit: 'contain' }} />
            </CardContent></Card>
          )}

          <Card><CardContent>
            <Typography fontWeight={700} sx={{ mb: 1.5 }}>
              Recipients & Links ({recs.length}) — 📤 To Send: {recs.length - sentSet.size} · ✅ Sent: {sentSet.size}
            </Typography>

            {/* Search */}
            <TextField size="small" fullWidth placeholder="Search by name or number…"
              value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
              sx={{ mb: 1 }}
              InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>🔍</Typography> }} />
            {/* Sub-tabs */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Button size="small" variant={linkTab === 'tosend' ? 'contained' : 'outlined'}
                onClick={() => setLinkTab('tosend')}>
                📤 To Send ({recs.length - sentSet.size})
              </Button>
              <Button size="small"
                variant={linkTab === 'sent' ? 'contained' : 'outlined'}
                color={linkTab === 'sent' ? 'success' : 'inherit'}
                onClick={() => setLinkTab('sent')}>
                ✅ Sent ({sentSet.size})
              </Button>
              {sentSet.size > 0 && (
                <Button size="small" variant="text" color="warning" onClick={() => setSentSet(new Set())}>Reset</Button>
              )}
            </Stack>

            <Stack spacing={1}>
              {filtered.length === 0 && (
                <Typography color="text.secondary" textAlign="center" py={1.5} variant="body2">
                  {linkTab === 'tosend' ? '🎉 All sent!' : 'No sent links yet.'}
                </Typography>
              )}
              {recs.map((r, idx) => {
                if (linkTab === 'tosend' ? sentSet.has(idx) : !sentSet.has(idx)) return null;
                const q = linkSearch.trim().toLowerCase();
                if (q && !r.name.toLowerCase().includes(q) && !r.mobile.includes(q)) return null;
                const personalMsg = (selected.message || '').replace(/\{name\}/gi, r.name);
                return (
                  <Card key={idx} variant="outlined" sx={{ borderRadius: 2, opacity: sentSet.has(idx) ? 0.75 : 1 }}>
                    <CardContent sx={{ py: '10px !important', px: 1.5 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {sentSet.has(idx) && <Typography fontSize={14}>✅</Typography>}
                            <Typography variant="body2" fontWeight={700}>{r.name}</Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{r.mobile}</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {selected.imageUrl && (
                            <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                              onClick={() => downloadImg(selected, r.name)}>
                              Image
                            </Button>
                          )}
                          {selected.imageUrl && (
                            <Button size="small" variant="contained" color="secondary"
                              onClick={() => shareImg(selected, r)}>
                              📤 Share + Open WA
                            </Button>
                          )}
                          {r.waUrl ? (
                            <Button size="small" variant="contained" color="success"
                              onClick={() => { setSentSet(prev => new Set([...prev, idx])); openExternalUrl(r.waUrl); }}>
                              📱 Send WA
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No link</Typography>
                          )}
                          {sentSet.has(idx) ? (
                            <Button size="small" variant="text" color="warning"
                              onClick={() => setSentSet(prev => { const s = new Set(prev); s.delete(idx); return s; })}>
                              Undo
                            </Button>
                          ) : (
                            <Button size="small" variant="text" color="success"
                              onClick={() => setSentSet(prev => new Set([...prev, idx]))}>
                              Mark Sent
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </CardContent></Card>
        </Stack>
      </PageSurface>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <PageSurface sx={{ pb: { xs: 10, sm: 3 } }}>
      <Stack spacing={2}>
        <Card><CardContent sx={{ py: '10px !important', px: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>📱 Saved Manual Campaigns</Typography>
              <Typography variant="caption" color="text.secondary">
                Campaigns saved from the Manual tab — wa.me links ready to reuse
              </Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={load} disabled={loading}>Refresh</Button>
          </Stack>
        </CardContent></Card>

        {loading && <LinearProgress />}

        {!loading && campaigns.length === 0 && (
          <Card><CardContent>
            <Typography color="text.secondary" textAlign="center" py={2}>
              No saved manual campaigns yet. Go to <strong>📱 Manual</strong> tab, upload Excel &amp; generate links — they auto-save here.
            </Typography>
          </CardContent></Card>
        )}

        {campaigns.map(c => (
          <Card key={c._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: '12px !important', px: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography fontWeight={700}>{c.title || 'Untitled'}</Typography>
                    <Chip label={`${c.recipients?.length || 0} recipients`} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Saved {new Date(c.createdAt).toLocaleString()}
                  </Typography>
                  {c.message && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      💬 {c.message.slice(0, 60)}{c.message.length > 60 ? '…' : ''}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="contained" onClick={() => setSelected(c)}>Open Links</Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(c._id)}>Delete</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </PageSurface>
  );
}

// ── Campaigns Panel ───────────────────────────────────────────────────────────

function CampaignsPanel() {
  const [campaigns, setCampaigns]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [selected,  setSelected]    = useState(null);  // detail view
  const [saving,    setSaving]      = useState(false);
  const [sending,   setSending]     = useState('');    // campaign id being sent

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await whatsappService.listCampaigns();
      setCampaigns(Array.isArray(r.data) ? r.data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s so status updates (SENDING→SENT) reflect live
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    await whatsappService.deleteCampaign(id).catch(() => null);
    load();
  };

  const handleSendNow = async (id) => {
    setSending(id);
    try {
      await whatsappService.sendCampaignNow(id);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || 'Send failed');
    } finally { setSending(''); }
  };

  const handleCancel = async (id) => {
    await whatsappService.updateCampaign(id, { status: 'CANCELLED' }).catch(() => null);
    load();
  };

  const statusColor = (s) =>
    s === 'SENT'      ? 'success' :
    s === 'SENDING'   ? 'warning' :
    s === 'SCHEDULED' ? 'primary' :
    s === 'CANCELLED' ? 'error'   : 'default';

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const r = selected.recipients || [];
    const sent   = r.filter(x => x.status === 'SENT').length;
    const failed = r.filter(x => x.status === 'FAILED').length;
    const pending = r.filter(x => x.status === 'PENDING').length;
    return (
      <PageSurface>
        <Stack spacing={2}>
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" fontWeight={800}>{selected.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.type} · {selected.status} · {new Date(selected.createdAt).toLocaleString()}
                </Typography>
                {selected.scheduledAt && (
                  <Typography variant="body2" color="primary.main">
                    🗓 Scheduled: {new Date(selected.scheduledAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
              <Button size="small" variant="outlined" onClick={() => setSelected(null)}>← Back</Button>
            </Stack>
          </CardContent></Card>

          <Grid container spacing={2}>
            {[['Total', r.length, 'text.primary'], ['Sent', sent, 'success.main'], ['Failed', failed, 'error.main'], ['Pending', pending, 'text.secondary']].map(([label, val, color]) => (
              <Grid key={label} size={{ xs: 6, md: 3 }}>
                <Card><CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={800} color={color}>{val}</Typography>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: selected.imageUrl ? 7 : 12 }}>
              <Card><CardContent>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Message</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  {selected.message || '(no message)'}
                </Typography>
              </CardContent></Card>
            </Grid>
            {selected.imageUrl && (
              <Grid size={{ xs: 12, md: 5 }}>
                <Card><CardContent>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>Image</Typography>
                  <Box component="img" src={selected.imageUrl} alt="Campaign image"
                    sx={{ width: '100%', borderRadius: 1, objectFit: 'contain', maxHeight: 300 }} />
                </CardContent></Card>
              </Grid>
            )}
          </Grid>

          {r.length > 0 && (
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}>Recipients ({r.length})</Typography>
              <Box sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {r.map((rec, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" spacing={1.5}
                    sx={{ px: 1.5, py: 0.75, borderBottom: idx < r.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>{idx + 1}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{rec.name || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{rec.mobile}</Typography>
                    </Box>
                    <Chip size="small"
                      label={rec.status === 'SENT' ? '✅ Sent' : rec.status === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
                      color={rec.status === 'SENT' ? 'success' : rec.status === 'FAILED' ? 'error' : 'default'} />
                  </Stack>
                ))}
              </Box>
            </CardContent></Card>
          )}
        </Stack>
      </PageSurface>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <PageSurface>
      <Stack spacing={2}>
        <Card><CardContent sx={{ py: '10px !important', px: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>🗓 Campaigns</Typography>
              <Typography variant="caption" color="text.secondary">
                Save &amp; schedule invitation campaigns · auto-send via Baileys at scheduled time
              </Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={load} disabled={loading}>Refresh</Button>
          </Stack>
        </CardContent></Card>

        {loading && <LinearProgress />}

        {!loading && campaigns.length === 0 && (
          <Card><CardContent>
            <Typography color="text.secondary" textAlign="center" py={2}>
              No campaigns yet. Use <strong>Save Campaign</strong> in the Invitation or Manual tab to create one.
            </Typography>
          </CardContent></Card>
        )}

        {campaigns.map(c => (
          <Card key={c._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: '12px !important', px: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography fontWeight={700}>{c.title || 'Untitled'}</Typography>
                    <Chip label={c.status} size="small" color={statusColor(c.status)} />
                    <Chip label={c.type} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {c.recipients?.length || 0} recipients
                    {c.scheduledAt ? ` · 🗓 ${new Date(c.scheduledAt).toLocaleString()}` : ''}
                    {c.sentCount > 0 ? ` · ✅ ${c.sentCount} sent` : ''}
                    {c.failedCount > 0 ? ` · ❌ ${c.failedCount} failed` : ''}
                  </Typography>
                  {c.message && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      💬 {c.message.slice(0, 60)}{c.message.length > 60 ? '…' : ''}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => setSelected(c)}>Report</Button>
                  {['DRAFT','SCHEDULED'].includes(c.status) && (
                    <Button size="small" variant="contained" color="success"
                      disabled={sending === c._id}
                      startIcon={sending === c._id ? <CircularProgress size={14} color="inherit" /> : null}
                      onClick={() => handleSendNow(c._id)}>
                      Send Now
                    </Button>
                  )}
                  {c.status === 'SCHEDULED' && (
                    <Button size="small" variant="outlined" color="warning" onClick={() => handleCancel(c._id)}>Cancel</Button>
                  )}
                  {['SENT','CANCELLED'].includes(c.status) && (
                    <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(c._id)}>Delete</Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </PageSurface>
  );
}

// ── Logs panel ────────────────────────────────────────────────────────────────

function LogsPanel({ logs, isBaileys }) {
  const logRows = {
    columns: [
      { key: 'contact',   label: 'Contact'   },
      { key: 'direction', label: 'Direction' },
      { key: 'source',    label: 'Source'    },
      { key: 'message',   label: 'Message'   },
      { key: 'status',    label: 'Status'    },
      { key: 'when',      label: 'Time'      },
    ],
    data: logs.map(item => ({
      title:     item.contactName || item.from || item.to || 'Message',
      contact:   item.contactName || item.from || item.to || '-',
      direction: item.direction || '-',
      source:    item.source    || '-',
      message:   item.bodyText  || item.text  || '-',
      status: () => (
        <Chip label={item.status || '-'} size="small"
          color={
            item.status === 'SENT' || item.status === 'READ' ? 'success' :
            item.status === 'FAILED' ? 'error' : 'default'
          } />
      ),
      when: formatWhen(item.createdAt),
    })),
  };
  return (
    <CollectionSection
      title={isBaileys ? '🐝 Baileys Message Logs' : 'Message Logs'}
      subtitle={isBaileys
        ? 'All Baileys messages: incoming, outgoing, auto replies and invitations.'
        : 'Incoming webhook messages, manual replies and auto replies.'}
      rows={logRows}
    />
  );
}

// ── Blast History Panel ───────────────────────────────────────────────────────

function BlastHistoryPanel({ blasts, onView, isBaileys }) {
  const [selectedBlast, setSelectedBlast] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleView = async (blast) => {
    setLoadingDetail(true);
    try {
      const res = await whatsappService.getBlast(blast._id);
      setSelectedBlast(res.data);
    } catch (_) { setSelectedBlast(blast); }
    finally { setLoadingDetail(false); }
  };

  const accentColor = isBaileys ? 'warning' : 'primary';

  if (selectedBlast) {
    const recipients = selectedBlast.recipients || [];
    const sent   = recipients.filter(r => r.status === 'SENT').length;
    const failed = recipients.filter(r => r.status === 'FAILED').length;
    const pending = recipients.filter(r => r.status === 'PENDING').length;
    return (
      <PageSurface>
        <Stack spacing={2}>
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" fontWeight={800}>{selectedBlast.title || 'Blast Report'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(selectedBlast.createdAt).toLocaleString()} · {selectedBlast.status}
                </Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => setSelectedBlast(null)}>← Back</Button>
            </Stack>
          </CardContent></Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color="text.primary">{selectedBlast.totalRecipients || recipients.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color="success.main">{sent}</Typography>
                <Typography variant="body2" color="text.secondary">Sent</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color="error.main">{failed}</Typography>
                <Typography variant="body2" color="text.secondary">Failed</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color="text.secondary">{pending}</Typography>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: selectedBlast.imageUrl ? 7 : 12 }}>
              <Card><CardContent>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Message</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  {selectedBlast.message || '(no text message)'}
                </Typography>
                {selectedBlast.includeRsvp && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>RSVP Labels</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip label={selectedBlast.rsvpYesLabel} color="success" size="small" />
                      <Chip label={selectedBlast.rsvpNoLabel} color="error" size="small" />
                    </Stack>
                  </Box>
                )}
              </CardContent></Card>
            </Grid>
            {selectedBlast.imageUrl && (
              <Grid size={{ xs: 12, md: 5 }}>
                <Card><CardContent>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>Image</Typography>
                  <Box
                    component="img"
                    src={selectedBlast.imageUrl}
                    alt="Blast image"
                    sx={{ width: '100%', borderRadius: 1, objectFit: 'contain', maxHeight: 300 }}
                  />
                </CardContent></Card>
              </Grid>
            )}
          </Grid>

          {recipients.length > 0 && (
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                Recipient Delivery Log ({recipients.length})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {recipients.map((r, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" spacing={1.5}
                    sx={{ px: 1.5, py: 0.75, borderBottom: idx < recipients.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ minWidth: 24, color: 'text.secondary' }}>{idx + 1}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{r.name || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.mobile}</Typography>
                    </Box>
                    <Chip size="small"
                      label={r.status === 'SENT' ? '✅ Sent' : r.status === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
                      color={r.status === 'SENT' ? 'success' : r.status === 'FAILED' ? 'error' : 'default'} />
                    {r.error && (
                      <Tooltip title={r.error}>
                        <Typography variant="caption" color="error" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.error}
                        </Typography>
                      </Tooltip>
                    )}
                  </Stack>
                ))}
              </Box>
            </CardContent></Card>
          )}
        </Stack>
      </PageSurface>
    );
  }

  return (
    <PageSurface>
      <Stack spacing={2}>
        <Card><CardContent>
          <Typography variant="h6" fontWeight={800}>Blast History</Typography>
          <Typography variant="body2" color="text.secondary">
            All saved blast campaigns. Click a blast to view the full report.
          </Typography>
        </CardContent></Card>

        {loadingDetail && <LinearProgress />}

        {blasts.length === 0 ? (
          <Card><CardContent>
            <Typography color="text.secondary">No blasts saved yet. Start a blast from the Invitation tab.</Typography>
          </CardContent></Card>
        ) : (
          <Card><CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {blasts.map((b, idx) => (
              <Stack key={b._id} direction="row" alignItems="center" spacing={2}
                sx={{
                  px: 2, py: 1.5,
                  borderBottom: idx < blasts.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700}>{b.title || 'Blast'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(b.createdAt).toLocaleString()} · {b.totalRecipients || 0} recipients
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={b.status} size="small"
                    color={b.status === 'COMPLETED' ? 'success' : b.status === 'SENDING' ? 'primary' : 'default'} />
                  <Typography variant="body2" color="success.main" fontWeight={600}>✅ {b.sentCount || 0}</Typography>
                  {(b.failedCount > 0) && (
                    <Typography variant="body2" color="error" fontWeight={600}>❌ {b.failedCount}</Typography>
                  )}
                  <Button size="small" variant="contained" color={accentColor} onClick={() => handleView(b)}>
                    View Report
                  </Button>
                </Stack>
              </Stack>
            ))}
          </CardContent></Card>
        )}
      </Stack>
    </PageSurface>
  );
}

// ── Baileys Setup / QR ────────────────────────────────────────────────────────

function BaileysSetup({ status, onConnect, onDisconnect, connecting, onRefresh }) {
  const isConnected    = status?.status === 'CONNECTED';
  const isQrPending    = status?.status === 'QR_PENDING';
  const isDisconnected = !isConnected && !isQrPending;

  useEffect(() => {
    const id = setInterval(onRefresh, 2000);
    return () => clearInterval(id);
  }, [onRefresh]);

  const [qrAge,  setQrAge]  = useState(0);
  const prevQrRef           = useRef(null);

  useEffect(() => {
    if (status?.qr && status.qr !== prevQrRef.current) {
      prevQrRef.current = status.qr;
      setQrAge(0);
    }
  }, [status?.qr]);

  useEffect(() => {
    if (!isQrPending) { setQrAge(0); return; }
    const id = setInterval(() => setQrAge(a => a + 1), 1000);
    return () => clearInterval(id);
  }, [isQrPending]);

  const qrSecondsLeft = Math.max(0, 20 - qrAge);
  const qrExpired     = isQrPending && qrSecondsLeft === 0;

  return (
    <PageSurface>
      <Card><CardContent>
        <Stack spacing={3}>

          <Stack direction="row" alignItems="center" spacing={2}>
            <QrCode2Icon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" fontWeight={800}>Baileys Connection Setup</Typography>
              <Typography color="text.secondary">
                Connects your personal WhatsApp number via QR scan (like WhatsApp Web).
              </Typography>
            </Box>
          </Stack>

          <Alert severity="warning">
            <strong>Unofficial API:</strong> Baileys uses the WhatsApp Web protocol.
            Use for internal/testing purposes only.
          </Alert>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              label={`● ${status?.status || 'UNKNOWN'}`}
              color={isConnected ? 'success' : isQrPending ? 'warning' : 'default'}
            />
            {status?.phone && (
              <Chip label={`📱 +${status.phone}`} variant="outlined" color="success" />
            )}
            <Chip size="small" label="● LIVE" color="info" variant="outlined" />
          </Stack>

          {isQrPending && status?.qr && (
            <Box>
              <Alert severity={qrExpired ? 'error' : 'info'} sx={{ mb: 2 }}>
                {qrExpired
                  ? '⏱ QR expired — next QR loading automatically…'
                  : (
                    <>
                      <strong>Open WhatsApp</strong> → tap ⋮ → <strong>Linked Devices</strong> →{' '}
                      <strong>Link a Device</strong> → scan below
                      &nbsp;·&nbsp; refreshes in <strong>{qrSecondsLeft}s</strong>
                    </>
                  )}
              </Alert>
              <Box
                component="img"
                src={status.qr}
                alt="WhatsApp QR Code"
                sx={{
                  display: 'block', width: 260, height: 260,
                  border: '4px solid',
                  borderColor: qrExpired ? 'error.main' : 'warning.main',
                  borderRadius: 2, mb: 1,
                  opacity: qrExpired ? 0.3 : 1,
                  transition: 'opacity 0.4s, border-color 0.4s',
                }}
              />
              {qrExpired && (
                <Typography variant="body2" color="error">
                  ⟳ Waiting for next QR from WhatsApp server…
                </Typography>
              )}
            </Box>
          )}

          {connecting && !isQrPending && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={22} color="warning" />
              <Typography variant="body2" color="text.secondary">
                Connecting to WhatsApp — QR will appear here automatically…
              </Typography>
            </Stack>
          )}

          {isConnected && (
            <Alert severity="success">
              ✅ Connected as <strong>+{status.phone}</strong>.
              Registration confirmations and messages are being sent automatically.
            </Alert>
          )}

          {isDisconnected && !connecting && (
            <Alert severity="info">
              Click <strong>Connect</strong> to start.
              If previously connected, saved credentials will be used — no QR scan needed.
            </Alert>
          )}

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained" color="warning"
              startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
              onClick={onConnect}
              disabled={connecting || isConnected}
            >
              {isQrPending ? 'Get New QR' : 'Connect'}
            </Button>
            <Button
              variant="outlined" color="error"
              startIcon={<LinkOffIcon />}
              onClick={onDisconnect}
              disabled={isDisconnected && !connecting}
            >
              Disconnect &amp; Reset
            </Button>
          </Stack>

          <Divider />

          <Box>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Setup Notes</Typography>
            <Typography variant="body2" color="text.secondary">
              • Backend: <code>npm install @whiskeysockets/baileys qrcode pino</code>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              • Auth stored in <strong>MongoDB</strong> — survives server restarts.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              • Server <strong>auto-reconnects</strong> on boot if credentials exist.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              • QR on this page refreshes automatically every ~20s — just keep it open and scan.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              • Scan failing? Click <strong>Disconnect &amp; Reset</strong> → wait 5s → <strong>Connect</strong>.
            </Typography>
          </Box>

        </Stack>
      </CardContent></Card>
    </PageSurface>
  );
}

// ── Rule dialog ───────────────────────────────────────────────────────────────

function RuleDialog({ open, onClose, editing, form, setForm, onSave, saving, isBaileys }) {
  return (
    <ResponsiveDialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>
            {editing ? 'Edit' : 'Add'} Auto Reply Rule{isBaileys ? ' (Baileys)' : ''}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Rule Name" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="number" label="Priority" value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select label="Match Type" value={form.matchType}
                onChange={e => setForm(p => ({ ...p, matchType: e.target.value }))}>
                {['CONTAINS', 'EXACT', 'STARTS_WITH', 'ALL'].map(v =>
                  <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Trigger Text" value={form.triggerText}
                onChange={e => setForm(p => ({ ...p, triggerText: e.target.value }))}
                helperText="Leave blank only when match type is ALL." />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select label="Reply Type" value={form.replyType}
                onChange={e => setForm(p => ({ ...p, replyType: e.target.value }))}>
                {['TEXT', 'TEMPLATE'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select label="Active" value={form.isActive ? 'true' : 'false'}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </TextField>
            </Grid>
            {form.replyType === 'TEXT' && (
              <Grid size={{ xs: 12 }}>
                <TextField label="Reply Text" multiline minRows={3} value={form.replyText}
                  onChange={e => setForm(p => ({ ...p, replyText: e.target.value }))} />
              </Grid>
            )}
            {form.replyType === 'TEMPLATE' && (
              <>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField label="Template Name" value={form.templateName}
                    onChange={e => setForm(p => ({ ...p, templateName: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Language" value={form.templateLanguage}
                    onChange={e => setForm(p => ({ ...p, templateLanguage: e.target.value }))} />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel label="Stop after first match"
                control={<Checkbox checked={form.stopAfterMatch}
                  onChange={e => setForm(p => ({ ...p, stopAfterMatch: e.target.checked }))} />} />
            </Grid>
          </Grid>
          <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" color={isBaileys ? 'warning' : 'primary'}
              disabled={saving || !form.name} onClick={onSave}>
              {saving ? 'Saving…' : 'Save Rule'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </ResponsiveDialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════════

export default function WhatsAppPage() {
  const { user } = useAuth();
  const invitationOnly = isInvitationOnly(user);

  const [useBaileys, setUseBaileys] = useState(
    () => localStorage.getItem('wa_provider') !== 'official'
  );

  const [tab,        setTab]        = useState(invitationOnly ? 'invite' : 'inbox');
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  // ── Official API state ────────────────────────────────────────────────────
  const [inbox,                   setInbox]                   = useState([]);
  const [selectedConversationKey, setSelectedConversationKey] = useState('');
  const [conversationMessages,    setConversationMessages]    = useState([]);
  const [replyForm,               setReplyForm]               = useState({ text: '', templateName: '' });
  const [templates,               setTemplates]               = useState([]);
  const [rules,                   setRules]                   = useState([]);
  const [connections,             setConnections]             = useState([]);
  const [logs,                    setLogs]                    = useState([]);
  const [ruleOpen,                setRuleOpen]                = useState(false);
  const [editingRule,             setEditingRule]             = useState(null);
  const [ruleForm,                setRuleForm]                = useState(emptyRule);
  const [invitationForm,          setInvitationForm]          = useState(emptyInvitationForm);
  const [selectedRecipients,      setSelectedRecipients]      = useState([]);
  const [fontStyle,               setFontStyle]               = useState(emptyFontStyle);   // replaces textPosition
  const [uploadingImage,          setUploadingImage]          = useState(false);
  const [fileName,                setFileName]                = useState('');

  // ── Baileys state ─────────────────────────────────────────────────────────
  const [baileysStatus,      setBaileysStatus]      = useState({ status: 'DISCONNECTED', qr: null, phone: '' });
  const [baileysConnecting,  setBaileysConnecting]  = useState(false);
  const [baileysInbox,       setBaileysInbox]       = useState([]);
  const [baileysSelectedKey, setBaileysSelectedKey] = useState('');
  const [baileysConversation,setBaileysConversation]= useState([]);
  const [baileysReplyForm,   setBaileysReplyForm]   = useState({ text: '' });
  const [baileysRules,       setBaileysRules]       = useState([]);
  const [baileysRuleOpen,    setBaileysRuleOpen]    = useState(false);
  const [baileysEditingRule, setBaileysEditingRule] = useState(null);
  const [baileysRuleForm,    setBaileysRuleForm]    = useState(emptyRule);
  const [baileysInvitationForm,     setBaileysInvitationForm]     = useState(emptyInvitationForm);
  const [baileysSelectedRecipients, setBaileysSelectedRecipients] = useState([]);
  const [baileysFontStyle,          setBaileysFontStyle]          = useState(emptyFontStyle);  // replaces baileysTextPosition
  const [baileysUploadingImage,     setBaileysUploadingImage]     = useState(false);
  const [baileysFileName,           setBaileysFileName]           = useState('');
  const [baileysLogs,               setBaileysLogs]               = useState([]);

  // ── Blast history state ───────────────────────────────────────────────────
  const [blasts, setBlasts] = useState([]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadOfficial = async () => {
    setLoading(true);
    try {
      const [inboxRes, tplRes, rulesRes, connsRes, logsRes] = await Promise.all([
        whatsappService.getInbox(),
        whatsappService.getTemplates(),
        whatsappService.getRules(),
        whatsappService.getConnections(),
        whatsappService.getMessages(),
      ]);
      const inboxData = Array.isArray(inboxRes.data) ? inboxRes.data : [];
      setInbox(inboxData);
      setTemplates(Array.isArray(tplRes.data)    ? tplRes.data   : []);
      setRules(Array.isArray(rulesRes.data)       ? rulesRes.data : []);
      setConnections(Array.isArray(connsRes.data) ? connsRes.data : []);
      setLogs(Array.isArray(logsRes.data)         ? logsRes.data  : []);
      if (!selectedConversationKey && inboxData[0]?.conversationKey)
        setSelectedConversationKey(inboxData[0].conversationKey);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const loadOfficialConversation = async (key) => {
    if (!key) { setConversationMessages([]); return; }
    const { data } = await whatsappService.getConversation(key);
    setConversationMessages(Array.isArray(data) ? data : []);
    await whatsappService.markConversationRead(key).catch(() => null);
    const res = await whatsappService.getInbox();
    setInbox(Array.isArray(res.data) ? res.data : []);
  };

  const loadBaileys = async () => {
    setLoading(true);
    try {
      const [statusRes, inboxRes, rulesRes, logsRes] = await Promise.all([
        whatsappService.baileysGetStatus(),
        whatsappService.baileysGetInbox(),
        whatsappService.baileysGetRules(),
        whatsappService.baileysGetLogs(),
      ]);
      setBaileysStatus(statusRes.data || { status: 'DISCONNECTED' });
      const rows = Array.isArray(inboxRes.data) ? inboxRes.data : [];
      setBaileysInbox(rows);
      setBaileysRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      setBaileysLogs(Array.isArray(logsRes.data)   ? logsRes.data  : []);
      if (!baileysSelectedKey && rows[0]?.conversationKey)
        setBaileysSelectedKey(rows[0].conversationKey);
    } catch (e) {
      console.error('loadBaileys error:', e);
    }
    finally { setLoading(false); }
  };

  const loadBaileysConversation = async (key) => {
    if (!key) { setBaileysConversation([]); return; }
    const { data } = await whatsappService.baileysGetConversation(key);
    setBaileysConversation(Array.isArray(data) ? data : []);
    await whatsappService.baileysMarkRead(key).catch(() => null);
  };

  useEffect(() => {
    whatsappService.listBlasts().then(r => setBlasts(Array.isArray(r.data) ? r.data : [])).catch(() => null);
  }, []);

  useEffect(() => { if (useBaileys) loadBaileys(); else loadOfficial(); }, [useBaileys]);
  useEffect(() => { if (!useBaileys) loadOfficialConversation(selectedConversationKey); }, [selectedConversationKey]);
  useEffect(() => { if (useBaileys)  loadBaileysConversation(baileysSelectedKey);       }, [baileysSelectedKey]);

  const handleToggle = () => {
    setUseBaileys(v => {
      const next = !v;
      if (next) localStorage.removeItem('wa_provider');
      else      localStorage.setItem('wa_provider', 'official');
      return next;
    });
    setTab('inbox');
    setResultMessage(null);
  };

  // ── Baileys status refresh ────────────────────────────────────────────────
  const handleBaileysRefreshStatus = useCallback(async () => {
    try {
      const res = await whatsappService.baileysGetStatus();
      setBaileysStatus(res.data || { status: 'DISCONNECTED' });
    } catch (_) {}
  }, []);

  const connectPollerRef = useRef(null);
  const stopConnectPoller = () => {
    if (connectPollerRef.current) { clearInterval(connectPollerRef.current); connectPollerRef.current = null; }
  };

  const handleBaileysConnect = async () => {
    setBaileysConnecting(true);
    setBaileysStatus({ status: 'DISCONNECTED', qr: null, phone: '' });
    try {
      await whatsappService.baileysConnect();
      stopConnectPoller();
      let attempts = 0;
      connectPollerRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await whatsappService.baileysGetStatus();
          const s   = res.data || {};
          setBaileysStatus(s);
          if (s.status === 'QR_PENDING' || s.status === 'CONNECTED') setBaileysConnecting(false);
          if (s.status === 'CONNECTED' || attempts >= 90) {
            stopConnectPoller();
            setBaileysConnecting(false);
          }
        } catch (_) {}
      }, 1000);
    } catch (e) {
      setBaileysConnecting(false);
      setResultMessage({ type: 'error', text: e?.response?.data?.message || 'Failed to start Baileys' });
    }
  };

  const handleBaileysDisconnect = async () => {
    stopConnectPoller();
    try {
      await whatsappService.baileysDisconnect();
      setBaileysStatus({ status: 'DISCONNECTED', qr: null, phone: '' });
      setBaileysConnecting(false);
    } catch (e) {
      setResultMessage({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  // ── Official handlers ─────────────────────────────────────────────────────
  const handleReplySend = async () => {
    const sel = inbox.find(i => i.conversationKey === selectedConversationKey);
    if (!sel?.phone || (!replyForm.text.trim() && !replyForm.templateName)) return;
    setSaving(true);
    try {
      await whatsappService.sendText({
        to: sel.phone, contactName: sel.contactName,
        text: replyForm.templateName ? '' : replyForm.text,
        templateName: replyForm.templateName,
        replyToMessageId: conversationMessages[conversationMessages.length - 1]?.waMessageId || '',
      });
      setReplyForm({ text: '', templateName: '' });
      await loadOfficial();
      await loadOfficialConversation(sel.conversationKey);
    } finally { setSaving(false); }
  };

  const handleQuickSend = async (form) => {
    setSaving(true);
    try {
      await whatsappService.sendText({ to: form.to, contactName: form.contactName, text: form.text, templateName: form.templateName });
      setResultMessage({ type: 'success', text: `Message sent to ${form.to}` });
    } catch (e) {
      setResultMessage({ type: 'error', text: e?.response?.data?.message || 'Send failed' });
    } finally { setSaving(false); }
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      await whatsappService.saveRule(ruleForm, editingRule?._id);
      setRuleOpen(false);
      await loadOfficial();
    } finally { setSaving(false); }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'bk_award_invites');
      const { default: api } = await import('../api');
      const response = await api.post('/uploads/public', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setInvitationForm(p => ({ ...p, imageUrl: response?.data?.url || '' }));
    } finally { setUploadingImage(false); }
  };

  // ── Baileys handlers ──────────────────────────────────────────────────────
  const handleBaileysReplySend = async () => {
    if (!baileysSelectedKey || !baileysReplyForm.text.trim()) return;
    setSaving(true);
    try {
      await whatsappService.baileysSendText({ to: baileysSelectedKey, text: baileysReplyForm.text, contactName: '' });
      setBaileysReplyForm({ text: '' });
      await loadBaileys();
      await loadBaileysConversation(baileysSelectedKey);
    } finally { setSaving(false); }
  };

  const handleBaileysQuickSend = async (form) => {
    setSaving(true);
    try {
      await whatsappService.baileysSendText(form);
      setResultMessage({ type: 'success', text: `Message sent to ${form.to}` });
      await loadBaileys();
    } catch (e) {
      setResultMessage({ type: 'error', text: e?.response?.data?.message || 'Send failed' });
    } finally { setSaving(false); }
  };

  const handleBaileysEditRule = (item) => { setBaileysEditingRule(item); setBaileysRuleForm({ ...emptyRule, ...item }); setBaileysRuleOpen(true); };
  const handleBaileysAddRule  = ()     => { setBaileysEditingRule(null); setBaileysRuleForm(emptyRule); setBaileysRuleOpen(true); };
  const handleBaileysSaveRule = async () => {
    setSaving(true);
    try {
      await whatsappService.baileysSaveRule(baileysRuleForm, baileysEditingRule?._id);
      setBaileysRuleOpen(false);
      await loadBaileys();
    } finally { setSaving(false); }
  };

  const handleBaileysUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBaileysUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'bk_award_invites');
      const { default: api } = await import('../api');
      const response = await api.post('/uploads/public', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBaileysInvitationForm(p => ({ ...p, imageUrl: response?.data?.url || '' }));
    } finally { setBaileysUploadingImage(false); }
  };

  // ── Table rows ────────────────────────────────────────────────────────────
  const officialRuleRows = {
    columns: [
      { key: 'name', label: 'Rule' }, { key: 'trigger', label: 'Trigger' },
      { key: 'reply', label: 'Reply' }, { key: 'status', label: 'Status' }, { key: 'action', label: 'Action' },
    ],
    data: rules.map(item => ({
      title: item.name || 'Rule', name: item.name || '-',
      trigger: `${item.matchType || '-'} • ${item.triggerText || 'ALL'}`,
      reply: item.replyType === 'TEMPLATE' ? item.templateName || '-' : item.replyText || '-',
      status: () => <Chip label={item.isActive ? 'Active' : 'Inactive'} color={item.isActive ? 'success' : 'default'} size="small" />,
      action: () => <Button size="small" variant="contained"
        onClick={() => { setEditingRule(item); setRuleForm({ ...emptyRule, ...item }); setRuleOpen(true); }}>Edit</Button>,
    })),
  };
  const templateRows = {
    columns: [{ key: 'name', label: 'Template' }, { key: 'category', label: 'Category' }, { key: 'language', label: 'Language' }],
    data: templates.map(item => ({
      title: item.displayName || item.name || 'Template',
      name: item.displayName || item.name || '-',
      category: item.category || '-',
      language: item.language || item.templateLanguage || '-',
    })),
  };
  const connectionsRows = {
    columns: [{ key: 'name', label: 'Name' }, { key: 'mode', label: 'Mode' }, { key: 'phoneNumberId', label: 'Phone ID' }, { key: 'businessAccountId', label: 'Business ID' }],
    data: connections.map(item => ({
      title: item.name || 'Connection', name: item.name || '-', mode: item.mode || '-',
      phoneNumberId: item.phoneNumberId || '-', businessAccountId: item.businessAccountId || '-',
    })),
  };
  const logRows = {
    columns: [{ key: 'contact', label: 'Contact' }, { key: 'direction', label: 'Direction' }, { key: 'message', label: 'Message' }, { key: 'when', label: 'Time' }],
    data: logs.map(item => ({
      title: item.contactName || item.phone || 'Message',
      contact: item.contactName || item.phone || '-',
      direction: item.direction || '-',
      message: item.bodyText || item.text || '-',
      when: formatWhen(item.createdAt),
    })),
  };

  const currentTabs = useBaileys ? baileysTabs : officialTabs;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ pb: 3 }}>
      {!invitationOnly && (
        <PageHeader
          eyebrow="Communication"
          title="WhatsApp Management"
          chips={[
            { label: useBaileys ? '🐝 Baileys' : '✅ Official API', color: useBaileys ? 'warning' : 'success' },
            { label: `${useBaileys ? baileysInbox.length : inbox.length} Chats`, color: 'success' },
          ]}
        />
      )}

      {!invitationOnly && (
        <ProviderToggle useBaileys={useBaileys} onToggle={handleToggle} baileysStatus={baileysStatus?.status} />
      )}

      {!invitationOnly && (
        <PageSurface sx={{ mb: 2 }}>
          <Tabs
            value={tab} onChange={(_, v) => {
              setTab(v);
              if (v === 'blasts') whatsappService.listBlasts().then(r => setBlasts(Array.isArray(r.data) ? r.data : [])).catch(() => null);
            }}
            variant="scrollable" allowScrollButtonsMobile
            sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 42 } }}
            textColor={useBaileys ? 'warning' : 'primary'}
            indicatorColor={useBaileys ? 'warning' : 'primary'}
          >
            {currentTabs.map(([value, label]) => <Tab key={value} value={value} label={label} />)}
          </Tabs>
        </PageSurface>
      )}

      {loading       && <LinearProgress sx={{ mb: 2 }} />}
      {resultMessage && (
        <Alert sx={{ mb: 2 }} severity={resultMessage.type} onClose={() => setResultMessage(null)}>
          {resultMessage.text}
        </Alert>
      )}

      {/* ══════════════ BAILEYS TABS ══════════════ */}

      {useBaileys && tab === 'inbox' && (
        <InboxPanel
          inbox={baileysInbox} selectedKey={baileysSelectedKey} onSelect={setBaileysSelectedKey}
          conversationMessages={baileysConversation} replyForm={baileysReplyForm}
          setReplyForm={setBaileysReplyForm} onSend={handleBaileysReplySend} saving={saving} isBaileys
        />
      )}
      {useBaileys && tab === 'rules' && (
        <>
          <AutoReplyPanel rules={baileysRules} onAdd={handleBaileysAddRule} onEdit={handleBaileysEditRule} isBaileys />
          <RuleDialog open={baileysRuleOpen} onClose={() => setBaileysRuleOpen(false)}
            editing={baileysEditingRule} form={baileysRuleForm} setForm={setBaileysRuleForm}
            onSave={handleBaileysSaveRule} saving={saving} isBaileys />
        </>
      )}
      {useBaileys && tab === 'send' && (
        <QuickSendPanel onSend={handleBaileysQuickSend} saving={saving} isBaileys />
      )}
      {useBaileys && tab === 'invite' && (
        <InvitationPanel
          isBaileys
          invitationForm={baileysInvitationForm}   setInvitationForm={setBaileysInvitationForm}
          selectedRecipients={baileysSelectedRecipients} setSelectedRecipients={setBaileysSelectedRecipients}
          fontStyle={baileysFontStyle}             setFontStyle={setBaileysFontStyle}
          onUploadImage={handleBaileysUploadImage} uploadingImage={baileysUploadingImage}
          sendServiceFn={whatsappService.baileysSendInvitation}
          fileName={baileysFileName}               setFileName={setBaileysFileName}
          blasts={blasts}
        />
      )}
      {useBaileys && tab === 'manual'        && <ManualInvitePanel />}
      {useBaileys && tab === 'manual-saved' && <ManualCampaignsPanel />}
      {useBaileys && tab === 'campaigns'    && <CampaignsPanel />}
      {useBaileys && tab === 'blasts'     && <BlastHistoryPanel blasts={blasts} isBaileys />}
      {useBaileys && tab === 'logs'  && <LogsPanel logs={baileysLogs} isBaileys />}
      {useBaileys && tab === 'setup' && (
        <BaileysSetup
          status={baileysStatus}
          onConnect={handleBaileysConnect}
          onDisconnect={handleBaileysDisconnect}
          connecting={baileysConnecting}
          onRefresh={handleBaileysRefreshStatus}
        />
      )}

      {/* ══════════════ OFFICIAL TABS ══════════════ */}

      {!useBaileys && tab === 'inbox' && (
        <InboxPanel
          inbox={inbox} selectedKey={selectedConversationKey} onSelect={setSelectedConversationKey}
          conversationMessages={conversationMessages} replyForm={replyForm} setReplyForm={setReplyForm}
          onSend={handleReplySend} saving={saving} isBaileys={false} templates={templates}
        />
      )}
      {!useBaileys && tab === 'rules' && (
        <>
          <CollectionSection title="Auto Reply Rules"
            subtitle="Rules trigger after customer message is stored by webhook."
            rows={officialRuleRows}
            onAdd={() => { setEditingRule(null); setRuleForm(emptyRule); setRuleOpen(true); }}>
            <Card><CardContent>
              <Typography fontWeight={700}>Webhook setup</Typography>
              <Typography variant="body2" color="text.secondary">
                Meta webhook URL: <strong>/api/whatsapp/webhook</strong>.
              </Typography>
            </CardContent></Card>
          </CollectionSection>
          <RuleDialog open={ruleOpen} onClose={() => setRuleOpen(false)}
            editing={editingRule} form={ruleForm} setForm={setRuleForm}
            onSave={handleSaveRule} saving={saving} isBaileys={false} />
        </>
      )}
      {!useBaileys && tab === 'send' && (
        <QuickSendPanel onSend={handleQuickSend} saving={saving} isBaileys={false} templates={templates} />
      )}
      {!useBaileys && tab === 'invite' && (
        <InvitationPanel
          isBaileys={false}
          invitationForm={invitationForm}         setInvitationForm={setInvitationForm}
          selectedRecipients={selectedRecipients} setSelectedRecipients={setSelectedRecipients}
          fontStyle={fontStyle}                   setFontStyle={setFontStyle}
          onUploadImage={handleUploadImage}       uploadingImage={uploadingImage}
          sendServiceFn={whatsappService.sendInvitation}
          fileName={fileName}                     setFileName={setFileName}
          blasts={blasts}
        />
      )}
      {!useBaileys && tab === 'manual'        && <ManualInvitePanel />}
      {!useBaileys && tab === 'manual-saved'  && <ManualCampaignsPanel />}
      {!useBaileys && tab === 'campaigns'     && <CampaignsPanel />}
      {!useBaileys && tab === 'blasts'    && <BlastHistoryPanel blasts={blasts} isBaileys={false} />}
      {!useBaileys && tab === 'templates' && (
        <CollectionSection title="Templates" subtitle="Approved WhatsApp message templates." rows={templateRows} />
      )}
      {!useBaileys && tab === 'connections' && (
        <CollectionSection title="Connections" subtitle="Manual or embedded WhatsApp connection records." rows={connectionsRows} />
      )}
      {!useBaileys && tab === 'logs' && (
        <CollectionSection title="Message Logs" subtitle="Incoming webhook messages, manual replies and auto replies." rows={logRows} />
      )}
    </Box>
  );
}
