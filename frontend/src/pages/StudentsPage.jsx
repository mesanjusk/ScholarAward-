import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../api';
import { exportStudentsToPDF } from '../utils/studentsPdfExport';
import PageHeader from '../components/PageHeader';
import ResponsiveTable from '../components/ResponsiveTable';
import StatusChip from '../components/StatusChip';
import StudentFormWizard from '../components/students/StudentFormWizard';
import StudentCertificatePreviewSection from '../components/students/StudentCertificatePreviewSection';
import { createInitialStudentForm, toStudentPayload } from '../components/students/studentFormConfig';

function StudentRecordCard({ item, onEdit, onParse, onEvaluate }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="h6" fontWeight={800}>{item.fullName || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.mobile || 'No mobile'}
              </Typography>
            </Box>
            <StatusChip label={item.status || 'Pending'} />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {item.board || '-'} · {item.className || '-'} · {item.percentage ?? 0}%
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {item.marksheetFileUrl || item.resultImageUrl ? (
              <>
                <Button size="small" variant="outlined" startIcon={<DescriptionOutlinedIcon />} href={item.marksheetFileUrl || item.resultImageUrl} target="_blank" rel="noreferrer">Marksheet</Button>
                <Button size="small" variant="text" href={item.marksheetFileUrl || item.resultImageUrl} download>Download</Button>
              </>
            ) : null}
            {item.studentPhotoUrl || item.certificatePhotoUrl ? (
              <>
                <Button size="small" variant="outlined" startIcon={<ImageOutlinedIcon />} href={item.studentPhotoUrl || item.certificatePhotoUrl} target="_blank" rel="noreferrer">Photo</Button>
                <Button size="small" variant="text" href={item.studentPhotoUrl || item.certificatePhotoUrl} download>Download</Button>
              </>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
            <Button size="small" onClick={() => onParse(item._id)}>Parse</Button>
            <Button size="small" variant="outlined" onClick={() => onEvaluate(item._id)}>Evaluate</Button>
            <Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(item)}>Edit</Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function mapStudentToForm(student) {
  const initial = createInitialStudentForm();
  return {
    ...initial,
    ...student,
    categoryId: student.categoryId?._id || student.categoryId || '',
    studentPhotoPreviewUrl: student.studentPhotoUrl || '',
    studentPhotoFile: null,
    marksheetPreviewUrl: student.marksheetFileUrl || student.resultImageUrl || '',
    certificatePhotoUrl: student.certificatePhotoUrl || student.studentPhotoUrl || ''
  };
}

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(createInitialStudentForm());
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const load = async () => {
    const [s, c] = await Promise.all([api.get('/students'), api.get('/categories')]);
    setStudents(Array.isArray(s.data) ? s.data : []);
    setCategories(Array.isArray(c.data) ? c.data : []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      handleAdd();
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  const handleAdd = () => {
    setEditStudent(null);
    setForm(createInitialStudentForm());
    setSavedMessage('');
    setOpenDialog(true);
  };

  const handleEdit = (student) => {
    setEditStudent(student);
    setForm(mapStudentToForm(student));
    setSavedMessage('');
    setOpenDialog(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setOpenDialog(false);
    setEditStudent(null);
  };

  const save = async () => {
    setSaving(true);
    setSavedMessage('');
    try {
      const payload = toStudentPayload(form);
      if (editStudent?._id) {
        await api.put(`/students/${editStudent._id}`, payload);
        setSavedMessage('Student updated successfully.');
      } else {
        await api.post('/students', payload);
        setSavedMessage('Student created successfully.');
      }
      await load();
      setOpenDialog(false);
      setEditStudent(null);
      setForm(createInitialStudentForm());
    } finally {
      setSaving(false);
    }
  };

  const evaluate = async (id) => { await api.post(`/students/${id}/evaluate`); await load(); };
  const parse = async (id) => { await api.post(`/students/${id}/parse`); await load(); };

  const summary = useMemo(() => ({
    total: students.length,
    eligible: students.filter((s) => String(s.status || '').toLowerCase() === 'eligible').length,
    categories: categories.length
  }), [students, categories]);

  const rows = students.map((s) => ({
    title: s.fullName,
    name: s.fullName || '-',
    mobile: s.mobile || '-',
    academic: `${s.board || '-'} · ${s.className || '-'} · ${s.percentage ?? 0}%`,
    status: () => <StatusChip label={s.status || 'Pending'} />,
    files: () => (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {s.marksheetFileUrl || s.resultImageUrl ? <Button size="small" href={s.marksheetFileUrl || s.resultImageUrl} target="_blank" rel="noreferrer">Marksheet</Button> : null}
        {s.studentPhotoUrl || s.certificatePhotoUrl ? <Button size="small" href={s.studentPhotoUrl || s.certificatePhotoUrl} target="_blank" rel="noreferrer">Photo</Button> : null}
      </Stack>
    ),
    action: () => (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button size="small" onClick={() => parse(s._id)}>Parse</Button>
        <Button size="small" variant="outlined" onClick={() => evaluate(s._id)}>Evaluate</Button>
        <Button size="small" variant="contained" onClick={() => handleEdit(s)}>Edit</Button>
      </Stack>
    )
  }));

  return (
    <Box>
      <PageHeader
        title="Students"
        subtitle="List-first student management with files, edit dialog and certificate preview only during edit."
        chips={[
          { label: `${summary.total} Registered` },
          { label: `${summary.eligible} Eligible`, color: 'success' },
          { label: `${summary.categories} Categories` }
        ]}
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>Student Records</Typography>
              <Typography color="text.secondary">Use files buttons for marksheet/photo and edit to fine tune certificate preview.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <ToggleButtonGroup exclusive value={viewMode} onChange={(_, v) => v && setViewMode(v)} size="small">
                <ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton>
                <ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => exportStudentsToPDF(students)} disabled={students.length === 0}>Download PDF</Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Student</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {savedMessage ? <Alert sx={{ mb: 2 }} severity="success">{savedMessage}</Alert> : null}

      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {students.map((student) => (
            <Grid key={student._id} size={{ xs: 12, md: 6, xl: 4 }}>
              <StudentRecordCard item={student} onEdit={handleEdit} onParse={parse} onEvaluate={evaluate} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <ResponsiveTable
          columns={[
            { key: 'name', label: 'Student' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'academic', label: 'Academic Info' },
            { key: 'status', label: 'Status' },
            { key: 'files', label: 'Files' },
            { key: 'action', label: 'Action' }
          ]}
          rows={rows}
          mobileTitleKey="title"
        />
      )}

      <Dialog
        open={openDialog}
        onClose={closeDialog}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: '100%', md: '96vw' },
            maxWidth: '1600px',
            height: { xs: '100%', md: '94vh' },
            maxHeight: { xs: '100%', md: '94vh' },
            m: { xs: 0, md: 2 },
            borderRadius: { xs: 0, md: 4 },
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent sx={{ p: 0, height: '100%' }}>
          <Grid container sx={{ minHeight: '100%', height: '100%' }}>
            <Grid size={{ xs: 12, lg: editStudent ? 7 : 12 }} sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
              <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 2, bgcolor: '#fff' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{editStudent ? 'Edit Student' : 'Add New Student'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {editStudent ? 'Certificate preview is available only while editing.' : 'Quick create form without certificate preview.'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={closeDialog}>Close</Button>
                    <Button variant="contained" onClick={save} disabled={saving} startIcon={<AutoFixHighIcon />}>{saving ? 'Saving...' : editStudent ? 'Update Student' : 'Save Student'}</Button>
                  </Stack>
                </Stack>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
                <StudentFormWizard
                  mode="admin"
                  form={form}
                  setForm={setForm}
                  onSubmit={save}
                  saving={saving}
                  successMessage=""
                  topInfo={{
                    title: editStudent ? 'Student profile editor' : 'New student intake',
                    description: editStudent ? 'Update records and files, then preview certificate on the right.' : 'Add the student details and save.'
                  }}
                />
              </Box>
            </Grid>

            {editStudent ? (
              <Grid size={{ xs: 12, lg: 5 }} sx={{ bgcolor: '#f8fafc', borderLeft: { lg: '1px solid #e2e8f0' }, borderTop: { xs: '1px solid #e2e8f0', lg: 'none' }, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 1.5, sm: 2, md: 2.5 } }}>
                  <StudentCertificatePreviewSection form={form} setForm={setForm} categories={categories} />
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
}