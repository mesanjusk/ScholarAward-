import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent,  DialogContent, Grid, MenuItem, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ResponsiveDialog from '../components/ResponsiveDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import api from '../api';
import PageHeader from '../components/PageHeader';
import ResponsiveTable from '../components/ResponsiveTable';
import StatusChip from '../components/StatusChip';

function CollectionSection({ title, subtitle, items, fields, viewMode, setViewMode, onAdd, onEdit }) {
  const rows = items.map((item) => ({ title: item[fields[0].key] || 'Record', ...Object.fromEntries(fields.map((f) => [f.key, f.render ? f.render(item) : item[f.key] || '-'])), action: () => <Button size="small" variant="contained" onClick={() => onEdit(item)}>Edit</Button> }));
  return <Stack spacing={2}><Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}><Box><Typography variant="h6" fontWeight={800}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Box><Stack direction="row" spacing={1}><ToggleButtonGroup exclusive size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)}><ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton><ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton></ToggleButtonGroup><Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>Add</Button></Stack></Stack></CardContent></Card>{viewMode === 'card' ? <Grid container spacing={2}>{items.map((item) => <Grid key={item._id} size={{ xs: 12, md: 6, xl: 4 }}><Card><CardContent><Stack spacing={1.2}>{fields.map((f, i) => i === 0 ? <Typography key={f.key} variant="h6" fontWeight={800}>{f.render ? f.render(item) : item[f.key] || '-'}</Typography> : <Typography key={f.key} variant="body2"><strong>{f.label}:</strong> {f.render ? f.render(item) : item[f.key] || '-'}</Typography>)}{item.status ? <StatusChip label={item.status} /> : null}<Stack direction="row" justifyContent="flex-end"><Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(item)}>Edit</Button></Stack></Stack></CardContent></Card></Grid>)}</Grid> : <ResponsiveTable columns={[...fields.map((f) => ({ key: f.key, label: f.label })), { key: 'action', label: 'Action' }]} rows={rows} mobileTitleKey="title" />}</Stack>;
}

export default function ResponsibilitiesPage() {
  const [tab, setTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const [t, tk, u, v] = await Promise.all([api.get('/teams'), api.get('/event-tasks'), api.get('/users'), api.get('/vendors')]);
    setTeams(Array.isArray(t.data) ? t.data : []);
    setTasks(Array.isArray(tk.data) ? tk.data : []);
    setUsers(Array.isArray(u.data) ? u.data : []);
    setVendors(Array.isArray(v.data) ? v.data : []);
  };
  useEffect(() => { load(); }, []);

  const config = {
    teams: {
      title: 'Teams', endpoint: '/teams', subtitle: 'Create teams and assign lead owners.',
      initial: { name: '', code: '', purpose: '', leadUserId: '', memberUserIds: [], isActive: true },
      fields: [{ key: 'name', label: 'Team' }, { key: 'code', label: 'Code' }, { key: 'purpose', label: 'Purpose' }, { key: 'leadUserId', label: 'Lead', render: (item) => item.leadUserId?.name || '-' }],
      formFields: [{ key: 'name', label: 'Team Name' }, { key: 'code', label: 'Code' }, { key: 'purpose', label: 'Purpose', multiline: true }, { key: 'leadUserId', label: 'Lead User', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) }],
      items: teams
    },
    tasks: {
      title: 'Tasks', endpoint: '/event-tasks', subtitle: 'Track owner, vendor link, deadline and status.',
      initial: { title: '', teamId: '', assignedToUserId: '', backupUserId: '', linkedVendorId: '', priority: 'MEDIUM', status: 'PENDING', startTimeLabel: '', deadlineLabel: '', notes: '' },
      fields: [{ key: 'title', label: 'Task' }, { key: 'teamId', label: 'Team', render: (item) => item.teamId?.name || '-' }, { key: 'assignedToUserId', label: 'Owner', render: (item) => item.assignedToUserId?.name || '-' }, { key: 'deadlineLabel', label: 'Deadline' }, { key: 'status', label: 'Status' }],
      formFields: [{ key: 'title', label: 'Task Title' }, { key: 'teamId', label: 'Team', type: 'select', options: teams.map((t) => ({ value: t._id, label: t.name })) }, { key: 'assignedToUserId', label: 'Owner', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) }, { key: 'backupUserId', label: 'Backup Owner', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) }, { key: 'linkedVendorId', label: 'Linked Vendor', type: 'select', options: vendors.map((v) => ({ value: v._id, label: v.name })) }, { key: 'priority', label: 'Priority', type: 'select', options: ['LOW','MEDIUM','HIGH'].map((v) => ({ value: v, label: v })) }, { key: 'status', label: 'Status', type: 'select', options: ['PENDING','IN_PROGRESS','DONE'].map((v) => ({ value: v, label: v })) }, { key: 'startTimeLabel', label: 'Start Label' }, { key: 'deadlineLabel', label: 'Deadline Label' }, { key: 'notes', label: 'Notes', multiline: true }],
      items: tasks
    }
  };
  const current = config[tab];
  const openAdd = () => { setEditing(null); setForm(current.initial); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...current.initial, ...item, leadUserId: item.leadUserId?._id || item.leadUserId || '', teamId: item.teamId?._id || item.teamId || '', assignedToUserId: item.assignedToUserId?._id || item.assignedToUserId || '', backupUserId: item.backupUserId?._id || item.backupUserId || '', linkedVendorId: item.linkedVendorId?._id || item.linkedVendorId || '' }); setOpen(true); };
  const save = async () => { if (editing?._id) await api.put(`${current.endpoint}/${editing._id}`, form); else await api.post(current.endpoint, form); setOpen(false); load(); };

  return (
    <>
      <PageHeader title="Responsibilities" subtitle="Teams and tasks with one consistent add/edit experience." chips={[{ label: `${teams.length} Teams` }, { label: `${tasks.length} Tasks` }]} />
      <Card sx={{ mb: 2 }}><CardContent><Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab value="teams" label={`Teams (${teams.length})`} /><Tab value="tasks" label={`Tasks (${tasks.length})`} /></Tabs></CardContent></Card>
      <CollectionSection {...current} viewMode={viewMode} setViewMode={setViewMode} onAdd={openAdd} onEdit={openEdit} />
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md"><DialogContent sx={{ pt: 3 }}><Stack spacing={2}><Typography variant="h6" fontWeight={800}>{editing ? `Edit ${current.title}` : `Add ${current.title}`}</Typography><Grid container spacing={2}>{current.formFields.map((field) => <Grid key={field.key} size={{ xs: 12, md: field.multiline ? 12 : 6 }}>{field.type === 'select' ? <TextField select label={field.label} value={form[field.key] ?? ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}>{(field.options || []).map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField> : <TextField label={field.label} type={field.type || 'text'} multiline={field.multiline} minRows={field.multiline ? 3 : undefined} value={form[field.key] ?? ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />}</Grid>)}</Grid><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></Stack></Stack></DialogContent></ResponsiveDialog>
    </>
  );
}
