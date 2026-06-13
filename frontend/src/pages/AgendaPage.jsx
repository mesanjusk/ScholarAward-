import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, LinearProgress,
  Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import { jsPDF } from 'jspdf';
import PageHeader from '../components/PageHeader';
import PageSurface from '../components/PageSurface';
import { useAuth } from '../context/AuthContext';

const API = (import.meta.env.VITE_API_URL || 'https://bkbackend-zr8f.onrender.com/api').replace(/\/api$/, '');

function authHeader() {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}
async function safeJson(res) {
  const text = await res.text();
  if (!text) throw new Error(`Empty response (${res.status})`);
  try { return JSON.parse(text); } catch { throw new Error(`Server error (${res.status}): ${text.slice(0,100)}`); }
}

const NAVY = '#0a1929';
const DONE_BG = '#1b5e20';

const PRESENTER_ROWS = [
  { row: 1, label: 'Team Members',         source: 'team'  },
  { row: 2, label: 'Guest (Organisation)', source: 'guest' },
  { row: 3, label: 'Special Guest 1',      source: 'guest' },
  { row: 4, label: 'Special Guest 2',      source: 'guest' },
];

function catTitleMatch(agendaTitle, dbCatTitle) {
  const a = (agendaTitle || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const b = (dbCatTitle  || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return a === b || a.includes(b) || b.includes(a);
}

function sName(s) { return (s.fullName || `${s.firstName || ''} ${s.lastName || ''}`).trim(); }

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <Box sx={{ bgcolor: '#e65100', color: '#fff', fontSize: 10, fontWeight: 900,
      minWidth: 20, height: 20, borderRadius: 0, px: 0.5,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ml: 0.75 }}>
      ×{count}
    </Box>
  );
}

// ── Full-screen presenter picker ──────────────────────────────────────────────
function PresenterPicker({ open, onClose, rowLabel, selected, onChange, options, presenterCounts, onAddNew }) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = useMemo(() =>
    options.filter(n => !search || n.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  function toggle(name) {
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }
  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    onAddNew(name);
    if (!selected.includes(name)) onChange([...selected, name]);
    setNewName(''); setAddOpen(false);
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column', borderRadius: 0, bgcolor: '#f5f5f5' } }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5, bgcolor: NAVY, color: 'white', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center">
            <Typography fontWeight={900} fontSize={20} sx={{ flex: 1 }}>{rowLabel}</Typography>
            <Typography fontSize={13} sx={{ mr: 1, opacity: 0.7 }}>{selected.length} selected</Typography>
            <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
          </Stack>
          <TextField fullWidth size="small" placeholder="Search name…" value={search}
            onChange={e => setSearch(e.target.value)} autoFocus sx={{ mt: 1.5 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'white' }} /></InputAdornment>,
              sx: { borderRadius: 0, bgcolor: 'rgba(255,255,255,0.15)', color: 'white',
                '& input': { color: 'white' }, '& input::placeholder': { color: 'rgba(255,255,255,0.6)' } } }}
          />
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1, bgcolor: 'white' }}>
          {selected.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 0.5, bgcolor: '#e3f2fd' }}>
                <Typography fontSize={11} fontWeight={800} color="primary">✓ SELECTED ({selected.length})</Typography>
              </Box>
              {selected.map(name => (
                <Box key={name} onClick={() => toggle(name)}
                  sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5,
                    borderBottom: '1px solid #e0e0e0', cursor: 'pointer', bgcolor: '#f0f7ff',
                    '&:hover': { bgcolor: '#dbeeff' } }}>
                  <CheckBoxIcon sx={{ color: '#1565c0', mr: 2, fontSize: 24 }} />
                  <Typography fontWeight={900} fontSize={18} sx={{ flex: 1 }}>{name}</Typography>
                  <CountBadge count={presenterCounts[name] || 0} />
                </Box>
              ))}
              <Divider />
            </>
          )}
          {filtered.filter(n => !selected.includes(n)).length === 0 && !selected.length && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center', fontSize: 15 }}>
              No names found — tap + Add New below
            </Typography>
          )}
          {filtered.filter(n => !selected.includes(n)).map(name => (
            <Box key={name} onClick={() => toggle(name)}
              sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5,
                borderBottom: '1px solid #e0e0e0', cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' } }}>
              <CheckBoxOutlineBlankIcon sx={{ color: '#bdbdbd', mr: 2, fontSize: 24 }} />
              <Typography fontSize={17} sx={{ flex: 1 }}>{name}</Typography>
              <CountBadge count={presenterCounts[name] || 0} />
            </Box>
          ))}
        </Box>

        <Box sx={{ px: 2, py: 1, bgcolor: 'white', borderTop: '2px solid #e0e0e0', flexShrink: 0 }}>
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => { setNewName(''); setAddOpen(true); }}
              sx={{ borderRadius: 0 }}>Add New</Button>
            <Button variant="contained" onClick={onClose} size="small"
              sx={{ borderRadius: 0, flex: 1, fontWeight: 800, fontSize: 15 }}>Done</Button>
          </Stack>
        </Box>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ py: 1.5, fontSize: 15 }}>Add New Name</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Full Name" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            InputProps={{ sx: { borderRadius: 0 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setAddOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleAdd} disabled={!newName.trim()}
            sx={{ borderRadius: 0 }}>Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Full-screen student picker ────────────────────────────────────────────────
function StudentPicker({ open, onClose, catTitle, existingNames, allDbStudents, onAdd }) {
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPct, setCustomPct] = useState('');

  useEffect(() => {
    if (open) { setSearch(''); setCustomName(''); setCustomPct(''); }
  }, [open]);

  const catStudents = useMemo(() => {
    return allDbStudents.filter(s => {
      const dbCatTitle = s.categoryId?.title || s.categoryName || s.categoryOther || '';
      return catTitleMatch(catTitle, dbCatTitle);
    });
  }, [allDbStudents, catTitle]);

  const sourceList = catStudents.length > 0 ? catStudents : allDbStudents;
  const filtered = sourceList.filter(s => {
    const name = sName(s).toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  function addFromDb(s) {
    onAdd({ name: sName(s), percentage: s.percentage ? `${s.percentage}%` : '', extra: '' });
    onClose();
  }

  function addCustom() {
    if (!customName.trim()) return;
    onAdd({ name: customName.trim(), percentage: customPct.trim(), extra: '' });
    setCustomName(''); setCustomPct(''); onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', borderRadius: 0, bgcolor: '#f5f5f5' } }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 1, bgcolor: NAVY, color: 'white', flexShrink: 0 }}>
        <Stack direction="row" alignItems="center">
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900} fontSize={18}>Add Student</Typography>
            <Typography fontSize={12} sx={{ opacity: 0.7 }}>
              {catTitle} · {catStudents.length > 0 ? `${catStudents.length} in DB` : `${allDbStudents.length} total`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </Stack>
        <TextField fullWidth size="small" placeholder="Search student…" value={search}
          onChange={e => setSearch(e.target.value)} autoFocus sx={{ mt: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'white' }} /></InputAdornment>,
            sx: { borderRadius: 0, bgcolor: 'rgba(255,255,255,0.15)', color: 'white',
              '& input': { color: 'white' }, '& input::placeholder': { color: 'rgba(255,255,255,0.6)' } } }}
        />
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1, bgcolor: 'white' }}>
        {filtered.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2.5, textAlign: 'center', fontSize: 14 }}>
            {search ? 'No match — try different spelling' : 'No students found'}
          </Typography>
        )}
        {filtered.map(s => {
          const name = sName(s);
          const already = existingNames.has(name.toLowerCase());
          return (
            <Box key={s._id} onClick={() => !already && addFromDb(s)}
              sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25,
                borderBottom: '1px solid #e0e0e0', cursor: already ? 'default' : 'pointer',
                opacity: already ? 0.4 : 1, '&:hover': { bgcolor: already ? 'transparent' : '#f5f5f5' } }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700} fontSize={15}>{name}</Typography>
                <Typography fontSize={11} color="text.secondary">
                  {s.categoryId?.title || s.categoryOther || ''}
                  {s.percentage ? ` · ${s.percentage}%` : ''}
                </Typography>
              </Box>
              {already ? <Chip label="added" size="small" sx={{ borderRadius: 0, fontSize: 10 }} /> : <AddIcon sx={{ color: 'primary.main', fontSize: 18 }} />}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ px: 2, py: 1, bgcolor: 'white', borderTop: '2px solid #e0e0e0', flexShrink: 0 }}>
        <Typography fontSize={11} color="text.secondary" sx={{ mb: 0.75 }}>Or type manually:</Typography>
        <Stack direction="row" spacing={0.75}>
          <TextField size="small" placeholder="Student name" value={customName}
            onChange={e => setCustomName(e.target.value)} sx={{ flex: 2 }}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            InputProps={{ sx: { borderRadius: 0 } }} />
          <TextField size="small" placeholder="%" value={customPct}
            onChange={e => setCustomPct(e.target.value)} sx={{ flex: 0.7 }}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            InputProps={{ sx: { borderRadius: 0 } }} />
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={addCustom}
            disabled={!customName.trim()} sx={{ borderRadius: 0 }}>Add</Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────
function StudentRow({ student, index, onSave, onDelete, teams, guests, presenterCounts, extraTeams, extraGuests, onAddExtra }) {
  function buildSelected(presenters) {
    const r = { 1: [], 2: [], 3: [], 4: [] };
    (presenters || []).forEach(p => { if (p.name && r[p.row] && !r[p.row].includes(p.name)) r[p.row].push(p.name); });
    return r;
  }

  const [rowSel, setRowSel] = useState(() => buildSelected(student.presenters));
  const rowSelRef = useRef(rowSel);
  rowSelRef.current = rowSel;
  const [saving, setSaving] = useState(false);
  const [pickerRow, setPickerRow] = useState(null);

  useEffect(() => { setRowSel(buildSelected(student.presenters)); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(student.presenters)]
  );

  function flattenSelected(sel) {
    const r = [];
    [1,2,3,4].forEach(row => (sel[row]||[]).forEach((name,idx) => r.push({ name, row, slot:idx+1 })));
    return r;
  }

  async function handleRowChange(row, names) {
    const newSel = { ...rowSelRef.current, [row]: names };
    setRowSel(newSel);
    setSaving(true);
    try { await onSave({ ...student, presenters: flattenSelected(newSel) }); }
    finally { setSaving(false); }
  }

  async function toggleStatus() {
    await onSave({ ...student, status: (student.status||'live') === 'live' ? 'done' : 'live' });
  }

  const isDone = (student.status || 'live') === 'done';

  return (
    <Box sx={{ borderBottom: '1px solid #e8e8e8', bgcolor: isDone ? '#f9fbe7' : 'white' }}>
      {/* Student header */}
      <Stack direction="row" alignItems="center" sx={{ px: 1.25, py: 0.75, bgcolor: isDone ? '#f1f8e9' : '#f8f9fa' }}>
        <Typography fontSize={11} color="text.secondary" sx={{ minWidth: 20, fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            <Typography fontWeight={800} fontSize={14} sx={{ lineHeight: 1.3 }}>{student.name}</Typography>
            {student.percentage && (
              <Box sx={{ fontSize: 10, fontWeight: 800, color: '#1565c0', bgcolor: '#e3f2fd', px: 0.6, py: 0.1 }}>
                {student.percentage}
              </Box>
            )}
            {student.extra && <Typography fontSize={11} color="text.secondary">{student.extra}</Typography>}
            {saving && <CircularProgress size={11} />}
          </Stack>
        </Box>
        <IconButton size="small" onClick={toggleStatus}
          sx={{ p: 0.4, color: isDone ? DONE_BG : '#c0c0c0', flexShrink: 0 }}>
          {isDone ? <CheckCircleIcon sx={{ fontSize: 17 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 17 }} />}
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(student)} sx={{ p: 0.4 }}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {/* Presenter rows — row number + names only, no labels */}
      {PRESENTER_ROWS.map(rd => {
        const sel = rowSel[rd.row] || [];
        return (
          <Stack key={rd.row} direction="row" alignItems="center"
            onClick={() => setPickerRow(rd.row)}
            sx={{ px: 1.25, py: 0.4, cursor: 'pointer', minHeight: 28,
              borderTop: '1px solid #f0f0f0', '&:hover': { bgcolor: '#fafafa' } }}>
            <Typography fontSize={10} color="text.disabled" sx={{ minWidth: 16, flexShrink: 0 }}>
              {rd.row}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {sel.length === 0 ? (
                <Typography fontSize={12} color="text.disabled" fontStyle="italic">—</Typography>
              ) : sel.map(name => (
                <Typography key={name} fontWeight={700} fontSize={13} sx={{ lineHeight: 1.6 }}>{name}</Typography>
              ))}
            </Box>
            <EditIcon sx={{ fontSize: 14, color: '#d0d0d0', flexShrink: 0 }} />
          </Stack>
        );
      })}

      {/* Presenter pickers */}
      {PRESENTER_ROWS.map(rd => (
        <PresenterPicker key={rd.row}
          open={pickerRow === rd.row}
          onClose={() => setPickerRow(null)}
          rowLabel={`${rd.row}. ${rd.label}`}
          selected={rowSel[rd.row] || []}
          onChange={names => handleRowChange(rd.row, names)}
          options={rd.source === 'team' ? [...new Set([...teams, ...extraTeams])] : [...new Set([...guests, ...extraGuests])]}
          presenterCounts={presenterCounts}
          onAddNew={name => onAddExtra(rd.source, name)}
        />
      ))}
    </Box>
  );
}

// ── Category accordion ────────────────────────────────────────────────────────
function CategoryAccordion({ cat, expanded, onToggle, onCategoryUpdate, onCategoryDelete, teams, guests, presenterCounts, extraTeams, extraGuests, onAddExtra, allDbStudents, onAddStudentClick }) {
  const catRef = useRef(cat);
  useEffect(() => { catRef.current = cat; }, [cat]);

  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(cat.title);
  const autoImportDone = useRef(false);

  const existingNames = useMemo(() =>
    new Set((cat.students || []).map(s => s.name.toLowerCase().trim())),
    [cat.students]
  );

  // Auto-import on mount using pre-loaded allDbStudents
  useEffect(() => {
    if (autoImportDone.current || !allDbStudents.length) return;
    autoImportDone.current = true;
    const cur = catRef.current;
    const curNames = new Set((cur.students || []).map(s => s.name.toLowerCase().trim()));

    const matched = allDbStudents.filter(s => {
      const dbCatTitle = s.categoryId?.title || s.categoryName || s.categoryOther || '';
      return catTitleMatch(cur.title, dbCatTitle);
    });

    const toAdd = matched.filter(s => !curNames.has(sName(s).toLowerCase()));
    if (!toAdd.length) return;

    const startOrder = (cur.students?.length || 0) + 1;
    onCategoryUpdate({ ...cur, students: [
      ...(cur.students || []),
      ...toAdd.map((s, i) => ({
        name: sName(s),
        percentage: s.percentage ? `${s.percentage}%` : '',
        extra: '', presenters: [], order: startOrder + i, status: 'live',
      })),
    ]});
  }, [allDbStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveStudentPresenter(updated) {
    const cur = catRef.current;
    await onCategoryUpdate({ ...cur, students: (cur.students || []).map(s =>
      s.name === updated.name && s.order === updated.order ? updated : s
    )});
  }

  function deleteStudent(student) {
    const cur = catRef.current;
    onCategoryUpdate({ ...cur, students: (cur.students || [])
      .filter(s => !(s.name === student.name && s.order === student.order))
      .map((s, i) => ({ ...s, order: i + 1 })) });
  }

  const isDone = (cat.status || 'live') === 'done';
  const students = (cat.students || []).slice().sort((a, b) => a.order - b.order);

  return (
    <Box sx={{ mb: 0.75, border: '1px solid', borderColor: isDone ? '#388e3c' : '#cfd8dc' }}>
      {/* Category header */}
      <Stack direction="row" alignItems="center"
        sx={{ px: 1.25, py: 0.75, bgcolor: isDone ? DONE_BG : NAVY, color: 'white', cursor: 'pointer' }}
        onClick={onToggle}>
        <ExpandMoreIcon sx={{ mr: 1, fontSize: 24, transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
        <Typography fontWeight={900} fontSize={14} sx={{ flex: 1, lineHeight: 1.2 }}>{cat.title}</Typography>
        <Box sx={{ fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.2)',
          px: 0.75, py: 0.1, mr: 0.5, flexShrink: 0 }}>
          {students.length}
        </Box>
        <IconButton size="small" onClick={e => { e.stopPropagation(); onCategoryUpdate({ ...cat, status: isDone ? 'live' : 'done' }); }}
          sx={{ color: isDone ? '#a5d6a7' : 'rgba(255,255,255,0.5)', p: 0.4 }}>
          {isDone ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
        </IconButton>
        <IconButton size="small"
          onClick={e => { e.stopPropagation(); setEditTitle(cat.title); setEditTitleOpen(true); }}
          sx={{ color: 'rgba(255,255,255,0.65)', p: 0.4 }}>
          <EditIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton size="small" onClick={e => { e.stopPropagation(); onCategoryDelete(cat); }}
          sx={{ color: '#ef9a9a', p: 0.4 }}>
          <DeleteIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>

      {/* Expanded body */}
      {expanded && (
        <Box>
          {students.length === 0 && (
            <Typography fontSize={12} color="text.secondary"
              sx={{ px: 2, py: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
              No students yet — auto-importing from DB…
            </Typography>
          )}

          {students.map((student, i) => (
            <StudentRow
              key={`${student.name}-${student.order}-${(student.presenters||[]).length}`}
              student={student} index={i}
              onSave={saveStudentPresenter} onDelete={deleteStudent}
              teams={teams} guests={guests} presenterCounts={presenterCounts}
              extraTeams={extraTeams} extraGuests={extraGuests} onAddExtra={onAddExtra}
            />
          ))}
        </Box>
      )}

      <Dialog open={editTitleOpen} onClose={() => setEditTitleOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ py: 1.5, fontSize: 15 }}>Edit Category Title</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Title" value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onCategoryUpdate({ ...cat, title: editTitle }); setEditTitleOpen(false); } }}
            InputProps={{ sx: { borderRadius: 0 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setEditTitleOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button size="small" variant="contained" sx={{ borderRadius: 0 }} disabled={!editTitle.trim()}
            onClick={() => { onCategoryUpdate({ ...cat, title: editTitle }); setEditTitleOpen(false); }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportToPDF(categories) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const W = 210, H = 297, MX = 12, MY = 14;
  const C = { sx: MX, sw: 13, nx: MX+13, nw: 57, px: MX+70, pw: 24, rx: MX+94, rw: W-MX-MX-94 };
  const ROW_H = 8, N_PRES = 4, STU_H = ROW_H * N_PRES;
  let y = MY;

  function newPage() { doc.addPage(); y = MY; }
  function need(h) { if (y + h > H - MY) newPage(); }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(0,0,180);
  doc.text('19th BK Scholar Awards', W/2, y+8, { align: 'center' }); y += 13;
  doc.setFontSize(14); doc.setTextColor(180,0,0);
  doc.text('Sunday, 14th June 2026', W/2, y+6, { align: 'center' }); y += 13;

  for (const cat of categories) {
    const students = [...(cat.students||[])].sort((a,b) => a.order - b.order);
    if (!students.length) continue;
    need(10 + STU_H);
    doc.setFillColor(255,255,0); doc.rect(MX, y, W-2*MX, 9, 'F');
    doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(MX, y, W-2*MX, 9, 'D');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0,0,0);
    doc.text(cat.title, W/2, y+6.2, { align: 'center' }); y += 9;

    students.forEach((student, idx) => {
      need(STU_H);
      const sy = y;
      const byRow = {};
      (student.presenters||[]).forEach(p => { if (!byRow[p.row]) byRow[p.row]=[]; if(p.name) byRow[p.row].push(p.name); });
      const pLines = [1,2,3,4].map(r => (byRow[r]||[]).filter(Boolean).join(' & '));

      doc.setDrawColor(0); doc.setLineWidth(0.35); doc.rect(MX, sy, W-2*MX, STU_H, 'D');
      [C.nx, C.px, C.rx].forEach(x => { doc.setLineWidth(0.25); doc.line(x, sy, x, sy+STU_H); });

      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(0,0,0);
      doc.text(String(idx+1), C.sx+C.sw/2, sy+STU_H/2+2, { align: 'center' });

      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(180,30,30);
      const nw = doc.splitTextToSize(student.name, C.nw-3);
      const nY = sy + STU_H/2 - (nw.length*5.5)/2 + 4.5;
      nw.forEach((l,li) => doc.text(l, C.nx+2, nY+li*5.5));

      if (student.percentage) {
        doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(0,0,0);
        const pw = doc.splitTextToSize(student.percentage, C.pw-2);
        const pY = student.extra ? sy+STU_H/2-2 : sy+STU_H/2+2;
        doc.text(pw, C.px+C.pw/2, pY, { align: 'center' });
        if (student.extra) {
          doc.setFontSize(8); doc.setTextColor(80,80,80);
          doc.text(doc.splitTextToSize(student.extra, C.pw-2), C.px+C.pw/2, pY+5, { align: 'center' });
        }
      }

      pLines.forEach((line, ri) => {
        const ry = sy + ri*ROW_H;
        if (ri > 0) { doc.setDrawColor(160,160,160); doc.setLineWidth(0.15); doc.line(C.rx, ry, W-MX, ry); }
        if (line) {
          doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(0,0,0);
          doc.text(doc.splitTextToSize(line, C.rw-4), C.rx+2, ry+5.5);
        }
      });
      y += STU_H;
    });
  }

  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(140,140,140);
    doc.text(`Page ${pg} of ${total}`, W/2, H-5, { align: 'center' });
    doc.text('BK Scholar Awards', MX, H-5);
  }
  doc.save('BK_Awards_Agenda.pdf');
}

// ── Main AgendaPage ───────────────────────────────────────────────────────────
function AgendaPage() {
  useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [teams, setTeams] = useState([]);
  const [guests, setGuests] = useState([]);
  const [allDbStudents, setAllDbStudents] = useState([]);
  const [extraTeams, setExtraTeams] = useState([]);
  const [extraGuests, setExtraGuests] = useState([]);
  const [tab, setTab] = useState('live');
  const [expandedCat, setExpandedCat] = useState(null);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [dbCategories, setDbCategories] = useState([]);
  const [loadingDbCats, setLoadingDbCats] = useState(false);
  const [studentPickerCat, setStudentPickerCat] = useState(null); // cat object for the picker
  const [loadingAll, setLoadingAll] = useState(false);

  const presenterCounts = useMemo(() => {
    const counts = {};
    categories.forEach(cat =>
      (cat.students||[]).forEach(student =>
        (student.presenters||[]).forEach(p => { if(p.name) counts[p.name] = (counts[p.name]||0) + 1; })
      )
    );
    return counts;
  }, [categories]);

  function handleAddExtra(source, name) {
    if (source === 'team') setExtraTeams(p => p.includes(name) ? p : [...p, name]);
    else setExtraGuests(p => p.includes(name) ? p : [...p, name]);
  }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/agenda`, { headers: authHeader() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setCategories(data);
    } catch (e) { setError(e.message); setLoading(false); return; }

    try {
      const r = await fetch(`${API}/api/users`, { headers: authHeader() });
      const d = await safeJson(r);
      const ul = Array.isArray(d) ? d : d.users || [];
      setTeams(ul.filter(u => ['TEAM_LEADER','SENIOR_TEAM','ADMIN','HOST','SUPER_ADMIN'].includes(u.eventDutyType)).map(u => u.name).filter(Boolean));
      setGuests(ul.filter(u => u.eventDutyType === 'GUEST').map(u => u.name).filter(Boolean));
    } catch { /* optional */ }

    try {
      const r = await fetch(`${API}/api/students`, { headers: authHeader() });
      const d = await safeJson(r);
      const list = Array.isArray(d) ? d : d.students || d.data || [];
      setAllDbStudents(list);
    } catch { /* optional */ }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load all approved students into all categories at once
  async function loadAllCategories() {
    if (!allDbStudents.length || !categories.length) return;
    setLoadingAll(true);
    const updates = [];
    for (const cat of categories) {
      const curNames = new Set((cat.students || []).map(s => s.name.toLowerCase().trim()));
      const matched = allDbStudents.filter(s => {
        const dbCatTitle = s.categoryId?.title || s.categoryName || s.categoryOther || '';
        return catTitleMatch(cat.title, dbCatTitle);
      });
      const toAdd = matched.filter(s => !curNames.has(sName(s).toLowerCase()));
      if (!toAdd.length) continue;
      const startOrder = (cat.students?.length || 0) + 1;
      const updated = { ...cat, students: [
        ...(cat.students || []),
        ...toAdd.map((s, i) => ({
          name: sName(s),
          percentage: s.percentage ? `${s.percentage}%` : '',
          extra: '', presenters: [], order: startOrder + i, status: 'live',
        })),
      ]};
      updates.push(updated);
    }
    for (const updated of updates) {
      try {
        const res = await fetch(`${API}/api/agenda/${updated._id}`, {
          method: 'PATCH', headers: authHeader(), body: JSON.stringify(updated),
        });
        const saved = await safeJson(res);
        if (res.ok) setCategories(prev => prev.map(c => c._id === saved._id ? saved : c));
      } catch { /* skip */ }
    }
    setLoadingAll(false);
  }

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/api/agenda/seed`, { method: 'POST', headers: authHeader() });
      const d = await safeJson(res);
      if (!res.ok) throw new Error(d?.message || `HTTP ${res.status}`);
      await load(); setError('');
    } catch (e) { setError(e.message); }
    finally { setSeeding(false); }
  }

  async function openAddCat() {
    setAddCatOpen(true); setNewCatTitle('');
    if (dbCategories.length === 0) {
      setLoadingDbCats(true);
      try {
        const res = await fetch(`${API}/api/categories`, { headers: authHeader() });
        const d = await safeJson(res);
        setDbCategories(Array.isArray(d) ? d : d.categories || []);
      } catch { }
      finally { setLoadingDbCats(false); }
    }
  }

  async function addCategory() {
    if (!newCatTitle.trim()) return;
    try {
      const res = await fetch(`${API}/api/agenda`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ title: newCatTitle.trim(), order: categories.length + 1, students: [], status: 'live' }),
      });
      const cat = await safeJson(res);
      if (!res.ok) throw new Error(cat?.message || `HTTP ${res.status}`);
      setCategories(prev => [...prev, cat]);
      setExpandedCat(cat._id);
      setAddCatOpen(false);
    } catch (e) { setError(e.message); }
  }

  const updateCategory = useCallback(async (updated) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/agenda/${updated._id}`, {
        method: 'PATCH', headers: authHeader(), body: JSON.stringify(updated),
      });
      const saved = await safeJson(res);
      if (!res.ok) throw new Error(saved?.message || `HTTP ${res.status}`);
      setCategories(prev => prev.map(c => c._id === saved._id ? saved : c));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }, []);

  async function deleteCategory(cat) {
    if (!window.confirm(`Delete "${cat.title}" and all its students?`)) return;
    try {
      await fetch(`${API}/api/agenda/${cat._id}`, { method: 'DELETE', headers: authHeader() });
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch (e) { setError(e.message); }
  }

  function addStudentToCategory(cat) {
    return (data) => {
      const updated = { ...cat, students: [...(cat.students || []), {
        ...data, presenters: [], order: (cat.students?.length || 0) + 1, status: 'live',
      }]};
      updateCategory(updated);
    };
  }

  const filteredDbCats = dbCategories.filter(c =>
    !newCatTitle || (c.name || c.title || '').toLowerCase().includes(newCatTitle.toLowerCase())
  );

  const liveCats = categories.filter(c => (c.status||'live') === 'live').sort((a,b) => a.order - b.order);
  const doneCats = categories.filter(c => (c.status||'live') === 'done').sort((a,b) => a.order - b.order);
  const visibleCats = tab === 'live' ? liveCats : doneCats;

  return (
    <>
      <PageHeader title="Agenda"
        subtitle={`${liveCats.length} live · ${doneCats.length} done · ${categories.reduce((s,c) => s+(c.students?.length||0), 0)} students`}
      />
      <PageSurface>
        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 1, borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': { fontWeight: 700, borderRadius: 0, minHeight: 36, fontSize: 13, py: 0.5, px: 2 } }}>
          <Tab value="live" label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <span>Live</span>
              <Box sx={{ bgcolor: '#1976d2', color: 'white', fontSize: 11, fontWeight: 900,
                minWidth: 20, height: 20, borderRadius: 0, px: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{liveCats.length}</Box>
            </Stack>
          } />
          <Tab value="done" label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <span>Done</span>
              <Box sx={{ bgcolor: DONE_BG, color: 'white', fontSize: 11, fontWeight: 900,
                minWidth: 20, height: 20, borderRadius: 0, px: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{doneCats.length}</Box>
            </Stack>
          } />
        </Tabs>

        {/* Action toolbar — single scrollable row */}
        <Box sx={{ overflowX: 'auto', mb: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ pb: 0.5, minWidth: 'max-content' }}>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
              onClick={load} disabled={loading}
              sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25, borderColor: '#9e9e9e', color: '#555' }}>
              Refresh
            </Button>
            <Button size="small" variant="outlined" startIcon={<SyncIcon sx={{ fontSize: 15 }} />}
              onClick={loadAllCategories} disabled={loadingAll || loading || !allDbStudents.length}
              sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25, borderColor: '#9e9e9e', color: '#555' }}>
              {loadingAll ? 'Loading…' : 'Load All'}
            </Button>
            <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
              onClick={openAddCat}
              sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25, borderColor: '#9e9e9e', color: '#555' }}>
              Add Category
            </Button>
            <Button size="small" variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
              onClick={() => window.open('/student-register', '_blank')}
              sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25, borderColor: '#9e9e9e', color: '#555' }}>
              Add Students
            </Button>
            <Button size="small" variant="contained" color="success" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
              onClick={() => { try { exportToPDF(liveCats); } catch(e) { setError(e.message); } }}
              disabled={liveCats.length === 0}
              sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25 }}>
              Export PDF
            </Button>
            {categories.length === 0 && !loading && (
              <Button size="small" variant="contained" color="secondary" onClick={seed} disabled={seeding}
                sx={{ borderRadius: 0, fontSize: 12, py: 0.4, px: 1.25 }}
                startIcon={seeding ? <CircularProgress size={13} color="inherit" /> : null}>
                {seeding ? 'Seeding…' : '🌱 Load Default'}
              </Button>
            )}
          </Stack>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 0, py: 0.5 }} onClose={() => setError('')}>{error}</Alert>}
        {(loading || saving) && <LinearProgress sx={{ mb: 1 }} color={saving ? 'success' : 'primary'} />}

        {!loading && visibleCats.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: 0, py: 0.5, fontSize: 13 }}>
            {tab === 'live'
              ? categories.length === 0
                ? <>No categories. Click <strong>Load Default</strong> or Add Category.</>
                : 'All categories are marked done.'
              : 'No done categories yet.'}
          </Alert>
        )}

        {visibleCats.map(cat => (
          <CategoryAccordion key={cat._id} cat={cat}
            expanded={expandedCat === cat._id}
            onToggle={() => setExpandedCat(expandedCat === cat._id ? null : cat._id)}
            onCategoryUpdate={updateCategory} onCategoryDelete={deleteCategory}
            teams={teams} guests={guests} presenterCounts={presenterCounts}
            extraTeams={extraTeams} extraGuests={extraGuests} onAddExtra={handleAddExtra}
            allDbStudents={allDbStudents}
            onAddStudentClick={() => setStudentPickerCat(cat)}
          />
        ))}

        {/* Student picker driven from toolbar "Add Students" per-category via expand */}
        {studentPickerCat && (
          <StudentPicker
            open={!!studentPickerCat}
            onClose={() => setStudentPickerCat(null)}
            catTitle={studentPickerCat.title}
            existingNames={new Set((studentPickerCat.students||[]).map(s => s.name.toLowerCase().trim()))}
            allDbStudents={allDbStudents}
            onAdd={addStudentToCategory(studentPickerCat)}
          />
        )}

        {/* Add category dialog */}
        <Dialog open={addCatOpen} onClose={() => setAddCatOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 0 } }}>
          <DialogTitle sx={{ py: 1.5, fontSize: 15 }}>Add Category</DialogTitle>
          <DialogContent>
            <Stack spacing={1.25} sx={{ mt: 0.5 }}>
              <TextField autoFocus fullWidth size="small" label="Search or type category name"
                value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  endAdornment: loadingDbCats ? <CircularProgress size={14} /> : null,
                  sx: { borderRadius: 0 },
                }}
              />
              {filteredDbCats.length > 0 && (
                <Box sx={{ border: '1px solid #e0e0e0', maxHeight: 200, overflowY: 'auto', bgcolor: '#fafafa' }}>
                  {filteredDbCats.slice(0, 20).map(c => (
                    <Box key={c._id} onClick={() => setNewCatTitle(c.name || c.title)}
                      sx={{ px: 2, py: 0.9, cursor: 'pointer', borderBottom: '1px solid #eeeeee',
                        '&:hover': { bgcolor: '#f0f0f0' } }}>
                      <Typography fontSize={13}>{c.name || c.title}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {newCatTitle && filteredDbCats.length === 0 && !loadingDbCats && (
                <Typography variant="caption" color="text.secondary">Not in DB — will create new.</Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setAddCatOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
            <Button size="small" variant="contained" onClick={addCategory} disabled={!newCatTitle.trim()}
              sx={{ borderRadius: 0 }}>Add</Button>
          </DialogActions>
        </Dialog>
      </PageSurface>
    </>
  );
}

class AgendaErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>
          <strong>Agenda crashed:</strong> {this.state.error?.message}
        </Alert>
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {this.state.error?.stack}
        </pre>
      </Box>
    );
    return this.props.children;
  }
}

export default function AgendaPageWithBoundary() {
  return <AgendaErrorBoundary><AgendaPage /></AgendaErrorBoundary>;
}
