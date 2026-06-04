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
import { useLive } from '../context/LiveContext';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO', targetRoles: '' });
  const { events } = useLive();

  const load = async () => {
    const { data } = await api.get('/notifications');
    setItems(Array.isArray(data) ? data : []);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ title: '', message: '', type: 'INFO', targetRoles: '' }); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ title: item.title || '', message: item.message || '', type: item.type || 'INFO', targetRoles: (item.targetRoles || []).join(', ') }); setOpen(true); };
  const save = async () => {
    const payload = { ...form, targetRoles: String(form.targetRoles || '').split(',').map((v) => v.trim()).filter(Boolean) };
    if (editing?._id) await api.put(`/notifications/${editing._id}`, payload); else await api.post('/notifications', payload);
    setOpen(false); load();
  };

  const rows = items.map((n) => ({
    title: n.title || n.type || 'Notification',
    titleText: n.title || '-',
    type: n.type || '-',
    roles: (n.targetRoles || []).join(', ') || '-',
    message: n.message || '-',
    action: () => <Button size="small" variant="contained" onClick={() => openEdit(n)}>Edit</Button>
  }));

  return (
    <>
      <PageHeader title="Notifications & Alerts" subtitle="Stored notifications and live socket feed in one place." chips={[{ label: `${items.length} Stored` }, { label: `${events.length} Live`, color: 'secondary' }]} />
      <Card sx={{ mb: 2 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}><Tabs value="stored" onChange={() => {}}><Tab value="stored" label="Stored Notifications" /><Tab value="live" label="Live Feed" disabled /></Tabs><Stack direction="row" spacing={1}><ToggleButtonGroup exclusive size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)}><ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton><ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton></ToggleButtonGroup><Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Notification</Button></Stack></Stack></CardContent></Card>
      {viewMode === 'card' ? <Grid container spacing={2}>{items.map((n) => <Grid key={n._id} size={{ xs: 12, md: 6, xl: 4 }}><Card><CardContent><Stack spacing={1.2}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="h6" fontWeight={800}>{n.title || 'Notification'}</Typography><Typography color="text.secondary">{n.type || 'INFO'}</Typography></Box><StatusChip label={n.type || 'INFO'} /></Stack><Typography variant="body2">{n.message || '-'}</Typography><Typography variant="body2" color="text.secondary">Roles: {(n.targetRoles || []).join(', ') || 'All'}</Typography><Stack direction="row" justifyContent="flex-end"><Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(n)}>Edit</Button></Stack></Stack></CardContent></Card></Grid>)}</Grid> : <ResponsiveTable columns={[{ key: 'titleText', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'roles', label: 'Target Roles' }, { key: 'message', label: 'Message' }, { key: 'action', label: 'Action' }]} rows={rows} mobileTitleKey="title" />}
      <Card sx={{ mt: 2 }}><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Live Feed</Typography><Stack spacing={1.5}>{events.length ? events.slice().reverse().map((n, idx) => <Card key={idx} variant="outlined"><CardContent><Typography fontWeight={700}>{String(n.name || '').replaceAll('_', ' ')}</Typography><Typography variant="body2" color="text.secondary">{JSON.stringify(n.payload)}</Typography></CardContent></Card>) : <Typography color="text.secondary">No live socket events yet.</Typography>}</Stack></CardContent></Card>
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogContent sx={{ pt: 3 }}><Stack spacing={2}><Typography variant="h6" fontWeight={800}>{editing ? 'Edit Notification' : 'Add Notification'}</Typography><TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><TextField select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['INFO','SUCCESS','WARNING','ERROR','WHATSAPP'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField><TextField label="Target Roles (comma separated)" value={form.targetRoles} onChange={(e) => setForm({ ...form, targetRoles: e.target.value })} /><TextField label="Message" multiline minRows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></Stack></Stack></DialogContent></ResponsiveDialog>
    </>
  );
}
