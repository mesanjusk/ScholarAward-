import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, MenuItem, Select, Snackbar, Stack, Typography,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import TuneIcon from '@mui/icons-material/Tune';
import GroupsIcon from '@mui/icons-material/Groups';
import MicIcon from '@mui/icons-material/Mic';
import SchoolIcon from '@mui/icons-material/School';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../components/PageHeader';
import api from '../api';

// ── data hook ────────────────────────────────────────────────────────────────
function useSystemSettings() {
  const [map, setMap]       = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system-settings');
      setMap(res.data?.map || {});
    } catch {
      setToast({ type: 'error', msg: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key, value) => {
    setSaving(true);
    try {
      await api.put(`/system-settings/${key}`, { value });
      setMap(prev => ({ ...prev, [key]: value }));
      setToast({ type: 'success', msg: 'Saved successfully ✅' });
    } catch (e) {
      setToast({ type: 'error', msg: e?.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return { map, loading, saving, save, toast, setToast };
}

// ── provider option button ────────────────────────────────────────────────────
function ProviderOption({ value, current, saving, onSelect, icon, label, tag, tagColor, description, alertMsg, alertSeverity }) {
  const selected = current === value;
  return (
    <Box
      onClick={() => !saving && !selected && onSelect(value)}
      sx={{
        flex: 1,
        minWidth: { xs: '100%', sm: 220 },
        border: '2px solid',
        borderColor: selected ? (value === 'baileys' ? 'warning.main' : 'success.main') : 'divider',
        borderRadius: 3,
        p: 2.5,
        cursor: saving || selected ? 'default' : 'pointer',
        bgcolor: selected
          ? value === 'baileys' ? '#fff8e1' : '#e8f5e9'
          : 'background.paper',
        transition: 'all 0.2s',
        '&:hover': !selected && !saving ? {
          borderColor: value === 'baileys' ? 'warning.light' : 'success.light',
          bgcolor: value === 'baileys' ? '#fffde7' : '#f1f8e9',
        } : {},
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.2}>
          {icon}
          <Typography fontWeight={700} fontSize={15}>{label}</Typography>
          {selected && (
            <Chip
              label="ACTIVE"
              size="small"
              color={value === 'baileys' ? 'warning' : 'success'}
              sx={{ ml: 'auto', height: 20, fontSize: 10, fontWeight: 700 }}
            />
          )}
          {!selected && (
            <Chip
              label={tag}
              size="small"
              color={tagColor}
              variant="outlined"
              sx={{ ml: 'auto', height: 20, fontSize: 10 }}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" fontSize={13}>
          {description}
        </Typography>
        {selected && alertMsg && (
          <Alert severity={alertSeverity || 'info'} sx={{ py: 0.5, fontSize: 12 }}>
            {alertMsg}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}

// ── registration groups section ───────────────────────────────────────────────
function RegistrationGroupsSection({ map, saving, save }) {
  const [groups, setGroups]           = useState([]);
  const [fetching, setFetching]       = useState(false);
  const [fetchError, setFetchError]   = useState('');
  const [anchorJid, setAnchorJid]     = useState('');
  const [studentJid, setStudentJid]   = useState('');
  const [volunteerJid, setVolunteerJid] = useState('');

  useEffect(() => {
    setAnchorJid(map['anchor_registration_group_jid'] || '');
    setStudentJid(map['student_registration_group_jid'] || '');
    setVolunteerJid(map['volunteer_registration_group_jid'] || '');
  }, [map]);

  const fetchGroups = async () => {
    setFetching(true);
    setFetchError('');
    try {
      const res = await api.get('/whatsapp/groups');
      setGroups(Array.isArray(res.data) ? res.data : []);
      if (!res.data?.length) setFetchError('No groups found. Make sure the bot is connected and is a member of the groups.');
    } catch {
      setFetchError('Failed to fetch groups. Ensure WhatsApp bot is connected.');
    } finally {
      setFetching(false);
    }
  };

  const GroupRow = ({ icon, label, color, value, onChange, settingKey }) => (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography fontWeight={700} fontSize={14}>{label}</Typography>
        {map[settingKey] && (
          <Chip label="Configured" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Select
          size="small"
          displayEmpty
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{ flex: 1, borderRadius: 1.5, bgcolor: '#fff', fontSize: 14 }}
        >
          <MenuItem value=""><em>— Select a group —</em></MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id}>{g.name || g.id}</MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          disabled={saving || !value}
          onClick={() => save(settingKey, value)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 1.5,
            bgcolor: color,
            '&:hover': { filter: 'brightness(0.9)', bgcolor: color },
            whiteSpace: 'nowrap'
          }}
        >
          Save Group
        </Button>
      </Stack>
      {map[settingKey] && (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          Saved JID: {map[settingKey]}
        </Typography>
      )}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <GroupsIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          WhatsApp — Registration Group Notifications
        </Typography>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              When a student, anchor, or volunteer registers, the system automatically sends a notification
              to the configured WhatsApp group. First fetch your available groups, then assign
              one to each registration type and save.
            </Typography>

            <Alert severity="info" sx={{ fontSize: 13, borderRadius: 2 }}>
              <strong>Setup:</strong> Create 3 WhatsApp groups on your phone → add the bot's number to all →
              click <strong>Fetch Groups</strong> below → select and save each group.
            </Alert>

            <Divider />

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                startIcon={fetching ? <CircularProgress size={14} /> : <RefreshIcon />}
                onClick={fetchGroups}
                disabled={fetching}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
              >
                {fetching ? 'Fetching...' : 'Fetch Groups'}
              </Button>
              {groups.length > 0 && (
                <Chip label={`${groups.length} groups found`} size="small" color="success" />
              )}
            </Stack>

            {fetchError && (
              <Alert severity="warning" sx={{ borderRadius: 2, fontSize: 13 }}>{fetchError}</Alert>
            )}

            {groups.length > 0 && (
              <>
                <Divider />
                <Stack spacing={2.5}>
                  <GroupRow
                    icon={<MicIcon sx={{ color: '#7c3aed', fontSize: 18 }} />}
                    label="Anchor Registration Group"
                    color="#7c3aed"
                    value={anchorJid}
                    onChange={setAnchorJid}
                    settingKey="anchor_registration_group_jid"
                  />
                  <Divider />
                  <GroupRow
                    icon={<SchoolIcon sx={{ color: '#2497d3', fontSize: 18 }} />}
                    label="Student Registration Group"
                    color="#2497d3"
                    value={studentJid}
                    onChange={setStudentJid}
                    settingKey="student_registration_group_jid"
                  />
                  <Divider />
                  <GroupRow
                    icon={<GroupsIcon sx={{ color: '#16a34a', fontSize: 18 }} />}
                    label="BK Award 2026 Volunteer Group"
                    color="#16a34a"
                    value={volunteerJid}
                    onChange={setVolunteerJid}
                    settingKey="volunteer_registration_group_jid"
                  />
                </Stack>
              </>
            )}

            {(map['anchor_registration_group_jid'] || map['student_registration_group_jid'] || map['volunteer_registration_group_jid']) && groups.length === 0 && (
              <>
                <Divider />
                <Stack spacing={1.5}>
                  {map['anchor_registration_group_jid'] && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MicIcon sx={{ color: '#7c3aed', fontSize: 16 }} />
                      <Typography variant="body2" fontWeight={700}>Anchor Group:</Typography>
                      <Chip label="Configured" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />
                    </Stack>
                  )}
                  {map['student_registration_group_jid'] && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SchoolIcon sx={{ color: '#2497d3', fontSize: 16 }} />
                      <Typography variant="body2" fontWeight={700}>Student Group:</Typography>
                      <Chip label="Configured" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />
                    </Stack>
                  )}
                  {map['volunteer_registration_group_jid'] && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GroupsIcon sx={{ color: '#16a34a', fontSize: 16 }} />
                      <Typography variant="body2" fontWeight={700}>Volunteer Group:</Typography>
                      <Chip label="Configured" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Groups are already configured. Click Fetch Groups to change them.
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SuperAdminSettingsPage() {
  const { map, loading, saving, save, toast, setToast } = useSystemSettings();

  // default to 'baileys' if not set yet
  const provider = map['registration_whatsapp_provider'] || 'baileys';

  const handleProviderChange = (val) => {
    save('registration_whatsapp_provider', val);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        eyebrow="Super Admin"
        title="System Settings"
        subtitle="Global configuration options. Changes take effect immediately."
        chips={[{ label: '🔒 Super Admin Only', color: 'error' }]}
      />

      {loading ? (
        <Stack alignItems="center" sx={{ mt: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Loading settings…</Typography>
        </Stack>
      ) : (
        <Stack spacing={3} sx={{ maxWidth: 780 }}>

          {/* Section header */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <WhatsAppIcon sx={{ color: '#25D366', fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
              WhatsApp — Registration Message Provider
            </Typography>
          </Stack>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    When a student registers via the public form, this controls which WhatsApp
                    service sends the auto-confirmation message. Click a provider to switch.
                  </Typography>
                </Box>

                <Divider />

                {saving && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} color="warning" />
                    <Typography variant="body2" color="text.secondary">Saving…</Typography>
                  </Stack>
                )}

                {/* Provider cards */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <ProviderOption
                    value="baileys"
                    current={provider}
                    saving={saving}
                    onSelect={handleProviderChange}
                    icon={<PhoneAndroidIcon sx={{ color: provider === 'baileys' ? 'warning.main' : 'action.disabled', fontSize: 22 }} />}
                    label="Baileys"
                    tag="Default"
                    tagColor="warning"
                    description="Sends a plain text confirmation via Baileys (WhatsApp Web). Must be connected via QR before registrations arrive."
                    alertMsg="Baileys is active. Ensure it is connected — go to WhatsApp page and confirm status shows CONNECTED."
                    alertSeverity="warning"
                  />
                  <ProviderOption
                    value="official"
                    current={provider}
                    saving={saving}
                    onSelect={handleProviderChange}
                    icon={<CheckCircleIcon sx={{ color: provider === 'official' ? 'success.main' : 'action.disabled', fontSize: 22 }} />}
                    label="Official API"
                    tag="Meta"
                    tagColor="success"
                    description="Sends the bk_award approved template with personalised edit link via Meta WhatsApp Cloud API."
                    alertMsg="Official API is active. Ensure the bk_award template is approved in Meta Business Manager."
                    alertSeverity="info"
                  />
                </Stack>

                <Divider />

                {/* Current status summary */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TuneIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Current provider:{' '}
                    <strong style={{ color: provider === 'baileys' ? '#b45309' : '#166534' }}>
                      {provider === 'baileys' ? 'Baileys (WhatsApp Web)' : 'Official Meta Cloud API'}
                    </strong>
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <RegistrationGroupsSection map={map} saving={saving} save={save} />

        </Stack>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.type || 'info'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
