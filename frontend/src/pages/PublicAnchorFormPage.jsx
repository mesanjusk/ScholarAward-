import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Fade,
  Paper,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import {
  CheckCircle,
  Edit,
  Mic,
  WarningAmber,
  WhatsApp
} from '@mui/icons-material';
import api from '../api';
import AnchorFormWizard from '../components/anchors/AnchorFormWizard';
import {
  buildAnchorFullName,
  createInitialAnchorForm,
  normalizeAnchorFromApi,
  toAnchorPayload
} from '../components/anchors/anchorFormConfig';

const ANCHOR_COLOR = '#7c3aed';
const ANCHOR_HOVER = '#6d28d9';
const ORG_WHATSAPP = '917020955501';

function HeroCard({ editMode }) {
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${ANCHOR_COLOR} 0%, #9333ea 60%, #a855f7 100%)`,
        color: '#fff',
        pt: { xs: 4, sm: 5, md: 6 },
        pb: { xs: 5, sm: 6, md: 7 },
        px: { xs: 2, md: 3 },
        textAlign: 'center',
        borderRadius: '0 0 28px 28px',
        mb: { xs: -2, md: -3 }
      }}
    >
      <Mic sx={{ fontSize: { xs: 38, md: 44 }, mb: 1.2, color: '#fff' }} />
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{
          fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' },
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}
      >
        BADTE KADAM
      </Typography>
      <Typography
        variant="body2"
        sx={{ mt: 1, opacity: 0.95, fontSize: { xs: '0.82rem', sm: '0.92rem', md: '1rem' } }}
      >
        {editMode ? 'Update your anchor details' : '— Scholar Awards 2026'}
      </Typography>
    </Box>
  );
}

function ConfirmationCard({ anchorName, mobile, age, language, editToken, onBackToForm }) {
  const languageDisplay = Array.isArray(language) ? language.join(', ') : language || '';

  const shareMessage = encodeURIComponent(
    `✅ *My BK Scholar Awards 2026 - Anchor Registration*\n\n` +
    `*Name:* ${anchorName}\n` +
    `*Age:* ${age}\n` +
    `*Language(s):* ${languageDisplay}\n` +
    `*Mobile:* ${mobile}\n\n` +
    `I have successfully registered as an Anchor for BK Scholar Awards 2026.\n` +
    `Please confirm my registration. 🙏`
  );
  const waShareLink = `https://wa.me/${ORG_WHATSAPP}?text=${shareMessage}`;

  return (
    <Box
      sx={{
        minHeight: { xs: '50vh', md: '58vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 2
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 520 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
            border: `2px solid ${ANCHOR_COLOR}`,
            overflow: 'hidden',
            bgcolor: '#fff'
          }}
        >
          <Box sx={{ background: `linear-gradient(135deg, ${ANCHOR_COLOR}, #9333ea)`, py: 2, px: 3 }}>
            <CheckCircle sx={{ fontSize: 44, color: '#fff', mb: 0.5 }} />
            <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
              Registration Confirmed!
            </Typography>
            <Typography variant="body2" sx={{ color: '#ede9fe' }}>
              BK Scholar Awards 2026 — Anchor
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Stack spacing={1.2}>
              <Box sx={{ bgcolor: '#f5f3ff', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ANCHOR NAME
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#111' }}>
                  {anchorName}
                </Typography>
              </Box>

              {age ? (
                <Box sx={{ bgcolor: '#faf5ff', borderRadius: 2, p: 1.2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    AGE
                  </Typography>
                  <Typography fontWeight={700}>{age}</Typography>
                </Box>
              ) : null}

              {languageDisplay ? (
                <Box sx={{ bgcolor: '#faf5ff', borderRadius: 2, p: 1.2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    LANGUAGE(S)
                  </Typography>
                  <Typography fontWeight={700}>{languageDisplay}</Typography>
                </Box>
              ) : null}

              <Box sx={{ bgcolor: '#f8f8f8', borderRadius: 2, p: 1.2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  MOBILE
                </Typography>
                <Typography fontWeight={700}>{mobile}</Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Alert
              severity="info"
              icon={<WhatsApp />}
              sx={{ textAlign: 'left', fontSize: '0.82rem', borderRadius: 2 }}
            >
              <strong>WhatsApp confirmation</strong> will be sent to your mobile number shortly.
              Use the <em>"Click here for Confirmation"</em> button below as your proof of
              registration.
            </Alert>
          </Box>
        </Paper>

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
    </Box>
  );
}

function DuplicateAlert({ message, editToken }) {
  const editLink = editToken
    ? `${window.location.origin}/anchor-edit/${editToken}`
    : null;
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

export default function PublicAnchorFormPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(token);

  const [form, setForm] = useState(createInitialAnchorForm());
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  useEffect(() => {
    if (!editMode) return;
    api
      .get(`/anchors/public-edit/${token}`)
      .then((r) => {
        setForm(normalizeAnchorFromApi(r.data || {}));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [editMode, token]);

  const handleSubmit = async () => {
    setSaving(true);
    setErrorMessage('');
    setDuplicateInfo(null);

    try {
      const payload = toAnchorPayload(form);

      if (editMode) {
        await api.put(`/anchors/public-edit/${token}`, payload);
        setSubmitted(true);
      } else {
        const { data } = await api.post('/anchors/public-register', payload);
        setRegistrationResult({
          anchorName: buildAnchorFullName(form) || form.fullName || '',
          mobile: String(form.mobile || '').replace(/\D/g, ''),
          age: form.age || '',
          language: form.language || [],
          editToken: data.editToken || ''
        });
        setSubmitted(true);
      }
    } catch (error) {
      const data = error?.response?.data;
      if (error?.response?.status === 409 && data?.duplicate) {
        setDuplicateInfo({
          message: data.message || 'You have already registered.',
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
    setForm(createInitialAnchorForm());
    setErrorMessage('');
    setDuplicateInfo(null);
    setRegistrationResult(null);
    setSubmitted(false);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rounded" height={560} sx={{ borderRadius: 3 }} />
      </Container>
    );
  }

  if (editMode && submitted) {
    return (
      <Box sx={{ bgcolor: '#faf5ff', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
        <HeroCard editMode />
        <Container maxWidth="sm" sx={{ mt: 4 }}>
          <Paper
            elevation={0}
            sx={{ p: 4, borderRadius: 3, border: '1px solid #d9d9d9', textAlign: 'center' }}
          >
            <CheckCircle sx={{ fontSize: 70, color: ANCHOR_COLOR, mb: 1.5 }} />
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
              Changes Saved Successfully
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your anchor details have been updated.
            </Typography>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!editMode && submitted && registrationResult) {
    return (
      <Box sx={{ bgcolor: '#faf5ff', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
        <HeroCard editMode={false} />
        <Container maxWidth="sm" sx={{ mt: 4, px: { xs: 1.5, sm: 3 } }}>
          <ConfirmationCard {...registrationResult} onBackToForm={handleAddAnother} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#faf5ff', minHeight: '100vh', pb: { xs: 4, sm: 6 } }}>
      <HeroCard editMode={editMode} />

      <Container
        maxWidth={false}
        sx={{ mt: { xs: 1.5, sm: 2, md: 3 }, px: { xs: 1.25, sm: 2, md: 3, lg: 4, xl: 6 } }}
      >
        <Box sx={{ maxWidth: '1100px', mx: 'auto' }}>
          <Stack spacing={2}>
            {errorMessage ? (
              <Fade in>
                <Alert
                  severity="error"
                  variant="filled"
                  sx={{ borderRadius: 2.5, fontSize: '1rem', fontWeight: 600, py: 1.5 }}
                >
                  {errorMessage}
                </Alert>
              </Fade>
            ) : null}

            {duplicateInfo ? (
              <DuplicateAlert
                message={duplicateInfo.message}
                editToken={duplicateInfo.editToken}
              />
            ) : null}

            {!editMode && !submitted && !duplicateInfo ? (
              <Alert
                severity="info"
                icon={<Mic />}
                sx={{
                  borderRadius: 2.5,
                  bgcolor: '#fff',
                  border: '1px solid #d9d9d9',
                  color: '#111827'
                }}
              >
                Badte Kadam Scholar Awards 2026. Anchor Audition.
              </Alert>
            ) : null}

            <Card sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <AnchorFormWizard
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  onSubmit={handleSubmit}
                  editMode={editMode}
                />
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
