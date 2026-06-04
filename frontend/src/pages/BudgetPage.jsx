import { useEffect, useMemo, useState } from 'react';
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

function CrudSection({ title, subtitle, items, fields, endpoint, viewMode, setViewMode, onAdd, onEdit }) {
  const rows = items.map((item) => { const row = { title: item[fields[0].key] || 'Record' }; fields.forEach((f) => { row[f.key] = item[f.render ? f.render(item) : f.key] ?? (f.render ? f.render(item) : item[f.key] ?? '-'); }); row.action = () => <Button size="small" variant="contained" onClick={() => onEdit(item)}>Edit</Button>; return row; });
  return <Stack spacing={2}><Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}><Box><Typography variant="h6" fontWeight={800}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Box><Stack direction="row" spacing={1}><ToggleButtonGroup exclusive size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)}><ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton><ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton></ToggleButtonGroup><Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>Add</Button></Stack></Stack></CardContent></Card>{viewMode === 'card' ? <Grid container spacing={2}>{items.map((item) => <Grid key={item._id} size={{ xs: 12, md: 6, xl: 4 }}><Card><CardContent><Stack spacing={1.2}>{fields.map((f, index) => index === 0 ? <Typography key={f.key} variant="h6" fontWeight={800}>{item[f.key] || '-'}</Typography> : <Typography key={f.key} variant="body2"><strong>{f.label}:</strong> {f.render ? f.render(item) : item[f.key] || '-'}</Typography>)}{item.status ? <StatusChip label={item.status} /> : null}<Stack direction="row" justifyContent="flex-end"><Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(item)}>Edit</Button></Stack></Stack></CardContent></Card></Grid>)}</Grid> : <ResponsiveTable columns={[...fields.map((f) => ({ key: f.key, label: f.label })), { key: 'action', label: 'Action' }]} rows={rows} mobileTitleKey="title" />}</Stack>;
}

export default function BudgetPage() {
  const [tab, setTab] = useState('heads');
  const [heads, setHeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    const [b, v, e, t, u] = await Promise.all([api.get('/budget-heads'), api.get('/vendors'), api.get('/expenses'), api.get('/teams'), api.get('/users')]);
    setHeads(Array.isArray(b.data) ? b.data : []);
    setVendors(Array.isArray(v.data) ? v.data : []);
    setExpenses(Array.isArray(e.data) ? e.data : []);
    setTeams(Array.isArray(t.data) ? t.data : []);
    setUsers(Array.isArray(u.data) ? u.data : []);
  };
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({ allowed: heads.reduce((a, b) => a + Number(b.allowedBudget || 0), 0), actual: expenses.reduce((a, b) => a + Number(b.amount || 0), 0) }), [heads, expenses]);

  const config = {
    heads: {
      title: 'Budget Heads', endpoint: '/budget-heads', subtitle: 'Track budget allocation and owner mapping.',
      initial: { title: '', code: '', allowedBudget: 0, expectedCost: 0, responsibleTeamId: '', responsibleUserId: '', notes: '', isActive: true },
      fields: [{ key: 'title', label: 'Title' }, { key: 'code', label: 'Code' }, { key: 'allowedBudget', label: 'Budget' }, { key: 'expectedCost', label: 'Expected' }],
      formFields: [
        { key: 'title', label: 'Title' }, { key: 'code', label: 'Code' }, { key: 'allowedBudget', label: 'Allowed Budget', type: 'number' }, { key: 'expectedCost', label: 'Expected Cost', type: 'number' },
        { key: 'responsibleTeamId', label: 'Responsible Team', type: 'select', options: teams.map((t) => ({ value: t._id, label: t.name })) },
        { key: 'responsibleUserId', label: 'Responsible User', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) },
        { key: 'notes', label: 'Notes', multiline: true }
      ],
      items: heads
    },
    vendors: {
      title: 'Vendors', endpoint: '/vendors', subtitle: 'Manage vendor details and payment status.',
      initial: { name: '', vendorType: '', contactPerson: '', mobile: '', address: '', budgetHeadId: '', responsibleTeamId: '', responsibleUserId: '', quotedAmount: 0, finalAmount: 0, advancePaid: 0, dueAmount: 0, paymentStatus: 'UNPAID', notes: '' },
      fields: [{ key: 'name', label: 'Name' }, { key: 'vendorType', label: 'Type' }, { key: 'mobile', label: 'Mobile' }, { key: 'paymentStatus', label: 'Payment', render: (item) => item.paymentStatus || '-' }],
      formFields: [
        { key: 'name', label: 'Vendor Name' }, { key: 'vendorType', label: 'Vendor Type' }, { key: 'contactPerson', label: 'Contact Person' }, { key: 'mobile', label: 'Mobile' }, { key: 'address', label: 'Address', multiline: true },
        { key: 'budgetHeadId', label: 'Budget Head', type: 'select', options: heads.map((h) => ({ value: h._id, label: h.title })) },
        { key: 'responsibleTeamId', label: 'Responsible Team', type: 'select', options: teams.map((t) => ({ value: t._id, label: t.name })) },
        { key: 'responsibleUserId', label: 'Responsible User', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) },
        { key: 'quotedAmount', label: 'Quoted Amount', type: 'number' }, { key: 'finalAmount', label: 'Final Amount', type: 'number' }, { key: 'advancePaid', label: 'Advance Paid', type: 'number' }, { key: 'dueAmount', label: 'Due Amount', type: 'number' },
        { key: 'paymentStatus', label: 'Payment Status', type: 'select', options: ['UNPAID','PARTIAL','PAID'].map((v) => ({ value: v, label: v })) },
        { key: 'notes', label: 'Notes', multiline: true }
      ],
      items: vendors
    },
    expenses: {
      title: 'Expenses', endpoint: '/expenses', subtitle: 'Direct and vendor expenses in one list.',
      initial: { title: '', expenseType: 'DIRECT', amount: 0, paymentMode: 'CASH', budgetHeadId: '', vendorId: '', paidByUserId: '', approvedByUserId: '', status: 'PAID', note: '' },
      fields: [{ key: 'title', label: 'Title' }, { key: 'expenseType', label: 'Type' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status', render: (item) => item.status || '-' }],
      formFields: [
        { key: 'title', label: 'Expense Title' }, { key: 'expenseType', label: 'Expense Type', type: 'select', options: ['VENDOR','DIRECT','EMERGENCY','TEAM_PURCHASE'].map((v) => ({ value: v, label: v })) }, { key: 'amount', label: 'Amount', type: 'number' },
        { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: ['CASH','UPI','CHEQUE','BANK','OTHER'].map((v) => ({ value: v, label: v })) },
        { key: 'budgetHeadId', label: 'Budget Head', type: 'select', options: heads.map((h) => ({ value: h._id, label: h.title })) },
        { key: 'vendorId', label: 'Vendor', type: 'select', options: vendors.map((v) => ({ value: v._id, label: v.name })) },
        { key: 'paidByUserId', label: 'Paid By', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) },
        { key: 'approvedByUserId', label: 'Approved By', type: 'select', options: users.map((u) => ({ value: u._id, label: u.name })) },
        { key: 'status', label: 'Status', type: 'select', options: ['PENDING','APPROVED','PAID'].map((v) => ({ value: v, label: v })) },
        { key: 'note', label: 'Note', multiline: true }
      ],
      items: expenses
    }
  };

  const current = config[tab];

  const openAdd = () => { setEditing(null); setForm(current.initial); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...current.initial, ...item, budgetHeadId: item.budgetHeadId?._id || item.budgetHeadId || '', vendorId: item.vendorId?._id || item.vendorId || '', responsibleTeamId: item.responsibleTeamId?._id || item.responsibleTeamId || '', responsibleUserId: item.responsibleUserId?._id || item.responsibleUserId || '', paidByUserId: item.paidByUserId?._id || item.paidByUserId || '', approvedByUserId: item.approvedByUserId?._id || item.approvedByUserId || '' }); setOpen(true); };
  const save = async () => { if (editing?._id) await api.put(`${current.endpoint}/${editing._id}`, form); else await api.post(current.endpoint, form); setOpen(false); load(); };

  return (
    <Box>
      <PageHeader title="Finance" subtitle="Card and table view with add/edit across heads, vendors and expenses." chips={[{ label: `Budget ₹${totals.allowed}` }, { label: `Actual ₹${totals.actual}`, color: 'warning' }]} />
      <Card sx={{ mb: 2 }}><CardContent><Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"><Tab value="heads" label={`Budget Heads (${heads.length})`} /><Tab value="vendors" label={`Vendors (${vendors.length})`} /><Tab value="expenses" label={`Expenses (${expenses.length})`} /></Tabs></CardContent></Card>
      <CrudSection {...current} viewMode={viewMode} setViewMode={setViewMode} onAdd={openAdd} onEdit={openEdit} />
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md"><DialogContent sx={{ pt: 3 }}><Stack spacing={2}><Typography variant="h6" fontWeight={800}>{editing ? `Edit ${current.title}` : `Add ${current.title}`}</Typography><Grid container spacing={2}>{current.formFields.map((field) => <Grid key={field.key} size={{ xs: 12, md: field.multiline ? 12 : 6 }}>{field.type === 'select' ? <TextField select label={field.label} value={form[field.key] ?? ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}>{(field.options || []).map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField> : <TextField label={field.label} type={field.type || 'text'} multiline={field.multiline} minRows={field.multiline ? 3 : undefined} value={form[field.key] ?? ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />}</Grid>)}</Grid><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>Save</Button></Stack></Stack></DialogContent></ResponsiveDialog>
    </Box>
  );
}
