import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, DialogContent, Grid, MenuItem, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ResponsiveDialog from '../components/ResponsiveDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
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

function BulkNamesDialog({ open, onClose, bulkData, setBulkData, bulkTab, setBulkTab, guests, volunteers, teamMembers, onSave }) {
  const currentPool = bulkTab === 'guests' ? guests : bulkTab === 'volunteers' ? volunteers : teamMembers;
  const currentField = bulkTab === 'guests' ? 'guestId' : bulkTab === 'volunteers' ? 'volunteerId' : 'teamMemberId';

  const autoDistribute = () => {
    if (!currentPool.length) return;
    setBulkData(prev => prev.map((d, i) => ({ ...d, [currentField]: currentPool[i % currentPool.length]._id })));
  };

  const clearAll = () => {
    setBulkData(prev => prev.map(d => ({ ...d, [currentField]: '' })));
  };

  const assignToEmpty = (personId) => {
    setBulkData(prev => prev.map(d => !d[currentField] ? { ...d, [currentField]: personId } : d));
  };

  const assignToAll = (personId) => {
    setBulkData(prev => prev.map(d => ({ ...d, [currentField]: personId })));
  };

  return (
    <ResponsiveDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>Bulk Assign Names — Live Stage</Typography>
            <Typography variant="caption" color="text.secondary">{bulkData.length} assignments</Typography>
          </Stack>

          <Tabs value={bulkTab} onChange={(_, v) => setBulkTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab value="guests" label={`Guests (${guests.length})`} />
            <Tab value="volunteers" label={`Volunteers (${volunteers.length})`} />
            <Tab value="team" label={`Team Members (${teamMembers.length})`} />
          </Tabs>

          {/* Available pool — choose from data */}
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                {currentPool.length > 0 ? `Choose from ${currentPool.length} available — click a name to assign` : 'No data available for this type'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={autoDistribute} disabled={!currentPool.length}>
                  Auto Distribute
                </Button>
                <Button size="small" color="error" onClick={clearAll}>
                  Clear All
                </Button>
              </Stack>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {currentPool.map(p => (
                <Chip
                  key={p._id}
                  label={p.name}
                  size="small"
                  variant="outlined"
                  clickable
                  title="Click: fill empty slots only. Right-click: assign to all"
                  onClick={() => assignToEmpty(p._id)}
                  onContextMenu={(e) => { e.preventDefault(); assignToAll(p._id); }}
                />
              ))}
              {!currentPool.length && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No users with this duty type found.
                </Typography>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Left-click fills empty slots only · Right-click assigns to all slots
            </Typography>
          </Box>

          {/* Assignment rows */}
          <Box sx={{ maxHeight: 360, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {bulkData.length === 0 && (
              <Box p={3} textAlign="center">
                <Typography color="text.secondary">No stage assignments yet. Generate from eligible first.</Typography>
              </Box>
            )}
            {bulkData.map((d, i) => (
              <Stack
                key={d.id}
                direction="row"
                spacing={2}
                alignItems="center"
                px={2}
                py={1}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, bgcolor: d[currentField] ? 'transparent' : 'warning.50' }}
              >
                <Typography width={28} variant="body2" fontWeight={700} color="text.secondary">{d.seq}</Typography>
                <Box flex={1.5} minWidth={0}>
                  <Typography variant="body2" fontWeight={600} noWrap>{d.student}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{d.category}</Typography>
                </Box>
                <TextField
                  select
                  size="small"
                  sx={{ minWidth: 200 }}
                  value={d[currentField]}
                  onChange={e => setBulkData(prev => prev.map((item, idx) => idx === i ? { ...item, [currentField]: e.target.value } : item))}
                >
                  <MenuItem value=""><em>— None —</em></MenuItem>
                  {currentPool.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
                </TextField>
              </Stack>
            ))}
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {bulkData.filter(d => d[currentField]).length} of {bulkData.length} slots assigned
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="contained" onClick={onSave}>Save All</Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </ResponsiveDialog>
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkTab, setBulkTab] = useState('guests');

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

  const openBulk = () => {
    setBulkData(assignments.map(a => ({
      id: a._id,
      student: a.studentId?.fullName || '-',
      category: a.categoryId?.title || '-',
      seq: a.sequenceNo,
      guestId: a.actualGuestId?._id || a.plannedGuestId?._id || '',
      volunteerId: a.volunteerId?._id || '',
      teamMemberId: a.teamMemberId?._id || '',
    })));
    setBulkTab('guests');
    setBulkOpen(true);
  };

  const saveBulk = async () => {
    await api.put('/stage-assignments/bulk-names', {
      updates: bulkData.map(d => ({
        id: d.id,
        guestId: d.guestId || null,
        volunteerId: d.volunteerId || null,
        teamMemberId: d.teamMemberId || null,
      }))
    });
    setBulkOpen(false);
    load();
  };

  const rows = assignments.map((a) => ({ title: `${a.sequenceNo}. ${a.studentId?.fullName || '-'}`, sequenceNo: a.sequenceNo, student: a.studentId?.fullName || '-', category: a.categoryId?.title || '-', guest: a.actualGuestId?.name || a.plannedGuestId?.name || '-', status: () => <StatusChip label={a.status || 'PENDING'} />, action: () => <Button size="small" variant="contained" onClick={() => openEdit(a)}>Edit</Button> }));

  return (
    <>
      <PageHeader title="Live Stage" subtitle="Queue, live board and guest reassignment from one screen." chips={[{ label: `${assignments.length} Assignments` }, { label: liveBoard.current ? 'Live Running' : 'Waiting', color: liveBoard.current ? 'success' : 'warning' }]} action={<Button variant="contained" onClick={generate}>Generate from Eligible</Button>} />
      {guestChangedAlert ? <Alert severity="warning" sx={{ mb: 2 }}>{guestChangedAlert.payload?.title || 'Guest changed'} — {guestChangedAlert.payload?.message}</Alert> : null}
      <Card sx={{ mb: 2 }}><CardContent><Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"><Tab value="assignments" label={`Assignments (${assignments.length})`} /><Tab value="live" label="Live Board" /></Tabs></CardContent></Card>
      {tab === 'live' ? <Grid container spacing={2}><Grid size={{ xs: 12, lg: 5 }}><Card><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Current Stage</Typography>{liveBoard.current ? <Stack spacing={1}><Typography variant="h5" fontWeight={800}>{liveBoard.current.studentId?.fullName || '-'}</Typography><Typography color="text.secondary">{liveBoard.current.categoryId?.title || '-'}</Typography><Typography>Guest: {liveBoard.current.actualGuestId?.name || liveBoard.current.plannedGuestId?.name || '-'}</Typography><Typography>Anchor: {liveBoard.current.actualAnchorId?.name || liveBoard.current.plannedAnchorId?.name || '-'}</Typography><StatusChip label={liveBoard.current.status || 'PENDING'} /></Stack> : <Typography color="text.secondary">No current stage student.</Typography>}</CardContent></Card></Grid><Grid size={{ xs: 12, lg: 7 }}><Card><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Queue</Typography><Stack spacing={1.2}>{(liveBoard.queue || []).map((item) => <Card key={item._id} variant="outlined"><CardContent sx={{ py: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={700}>{item.sequenceNo}. {item.studentId?.fullName || '-'}</Typography><Typography variant="body2" color="text.secondary">{item.categoryId?.title || '-'}</Typography></Box><StatusChip label={item.status || 'PENDING'} /></Stack></CardContent></Card>)}</Stack></CardContent></Card></Grid></Grid> : <Stack spacing={2}><Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}><Box><Typography variant="h6" fontWeight={800}>Stage Assignments</Typography><Typography color="text.secondary">Card and table view with add/edit controls.</Typography></Box><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><ToggleButtonGroup exclusive size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)}><ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton><ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton></ToggleButtonGroup><Button variant="outlined" startIcon={<PeopleIcon />} onClick={openBulk}>Bulk Names</Button><Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Assignment</Button></Stack></Stack></CardContent></Card>{viewMode === 'card' ? <Grid container spacing={2}>{assignments.map((item) => <Grid key={item._id} size={{ xs: 12, md: 6, xl: 4 }}><AssignmentCard item={item} onEdit={openEdit} onStatus={statusUpdate} /></Grid>)}</Grid> : <ResponsiveTable columns={[{ key: 'sequenceNo', label: 'Seq' }, { key: 'student', label: 'Student' }, { key: 'category', label: 'Category' }, { key: 'guest', label: 'Guest' }, { key: 'status', label: 'Status' }, { key: 'action', label: 'Action' }]} rows={rows} mobileTitleKey="title" />}</Stack>}
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md"><DialogContent sx={{ pt: 3 }}><Stack spacing={2}><Typography variant="h6" fontWeight={800}>{editing ? 'Edit Assignment' : 'Add Assignment'}</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}><TextField type="number" label="Sequence No" value={form.sequenceNo} onChange={(e) => setForm({ ...form, sequenceNo: Number(e.target.value) })} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Student" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{students.map((s) => <MenuItem key={s._id} value={s._id}>{s.fullName}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.title || c.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Planned Guest" value={form.plannedGuestId} onChange={(e) => setForm({ ...form, plannedGuestId: e.target.value })}>{guests.map((g) => <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Actual Guest" value={form.actualGuestId} onChange={(e) => setForm({ ...form, actualGuestId: e.target.value })}>{guests.map((g) => <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Team Member" value={form.teamMemberId} onChange={(e) => setForm({ ...form, teamMemberId: e.target.value })}>{teamMembers.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField select label="Volunteer" value={form.volunteerId} onChange={(e) => setForm({ ...form, volunteerId: e.target.value })}>{volunteers.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, md: 6 }}><TextField label="Change Reason" value={form.changeReason} onChange={(e) => setForm({ ...form, changeReason: e.target.value })} /></Grid></Grid><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></Stack></Stack></DialogContent></ResponsiveDialog>
      <BulkNamesDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        bulkData={bulkData}
        setBulkData={setBulkData}
        bulkTab={bulkTab}
        setBulkTab={setBulkTab}
        guests={guests}
        volunteers={volunteers}
        teamMembers={teamMembers}
        onSave={saveBulk}
      />
    </>
  );
}
