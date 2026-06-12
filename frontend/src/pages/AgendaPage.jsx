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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { jsPDF } from 'jspdf';
import PageHeader from '../components/PageHeader';
import PageSurface from '../components/PageSurface';
import { useAuth } from '../context/AuthContext';

const API = (import.meta.env.VITE_API_URL || 'https://bkbackend-zr8f.onrender.com/api').replace(/\/api$/, '');

function authHeader() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Sortable presenter chip ────────────────────────────────────────────────────
function SortablePresenter({ id, name, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center',
        border: '1px solid', borderColor: 'divider',
        borderRadius: 4, px: 1, py: 0.25,
        bgcolor: 'background.paper', mb: 0.5,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <Box {...attributes} {...listeners} sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
        <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled' }} />
      </Box>
      <Typography variant="caption" sx={{ flex: 1 }}>{name}</Typography>
      <IconButton size="small" onClick={() => onEdit(id, name)} sx={{ p: 0.25 }}>
        <EditIcon sx={{ fontSize: 13 }} />
      </IconButton>
      <IconButton size="small" onClick={() => onDelete(id)} sx={{ p: 0.25 }}>
        <DeleteIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
}

// ── Student card with presenter drag-drop ─────────────────────────────────────
function StudentCard({ student, catId, onSave, onDelete }) {
  const [presenters, setPresenters] = useState(
    [...(student.presenters || [])].sort((a, b) => a.order - b.order)
  );
  const [activeId, setActiveId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addVal, setAddVal] = useState('');
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const ids = presenters.map((p, i) => p._id || `p-${catId}-${student.order}-${i}`);

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    const reordered = arrayMove(presenters, oldIdx, newIdx).map((p, i) => ({ ...p, order: i + 1 }));
    setPresenters(reordered);
    setDirty(true);
  }

  function addPresenter() {
    if (!addVal.trim()) return;
    const newP = { name: addVal.trim(), order: presenters.length + 1 };
    setPresenters(prev => [...prev, newP]);
    setAddVal('');
    setAddOpen(false);
    setDirty(true);
  }

  function deletePresenter(pid) {
    const idx = ids.indexOf(pid);
    const updated = presenters.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i + 1 }));
    setPresenters(updated);
    setDirty(true);
  }

  function startEdit(pid, name) {
    setEditId(pid);
    setEditVal(name);
  }

  function saveEdit() {
    const idx = ids.indexOf(editId);
    const updated = presenters.map((p, i) => i === idx ? { ...p, name: editVal } : p);
    setPresenters(updated);
    setEditId(null);
    setDirty(true);
  }

  function save() {
    onSave({ ...student, presenters });
    setDirty(false);
  }

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" fontWeight={700}>{student.name}</Typography>
              {student.percentage && <Chip label={student.percentage} size="small" color="primary" variant="outlined" />}
              {student.extra && <Typography variant="caption" color="text.secondary">{student.extra}</Typography>}
            </Stack>

            {/* Presenters */}
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={e => setActiveId(e.active.id)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <Stack spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', flexDirection: 'row', gap: 0.5 }}>
                  {presenters.map((p, i) => (
                    <SortablePresenter
                      key={ids[i]}
                      id={ids[i]}
                      name={p.name}
                      onDelete={deletePresenter}
                      onEdit={startEdit}
                    />
                  ))}
                </Stack>
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <Box sx={{ px: 1, py: 0.25, bgcolor: 'primary.light', borderRadius: 4, opacity: 0.8 }}>
                    <Typography variant="caption" color="white">
                      {presenters[ids.indexOf(activeId)]?.name}
                    </Typography>
                  </Box>
                ) : null}
              </DragOverlay>
            </DndContext>

            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
              <Button size="small" variant="text" startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)} sx={{ fontSize: 11 }}>
                Add Presenter
              </Button>
              {dirty && (
                <Button size="small" variant="contained" color="success"
                  onClick={save} sx={{ fontSize: 11 }}>
                  Save
                </Button>
              )}
            </Stack>
          </Box>
          <IconButton size="small" color="error" onClick={() => onDelete(student)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </CardContent>

      {/* Add Presenter Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Presenter</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Presenter name (Hindi/English)"
            value={addVal} onChange={e => setAddVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPresenter()}
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addPresenter} disabled={!addVal.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Presenter Dialog */}
      <Dialog open={editId !== null} onClose={() => setEditId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Presenter</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Presenter name" value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveEdit()}
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={!editVal.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({ cat, onCategoryUpdate, onCategoryDelete }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPct, setAddPct] = useState('');
  const [addExtra, setAddExtra] = useState('');
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(cat.title);

  function saveStudent() {
    if (!addName.trim()) return;
    const students = [
      ...(cat.students || []),
      {
        name: addName.trim(),
        percentage: addPct.trim(),
        extra: addExtra.trim(),
        presenters: [
          { name: 'सं. सुनीता बहन जी', order: 1 },
          { name: 'सं. शांति बहन जी', order: 2 },
          { name: 'सं. रेखा बहन जी', order: 3 },
        ],
        order: (cat.students?.length || 0) + 1,
      },
    ];
    onCategoryUpdate({ ...cat, students });
    setAddOpen(false);
    setAddName(''); setAddPct(''); setAddExtra('');
  }

  function saveStudentPresenter(updated) {
    const students = (cat.students || []).map(s =>
      s.name === updated.name && s.order === updated.order ? updated : s
    );
    onCategoryUpdate({ ...cat, students });
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
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>
            {cat.title}
          </Typography>
          <Chip label={`${(cat.students || []).length} students`} size="small" />
          <IconButton size="small" onClick={() => { setEditTitle(cat.title); setEditTitleOpen(true); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onCategoryDelete(cat)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>

        {(cat.students || [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s, i) => (
            <StudentCard key={`${s.name}-${i}`} student={s} catId={cat._id}
              onSave={saveStudentPresenter} onDelete={deleteStudent} />
          ))}

        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Student
        </Button>
      </CardContent>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Student to {cat.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField autoFocus label="Student Name" fullWidth value={addName} onChange={e => setAddName(e.target.value)} />
            <TextField label="Percentage / Score (optional)" fullWidth value={addPct} onChange={e => setAddPct(e.target.value)} />
            <TextField label="Extra info (e.g. JEE percentile)" fullWidth value={addExtra} onChange={e => setAddExtra(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveStudent} disabled={!addName.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog open={editTitleOpen} onClose={() => setEditTitleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Category Title</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Title" value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveCategoryTitle()}
            sx={{ mt: 1 }} />
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
  const MARGIN = 15;
  const contentW = W - MARGIN * 2;
  const FONT_TITLE = 18;   // category heading
  const FONT_NAME = 16;    // student name
  const FONT_DETAIL = 13;  // percentage / presenters
  const LINE_CAT_TITLE = 10;
  const LINE_NAME = 9;
  const LINE_DETAIL = 7;
  const STUDENT_GAP = 6;
  const MAX_PER_PAGE = 4;

  let y = MARGIN;
  let pageStudentCount = 0;
  let firstCatOnPage = true;

  function checkNewPage(neededHeight = 0) {
    if (y + neededHeight > H - MARGIN) {
      doc.addPage();
      y = MARGIN;
      pageStudentCount = 0;
      firstCatOnPage = true;
      return true;
    }
    return false;
  }

  function drawCategoryTitle(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_TITLE);
    doc.setTextColor(20, 100, 160);
    doc.text(title, MARGIN, y);
    y += LINE_CAT_TITLE;
    doc.setDrawColor(20, 100, 160);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 4;
    doc.setTextColor(0, 0, 0);
  }

  function drawStudent(student, serial) {
    // Student number + name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_NAME);
    const nameText = `${serial}. ${student.name}`;
    doc.text(nameText, MARGIN, y);

    if (student.percentage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_DETAIL);
      doc.setTextColor(60, 60, 60);
      const pctWidth = doc.getTextWidth(student.percentage);
      doc.text(student.percentage, W - MARGIN - pctWidth, y);
      doc.setTextColor(0, 0, 0);
    }
    y += LINE_NAME;

    if (student.extra) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(FONT_DETAIL);
      doc.setTextColor(100, 100, 100);
      doc.text(student.extra, MARGIN + 4, y);
      doc.setTextColor(0, 0, 0);
      y += LINE_DETAIL;
    }

    // Presenters row
    const presenters = [...(student.presenters || [])].sort((a, b) => a.order - b.order);
    if (presenters.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_DETAIL);
      doc.setTextColor(80, 80, 80);
      const presLine = 'Presented by: ' + presenters.map(p => p.name).join(' · ');
      const wrapped = doc.splitTextToSize(presLine, contentW - 4);
      doc.text(wrapped, MARGIN + 4, y);
      y += wrapped.length * (LINE_DETAIL - 0.5);
      doc.setTextColor(0, 0, 0);
    }

    y += STUDENT_GAP;
    pageStudentCount++;
  }

  // ── Smart packing layout ────────────────────────────────────────────────────
  // Rule: Every NEW category starts on a new page when the category has > 3 students
  // (big category). Small categories (≤ 3) may share a page if they fit.
  // Max 4 students per page.

  let i = 0;
  while (i < categories.length) {
    const cat = categories[i];
    const students = [...(cat.students || [])].sort((a, b) => a.order - b.order);
    const isSmall = students.length <= 3;

    if (!isSmall) {
      // Big category — always start fresh page (unless very first thing on document)
      if (y > MARGIN + 2 || pageStudentCount > 0) {
        doc.addPage();
        y = MARGIN;
        pageStudentCount = 0;
        firstCatOnPage = true;
      }
      drawCategoryTitle(cat.title);
      let serial = 1;
      let sIdx = 0;
      while (sIdx < students.length) {
        if (pageStudentCount >= MAX_PER_PAGE) {
          doc.addPage();
          y = MARGIN;
          pageStudentCount = 0;
          // re-draw category title continuation
          doc.setFont('helvetica', 'bolditalic');
          doc.setFontSize(FONT_TITLE - 2);
          doc.setTextColor(20, 100, 160);
          doc.text(`${cat.title} (contd.)`, MARGIN, y);
          y += LINE_CAT_TITLE;
          doc.setTextColor(0, 0, 0);
          y += 2;
        }
        drawStudent(students[sIdx], serial++);
        sIdx++;
      }
    } else {
      // Small category — try to share page with next small category if both fit
      // Estimate if it fits on current page
      const estimatedH = LINE_CAT_TITLE + 8 + students.length * (LINE_NAME + LINE_DETAIL + LINE_DETAIL + STUDENT_GAP);
      const nextFreeSlots = MAX_PER_PAGE - pageStudentCount;

      if (!firstCatOnPage && (nextFreeSlots < students.length || y + estimatedH > H - MARGIN)) {
        // Doesn't fit — new page
        doc.addPage();
        y = MARGIN;
        pageStudentCount = 0;
        firstCatOnPage = true;
      } else if (firstCatOnPage && y === MARGIN) {
        // first item on fresh page — no break needed
      } else if (!firstCatOnPage) {
        // add a small gap between small categories on same page
        y += 3;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, W - MARGIN, y);
        y += 3;
      }

      drawCategoryTitle(cat.title);
      let serial = 1;
      for (const student of students) {
        if (pageStudentCount >= MAX_PER_PAGE) {
          doc.addPage();
          y = MARGIN;
          pageStudentCount = 0;
          firstCatOnPage = true;
          doc.setFont('helvetica', 'bolditalic');
          doc.setFontSize(FONT_TITLE - 2);
          doc.setTextColor(20, 100, 160);
          doc.text(`${cat.title} (contd.)`, MARGIN, y);
          y += LINE_CAT_TITLE;
          doc.setTextColor(0, 0, 0);
          y += 2;
        }
        drawStudent(student, serial++);
      }
      firstCatOnPage = false;
    }

    i++;
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pg} of ${totalPages}`, W / 2, H - 8, { align: 'center' });
    doc.text('BK Scholar Awards', MARGIN, H - 8);
  }

  doc.save('BK_Awards_Agenda.pdf');
}

// ── Main AgendaPage ───────────────────────────────────────────────────────────
function AgendaPage() {
  useAuth(); // ensure user is authenticated
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  async function safeJson(res) {
    const text = await res.text();
    if (!text) throw new Error(`Server returned empty response (status ${res.status})`);
    try { return JSON.parse(text); } catch { throw new Error(`Server error (status ${res.status}): ${text.slice(0, 120)}`); }
  }

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
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/api/agenda/seed`, {
        method: 'POST', headers: authHeader(),
      });
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

  async function addCategory() {
    if (!newCatTitle.trim()) return;
    try {
      const res = await fetch(`${API}/api/agenda`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ title: newCatTitle.trim(), order: categories.length + 1, students: [] }),
      });
      const cat = await safeJson(res);
      if (!res.ok) throw new Error(cat?.message || `HTTP ${res.status}`);
      setCategories(prev => [...prev, cat]);
      setAddCatOpen(false);
      setNewCatTitle('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateCategory(updated) {
    setSaving(updated._id);
    try {
      const res = await fetch(`${API}/api/agenda/${updated._id}`, {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify(updated),
      });
      const saved = await safeJson(res);
      if (!res.ok) throw new Error(saved?.message || `HTTP ${res.status}`);
      setCategories(prev => prev.map(c => c._id === saved._id ? saved : c));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function deleteCategory(cat) {
    if (!window.confirm(`Delete category "${cat.title}" and all its students?`)) return;
    try {
      await fetch(`${API}/api/agenda/${cat._id}`, {
        method: 'DELETE', headers: authHeader(),
      });
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch (e) {
      setError(e.message);
    }
  }

  function handleExportPDF() {
    setExportingPdf(true);
    try {
      exportToPDF(categories);
    } finally {
      setExportingPdf(false);
    }
  }

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
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddCatOpen(true)}>
            Add Category
          </Button>
          <Button variant="contained" color="success" startIcon={<DownloadIcon />}
            onClick={handleExportPDF} disabled={exportingPdf || categories.length === 0}>
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {saving && <LinearProgress color="success" sx={{ mb: 2 }} />}

        {!loading && categories.length === 0 && (
          <Alert severity="info">
            No categories yet. Click <strong>Load Default Data (PDF)</strong> to pre-populate all 51 students from the agenda PDF, or add categories manually.
          </Alert>
        )}

        {categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(cat => (
            <CategorySection
              key={cat._id}
              cat={cat}
              onCategoryUpdate={updateCategory}
              onCategoryDelete={deleteCategory}
            />
          ))}

        {/* Add Category Dialog */}
        <Dialog open={addCatOpen} onClose={() => setAddCatOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <TextField autoFocus fullWidth label="Category title"
              value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              sx={{ mt: 1 }} />
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
