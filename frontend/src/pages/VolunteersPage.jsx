import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import api from '../api';
import PageHeader from '../components/PageHeader';
import ResponsiveDialog from '../components/ResponsiveDialog';
import ResponsiveTable from '../components/ResponsiveTable';
import StatusChip from '../components/StatusChip';

const emptyForm = {
  firstName: '',
  lastName: '',
  gender: '',
  address: '',
  mobile: '',
  teamId: '',
  teamOther: '',
  photoUrl: '',
  remarks: ''
};

function buildFullName(form) {
  return [form.firstName, form.lastName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getTeamLabel(volunteer) {
  return volunteer.teamId?.title || volunteer.teamId?.name || volunteer.teamOther || 'General';
}

function VolunteerRecordCard({ item, onEdit }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800} noWrap>{item.fullName || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">{item.mobile || 'No mobile'}</Typography>
            </Box>
            <StatusChip label={getTeamLabel(item)} />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {[item.gender, item.address].filter(Boolean).join(' · ') || 'Volunteer details pending'}
          </Typography>

          {item.remarks ? (
            <Typography variant="body2">{item.remarks}</Typography>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {item.photoUrl ? (
              <Button size="small" variant="outlined" startIcon={<ImageOutlinedIcon />} href={item.photoUrl} target="_blank" rel="noreferrer">Photo</Button>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(item)}>Edit</Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function mapVolunteerToForm(volunteer) {
  return {
    firstName: volunteer.firstName || '',
    lastName: volunteer.lastName || '',
    gender: volunteer.gender || '',
    address: volunteer.address || '',
    mobile: volunteer.mobile || '',
    teamId: volunteer.teamId?._id || volunteer.teamId || '',
    teamOther: volunteer.teamOther || '',
    photoUrl: volunteer.photoUrl || '',
    remarks: volunteer.remarks || ''
  };
}

export default function VolunteersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [volunteers, setVolunteers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [viewMode, setViewMode] = useState('card');

  const load = async () => {
    const [v, t] = await Promise.all([
      api.get('/volunteers'),
      api.get('/volunteers/public-teams')
    ]);
    setVolunteers(Array.isArray(v.data) ? v.data : []);
    setTeams(Array.isArray(t.data) ? t.data : []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      handleAdd();
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  const handleAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setSavedMessage('');
    setOpenDialog(true);
  };

  const handleEdit = (volunteer) => {
    setEditing(volunteer);
    setForm(mapVolunteerToForm(volunteer));
    setSavedMessage('');
    setOpenDialog(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setOpenDialog(false);
    setEditing(null);
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSavedMessage('');
    try {
      const payload = {
        ...form,
        fullName: buildFullName(form),
        teamOther: form.teamId ? '' : form.teamOther
      };
      if (editing?._id) {
        await api.put(`/volunteers/${editing._id}`, payload);
        setSavedMessage('Volunteer updated successfully.');
      } else {
        await api.post('/volunteers', payload);
        setSavedMessage('Volunteer created successfully.');
      }
      await load();
      setOpenDialog(false);
      setEditing(null);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const confirmed = volunteers.filter((item) => item.whatsappConfirmationSentAt).length;
    const teamsUsed = new Set(volunteers.map(getTeamLabel).filter(Boolean));
    return { total: volunteers.length, confirmed, teams: teamsUsed.size };
  }, [volunteers]);

  const rows = volunteers.map((v) => ({
    title: v.fullName,
    name: v.fullName || '-',
    mobile: v.mobile || '-',
    team: getTeamLabel(v),
    status: () => <StatusChip label={v.whatsappConfirmationSentAt ? 'Confirmed' : 'Pending'} />,
    photo: () => (v.photoUrl ? <Button size="small" href={v.photoUrl} target="_blank" rel="noreferrer">Photo</Button> : '-'),
    action: () => <Button size="small" variant="contained" onClick={() => handleEdit(v)}>Edit</Button>
  }));

  return (
    <Box>
      <PageHeader
        title="Volunteers"
        subtitle="Review volunteer registrations, team details, contact numbers and registration photos."
        chips={[
          { label: `${summary.total} Registered` },
          { label: `${summary.confirmed} Confirmed`, color: 'success' },
          { label: `${summary.teams} Teams` }
        ]}
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>Volunteer Records</Typography>
              <Typography color="text.secondary">Manage public volunteer registrations in the dashboard like student records.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <ToggleButtonGroup exclusive value={viewMode} onChange={(_, v) => v && setViewMode(v)} size="small">
                <ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton>
                <ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Volunteer</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {savedMessage ? <Alert sx={{ mb: 2 }} severity="success">{savedMessage}</Alert> : null}

      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {volunteers.map((volunteer) => (
            <Grid key={volunteer._id} size={{ xs: 12, md: 6, xl: 4 }}>
              <VolunteerRecordCard item={volunteer} onEdit={handleEdit} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <ResponsiveTable
          columns={[
            { key: 'name', label: 'Volunteer' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'team', label: 'Team' },
            { key: 'status', label: 'Status' },
            { key: 'photo', label: 'Photo' },
            { key: 'action', label: 'Action' }
          ]}
          rows={rows}
          mobileTitleKey="title"
        />
      )}

      <ResponsiveDialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Edit Volunteer' : 'Add Volunteer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="First Name" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Last Name" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Mobile" value={form.mobile} onChange={(e) => updateField('mobile', e.target.value.replace(/[^\d+]/g, ''))} required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select label="Gender" value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                  <MenuItem value="">Not specified</MenuItem>
                  {['Male', 'Female', 'Other'].map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select label="Volunteer Team" value={form.teamId} onChange={(e) => updateField('teamId', e.target.value)}>
                  <MenuItem value="">General / Other</MenuItem>
                  {teams.map((team) => <MenuItem key={team._id} value={team._id}>{team.name || team.title}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Other Team" value={form.teamOther} onChange={(e) => updateField('teamOther', e.target.value)} disabled={Boolean(form.teamId)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} multiline minRows={2} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Photo URL" value={form.photoUrl} onChange={(e) => updateField('photoUrl', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Remarks" value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} multiline minRows={2} />
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={closeDialog}>Cancel</Button>
              <Button
                variant="contained"
                startIcon={<VolunteerActivismIcon />}
                disabled={saving || !form.firstName || !form.lastName || !form.mobile}
                onClick={save}
              >
                {saving ? 'Saving...' : editing ? 'Update Volunteer' : 'Save Volunteer'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </ResponsiveDialog>
    </Box>
  );
}
