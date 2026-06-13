import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Badge, Box, Button, Card, CardContent, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { jsPDF } from 'jspdf';
import PageHeader from '../components/PageHeader';
import PageSurface from '../components/PageSurface';
import { useAuth } from '../context/AuthContext';

const API = (import.meta.env.VITE_API_URL || 'https://bkbackend-zr8f.onrender.com/api').replace(/\/api$/, '');

function authHeader() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function safeJson(res) {
  const text = await res.text();
  if (!text) throw new Error(`Empty response (${res.status})`);
  try { return JSON.parse(text); } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`); }
}

// ── Presenter row definitions ─────────────────────────────────────────────────
const PRESENTER_ROWS = [
  { row: 1, label: 'Team Members',         source: 'team',  color: '#1565c0' },
  { row: 2, label: 'Guest (Organisation)', source: 'guest', color: '#2e7d32' },
  { row: 3, label: 'Special Guest 1',      source: 'guest', color: '#6a1b9a' },
  { row: 4, label: 'Special Guest 2',      source: 'guest', color: '#c62828' },
];

// ── Single presenter row — multi-select with checkboxes + count badge ─────────
function PresenterRow({ rowDef, selected, onChange, options, presenterCounts, extraOptions, onAddExtra }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const allOptions = useMemo(() => {
    const merged = [...options, ...(extraOptions || [])];
    return [...new Set(merged)].filter(Boolean);
  }, [options, extraOptions]);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    onAddExtra(name);
    if (!selected.includes(name)) onChange([...selected, name]);
    setNewName('');
    setAddOpen(false);
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ color: rowDef.color, fontWeight: 700, fontSize: 10, display: 'block', mb: 0.25 }}>
        {rowDef.row}. {rowDef.label}
      </Typography>
      <Stack direction="row" alignItems="flex-start" spacing={0.5}>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={allOptions}
          value={selected}
          onChange={(_, v) => onChange(v)}
          renderOption={(props, option, { selected: isSel }) => {
            const count = presenterCounts[option] || 0;
            return (
              <li {...props} key={option}>
                <Checkbox size="small" checked={isSel} sx={{ p: 0.5, mr: 0.5 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>{option}</Typography>
                {count > 0 && (
                  <Badge badgeContent={count} color="primary"
                    sx={{ mr: 2, '& .MuiBadge-badge': { fontSize: 10, minWidth: 18, height: 18 } }} />
                )}
              </li>
            );
          }}
          renderTags={() => null}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selected.length ? `${selected.length} selected` : 'Select names…'}
              size="small"
              sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
            />
          )}
          ListboxProps={{ sx: { maxHeight: 320 } }}
          sx={{ flex: 1 }}
        />
        <IconButton size="small" onClick={() => { setNewName(''); setAddOpen(true); }}
          title="Add new name" sx={{ mt: 0.25 }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      {selected.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5, pl: 0.25 }}>
          {selected.map(name => (
            <Chip key={name} label={name} size="small"
              onDelete={() => onChange(selected.filter(n => n !== name))}
              sx={{ fontSize: 11, height: 22 }} />
          ))}
        </Stack>
      )}

      {/* Add new name dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Add New — {rowDef.label}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Name" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Student card with 4 presenter rows, each multi-select ─────────────────────
function StudentCard({ student, onSave, onDelete, teams, guests, presenterCounts, extraTeams, extraGuests, onAddExtra }) {
  // Build initial per-row selection from presenter array
  function buildSelected(presenters) {
    const byRow = { 1: [], 2: [], 3: [], 4: [] };
    (presenters || []).forEach(p => {
      if (p.name && byRow[p.row] && !byRow[p.row].includes(p.name))
        byRow[p.row].push(p.name);
    });
    return byRow;
  }

  const [rowSel, setRowSel] = useState(() => buildSelected(student.presenters));
  const [saving, setSaving] = useState(false);

  function flattenSelected(sel) {
    const result = [];
    [1, 2, 3, 4].forEach(row => {
      (sel[row] || []).forEach((name, idx) => {
        result.push({ name, row, slot: idx + 1 });
      });
    });
    return result;
  }

  async function handleRowChange(row, names) {
    const newSel = { ...rowSel, [row]: names };
    setRowSel(newSel);
    setSaving(true);
    try { await onSave({ ...student, presenters: flattenSelected(newSel) }); }
    finally { setSaving(false); }
  }

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
              <Typography variant="body2" fontWeight={700}>{student.name}</Typography>
              {student.percentage && <Chip label={student.percentage} size="small" color="primary" variant="outlined" />}
              {student.extra && <Typography variant="caption" color="text.secondary">{student.extra}</Typography>}
              {saving && <CircularProgress size={12} />}
            </Stack>

            {PRESENTER_ROWS.map(rowDef => (
              <PresenterRow
                key={rowDef.row}
                rowDef={rowDef}
                selected={rowSel[rowDef.row] || []}
                onChange={names => handleRowChange(rowDef.row, names)}
                options={rowDef.source === 'team' ? teams : guests}
                presenterCounts={presenterCounts}
                extraOptions={rowDef.source === 'team' ? extraTeams : extraGuests}
                onAddExtra={name => onAddExtra(rowDef.source, name)}
              />
            ))}
          </Box>
          <IconButton size="small" color="error" onClick={() => onDelete(student)} sx={{ mt: 0.5 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({ cat, onCategoryUpdate, onCategoryDelete, allDbStudents, teams, guests, presenterCounts, extraTeams, extraGuests, onAddExtra }) {
  const [addOpen, setAddOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [addPct, setAddPct] = useState('');
  const [addExtra, setAddExtra] = useState('');
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(cat.title);
  const [importOpen, setImportOpen] = useState(false);
  const [catStudents, setCatStudents] = useState([]);
  const [loadingCatStudents, setLoadingCatStudents] = useState(false);

  const existingNames = new Set((cat.students || []).map(s => s.name.toLowerCase().trim()));
  const filteredDbStudents = allDbStudents.filter(s => {
    const name = (s.fullName || `${s.firstName} ${s.lastName}`).toLowerCase();
    return !studentSearch || name.includes(studentSearch.toLowerCase());
  });

  function pickStudent(s) {
    setSelectedStudent(s);
    setStudentSearch(s.fullName || `${s.firstName} ${s.lastName}`.trim());
    setAddPct(s.percentage ? `${s.percentage}%` : '');
  }

  function saveStudent() {
    const name = (selectedStudent
      ? selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`
      : studentSearch
    ).trim();
    if (!name) return;
    const students = [...(cat.students || []), {
      name, percentage: addPct.trim(), extra: addExtra.trim(),
      presenters: [], order: (cat.students?.length || 0) + 1,
    }];
    onCategoryUpdate({ ...cat, students });
    setAddOpen(false);
  }

  async function openImport() {
    setImportOpen(true);
    setLoadingCatStudents(true);
    try {
      const res = await fetch(`${API}/api/categories`, { headers: authHeader() });
      const cats = await safeJson(res);
      const matched = (Array.isArray(cats) ? cats : []).find(c =>
        c.name?.toLowerCase() === cat.title.toLowerCase() ||
        c.title?.toLowerCase() === cat.title.toLowerCase()
      );
      if (matched) {
        const sRes = await fetch(`${API}/api/students?categoryId=${matched._id}&limit=200`, { headers: authHeader() });
        const sData = await safeJson(sRes);
        setCatStudents(Array.isArray(sData) ? sData : sData.students || sData.data || []);
      } else {
        setCatStudents([]);
      }
    } catch { setCatStudents([]); }
    finally { setLoadingCatStudents(false); }
  }

  function importStudents(selected) {
    const toAdd = selected.filter(s => {
      const name = (s.fullName || `${s.firstName} ${s.lastName}`).trim().toLowerCase();
      return !existingNames.has(name);
    });
    if (!toAdd.length) { setImportOpen(false); return; }
    const startOrder = (cat.students?.length || 0) + 1;
    const newStudents = [
      ...(cat.students || []),
      ...toAdd.map((s, i) => ({
        name: s.fullName || `${s.firstName} ${s.lastName}`.trim(),
        percentage: s.percentage ? `${s.percentage}%` : '',
        extra: '', presenters: [], order: startOrder + i,
      })),
    ];
    onCategoryUpdate({ ...cat, students: newStudents });
    setImportOpen(false);
  }

  async function saveStudentPresenter(updated) {
    await onCategoryUpdate({ ...cat, students: (cat.students || []).map(s =>
      s.name === updated.name && s.order === updated.order ? updated : s
    )});
  }

  function deleteStudent(student) {
    const students = (cat.students || [])
      .filter(s => !(s.name === student.name && s.order === student.order))
      .map((s, i) => ({ ...s, order: i + 1 }));
    onCategoryUpdate({ ...cat, students });
  }

  function saveCategoryTitle() {
    onCategoryUpdate({ ...cat, title: editTitle });
    setEditTitleOpen(false);
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>{cat.title}</Typography>
          <Chip label={`${(cat.students || []).length} students`} size="small" />
          <IconButton size="small" onClick={() => { setEditTitle(cat.title); setEditTitleOpen(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onCategoryDelete(cat)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>

        {(cat.students || []).slice().sort((a, b) => a.order - b.order).map((s, i) => (
          <StudentCard key={`${s.name}-${i}`} student={s}
            onSave={saveStudentPresenter} onDelete={deleteStudent}
            teams={teams} guests={guests}
            presenterCounts={presenterCounts}
            extraTeams={extraTeams} extraGuests={extraGuests} onAddExtra={onAddExtra}
          />
        ))}

        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setAddOpen(true); setStudentSearch(''); setSelectedStudent(null); setAddPct(''); setAddExtra(''); }}>
            Add Student
          </Button>
          <Button size="small" variant="text" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
            onClick={openImport} sx={{ fontSize: 12 }}>
            Import from DB
          </Button>
        </Stack>
      </CardContent>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Student to "{cat.title}"</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField autoFocus label="Search student from DB" fullWidth size="small"
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }} />
            {studentSearch.length > 0 && !selectedStudent && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 200, overflowY: 'auto' }}>
                {filteredDbStudents.length === 0
                  ? <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'text.secondary' }}>
                      Not in DB — will be added as typed.
                    </Typography>
                  : filteredDbStudents.slice(0, 20).map(s => (
                    <Box key={s._id} onClick={() => pickStudent(s)}
                      sx={{ px: 1.5, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="body2">{s.fullName || `${s.firstName} ${s.lastName}`}</Typography>
                      {s.percentage ? <Typography variant="caption" color="text.secondary">{s.percentage}%</Typography> : null}
                    </Box>
                  ))}
              </Box>
            )}
            {selectedStudent && (
              <Alert severity="success" sx={{ py: 0 }}>
                Selected: <strong>{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</strong>
              </Alert>
            )}
            <TextField label="Percentage / Score (optional)" fullWidth size="small" value={addPct} onChange={e => setAddPct(e.target.value)} />
            <TextField label="Extra info (e.g. JEE percentile)" fullWidth size="small" value={addExtra} onChange={e => setAddExtra(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveStudent} disabled={!studentSearch.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Import from DB Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Students from DB — {cat.title}</DialogTitle>
        <DialogContent>
          {loadingCatStudents
            ? <LinearProgress sx={{ mt: 2 }} />
            : catStudents.length === 0
              ? <Alert severity="info" sx={{ mt: 1 }}>
                  No students found in DB for this category name.
                </Alert>
              : <ImportStudentList students={catStudents} existingNames={existingNames} onImport={importStudents} />
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog open={editTitleOpen} onClose={() => setEditTitleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Category Title</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Title" value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveCategoryTitle()} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTitleOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCategoryTitle} disabled={!editTitle.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ── Import student checklist ──────────────────────────────────────────────────
function ImportStudentList({ students, existingNames, onImport }) {
  const [checked, setChecked] = useState(() =>
    students.map(s => !existingNames.has((s.fullName || `${s.firstName} ${s.lastName}`).trim().toLowerCase()))
  );
  function toggle(i) { setChecked(prev => prev.map((v, j) => j === i ? !v : v)); }

  return (
    <Stack sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {students.length} students found. Already-added ones are unchecked.
      </Typography>
      {students.map((s, i) => {
        const name = s.fullName || `${s.firstName} ${s.lastName}`.trim();
        const already = existingNames.has(name.toLowerCase());
        return (
          <Box key={s._id} onClick={() => toggle(i)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, cursor: 'pointer',
              borderRadius: 1, opacity: already ? 0.5 : 1, '&:hover': { bgcolor: 'action.hover' } }}>
            <Checkbox size="small" checked={checked[i]} onChange={() => toggle(i)} sx={{ p: 0 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
            {s.percentage ? <Chip label={`${s.percentage}%`} size="small" variant="outlined" /> : null}
            {already && <Chip label="already added" size="small" />}
          </Box>
        );
      })}
      <Button variant="contained" sx={{ mt: 1.5 }}
        onClick={() => onImport(students.filter((_, i) => checked[i]))}>
        Import Selected ({checked.filter(Boolean).length})
      </Button>
    </Stack>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportToPDF(categories) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const W = 210, H = 297, M = 15, CW = W - M * 2;
  let y = M, pageStudents = 0;

  function newPage() { doc.addPage(); y = M; pageStudents = 0; }

  function drawCatTitle(title, contd) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(20, 80, 160);
    doc.text(contd ? `${title} (contd.)` : title, M, y);
    y += 7;
    doc.setDrawColor(20, 80, 160);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setTextColor(0, 0, 0);
  }

  function drawStudent(student, serial) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(0, 0, 0);
    doc.text(`${serial}. ${student.name}`, M, y);
    if (student.percentage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text(student.percentage, W - M - doc.getTextWidth(student.percentage), y);
    }
    y += 7;

    if (student.extra) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(13);
      doc.setTextColor(100, 100, 100);
      doc.text(student.extra, M + 4, y);
      y += 5.5;
    }

    const byRow = {};
    (student.presenters || []).forEach(p => {
      if (!byRow[p.row]) byRow[p.row] = [];
      if (p.name) byRow[p.row].push(p.name);
    });
    const ROW_LABELS = { 1: 'Team', 2: 'Guests', 3: 'Special Guest', 4: 'Special Guest' };
    [1, 2, 3, 4].forEach(row => {
      const names = (byRow[row] || []).filter(Boolean);
      if (!names.length) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(70, 70, 70);
      const line = `${ROW_LABELS[row]}: ${names.join('   ·   ')}`;
      const wrapped = doc.splitTextToSize(line, CW - 6);
      doc.text(wrapped, M + 4, y);
      y += wrapped.length * 5.5;
    });

    y += 6;
    pageStudents++;
  }

  let firstOnPage = true;
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const students = [...(cat.students || [])].sort((a, b) => a.order - b.order);
    const big = students.length > 3;

    if (big) {
      if (!firstOnPage || pageStudents > 0) newPage();
      drawCatTitle(cat.title, false);
      let serial = 1;
      for (const s of students) {
        if (pageStudents >= 4) { newPage(); drawCatTitle(cat.title, true); }
        drawStudent(s, serial++);
      }
    } else {
      if (!firstOnPage && pageStudents + students.length > 4) newPage();
      else if (!firstOnPage) { y += 3; doc.setDrawColor(210,210,210); doc.setLineWidth(0.3); doc.line(M,y,W-M,y); y+=3; }
      drawCatTitle(cat.title, false);
      let serial = 1;
      for (const s of students) {
        if (pageStudents >= 4) { newPage(); drawCatTitle(cat.title, true); }
        drawStudent(s, serial++);
      }
    }
    firstOnPage = false;
  }

  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pg} of ${total}`, W / 2, H - 6, { align: 'center' });
    doc.text('BK Scholar Awards', M, H - 6);
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
  const [exportingPdf, setExportingPdf] = useState(false);

  const [teams, setTeams] = useState([]);
  const [guests, setGuests] = useState([]);
  const [allDbStudents, setAllDbStudents] = useState([]);

  // Extra names added via + button (not from DB users)
  const [extraTeams, setExtraTeams] = useState([]);
  const [extraGuests, setExtraGuests] = useState([]);

  // Add Category state
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [dbCategories, setDbCategories] = useState([]);
  const [loadingDbCats, setLoadingDbCats] = useState(false);

  // Global presenter count: name → how many students across all categories use them
  const presenterCounts = useMemo(() => {
    const counts = {};
    categories.forEach(cat => {
      (cat.students || []).forEach(student => {
        (student.presenters || []).forEach(p => {
          if (p.name) counts[p.name] = (counts[p.name] || 0) + 1;
        });
      });
    });
    return counts;
  }, [categories]);

  function handleAddExtra(source, name) {
    if (source === 'team') {
      setExtraTeams(prev => prev.includes(name) ? prev : [...prev, name]);
    } else {
      setExtraGuests(prev => prev.includes(name) ? prev : [...prev, name]);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agendaRes, usersRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/agenda`, { headers: authHeader() }),
        fetch(`${API}/api/users`, { headers: authHeader() }),
        fetch(`${API}/api/students?limit=1000`, { headers: authHeader() }),
      ]);
      const agendaData = await safeJson(agendaRes);
      if (!agendaRes.ok) throw new Error(agendaData?.message || `HTTP ${agendaRes.status}`);
      setCategories(agendaData);

      const usersData = await safeJson(usersRes);
      const userList = Array.isArray(usersData) ? usersData : usersData.users || [];
      setTeams(userList
        .filter(u => ['TEAM_LEADER','SENIOR_TEAM','ADMIN','HOST','SUPER_ADMIN'].includes(u.eventDutyType))
        .map(u => u.name).filter(Boolean));
      setGuests(userList
        .filter(u => u.eventDutyType === 'GUEST')
        .map(u => u.name).filter(Boolean));

      const sData = await safeJson(studentsRes);
      setAllDbStudents(Array.isArray(sData) ? sData : sData.students || sData.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/api/agenda/seed`, { method: 'POST', headers: authHeader() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      await load();
      setError('');
    } catch (e) { setError(e.message); }
    finally { setSeeding(false); }
  }

  async function openAddCat() {
    setAddCatOpen(true);
    setNewCatTitle('');
    if (dbCategories.length === 0) {
      setLoadingDbCats(true);
      try {
        const res = await fetch(`${API}/api/categories`, { headers: authHeader() });
        const data = await safeJson(res);
        setDbCategories(Array.isArray(data) ? data : data.categories || []);
      } catch { }
      finally { setLoadingDbCats(false); }
    }
  }

  async function addCategory() {
    if (!newCatTitle.trim()) return;
    try {
      const res = await fetch(`${API}/api/agenda`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ title: newCatTitle.trim(), order: categories.length + 1, students: [] }),
      });
      const cat = await safeJson(res);
      if (!res.ok) throw new Error(cat?.message || `HTTP ${res.status}`);
      setCategories(prev => [...prev, cat]);
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

  const filteredDbCats = dbCategories.filter(c =>
    !newCatTitle || (c.name || c.title || '').toLowerCase().includes(newCatTitle.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={`${categories.length} categories · ${categories.reduce((s, c) => s + (c.students?.length || 0), 0)} students`}
      />
      <PageSurface>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
          {categories.length === 0 && !loading && (
            <Button variant="contained" color="secondary" onClick={seed} disabled={seeding}
              startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : null}>
              {seeding ? 'Seeding…' : '🌱 Load Default Data'}
            </Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddCat}>Add Category</Button>
          <Button variant="contained" color="success" startIcon={<DownloadIcon />}
            onClick={() => { setExportingPdf(true); try { exportToPDF(categories); } finally { setExportingPdf(false); } }}
            disabled={exportingPdf || categories.length === 0}>
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {(loading || saving) && <LinearProgress sx={{ mb: 2 }} color={saving ? 'success' : 'primary'} />}

        {!loading && categories.length === 0 && (
          <Alert severity="info">No categories yet. Click <strong>Load Default Data</strong> to pre-populate, or add categories manually.</Alert>
        )}

        {categories.slice().sort((a, b) => a.order - b.order).map(cat => (
          <CategorySection key={cat._id} cat={cat}
            onCategoryUpdate={updateCategory} onCategoryDelete={deleteCategory}
            allDbStudents={allDbStudents} teams={teams} guests={guests}
            presenterCounts={presenterCounts}
            extraTeams={extraTeams} extraGuests={extraGuests} onAddExtra={handleAddExtra}
          />
        ))}

        {/* Add Category Dialog */}
        <Dialog open={addCatOpen} onClose={() => setAddCatOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField autoFocus fullWidth size="small" label="Search or type category name"
                value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                InputProps={{ endAdornment: loadingDbCats ? <CircularProgress size={16} /> : null }}
              />
              {filteredDbCats.length > 0 && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 220, overflowY: 'auto' }}>
                  {filteredDbCats.slice(0, 20).map(c => (
                    <Box key={c._id} onClick={() => setNewCatTitle(c.name || c.title)}
                      sx={{ px: 1.5, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="body2">{c.name || c.title}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {newCatTitle && filteredDbCats.length === 0 && !loadingDbCats && (
                <Typography variant="caption" color="text.secondary">
                  Not in DB — will be created as a new agenda category.
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddCatOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={addCategory} disabled={!newCatTitle.trim()}>Add</Button>
          </DialogActions>
        </Dialog>
      </PageSurface>
    </>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────
class AgendaErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
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
