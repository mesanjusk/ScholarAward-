import { Component, useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
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
  if (!text) throw new Error(`Server returned empty response (status ${res.status})`);
  try { return JSON.parse(text); } catch { throw new Error(`Server error (status ${res.status}): ${text.slice(0, 100)}`); }
}

// ── Presenter row definitions ─────────────────────────────────────────────────
const PRESENTER_ROWS = [
  { row: 1, label: 'Team Members',           source: 'team',   color: '#1565c0' },
  { row: 2, label: 'Guests (Organisation)',   source: 'anchor', color: '#2e7d32' },
  { row: 3, label: 'Special Guest 1',         source: 'anchor', color: '#6a1b9a' },
  { row: 4, label: 'Special Guest 2',         source: 'anchor', color: '#c62828' },
];

// ── Name search dropdown ──────────────────────────────────────────────────────
function NamePicker({ label, source, value, onChange, teamMembers, anchors }) {
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);

  const list = source === 'team' ? teamMembers : anchors;
  const filtered = list.filter(n =>
    !search || n.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15);

  function pick(name) {
    setSearch(name);
    setOpen(false);
    onChange(name);
  }

  function clear() {
    setSearch('');
    setOpen(false);
    onChange('');
  }

  return (
    <Box sx={{ position: 'relative', flex: 1 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TextField
          size="small"
          placeholder={label}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); onChange(''); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 13, py: 0.5 } }}
        />
        {search && (
          <IconButton size="small" onClick={clear} sx={{ p: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>
      {open && filtered.length > 0 && (
        <Box sx={{
          position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0,
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
          borderRadius: 1, maxHeight: 160, overflowY: 'auto', boxShadow: 3,
        }}>
          {filtered.map(n => (
            <Box key={n} onMouseDown={() => pick(n)}
              sx={{ px: 1.5, py: 0.6, cursor: 'pointer', fontSize: 13, '&:hover': { bgcolor: 'action.hover' } }}>
              {n}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────
function StudentCard({ student, catId, onSave, onDelete }) {
  // Build row×slot map from flat presenters array
  function buildGrid(presenters) {
    const grid = {};
    (presenters || []).forEach(p => {
      if (!grid[p.row]) grid[p.row] = {};
      grid[p.row][p.slot] = p.name || '';
    });
    return grid;
  }

  const [grid, setGrid] = useState(() => buildGrid(student.presenters));
  const [saving, setSaving] = useState(false);

  function flattenGrid(g) {
    const result = [];
    [1, 2, 3, 4].forEach(row => {
      [1, 2].forEach(slot => {
        const name = g[row]?.[slot] || '';
        if (name) result.push({ name, row, slot });
      });
    });
    return result;
  }

  async function handleChange(row, slot, name) {
    const newGrid = { ...grid, [row]: { ...(grid[row] || {}), [slot]: name } };
    setGrid(newGrid);
    // Auto-save immediately
    setSaving(true);
    try {
      await onSave({ ...student, presenters: flattenGrid(newGrid) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1 }}>
            {/* Student name + percentage */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
              <Typography variant="body2" fontWeight={700}>{student.name}</Typography>
              {student.percentage && <Chip label={student.percentage} size="small" color="primary" variant="outlined" />}
              {student.extra && <Typography variant="caption" color="text.secondary">{student.extra}</Typography>}
              {saving && <CircularProgress size={12} />}
            </Stack>

            {/* 4 presenter rows × 2 slots */}
            <Stack spacing={0.5}>
              {PRESENTER_ROWS.map(({ row, label, source, color }) => (
                <Box key={row}>
                  <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: 10 }}>
                    {row}. {label}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                    <PresenterSlot row={row} slot={1} source={source}
                      value={grid[row]?.[1] || ''} onChange={name => handleChange(row, 1, name)} catId={catId} />
                    <PresenterSlot row={row} slot={2} source={source}
                      value={grid[row]?.[2] || ''} onChange={name => handleChange(row, 2, name)} catId={catId} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
          <IconButton size="small" color="error" onClick={() => onDelete(student)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Presenter slot — fetches its own data ─────────────────────────────────────
function PresenterSlot({ row, slot, source, value, onChange }) {
  const [names, setNames] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);

  useEffect(() => { setSearch(value || ''); }, [value]);

  async function loadNames() {
    if (loaded) return;
    try {
      if (source === 'team') {
        // Load users who are team members
        const res = await fetch(`${API}/api/users`, { headers: authHeader() });
        const data = await safeJson(res);
        const users = Array.isArray(data) ? data : data.users || [];
        setNames(users
          .filter(u => ['SENIOR_TEAM','TEAM_LEADER','ADMIN','HOST','SUPER_ADMIN'].includes(u.eventDutyType))
          .map(u => u.name).filter(Boolean));
      } else {
        // Load anchors
        const res = await fetch(`${API}/api/anchors`, { headers: authHeader() });
        const data = await safeJson(res);
        const anchors = Array.isArray(data) ? data : data.anchors || [];
        setNames(anchors.map(a => a.fullName || `${a.firstName} ${a.lastName}`.trim()).filter(Boolean));
      }
      setLoaded(true);
    } catch { /* ignore */ }
  }

  const filtered = names.filter(n =>
    !search || n.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15);

  function pick(name) {
    setSearch(name);
    setOpen(false);
    onChange(name);
  }

  function clear() {
    setSearch('');
    setOpen(false);
    onChange('');
  }

  return (
    <Box sx={{ position: 'relative', flex: 1 }}>
      <Stack direction="row" spacing={0.25} alignItems="center">
        <TextField
          size="small"
          placeholder={`Slot ${slot}`}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); loadNames(); }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { onChange(search.trim()); setOpen(false); } }}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 12, py: 0.4 } }}
        />
        {search && (
          <IconButton size="small" onClick={clear} sx={{ p: 0.2 }}>
            <DeleteIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Stack>
      {open && (
        <Box sx={{
          position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0, minWidth: 180,
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
          borderRadius: 1, maxHeight: 160, overflowY: 'auto', boxShadow: 4,
        }}>
          {filtered.length === 0 && (
            <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'text.secondary' }}>
              {names.length === 0 ? 'Loading…' : 'No match — press Enter to use typed name'}
            </Typography>
          )}
          {filtered.map(n => (
            <Box key={n} onMouseDown={() => pick(n)}
              sx={{ px: 1.5, py: 0.6, cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: 'action.hover' } }}>
              {n}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({ cat, onCategoryUpdate, onCategoryDelete }) {
  const [addOpen, setAddOpen] = useState(false);
  const [dbStudents, setDbStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [addPct, setAddPct] = useState('');
  const [addExtra, setAddExtra] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(cat.title);

  async function openAddStudent() {
    setAddOpen(true);
    setStudentSearch('');
    setSelectedStudent(null);
    setAddPct('');
    setAddExtra('');
    if (dbStudents.length === 0) {
      setLoadingStudents(true);
      try {
        const res = await fetch(`${API}/api/students?limit=500`, { headers: authHeader() });
        const data = await safeJson(res);
        setDbStudents(Array.isArray(data) ? data : data.students || data.data || []);
      } catch { /* ignore */ }
      finally { setLoadingStudents(false); }
    }
  }

  function pickStudent(s) {
    setSelectedStudent(s);
    setStudentSearch(s.fullName || `${s.firstName} ${s.lastName}`.trim());
    setAddPct(s.percentage ? `${s.percentage}%` : '');
  }

  function saveStudent() {
    const name = selectedStudent
      ? (selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`).trim()
      : studentSearch.trim();
    if (!name) return;
    const students = [
      ...(cat.students || []),
      { name, percentage: addPct.trim(), extra: addExtra.trim(), presenters: [], order: (cat.students?.length || 0) + 1 },
    ];
    onCategoryUpdate({ ...cat, students });
    setAddOpen(false);
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

  const filteredStudents = dbStudents.filter(s => {
    const name = (s.fullName || `${s.firstName} ${s.lastName}`).toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

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
          <StudentCard key={`${s.name}-${i}`} student={s} catId={cat._id}
            onSave={saveStudentPresenter} onDelete={deleteStudent} />
        ))}

        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddStudent}>
          Add Student
        </Button>
      </CardContent>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Student to {cat.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField autoFocus label="Search student from DB" fullWidth value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
              InputProps={{ endAdornment: loadingStudents ? <CircularProgress size={16} /> : null }}
            />
            {studentSearch.length > 0 && !selectedStudent && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 180, overflowY: 'auto' }}>
                {filteredStudents.length === 0
                  ? <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'text.secondary' }}>No match — name typed will be used</Typography>
                  : filteredStudents.slice(0, 20).map(s => (
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
            <TextField label="Percentage / Score (optional)" fullWidth value={addPct} onChange={e => setAddPct(e.target.value)} />
            <TextField label="Extra info (e.g. JEE percentile)" fullWidth value={addExtra} onChange={e => setAddExtra(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveStudent} disabled={!studentSearch.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog open={editTitleOpen} onClose={() => setEditTitleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Category Title</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Title" value={editTitle}
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

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportToPDF(categories) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const W = 210, H = 297;
  const M = 15;
  const CW = W - M * 2;

  const FS_CAT   = 18;
  const FS_NAME  = 17;
  const FS_PCT   = 14;
  const FS_ROW   = 13;
  const FS_FOOT  = 10;

  let y = M;
  let pageStudents = 0;

  function newPage() {
    doc.addPage();
    y = M;
    pageStudents = 0;
  }

  function checkSpace(need) {
    if (y + need > H - M - 8) { newPage(); return true; }
    return false;
  }

  function drawCatTitle(title, contd) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FS_CAT);
    doc.setTextColor(20, 80, 160);
    const label = contd ? `${title} (contd.)` : title;
    doc.text(label, M, y);
    y += 7;
    doc.setDrawColor(20, 80, 160);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setTextColor(0, 0, 0);
  }

  function drawStudent(student, serial) {
    // Name line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FS_NAME);
    doc.setTextColor(0, 0, 0);
    doc.text(`${serial}. ${student.name}`, M, y);

    if (student.percentage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FS_PCT);
      doc.setTextColor(60, 60, 60);
      const pw = doc.getTextWidth(student.percentage);
      doc.text(student.percentage, W - M - pw, y);
      doc.setTextColor(0, 0, 0);
    }
    y += 7;

    if (student.extra) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(FS_PCT);
      doc.setTextColor(100, 100, 100);
      doc.text(student.extra, M + 4, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
    }

    // Presenter rows: group by row number
    const byRow = {};
    (student.presenters || []).forEach(p => {
      if (!byRow[p.row]) byRow[p.row] = [];
      byRow[p.row].push(p.name);
    });

    const ROW_LABELS = { 1: 'Team', 2: 'Guests', 3: 'Special Guest', 4: 'Special Guest' };
    [1, 2, 3, 4].forEach(row => {
      const names = byRow[row];
      if (!names || names.length === 0) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FS_ROW);
      doc.setTextColor(80, 80, 80);
      const label = `${ROW_LABELS[row]}: ${names.join('   •   ')}`;
      const wrapped = doc.splitTextToSize(label, CW - 4);
      doc.text(wrapped, M + 4, y);
      y += wrapped.length * 5.5;
      doc.setTextColor(0, 0, 0);
    });

    y += 6; // gap between students
    pageStudents++;
  }

  // Layout: big categories (>3 students) start fresh page; small ones can share
  let i = 0;
  let firstOnPage = true;

  while (i < categories.length) {
    const cat = categories[i];
    const students = [...(cat.students || [])].sort((a, b) => a.order - b.order);
    const isSmall = students.length <= 3;

    if (!isSmall) {
      if (!firstOnPage || pageStudents > 0) newPage();
      drawCatTitle(cat.title, false);
      let serial = 1;
      let si = 0;
      while (si < students.length) {
        if (pageStudents >= 4) { newPage(); drawCatTitle(cat.title, true); }
        drawStudent(students[si], serial++);
        si++;
      }
      firstOnPage = false;
    } else {
      // Estimate height: cat title ~14mm + students ~(12+rows*5.5+6)mm each
      const presRows = students.reduce((sum, s) => {
        const byRow = {};
        (s.presenters || []).forEach(p => { byRow[p.row] = true; });
        return sum + Object.keys(byRow).length;
      }, 0);
      const estH = 14 + students.length * 12 + presRows * 5.5 + students.length * 6;

      if (!firstOnPage && (pageStudents + students.length > 4 || y + estH > H - M - 8)) {
        newPage();
      } else if (!firstOnPage) {
        y += 3;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(M, y, W - M, y);
        y += 3;
      }

      drawCatTitle(cat.title, false);
      let serial = 1;
      for (const student of students) {
        if (pageStudents >= 4) { newPage(); drawCatTitle(cat.title, true); }
        drawStudent(student, serial++);
      }
      firstOnPage = false;
    }
    i++;
  }

  // Page numbers
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS_FOOT);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pg} of ${total}`, W / 2, H - 6, { align: 'center' });
    doc.text('BK Scholar Awards', M, H - 6);
    doc.setTextColor(0, 0, 0);
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
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [dbCategories, setDbCategories] = useState([]);
  const [loadingDbCats, setLoadingDbCats] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agenda`, { headers: authHeader() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setCategories(data);
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
    } catch (e) {
      setError(e.message);
    } finally {
      setSeeding(false);
    }
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
      } catch { /* ignore */ }
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
      setNewCatTitle('');
    } catch (e) { setError(e.message); }
  }

  // updateCategory: called both for structure changes and auto-save from presenter
  const updateCategory = useCallback(async (updated) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/agenda/${updated._id}`, {
        method: 'PATCH', headers: authHeader(), body: JSON.stringify(updated),
      });
      const saved = await safeJson(res);
      if (!res.ok) throw new Error(saved?.message || `HTTP ${res.status}`);
      setCategories(prev => prev.map(c => c._id === saved._id ? saved : c));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  async function deleteCategory(cat) {
    if (!window.confirm(`Delete category "${cat.title}" and all its students?`)) return;
    try {
      await fetch(`${API}/api/agenda/${cat._id}`, { method: 'DELETE', headers: authHeader() });
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch (e) { setError(e.message); }
  }

  function handleExportPDF() {
    setExportingPdf(true);
    try { exportToPDF(categories); }
    finally { setExportingPdf(false); }
  }

  const filteredDbCats = dbCategories.filter(c =>
    !newCatTitle || c.name?.toLowerCase().includes(newCatTitle.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={`${categories.length} categories · ${categories.reduce((s, c) => s + (c.students?.length || 0), 0)} students`}
      />
      <PageSurface>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
          {categories.length === 0 && !loading && (
            <Button variant="contained" color="secondary" onClick={seed} disabled={seeding}
              startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : null}>
              {seeding ? 'Seeding…' : '🌱 Load Default Data (PDF)'}
            </Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddCat}>
            Add Category
          </Button>
          <Button variant="contained" color="success" startIcon={<DownloadIcon />}
            onClick={handleExportPDF} disabled={exportingPdf || categories.length === 0}>
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {(loading || saving) && <LinearProgress sx={{ mb: 2 }} color={saving ? 'success' : 'primary'} />}

        {!loading && categories.length === 0 && (
          <Alert severity="info">
            No categories yet. Click <strong>Load Default Data (PDF)</strong> to pre-populate all 51 students, or add categories manually.
          </Alert>
        )}

        {categories.slice().sort((a, b) => a.order - b.order).map(cat => (
          <CategorySection key={cat._id} cat={cat}
            onCategoryUpdate={updateCategory} onCategoryDelete={deleteCategory} />
        ))}

        {/* Add Category Dialog */}
        <Dialog open={addCatOpen} onClose={() => setAddCatOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField autoFocus fullWidth label="Search or type category name"
                value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                InputProps={{ endAdornment: loadingDbCats ? <CircularProgress size={16} /> : null }}
              />
              {filteredDbCats.length > 0 && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredDbCats.slice(0, 20).map(c => (
                    <Box key={c._id} onClick={() => setNewCatTitle(c.name)}
                      sx={{ px: 1.5, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="body2">{c.name}</Typography>
                    </Box>
                  ))}
                </Box>
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
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Agenda page crashed:</strong><br />
            {this.state.error?.message || String(this.state.error)}
          </Alert>
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.stack}
          </pre>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default function AgendaPageWithBoundary() {
  return <AgendaErrorBoundary><AgendaPage /></AgendaErrorBoundary>;
}
