import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent,  DialogContent, Grid, MenuItem, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
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

function AssignmentCard({ item, onEdit, onStatus }) {
  return (
    <Card><CardContent><Stack spacing={1.2}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6" fontWeight={800}>{item.sequenceNo}. {item.studentId?.fullName || '-'}</Typography><Typography color="text.secondary">{item.categoryId?.title || '-'}</Typography></Box><StatusChip label={item.status || 'PENDING'} /></Stack><Typography variant="body2">Guest: {item.actualGuestId?.name || item.plannedGuestId?.name || '-'}</Typography><Typography variant="body2">Anchor: {item.actualAnchorId?.name || item.plannedAnchorId?.name || '-'}</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><Button size="small" onClick={() => onStatus(item._id, 'CALLED')}>Call</Button><Button size="small" onClick={() => onStatus(item._id, 'ON_STAGE')}>On Stage</Button><Button size="small" onClick={() => onStatus(item._id, 'COMPLETED')}>Done</Button><Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(item)}>Edit</Button></Stack></Stack></CardContent></Card>
  );
}

export default function StagePage() {
  const { events } = useLive();
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [liveBoard, setLiveBoard] = useState({ current: null, queue: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [form, setForm] = useState({ sequenceNo: 1, studentId: '', categoryId: '', plannedGuestId: '', actualGuestId: '', changeReason: '' });

  const load = async () => {
    const [a, s, c, u, lb] = await Promise.all([api.get('/stage-assignments'), api.get('/students'), api.get('/categories'), api.get('/users'), api.get('/stage-assignments/live-board')]);
    setAssignments(Array.isArray(a.data) ? a.data : []);
    setStudents(Array.isArray(s.data) ? s.data : []);
    setCategories(Array.isArray(c.data) ? c.data : []);
    setUsers(Array.isArray(u.data) ? u.data : []);
    setLiveBoard(lb.data || { current: null, queue: [] });
  };
  useEffect(() => { load(); }, []);

  const guestChangedAlert = useMemo(() => events.find((e) => e.name === 'anchor_popup'), [events]);
  const guests = users.filter((u) => u.eventDutyType === 'GUEST');
  const volunteers = users.filter((u) => u.eventDutyType === 'VOLUNTEER');
  const teamMembers = users.filter((u) => ['TEAM_LEADER', 'SENIOR_TEAM', 'ADMIN'].includes(u.eventDutyType));

  const openAdd = () => { setEditing(null); setForm({ sequenceNo: assignments.length + 1, studentId: '', categoryId: '', plannedGuestId: '', actualGuestId: '', teamMemberId: '', volunteerId: '', changeReason: '' }); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ sequenceNo: item.sequenceNo || 1, studentId: item.studentId?._id || item.studentId || '', categoryId: item.categoryId?._id || item.categoryId || '', plannedGuestId: item.plannedGuestId?._id || item.plannedGuestId || '', actualGuestId: item.actualGuestId?._id || item.actualGuestId || '', teamMemberId: item.teamMemberId?._id || item.teamMemberId || '', volunteerId: item.volunteerId?._id || item.volunteerId || '', changeReason: item.changeReason || '' }); setOpen(true); };
  const save = async () => { if (editing?._id) { await api.post(`/stage-assignments/${editing._id}/change-guest`, { actualGuestId: form.actualGuestId, changeReason: form.changeReason }); } else { await api.post('/stage-assignments', form); } setOpen(false); load(); };
  const statusUpdate = async (id, status) => { await api.post(`/stage-assignments/${id}/status`, { status }); load(); };
  const generate = async () => { await api.post('/stage-assignments/generate-from-eligible'); load(); };

  const rows = assignments.map((a) => ({ title: `${a.sequenceNo}. ${a.studentId?.fullName || '-'}`, sequenceNo: a.sequenceNo, student: a.studentId?.fullName || '-', category: a.categoryId?.title || '-', guest: a.actualGuestId?.name || a.plannedGuestId?.name || '-', status: () => <StatusChip label={a.status || 'PENDING'} />, action: () => <Button size="small" variant="contained" onClick={() => openEdit(a)}>Edit</Button> }));

  return (
    <>
      <PageHeader title="Live Stage" subtitle="Queue, live board and guest reassignment from one screen." chips={[{ label: `${assignments.length} Assignments` }, { label: liveBoard.current ? 'Live Running' : 'Waiting', color: liveBoard.current ? 'success' : 'warning' }]} action={<Button variant="contained" onClick={generate}>Generate from Eligible</Button>} />
      {guestChangedAlert ? <Alert severity="warning" sx={{ mb: 2 }}>{guestChangedAlert.payload?.title || 'Guest changed'} — {guestChangedAlert.payload?.message}</Alert> : null}
      <Card sx={{ mb: 2 }}><CardContent><Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"><Tab value="assignments" label={`Assignments (${assignments.length})`} /><Tab value="live" label="Live Board" /></Tabs></CardContent></Card>
      {tab === 'live' ? <Grid container spacing={2}><Grid size={{ xs: 12, lg: 5 }}><Card><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Current Stage</Typography>{liveBoard.current ? <Stack spacing={1}><Typography variant="h5" fontWeight={800}>{liveBoard.current.studentId?.fullName || '-'}</Typography><Typography color="text.secondary">{liveBoard.current.categoryId?.title || '-'}</Typography><Typography>Guest: {liveBoard.current.actualGuestId?.name || liveBoard.current.plannedGuestId?.name || '-'}</Typography><Typography>Anchor: {liveBoard.current.actualAnchorId?.name || liveBoard.current.plannedAnchorId?.name || '-'}</Typography><StatusChip label={liveBoard.current.status || 'PENDING'} /></Stack> : <Typography color="text.secondary">No current stage student.</Typography>}</CardContent></Card></Grid><Grid size={{ xs: 12, lg: 7 }}><Card><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Queue</Typography><Stack spacing={1.2}>{(liveBoard.queue || []).map((item) => <Card key={item._id} variant="outlined"><CardContent sx={{ py: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={700}>{item.sequenceNo}. {item.studentId?.fullName || '-'}</Typography><Typography variant="body2" color="text.secondary">{item.categoryId?.title || '-'}</Typography></Box><StatusChip label={item.status || 'PENDING'} /></Stack></CardContent></Card>)}</Stack></CardContent></Card></Grid></Grid> : <Stack spacing={2}><Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}><Box><Typography variant="h6" fontWeight={800}>Stage Assignments</Typography><Typography color="text.secondary">Card and table view with add/edit controls.</Typography></Box><Stack direction="row" spacing={1}><ToggleButtonGroup exclusive size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)}><ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton><ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton></ToggleButtonGroup><Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Assignment</Button></Stack></Stack></CardContent></Card>{viewMode === 'card' ? <Grid container spacing={2}>{assignments.map((item) => <Grid key={item._id} size={{ xs: 12, md: 6, xl: 4 }}><AssignmentCard item={item} onEdit={openEdit} onStatus={statusUpdate} /></Grid>)}</Grid> : <ResponsiveTable columns={[{ key: 'sequenceNo', label: 'Seq' }, { key: 'student', label: 'Student' }, { key: 'category', label: 'Category' }, { key: 'guest', label: 'Guest' }, { key: 'status', label: 'Status' }, { key: 'action', label: 'Action' }]} rows={rows} mobileTitleKey="title" />}</Stack>}
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md"><DialogContent sx={{ pt: 3 }}><Stack spacing={2}><Typography variant="h6" fontWeight={800}>{editing ? 'Edit Assignment' : 'Add Assignment'}</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}><TextField type="number" label="Sequence No" value={form.sequenceNo} onChange={(e) => setForm({ ...form, sequenceNo: Number(e.target.value) })} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Student" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{students.map((s) => <MenuItem key={s._id} value={s._id}>{s.fullName}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.title || c.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Planned Guest" value={form.plannedGuestId} onChange={(e) => setForm({ ...form, plannedGuestId: e.target.value })}>{guests.map((g) => <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Actual Guest" value={form.actualGuestId} onChange={(e) => setForm({ ...form, actualGuestId: e.target.value })}>{guests.map((g) => <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Team Member" value={form.teamMemberId} onChange={(e) => setForm({ ...form, teamMemberId: e.target.value })}>{teamMembers.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Volunteer" value={form.volunteerId} onChange={(e) => setForm({ ...form, volunteerId: e.target.value })}>{volunteers.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField label="Change Reason" value={form.changeReason} onChange={(e) => setForm({ ...form, changeReason: e.target.value })} /></Grid></Grid><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></Stack></Stack></DialogContent></ResponsiveDialog>
    </>
  );
}
