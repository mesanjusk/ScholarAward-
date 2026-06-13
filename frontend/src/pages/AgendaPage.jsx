import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, LinearProgress,
  Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
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

const PRESENTER_ROWS = [
  { row: 1, label: 'Team Members',         source: 'team',  color: '#1565c0' },
  { row: 2, label: 'Guest (Organisation)', source: 'guest', color: '#2e7d32' },
  { row: 3, label: 'Special Guest 1',      source: 'guest', color: '#6a1b9a' },
  { row: 4, label: 'Special Guest 2',      source: 'guest', color: '#c62828' },
];

// ── Full-screen presenter picker ──────────────────────────────────────────────
function PresenterPicker({ open, onClose, rowDef, selected, onChange, options, presenterCounts, onAddNew }) {
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
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column', borderRadius: 0 } }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '3px solid', borderColor: rowDef.color, flexShrink: 0,
          bgcolor: rowDef.color + '18' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={900} sx={{ flex: 1, color: rowDef.color, fontSize: 18 }}>
              {rowDef.row}. {rowDef.label}
            </Typography>
            <Typography variant="body2" sx={{ color: rowDef.color, fontWeight: 700 }}>
              {selected.length} selected
            </Typography>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Stack>
          <TextField
            fullWidth size="small" placeholder="Search name…" value={search}
            onChange={e => setSearch(e.target.value)} autoFocus sx={{ mt: 1.5 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              sx: { borderRadius: 0, fontSize: 16 } }}
          />
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {/* Selected section */}
          {selected.length > 0 && (
            <Box sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
              <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', fontSize: 11,
                color: rowDef.color, fontWeight: 800 }}>
                ✓ Selected ({selected.length})
              </Typography>
              {selected.map(name => {
                const count = presenterCounts[name] || 0;
                return (
                  <Box key={name} onClick={() => toggle(name)}
                    sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, cursor: 'pointer',
                      borderTop: '1px solid', borderColor: 'divider',
                      bgcolor: rowDef.color + '0a', '&:hover': { bgcolor: rowDef.color + '18' } }}>
                    <CheckBoxIcon sx={{ color: rowDef.color, mr: 1.5, fontSize: 24 }} />
                    <Typography variant="body1" fontWeight={800} fontSize={18} sx={{ flex: 1 }}>
                      {name}
                    </Typography>
                    {count > 0 && (
                      <Box sx={{ bgcolor: '#ff6f00', color: '#fff', borderRadius: 0,
                        minWidth: 28, height: 28, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 900, fontSize: 13, px: 1 }}>
                        ×{count}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Unselected options */}
          {selected.length > 0 && filtered.some(n => !selected.includes(n)) && (
            <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', fontSize: 11,
              color: 'text.secondary', fontWeight: 700 }}>
              All
            </Typography>
          )}
          {filtered.length === 0 && (
            <Typography variant="body1" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No results — use + Add New
            </Typography>
          )}
          {filtered.filter(n => !selected.includes(n)).map(name => {
            const count = presenterCounts[name] || 0;
            return (
              <Box key={name} onClick={() => toggle(name)}
                sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, cursor: 'pointer',
                  borderTop: '1px solid', borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' } }}>
                <CheckBoxOutlineBlankIcon sx={{ color: 'text.disabled', mr: 1.5, fontSize: 24 }} />
                <Typography variant="body1" fontSize={17} sx={{ flex: 1 }}>{name}</Typography>
                {count > 0 && (
                  <Box sx={{ bgcolor: '#ff6f00', color: '#fff', borderRadius: 0,
                    minWidth: 28, height: 28, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 900, fontSize: 13, px: 1 }}>
                    ×{count}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ px: 2, py: 1.5, borderTop: '2px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<AddIcon />} onClick={() => { setNewName(''); setAddOpen(true); }}
              sx={{ mr: 'auto', borderRadius: 0 }}>
              Add New
            </Button>
            <Button variant="contained" onClick={onClose}
              sx={{ px: 5, borderRadius: 0, fontWeight: 800, fontSize: 15 }}>
              Done
            </Button>
          </Stack>
        </Box>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle>Add New — {rowDef.label}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Full Name" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            InputProps={{ sx: { borderRadius: 0 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!newName.trim()}
            sx={{ borderRadius: 0 }}>Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Presenter row display ─────────────────────────────────────────────────────
function PresenterRow({ rowDef, selected, onChange, options, presenterCounts, onAddNew }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Box sx={{ mb: 1, borderLeft: '3px solid', borderColor: rowDef.color, pl: 1 }}>
        <Stack direction="row" alignItems="center">
          <Typography fontWeight={800} sx={{ color: rowDef.color, flex: 1, fontSize: 13 }}>
            {rowDef.row}. {rowDef.label}
          </Typography>
          <IconButton size="small" onClick={() => setPickerOpen(true)}
            sx={{ p: 0.5, borderRadius: 0 }}>
            <EditIcon sx={{ fontSize: 16, color: rowDef.color }} />
          </IconButton>
        </Stack>
        {selected.length === 0 ? (
          <Typography fontSize={14} color="text.disabled" sx={{ fontStyle: 'italic' }}>
            — tap ✎ to assign
          </Typography>
        ) : selected.map(name => (
          <Typography key={name} fontWeight={800} fontSize={16}
            sx={{ lineHeight: 1.8, color: 'text.primary' }}>
            {name}
          </Typography>
        ))}
      </Box>
      <PresenterPicker
        open={pickerOpen} onClose={() => setPickerOpen(false)}
        rowDef={rowDef} selected={selected} onChange={onChange}
        options={options} presenterCounts={presenterCounts} onAddNew={onAddNew}
      />
    </>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onSave, onDelete, teams, guests, presenterCounts, extraTeams, extraGuests, onAddExtra }) {
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
      (sel[row] || []).forEach((name, idx) => result.push({ name, row, slot: idx + 1 }));
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
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 0, borderLeft: '4px solid #1976d2' }}>
      <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
              <Typography fontWeight={900} fontSize={19} sx={{ lineHeight: 1.3 }}>
                {student.name}
              </Typography>
              {student.percentage && (
                <Chip label={student.percentage} size="small" color="primary"
                  sx={{ fontWeight: 800, fontSize: 13, borderRadius: 0 }} />
              )}
              {student.extra && (
                <Typography fontSize={13} color="text.secondary">{student.extra}</Typography>
              )}
              {saving && <CircularProgress size={14} />}
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {PRESENTER_ROWS.map(rowDef => (
              <PresenterRow key={rowDef.row} rowDef={rowDef}
                selected={rowSel[rowDef.row] || []}
                onChange={names => handleRowChange(rowDef.row, names)}
                options={rowDef.source === 'team'
                  ? [...new Set([...teams, ...extraTeams])]
                  : [...new Set([...guests, ...extraGuests])]}
                presenterCounts={presenterCounts}
                onAddNew={name => onAddExtra(rowDef.source, name)}
              />
            ))}
          </Box>
          <IconButton size="small" color="error" onClick={() => onDelete(student)}
            sx={{ mt: 0.25, borderRadius: 0 }}>
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
  const autoImportDone = useRef(false);

  const existingNames = new Set((cat.students || []).map(s => s.name.toLowerCase().trim()));
  const filteredDbStudents = allDbStudents.filter(s => {
    const name = (s.fullName || `${s.firstName} ${s.lastName}`).toLowerCase();
    return !studentSearch || name.includes(studentSearch.toLowerCase());
  });

  // Auto-import from DB on mount — silently adds missing students
  useEffect(() => {
    if (autoImportDone.current) return;
    autoImportDone.current = true;
    async function autoImport() {
      try {
        const res = await fetch(`${API}/api/categories`, { headers: authHeader() });
        const cats = await safeJson(res);
        const matched = (Array.isArray(cats) ? cats : []).find(c =>
          (c.name || c.title || '').toLowerCase() === cat.title.toLowerCase()
        );
        if (!matched) return;
        const sRes = await fetch(`${API}/api/students?categoryId=${matched._id}&limit=200`, { headers: authHeader() });
        const sData = await safeJson(sRes);
        const dbList = Array.isArray(sData) ? sData : sData.students || sData.data || [];
        const currentNames = new Set((cat.students || []).map(s => s.name.toLowerCase().trim()));
        const toAdd = dbList.filter(s =>
          !currentNames.has((s.fullName || `${s.firstName} ${s.lastName}`).trim().toLowerCase())
        );
        if (!toAdd.length) return;
        const startOrder = (cat.students?.length || 0) + 1;
        onCategoryUpdate({ ...cat, students: [
          ...(cat.students || []),
          ...toAdd.map((s, i) => ({
            name: s.fullName || `${s.firstName} ${s.lastName}`.trim(),
            percentage: s.percentage ? `${s.percentage}%` : '',
            extra: '', presenters: [], order: startOrder + i,
          })),
        ]});
      } catch { /* silent */ }
    }
    autoImport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    onCategoryUpdate({ ...cat, students: [...(cat.students || []), {
      name, percentage: addPct.trim(), extra: addExtra.trim(),
      presenters: [], order: (cat.students?.length || 0) + 1,
    }]});
    setAddOpen(false);
  }

  async function saveStudentPresenter(updated) {
    await onCategoryUpdate({ ...cat, students: (cat.students || []).map(s =>
      s.name === updated.name && s.order === updated.order ? updated : s
    )});
  }

  function deleteStudent(student) {
    onCategoryUpdate({ ...cat, students: (cat.students || [])
      .filter(s => !(s.name === student.name && s.order === student.order))
      .map((s, i) => ({ ...s, order: i + 1 })) });
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 0, borderLeft: '5px solid #1976d2' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography fontWeight={900} fontSize={18} sx={{ flex: 1 }}>{cat.title}</Typography>
          <Chip label={`${(cat.students || []).length}`} size="small" color="primary"
            sx={{ fontWeight: 700, borderRadius: 0 }} />
          <IconButton size="small" sx={{ borderRadius: 0 }}
            onClick={() => { setEditTitle(cat.title); setEditTitleOpen(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" sx={{ borderRadius: 0 }}
            onClick={() => onCategoryDelete(cat)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>

        {(cat.students || []).slice().sort((a, b) => a.order - b.order).map((s, i) => (
          <StudentCard key={`${s.name}-${i}`} student={s}
            onSave={saveStudentPresenter} onDelete={deleteStudent}
            teams={teams} guests={guests} presenterCounts={presenterCounts}
            extraTeams={extraTeams} extraGuests={extraGuests} onAddExtra={onAddExtra} />
        ))}

        <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ borderRadius: 0, mt: 0.5 }}
          onClick={() => { setStudentSearch(''); setSelectedStudent(null); setAddPct(''); setAddExtra(''); setAddOpen(true); }}>
          Add Student
        </Button>
      </CardContent>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle>Add Student to "{cat.title}"</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField autoFocus label="Search student" fullWidth size="small"
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                sx: { borderRadius: 0 },
              }}
            />
            {studentSearch.length > 0 && !selectedStudent && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', maxHeight: 200, overflowY: 'auto' }}>
                {filteredDbStudents.length === 0
                  ? <Typography variant="body2" sx={{ p: 1.5, color: 'text.secondary', fontStyle: 'italic' }}>
                      Not in DB — will be added as typed
                    </Typography>
                  : filteredDbStudents.slice(0, 20).map(s => (
                    <Box key={s._id} onClick={() => pickStudent(s)}
                      sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography fontWeight={600} fontSize={15}>{s.fullName || `${s.firstName} ${s.lastName}`}</Typography>
                      {s.percentage ? <Typography variant="caption" color="text.secondary">{s.percentage}%</Typography> : null}
                    </Box>
                  ))}
              </Box>
            )}
            {selectedStudent && (
              <Alert severity="success" sx={{ py: 0.5, borderRadius: 0 }}>
                Selected: <strong>{selectedStudent.fullName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</strong>
              </Alert>
            )}
            <TextField label="Percentage / Score" fullWidth size="small" value={addPct}
              onChange={e => setAddPct(e.target.value)} InputProps={{ sx: { borderRadius: 0 } }} />
            <TextField label="Extra info (e.g. JEE percentile)" fullWidth size="small" value={addExtra}
              onChange={e => setAddExtra(e.target.value)} InputProps={{ sx: { borderRadius: 0 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button variant="contained" onClick={saveStudent} disabled={!studentSearch.trim()}
            sx={{ borderRadius: 0 }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog open={editTitleOpen} onClose={() => setEditTitleOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle>Edit Category Title</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Title" value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (onCategoryUpdate({ ...cat, title: editTitle }), setEditTitleOpen(false))}
            InputProps={{ sx: { borderRadius: 0 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTitleOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button variant="contained" sx={{ borderRadius: 0 }}
            onClick={() => { onCategoryUpdate({ ...cat, title: editTitle }); setEditTitleOpen(false); }}
            disabled={!editTitle.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ── PDF Export — table format matching reference PDF ──────────────────────────
function exportToPDF(categories) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const W = 210, H = 297, MX = 12, MY = 14;

  // Column x-positions and widths: serial | name | pct | presenters
  const C = { sx: MX, sw: 13, nx: MX+13, nw: 57, px: MX+70, pw: 24, rx: MX+94, rw: W-MX-MX-94 };
  const ROW_H = 8;   // height per presenter sub-row
  const N_PRES = 4;  // always draw 4 presenter rows per student
  const STU_H = ROW_H * N_PRES;

  let y = MY;
  let curPage = 1;

  function newPage() { doc.addPage(); curPage++; y = MY; }
  function need(h) { if (y + h > H - MY) newPage(); }

  // ── Page 1 header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 180);
  doc.text('19th BK Scholar Awards', W/2, y + 8, { align: 'center' });
  y += 13;
  doc.setFontSize(14);
  doc.setTextColor(180, 0, 0);
  doc.text('Sunday, 14th June 2026', W/2, y + 6, { align: 'center' });
  y += 13;

  for (const cat of categories) {
    const students = [...(cat.students || [])].sort((a, b) => a.order - b.order);
    if (!students.length) continue;

    // Category header
    need(10 + STU_H);
    doc.setFillColor(255, 255, 0);
    doc.rect(MX, y, W-2*MX, 9, 'F');
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(MX, y, W-2*MX, 9, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(cat.title, W/2, y + 6.2, { align: 'center' });
    y += 9;

    students.forEach((student, idx) => {
      need(STU_H);

      const sy = y;

      // Collect presenter lines (one line per presenter row, all names joined)
      const byRow = {};
      (student.presenters || []).forEach(p => {
        if (!byRow[p.row]) byRow[p.row] = [];
        if (p.name) byRow[p.row].push(p.name);
      });
      const pLines = [1,2,3,4].map(r => (byRow[r] || []).filter(Boolean).join(' & '));

      // Outer border (full student block)
      doc.setDrawColor(0);
      doc.setLineWidth(0.35);
      doc.rect(MX, sy, W-2*MX, STU_H, 'D');

      // Vertical column separators
      [C.nx, C.px, C.rx].forEach(x => {
        doc.setLineWidth(0.25);
        doc.line(x, sy, x, sy + STU_H);
      });

      // Serial number (centered in block)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(String(idx+1), C.sx + C.sw/2, sy + STU_H/2 + 2, { align: 'center' });

      // Student name (bold, dark red, vertically centered)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(180, 30, 30);
      const nLines = doc.splitTextToSize(student.name, C.nw - 3);
      const nY = sy + STU_H/2 - (nLines.length * 5.5)/2 + 4.5;
      nLines.forEach((l, li) => doc.text(l, C.nx + 2, nY + li * 5.5));

      // Percentage (centered)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      if (student.percentage) {
        const pLines2 = doc.splitTextToSize(student.percentage, C.pw - 2);
        const pY = student.extra ? sy + STU_H/2 - 2 : sy + STU_H/2 + 2;
        doc.text(pLines2, C.px + C.pw/2, pY, { align: 'center' });
        if (student.extra) {
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          const eLines = doc.splitTextToSize(student.extra, C.pw - 2);
          doc.text(eLines, C.px + C.pw/2, pY + 5, { align: 'center' });
        }
      }

      // Presenter rows with horizontal dividers
      pLines.forEach((line, ri) => {
        const ry = sy + ri * ROW_H;
        if (ri > 0) {
          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.15);
          doc.line(C.rx, ry, W - MX, ry);
        }
        if (line) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const lw = doc.splitTextToSize(line, C.rw - 4);
          doc.text(lw, C.rx + 2, ry + 5.5);
        }
      });

      y += STU_H;
    });
  }

  // Page footers
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
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
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [dbCategories, setDbCategories] = useState([]);
  const [loadingDbCats, setLoadingDbCats] = useState(false);

  const presenterCounts = useMemo(() => {
    const counts = {};
    categories.forEach(cat =>
      (cat.students || []).forEach(student =>
        (student.presenters || []).forEach(p => {
          if (p.name) counts[p.name] = (counts[p.name] || 0) + 1;
        })
      )
    );
    return counts;
  }, [categories]);

  function handleAddExtra(source, name) {
    if (source === 'team') setExtraTeams(prev => prev.includes(name) ? prev : [...prev, name]);
    else setExtraGuests(prev => prev.includes(name) ? prev : [...prev, name]);
  }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const agendaRes = await fetch(`${API}/api/agenda`, { headers: authHeader() });
      const agendaData = await safeJson(agendaRes);
      if (!agendaRes.ok) throw new Error(agendaData?.message || `HTTP ${agendaRes.status}`);
      setCategories(agendaData);
    } catch (e) { setError(e.message); setLoading(false); return; }

    try {
      const usersRes = await fetch(`${API}/api/users`, { headers: authHeader() });
      const usersData = await safeJson(usersRes);
      const ul = Array.isArray(usersData) ? usersData : usersData.users || [];
      setTeams(ul.filter(u => ['TEAM_LEADER','SENIOR_TEAM','ADMIN','HOST','SUPER_ADMIN'].includes(u.eventDutyType)).map(u => u.name).filter(Boolean));
      setGuests(ul.filter(u => u.eventDutyType === 'GUEST').map(u => u.name).filter(Boolean));
    } catch { /* optional */ }

    try {
      const sRes = await fetch(`${API}/api/students?page=1&limit=500`, { headers: authHeader() });
      const sData = await safeJson(sRes);
      setAllDbStudents(Array.isArray(sData) ? sData : sData.students || sData.data || []);
    } catch { /* optional */ }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/api/agenda/seed`, { method: 'POST', headers: authHeader() });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
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
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}
            sx={{ borderRadius: 0 }}>Refresh</Button>
          {categories.length === 0 && !loading && (
            <Button variant="contained" color="secondary" onClick={seed} disabled={seeding}
              sx={{ borderRadius: 0 }}
              startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : null}>
              {seeding ? 'Seeding…' : '🌱 Load Default Data'}
            </Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddCat}
            sx={{ borderRadius: 0 }}>Add Category</Button>
          <Button variant="contained" color="success" startIcon={<DownloadIcon />}
            onClick={() => { try { exportToPDF(categories); } catch(e) { setError(e.message); } }}
            disabled={categories.length === 0} sx={{ borderRadius: 0 }}>
            Export PDF
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }} onClose={() => setError('')}>{error}</Alert>}
        {(loading || saving) && <LinearProgress sx={{ mb: 2 }} color={saving ? 'success' : 'primary'} />}

        {!loading && categories.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            No categories yet. Click <strong>Load Default Data</strong> to pre-populate.
          </Alert>
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
        <Dialog open={addCatOpen} onClose={() => setAddCatOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 0 } }}>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField autoFocus fullWidth size="small" label="Search or type category name"
                value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  endAdornment: loadingDbCats ? <CircularProgress size={16} /> : null,
                  sx: { borderRadius: 0 },
                }}
              />
              {filteredDbCats.length > 0 && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', maxHeight: 220, overflowY: 'auto' }}>
                  {filteredDbCats.slice(0, 20).map(c => (
                    <Box key={c._id} onClick={() => setNewCatTitle(c.name || c.title)}
                      sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography fontSize={15}>{c.name || c.title}</Typography>
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
            <Button onClick={() => setAddCatOpen(false)} sx={{ borderRadius: 0 }}>Cancel</Button>
            <Button variant="contained" onClick={addCategory} disabled={!newCatTitle.trim()}
              sx={{ borderRadius: 0 }}>Add</Button>
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
