import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Fade,
  Skeleton,
  Stack,
  Tabs,
  Tab,
  Typography,
  Paper,
  Divider,
  Chip,
  Collapse
} from '@mui/material';
import {
  CheckCircle,
  EmojiEvents,
  School,
  WhatsApp,
  Share,
  Edit,
  Download,
  WarningAmber,
  PhotoCamera,
  TaskAlt
} from '@mui/icons-material';
import api from '../api';
import StudentFormWizard from '../components/students/StudentFormWizard';
import { uploadPublicFile } from '../services/uploadService';
import StudentCertificatePreviewSection from '../components/students/StudentCertificatePreviewSection';
import {
  createInitialStudentForm,
  toStudentPayload
} from '../components/students/studentFormConfig';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFullName(data) {
  return [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
}

// Phone number for sharing confirmation (the org's number)
const ORG_WHATSAPP = '917020955501';

// ─── Components ───────────────────────────────────────────────────────────────

function HeroCard({ editMode }) {
  return (
    <Box
      sx={{
        bgcolor: '#2497d3',
        color: '#fff',
        pt: { xs: 4, sm: 5, md: 6 },
        pb: { xs: 5, sm: 6, md: 7 },
        px: { xs: 2, md: 3 },
        textAlign: 'center',
        borderRadius: '0 0 28px 28px',
        mb: { xs: -2, md: -3 }
      }}
    >
      <EmojiEvents sx={{ fontSize: { xs: 38, md: 44 }, mb: 1.2, color: '#fff' }} />
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        BADTE KADAM
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.95, fontSize: { xs: '0.82rem', sm: '0.92rem', md: '1rem' } }}>
        {editMode ? 'Update your submitted details' : 'Scholar Awards 2026'}
      </Typography>
    </Box>
  );
}

/**
 * PhotoUploadBadge — shown inline in the form area when a photo has been selected.
 * Gives clear visual feedback that the photo is ready to upload.
 */
function PhotoUploadBadge({ previewUrl }) {
  if (!previewUrl) return null;
  return (
    <Fade in>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          borderRadius: 2.5,
          border: '2px solid #25D366',
          bgcolor: '#f0fff4',
          mt: 1
        }}
      >
        <Box
          component="img"
          src={previewUrl}
          alt="Uploaded photo"
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #25D366',
            flexShrink: 0
          }}
        />
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <CheckCircle sx={{ color: '#25D366', fontSize: 18 }} />
            <Typography fontWeight={700} color="#1a7a3a" fontSize="0.95rem">
              Photo Uploaded Successfully
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Your photo has been attached to the registration.
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}


/**
 * ConfirmationCard — shown after successful registration.
 * Shows a visual "Registration Proof" card that the student can screenshot and share.
 * Also has a WhatsApp share button that opens WhatsApp with a pre-filled message to
 * the org's number, so they have proof on their own phone too.
 */
function ConfirmationCard({ studentName, studentId, editToken, categoryName, mobile, percentage, onBackToForm }) {
  const confirmRef = useRef(null);
  const percentageDisplay = percentage ? `${percentage}%` : null;

  // WhatsApp share message — opens on student's own WhatsApp to the org number
  const shareMessage = encodeURIComponent(
    `✅ *My BK Scholar Awards 2026 Registration*\n\n` +
    `*Name:* ${studentName}\n` +
    `*Selected Category:* ${categoryName || 'Scholar Award'}\n` +
    (percentageDisplay ? `*Percentage:* ${percentageDisplay}\n` : '') +
    `*Mobile:* ${mobile}\n\n` +
    `I have successfully registered for BK Scholar Awards 2026.\n` +
    `Please confirm my registration. 🙏`
  );
  const waShareLink = `https://wa.me/${ORG_WHATSAPP}?text=${shareMessage}`;

  // Edit link
  const editLink = editToken
    ? `${window.location.origin}/register/edit/${editToken}`
    : null;

  return (
    <Box sx={{ minHeight: { xs: '50vh', md: '58vh' }, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 520 }}>

        {/* ── Main Confirmation Card (the "proof" image) ── */}
        <Paper
          ref={confirmRef}
          elevation={0}
          sx={{
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
            border: '2px solid #25D366',
            overflow: 'hidden',
            bgcolor: '#fff'
          }}
        >
          {/* Header */}
          <Box sx={{ bgcolor: '#25D366', py: 2, px: 3 }}>
            <CheckCircle sx={{ fontSize: 44, color: '#fff', mb: 0.5 }} />
            <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
              Registration Confirmed!
            </Typography>
            <Typography variant="body2" sx={{ color: '#e6fff0' }}>
              BK Scholar Awards 2026
            </Typography>
          </Box>

          {/* Details */}
          <Box sx={{ p: 3 }}>
            <Stack spacing={1.2}>
              <Box sx={{ bgcolor: '#f0fff4', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>STUDENT NAME</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#111' }}>{studentName}</Typography>
              </Box>
              {categoryName && (
                <Box sx={{ bgcolor: '#f0f7fc', borderRadius: 2, p: 1.2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>CATEGORY</Typography>
                  <Typography fontWeight={700}>{categoryName}</Typography>
                </Box>
              )}
              {percentageDisplay && (
                <Box sx={{ bgcolor: '#fffbf0', borderRadius: 2, p: 1.2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>PERCENTAGE</Typography>
                  <Typography fontWeight={800} sx={{ letterSpacing: 1, fontSize: '1.1rem', color: '#b45309' }}>{percentageDisplay}</Typography>
                </Box>
              )}
              <Box sx={{ bgcolor: '#f8f8f8', borderRadius: 2, p: 1.2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>MOBILE</Typography>
                <Typography fontWeight={700}>{mobile}</Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Alert severity="info" icon={<WhatsApp />} sx={{ textAlign: 'left', fontSize: '0.82rem', borderRadius: 2 }}>
              <strong>WhatsApp confirmation</strong> will be sent to your mobile number shortly.
              Use the <em>"Share via WhatsApp"</em> button below
              as your proof of registration.
            </Alert>
          </Box>
        </Paper>

        {/* ── Action Buttons ── */}
        <Stack spacing={1.2}>
          {/* Share via WhatsApp — opens WA with pre-filled message TO org number */}
          <Button
            fullWidth
            variant="contained"
            startIcon={<WhatsApp />}
            component="a"
            href={waShareLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              py: 1.4,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#1ebe5d' }
            }}
          >
            Click here for Confirmation
          </Button>

          

          
        </Stack>
      </Stack>
    </Box>
  );
}

// ─── Duplicate Alert ──────────────────────────────────────────────────────────

function DuplicateAlert({ message, editToken }) {
  const editLink = editToken ? `${window.location.origin}/register/edit/${editToken}` : null;
  return (
    <Fade in>
      <Alert
        severity="warning"
        icon={<WarningAmber />}
        sx={{ borderRadius: 2.5 }}
        action={
          editLink ? (
            <Button color="inherit" size="small" href={editLink} component="a" startIcon={<Edit />}>
              Edit
            </Button>
          ) : null
        }
      >
        <strong>Already Registered!</strong> {message}
      </Alert>
    </Fade>
  );
}

// ─── Form payload builder ─────────────────────────────────────────────────────

function normalizeFormFromApi(data) {
  const initial = createInitialStudentForm();
  const hasOtherCategory = !data.categoryId && data.categoryOther;

  const next = {
    ...initial,
    ...data,
    firstName: data.firstName || '',
    lastName:  data.lastName  || '',
    fatherName: data.fatherName || '',
    categoryId: hasOtherCategory
      ? 'OTHER'
      : (data.categoryId?._id || data.categoryId || ''),
    categoryOther: data.categoryOther || '',
    subjects: data.subjects?.length ? data.subjects : initial.subjects,
    studentPhotoPreviewUrl: data.studentPhotoUrl || '',
    studentPhotoFile: null,
    certificateAdjustments: {
      photoScale:    data.certificateAdjustments?.photoScale    ?? 1,
      photoX:        data.certificateAdjustments?.photoX        ?? 0,
      photoY:        data.certificateAdjustments?.photoY        ?? 0,
      photoRotation: data.certificateAdjustments?.photoRotation ?? 0
    }
  };

  next.fullName = data.fullName || buildFullName(next);
  return next;
}

function buildPayload(form, categories) {
  const isOther  = String(form.categoryId) === 'OTHER';
  const category = categories.find((c) => String(c._id) === String(form.categoryId));
  const fullName = buildFullName(form);

  const payload = toStudentPayload({
    ...form,
    fullName,
    categoryId:   isOther ? 'OTHER' : (form.categoryId || ''),
    categoryOther: isOther ? String(form.categoryOther || '').trim() : '',
    board:        isOther ? (form.board || '') : (category?.board || form.board || ''),
    categoryName: isOther
      ? (form.categoryOther || form.categoryName || 'Other')
      : (category?.name || category?.title || form.categoryName || ''),
    resultImageUrl:      form.resultImageUrl      || form.marksheetFileUrl  || '',
    certificatePhotoUrl: form.certificatePhotoUrl || form.studentPhotoUrl   || ''
  });

  payload.firstName  = form.firstName  || '';
  payload.lastName   = form.lastName   || '';
  payload.fatherName = form.fatherName || '';
  payload.fullName   = fullName;

  if (isOther) {
    payload.categoryId    = 'OTHER';
    payload.categoryOther = String(form.categoryOther || '').trim();
  } else {
    payload.categoryId    = form.categoryId || '';
    payload.categoryOther = '';
  }

  return payload;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicStudentFormPage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const editMode   = Boolean(token);

  const [form, setForm]               = useState(createInitialStudentForm());
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(editMode);
  const [saving, setSaving]           = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const [submitted, setSubmitted]     = useState(false);
  const [tab, setTab]                 = useState(0);

  // Registration result (for confirmation card)
  const [registrationResult, setRegistrationResult] = useState(null);
  // Duplicate info
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  useEffect(() => {
    api.get('/students/public-categories').then((r) => setCategories(r.data || []));
  }, []);

  useEffect(() => {
    if (!editMode) return;
    api.get(`/students/public-edit/${token}`)
      .then((r) => { setForm(normalizeFormFromApi(r.data || {})); setLoading(false); })
      .catch(() => setLoading(false));
  }, [editMode, token]);

  const handleSubmit = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    setDuplicateInfo(null);

    try {
      let nextForm = form;

      if (form.studentPhotoFile) {
        const uploaded = await uploadPublicFile(
          form.studentPhotoFile,
          'bk_awards/student_photos',
          { forcePng: true, removeBackground: true }
        );
        const uploadedUrl = uploaded?.url || '';
        nextForm = {
          ...form,
          studentPhotoUrl:        uploadedUrl,
          certificatePhotoUrl:    uploadedUrl,
          studentPhotoPreviewUrl: uploadedUrl,
          studentPhotoFile:       null
        };
        setForm(nextForm);
      }

      const payload = buildPayload(nextForm, categories);

      if (editMode) {
        await api.put(`/students/public-edit/${token}`, payload);
        setSuccessMessage('Changes saved successfully.');
        setSubmitted(true);
      } else {
        const { data } = await api.post('/students/public-register', payload);

        // Build category name for confirmation card
        const isOther    = String(form.categoryId) === 'OTHER';
        const catObj     = categories.find((c) => String(c._id) === String(form.categoryId));
        const categoryName = isOther
          ? (form.categoryOther || 'Other')
          : (catObj?.title || catObj?.name || '');

        setRegistrationResult({
          studentName: buildFullName(form) || form.fullName || '',
          studentId:   data.studentId || '',
          editToken:   data.editToken  || '',
          categoryName,
          mobile:      String(form.mobile || '').replace(/\D/g, ''),
          percentage:  form.percentage || null
        });
        setSuccessMessage(data?.message || 'Registration submitted successfully.');
        setSubmitted(true);
      }
    } catch (error) {
      const data = error?.response?.data;

      // ── Duplicate registration ─────────────────────────────────────────────
      if (error?.response?.status === 409 && data?.duplicate) {
        setDuplicateInfo({
          message:   data.message || 'You have already registered for this category.',
          editToken: data.editToken || null
        });
        setSaving(false);
        return;
      }

      setErrorMessage(data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setForm(createInitialStudentForm());
    setSuccessMessage('');
    setErrorMessage('');
    setDuplicateInfo(null);
    setRegistrationResult(null);
    setSubmitted(false);
    setTab(0);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rounded" height={560} sx={{ borderRadius: 3 }} />
      </Container>
    );
  }

  // ── Edit-mode success ──────────────────────────────────────────────────────
  if (editMode && submitted) {
    return (
      <Box sx={{ bgcolor: '#f0f7fc', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
        <HeroCard editMode />
        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #d9d9d9', textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 70, color: 'success.main', mb: 1.5 }} />
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Changes Saved Successfully</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Your student details have been updated.</Typography>
            <Button variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ── New registration success — show confirmation card ─────────────────────
  if (!editMode && submitted && registrationResult) {
    return (
      <Box sx={{ bgcolor: '#f0f7fc', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
        <HeroCard editMode={false} />
        <Container maxWidth="sm" sx={{ mt: 4, px: { xs: 1.5, sm: 3 } }}>
          <ConfirmationCard
            {...registrationResult}
            onBackToForm={handleAddAnother}
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f0f7fc', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
      <HeroCard editMode={editMode} />

      <Container
        maxWidth={false}
        sx={{ mt: { xs: 1.5, sm: 2, md: 3 }, px: { xs: 1.25, sm: 2, md: 3, lg: 4, xl: 6 } }}
      >
        <Box sx={{ maxWidth: editMode ? '1600px' : '1100px', mx: 'auto' }}>
          <Stack spacing={2}>

            {/* Success banner — prominent full-width */}
            {successMessage && !submitted && (
              <Fade in>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#1a7a3a',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(37,211,102,0.25)'
                  }}
                >
                  <TaskAlt sx={{ fontSize: 30, flexShrink: 0 }} />
                  <Box>
                    <Typography fontWeight={800} fontSize="1rem">{successMessage}</Typography>
                    <Typography fontSize="0.82rem" sx={{ opacity: 0.88 }}>Your details have been saved successfully.</Typography>
                  </Box>
                </Box>
              </Fade>
            )}

            {/* Error */}
            {errorMessage && (
              <Fade in>
                <Alert severity="error" variant="filled" sx={{ borderRadius: 2.5, fontSize: '1rem', fontWeight: 600, py: 1.5 }}>
                  {errorMessage}
                </Alert>
              </Fade>
            )}

            {/* Duplicate warning */}
            {duplicateInfo && (
              <DuplicateAlert message={duplicateInfo.message} editToken={duplicateInfo.editToken} />
            )}

            {/* Info banner */}
            {!editMode && !submitted && !duplicateInfo && (
              <Alert
                severity="info"
                icon={<School />}
                sx={{ borderRadius: 2.5, bgcolor: '#fff', border: '1px solid #d9d9d9', color: '#111827' }}
              >
                Fill the form carefully and upload a clear student photo for certificate preview.
              </Alert>
            )}

            {/* Photo upload confirmation badge */}
            {!submitted && form.studentPhotoPreviewUrl && (
              <PhotoUploadBadge previewUrl={form.studentPhotoPreviewUrl} />
            )}

            {/* Form tabs */}
            {!submitted && (
              <>
                {editMode && (
                  <Card sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ pb: '8px !important' }}>
                      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
                        <Tab label="📝 Edit Form" value={0} />
                        <Tab label="🎓 Certificate Preview" value={1} />
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {tab === 0 && (
                  <Card sx={{ borderRadius: 2.5 }}>
                    <CardContent>
                      <StudentFormWizard
                        form={form}
                        setForm={setForm}
                        categories={categories}
                        saving={saving}
                        onSubmit={handleSubmit}
                        editMode={editMode}
                      />
                    </CardContent>
                  </Card>
                )}

                {tab === 1 && editMode && (
                  <StudentCertificatePreviewSection form={form} setForm={setForm} categories={categories} />
                )}
              </>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
