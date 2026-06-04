import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  DialogContent,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import ResponsiveDialog from '../components/ResponsiveDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import SendIcon from '@mui/icons-material/Send';
import api from '../api';
import PageHeader from '../components/PageHeader';
import ResponsiveTable from '../components/ResponsiveTable';
import StatusChip from '../components/StatusChip';

function CollectionSection({ title, subtitle, items, fields, viewMode, setViewMode, onAdd, onEdit }) {
  const rows = items.map((item) => ({
    title: item[fields[0].key] || 'Record',
    ...Object.fromEntries(
      fields.map((f) => [f.key, f.render ? f.render(item) : item[f.key] || '-'])
    ),
    action: () => (
      <Button size="small" variant="contained" onClick={() => onEdit(item)}>
        Edit
      </Button>
    )
  }));

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {title}
              </Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_, v) => v && setViewMode(v)}
              >
                <ToggleButton value="card">
                  <ViewModuleIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="table">
                  <TableRowsIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>

              <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
                Add
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid key={item._id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card>
                <CardContent>
                  <Stack spacing={1.2}>
                    {fields.map((f, i) =>
                      i === 0 ? (
                        <Typography key={f.key} variant="h6" fontWeight={800}>
                          {f.render ? f.render(item) : item[f.key] || '-'}
                        </Typography>
                      ) : (
                        <Typography key={f.key} variant="body2">
                          <strong>{f.label}:</strong> {f.render ? f.render(item) : item[f.key] || '-'}
                        </Typography>
                      )
                    )}

                    {item.status || item.isActive !== undefined ? (
                      <StatusChip label={item.status || (item.isActive ? 'Active' : 'Inactive')} />
                    ) : null}

                    <Stack direction="row" justifyContent="flex-end">
                      <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(item)}>
                        Edit
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <ResponsiveTable
          columns={[...fields.map((f) => ({ key: f.key, label: f.label })), { key: 'action', label: 'Action' }]}
          rows={rows}
          mobileTitleKey="title"
        />
      )}
    </Stack>
  );
}

const emptyInvitationForm = {
  recipientMode: 'students',
  singleName: '',
  singleNumber: '',
  imageUrl: '',
  eventName: '',
  date: '',
  time: '',
  venue: ''
};

const recipientModeOptions = [
  { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents' },
  { value: 'teamMembers', label: 'Team Members' },
  { value: 'volunteers', label: 'Team / Volunteers' },
  { value: 'guests', label: 'Guests' },
  { value: 'single', label: 'Single Number' },
  { value: 'csv', label: 'CSV File' },
  { value: 'excel', label: 'Excel File' }
];

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '').trim();
}

function parseRowsToRecipients(rows = []) {
  return rows
    .map((row) => {
      const name =
        row.name ||
        row.fullName ||
        row.studentName ||
        row.guestName ||
        row.Name ||
        row.NAME ||
        '';
      const mobile =
        row.mobile ||
        row.phone ||
        row.number ||
        row.whatsapp ||
        row.Mobile ||
        row.Phone ||
        row.Number ||
        row.WhatsApp ||
        '';

      return {
        name: String(name || '').trim() || 'Guest',
        mobile: normalizePhone(mobile),
        source: 'FILE'
      };
    })
    .filter((item) => item.mobile);
}

export default function WhatsAppPage() {
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [sendForm, setSendForm] = useState({ to: '', templateName: '', text: '' });
  const [recipientGroups, setRecipientGroups] = useState({
    students: [],
    parents: [],
    teamMembers: [],
    volunteers: [],
    guests: []
  });
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [fileName, setFileName] = useState('');
  const [invitationForm, setInvitationForm] = useState(emptyInvitationForm);
  const [resultMessage, setResultMessage] = useState(null);

  const [textPosition, setTextPosition] = useState({
    x: 150,
    y: 200,
    fontSize: 30,
    color: '#000000'
  });

  const load = async () => {
    const [c, t, m, r] = await Promise.all([
      api.get('/whatsapp/connections'),
      api.get('/whatsapp/templates'),
      api.get('/whatsapp/messages'),
      api.get('/whatsapp/recipients')
    ]);

    setConnections(Array.isArray(c.data) ? c.data : []);
    setTemplates(Array.isArray(t.data) ? t.data : []);
    setMessages(Array.isArray(m.data) ? m.data : []);
    setRecipientGroups(r.data || {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const mode = invitationForm.recipientMode;

    if (['students', 'parents', 'teamMembers', 'volunteers', 'guests'].includes(mode)) {
      setSelectedRecipients((recipientGroups[mode] || []).map((item) => ({ ...item, checked: true })));
      setFileName('');
    } else if (mode === 'single') {
      setSelectedRecipients([]);
      setFileName('');
    } else {
      setSelectedRecipients([]);
    }
  }, [invitationForm.recipientMode, recipientGroups]);

  const config = {
    connections: {
      title: 'Connections',
      endpoint: '/whatsapp/connections',
      subtitle: 'Manual and embedded connections.',
      initial: {
        name: '',
        phoneNumberId: '',
        businessAccountId: '',
        mode: 'MANUAL',
        isActive: true
      },
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'mode', label: 'Mode' },
        { key: 'phoneNumberId', label: 'Phone ID' },
        { key: 'businessAccountId', label: 'Business ID' }
      ],
      formFields: [
        { key: 'name', label: 'Connection Name' },
        { key: 'phoneNumberId', label: 'Phone Number ID' },
        { key: 'businessAccountId', label: 'Business Account ID' },
        {
          key: 'mode',
          label: 'Mode',
          type: 'select',
          options: ['MANUAL', 'EMBEDDED'].map((v) => ({ value: v, label: v }))
        }
      ],
      items: connections
    },

    templates: {
      title: 'Templates',
      endpoint: '/whatsapp/templates',
      subtitle: 'Template registry used for quick sends.',
      initial: {
        name: '',
        displayName: '',
        language: 'en_US',
        category: 'UTILITY',
        bodyText: '',
        isActive: true
      },
      fields: [
        { key: 'name', label: 'Template' },
        { key: 'displayName', label: 'Display Name' },
        { key: 'language', label: 'Language' },
        { key: 'category', label: 'Category' }
      ],
      formFields: [
        { key: 'name', label: 'Template Key' },
        { key: 'displayName', label: 'Display Name' },
        { key: 'language', label: 'Language' },
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          options: ['UTILITY', 'MARKETING', 'AUTHENTICATION'].map((v) => ({ value: v, label: v }))
        },
        { key: 'bodyText', label: 'Body Text', multiline: true }
      ],
      items: templates
    },

    logs: {
      title: 'Message Logs',
      endpoint: '/whatsapp/messages',
      subtitle: 'Recent sends and statuses.',
      initial: {},
      fields: [
        { key: 'to', label: 'To' },
        { key: 'messageType', label: 'Type' },
        { key: 'templateName', label: 'Template' },
        { key: 'status', label: 'Status' }
      ],
      formFields: [],
      items: messages
    }
  };

  const current = config[tab];

  const openAdd = () => {
    if (tab === 'logs') return;
    setEditing(null);
    setForm(current.initial);
    setOpen(true);
  };

  const openEdit = (item) => {
    if (tab === 'logs') return;
    setEditing(item);
    setForm({ ...current.initial, ...item });
    setOpen(true);
  };

  const save = async () => {
    if (editing?._id) {
      await api.put(`${current.endpoint}/${editing._id}`, form);
    } else {
      await api.post(current.endpoint, form);
    }
    setOpen(false);
    load();
  };

  const sendText = async () => {
    await api.post('/whatsapp/send-text', sendForm);
    setSendForm({ to: '', templateName: '', text: '' });
    load();
  };

  const selectedCount = useMemo(() => {
    if (invitationForm.recipientMode === 'single') return invitationForm.singleNumber ? 1 : 0;
    return selectedRecipients.filter((item) => item.checked !== false).length;
  }, [selectedRecipients, invitationForm.singleNumber, invitationForm.recipientMode]);

  const toggleRecipient = (mobile) => {
    setSelectedRecipients((prev) =>
      prev.map((item) =>
        item.mobile === mobile
          ? { ...item, checked: item.checked === false ? true : false }
          : item
      )
    );
  };

  const handleInvitationField = (key, value) =>
    setInvitationForm((prev) => ({ ...prev, [key]: value }));

  const uploadInvitationImage = async (file) => {
    if (!file) return;

    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'bk_award/invitations');

    setUploadingImage(true);
    setResultMessage(null);

    try {
      const response = await api.post('/uploads/public', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const url = response?.data?.url || response?.data?.secure_url || '';
      if (!url) {
        throw new Error('Upload failed - no URL returned');
      }

      handleInvitationField('imageUrl', url);
      setResultMessage({
        type: 'success',
        text: 'Invitation image uploaded successfully.'
      });
    } catch (error) {
      setResultMessage({
        type: 'error',
        text: error?.response?.data?.message || error.message || 'Image upload failed'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSheetUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const buffer = await file.arrayBuffer();

    if (file.name.toLowerCase().endsWith('.csv')) {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        defval: ''
      });
      setSelectedRecipients(parseRowsToRecipients(rows).map((item) => ({ ...item, checked: true })));
      return;
    }

    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      defval: ''
    });
    setSelectedRecipients(parseRowsToRecipients(rows).map((item) => ({ ...item, checked: true })));
  };

  const sendInvitation = async () => {
    setSendingInvitation(true);
    setResultMessage(null);

    try {
      const recipients =
        invitationForm.recipientMode === 'single'
          ? [
              {
                name: invitationForm.singleName || 'Guest',
                mobile: invitationForm.singleNumber,
                source: 'SINGLE'
              }
            ]
          : selectedRecipients
              .filter((item) => item.checked !== false)
              .map((item) => ({
                name: item.name,
                mobile: item.mobile,
                source: item.source
              }));

      if (!invitationForm.imageUrl) {
        setResultMessage({
          type: 'error',
          text: 'Please upload invitation image first.'
        });
        return;
      }

      if (!invitationForm.eventName || !invitationForm.date || !invitationForm.time || !invitationForm.venue) {
        setResultMessage({
          type: 'error',
          text: 'Please fill event name, date, time and venue.'
        });
        return;
      }

      if (!recipients.length) {
        setResultMessage({
          type: 'error',
          text: 'No valid recipients selected.'
        });
        return;
      }

      const response = await api.post('/whatsapp/send-invitation', {
        imageUrl: invitationForm.imageUrl,
        eventName: invitationForm.eventName,
        date: invitationForm.date,
        time: invitationForm.time,
        venue: invitationForm.venue,
        textPosition,
        recipients
      });

      setResultMessage({
        type: 'success',
        text: `Invitation sent. Success: ${response.data?.success || 0}, Failed: ${response.data?.failed || 0}`
      });

      load();
    } catch (error) {
      const data = error?.response?.data;
      setResultMessage({
        type: 'error',
        text: data?.missingFields?.length
          ? `Missing fields: ${data.missingFields.join(', ')}`
          : data?.message || error.message
      });
    } finally {
      setSendingInvitation(false);
    }
  };

  return (
    <>
      <PageHeader
        title="WhatsApp Center"
        subtitle="Connections, approved templates, quick send and invitation bulk sending from one screen."
        chips={[
          { label: `${connections.length} Connections` },
          { label: `${templates.length} Templates` },
          { label: `${messages.length} Logs` },
          { label: `${selectedCount} Selected`, color: 'secondary' }
        ]}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Use <strong>entry_pass</strong> to send image invitations to students, parents, team members,
        volunteers, guests, one number, CSV or Excel.
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="connections" label={`Connections (${connections.length})`} />
            <Tab value="templates" label={`Templates (${templates.length})`} />
            <Tab value="send" label="Quick Send" />
            <Tab value="invite" label="Invitation Send" />
            <Tab value="logs" label={`Logs (${messages.length})`} />
          </Tabs>
        </CardContent>
      </Card>

      {tab === 'send' ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>
                Quick Send
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="To"
                    value={sendForm.to}
                    onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Template"
                    value={sendForm.templateName}
                    onChange={(e) => setSendForm({ ...sendForm, templateName: e.target.value })}
                  >
                    <MenuItem value="">No Template</MenuItem>
                    {templates.map((t) => (
                      <MenuItem key={t._id} value={t.name}>
                        {t.displayName || t.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Button variant="contained" fullWidth sx={{ height: '100%' }} onClick={sendText}>
                    Send
                  </Button>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Text Message"
                multiline
                minRows={4}
                value={sendForm.text}
                onChange={(e) => setSendForm({ ...sendForm, text: e.target.value })}
              />
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'invite' ? (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={800}>
                  Invitation Send
                </Typography>

                {resultMessage ? <Alert severity={resultMessage.type}>{resultMessage.text}</Alert> : null}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Event Name"
                      value={invitationForm.eventName}
                      onChange={(e) => handleInvitationField('eventName', e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 2 }}>
                    <TextField
                      fullWidth
                      label="Date"
                      value={invitationForm.date}
                      onChange={(e) => handleInvitationField('date', e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 2 }}>
                    <TextField
                      fullWidth
                      label="Time"
                      value={invitationForm.time}
                      onChange={(e) => handleInvitationField('time', e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 2 }}>
                    <TextField
                      fullWidth
                      select
                      label="Recipients"
                      value={invitationForm.recipientMode}
                      onChange={(e) => handleInvitationField('recipientMode', e.target.value)}
                    >
                      {recipientModeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Venue"
                      value={invitationForm.venue}
                      onChange={(e) => handleInvitationField('venue', e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                      >
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<UploadFileIcon />}
                        >
                          Upload Invitation Image
                          <input
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(e) => uploadInvitationImage(e.target.files?.[0])}
                          />
                        </Button>

                        <TextField
                          fullWidth
                          label="Header Image URL"
                          value={invitationForm.imageUrl}
                          onChange={(e) => handleInvitationField('imageUrl', e.target.value)}
                        />

                        {uploadingImage ? (
                          <Box sx={{ minWidth: 160 }}>
                            <LinearProgress />
                          </Box>
                        ) : null}
                      </Stack>

                      {invitationForm.imageUrl ? (
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              position: 'relative',
                              display: 'inline-block',
                              width: 'fit-content',
                              maxWidth: '100%'
                            }}
                          >
                            <Box
                              component="img"
                              src={invitationForm.imageUrl}
                              alt="Invitation Preview"
                              sx={{
                                width: 300,
                                maxWidth: '100%',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'block'
                              }}
                            />

                            <Box
                              draggable
                              onDragEnd={(e) => {
                                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                                setTextPosition((prev) => ({
                                  ...prev,
                                  x: e.clientX - rect.left,
                                  y: e.clientY - rect.top
                                }));
                              }}
                              sx={{
                                position: 'absolute',
                                top: textPosition.y,
                                left: textPosition.x,
                                fontSize: textPosition.fontSize,
                                color: textPosition.color,
                                fontWeight: 'bold',
                                cursor: 'move',
                                userSelect: 'none',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                textShadow: '0 1px 2px rgba(255,255,255,0.35)'
                              }}
                            >
                              {invitationForm.singleName || 'Guest Name'}
                            </Box>
                          </Box>

                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField
                                fullWidth
                                label="Font Size"
                                type="number"
                                value={textPosition.fontSize}
                                onChange={(e) =>
                                  setTextPosition((prev) => ({
                                    ...prev,
                                    fontSize: Number(e.target.value) || 30
                                  }))
                                }
                              />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField
                                fullWidth
                                label="Text Color"
                                value={textPosition.color}
                                onChange={(e) =>
                                  setTextPosition((prev) => ({
                                    ...prev,
                                    color: e.target.value || '#000000'
                                  }))
                                }
                                helperText="Example: #000000"
                              />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField
                                fullWidth
                                label="Preview Name"
                                value={invitationForm.singleName}
                                onChange={(e) => handleInvitationField('singleName', e.target.value)}
                                helperText="Only for preview. Bulk send uses actual recipient names."
                              />
                            </Grid>
                          </Grid>
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>

                {invitationForm.recipientMode === 'single' ? (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Guest Name"
                        value={invitationForm.singleName}
                        onChange={(e) => handleInvitationField('singleName', e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="WhatsApp Number"
                        value={invitationForm.singleNumber}
                        onChange={(e) => handleInvitationField('singleNumber', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                ) : null}

                {['csv', 'excel'].includes(invitationForm.recipientMode) ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Typography fontWeight={700}>
                          {invitationForm.recipientMode === 'csv' ? 'CSV Upload' : 'Excel Upload'}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Use columns like <strong>name</strong> and <strong>mobile</strong>. Other
                          supported phone headers: phone, number, whatsapp.
                        </Typography>

                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<UploadFileIcon />}
                        >
                          Choose File
                          <input
                            ref={fileInputRef}
                            hidden
                            type="file"
                            accept={invitationForm.recipientMode === 'csv' ? '.csv' : '.xlsx,.xls'}
                            onChange={handleSheetUpload}
                          />
                        </Button>

                        {fileName ? <Chip label={fileName} /> : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}

                {invitationForm.recipientMode !== 'single' ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography fontWeight={700}>Selected Recipients</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tap to include or exclude before sending.
                          </Typography>
                        </Stack>

                        <Grid container spacing={1.5}>
                          {selectedRecipients.map((item) => (
                            <Grid key={`${item.mobile}-${item.source}`} size={{ xs: 12, md: 6, xl: 4 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  borderColor: item.checked === false ? 'divider' : 'primary.main'
                                }}
                              >
                                <CardContent sx={{ pb: '16px !important' }}>
                                  <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={item.checked !== false}
                                          onChange={() => toggleRecipient(item.mobile)}
                                        />
                                      }
                                      label=""
                                      sx={{ mr: 0 }}
                                    />

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                      <Typography fontWeight={700} noWrap>
                                        {item.name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {item.mobile}
                                      </Typography>
                                      <Chip size="small" label={item.source} sx={{ mt: 1 }} />
                                    </Box>
                                  </Stack>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}

                          {!selectedRecipients.length ? (
                            <Grid size={{ xs: 12 }}>
                              <Alert severity="warning">
                                No recipients loaded for this source yet.
                              </Alert>
                            </Grid>
                          ) : null}
                        </Grid>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                >
                  <Typography color="text.secondary">
                    Template: <strong>entry_pass</strong> · Total to send:{' '}
                    <strong>{selectedCount}</strong>
                  </Typography>

                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    disabled={sendingInvitation || !selectedCount}
                    onClick={sendInvitation}
                  >
                    Send Invitation
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {tab !== 'send' && tab !== 'invite' ? (
        <CollectionSection
          {...current}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      ) : null}

      {tab !== 'logs' && tab !== 'send' && tab !== 'invite' ? (
        <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>
                {editing ? `Edit ${current.title}` : `Add ${current.title}`}
              </Typography>

              <Grid container spacing={2}>
                {current.formFields.map((field) => (
                  <Grid key={field.key} size={{ xs: 12, md: field.multiline ? 12 : 6 }}>
                    {field.type === 'select' ? (
                      <TextField
                        fullWidth
                        select
                        label={field.label}
                        value={form[field.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      >
                        {(field.options || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <TextField
                        fullWidth
                        label={field.label}
                        multiline={field.multiline}
                        minRows={field.multiline ? 3 : undefined}
                        value={form[field.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      />
                    )}
                  </Grid>
                ))}
              </Grid>

              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={save}>
                  Save
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ResponsiveDialog>
      ) : null}
    </>
  );
}