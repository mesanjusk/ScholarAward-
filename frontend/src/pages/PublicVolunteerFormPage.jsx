import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Fade,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { CheckCircle, Download, Groups, PhotoCamera } from '@mui/icons-material';
import api from '../api';
import ImageCropDialog from '../components/common/ImageCropDialog';
import { uploadPublicFile } from '../services/uploadService';
import { buildFinalCanvas, downloadPhoto } from '../utils/photoTemplate';
import { loadTemplateConfig, TEMPLATE_DEFAULTS } from './TemplateConfigPage';

const DEFAULT_TEMPLATE_SRC = '/badhte-kadam-2026.jpg';

const inputSx = {
  '& .MuiFilledInput-root': {
    borderRadius: '10px'
  }
};

function buildFullName(form) {
  return [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
}

export default function PublicVolunteerFormPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    gender: '',
    mobile: '',
    age: '',
    photoFile: null,
    photoPreviewUrl: '',
    photoUrl: ''
  });
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'done'
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [buildingPhoto, setBuildingPhoto] = useState(false);
  const [donePreviewUrl, setDonePreviewUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const doneCanvasRef = useRef(null);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      next.fullName = buildFullName(next);
      return next;
    });
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setRawImageSrc(reader.result); setCropOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setSaving(true);
    setFormError('');

    try {
      let photoUrl = form.photoUrl;

      if (form.photoFile) {
        const uploaded = await uploadPublicFile(form.photoFile, 'bk_awards/volunteers', {
          forcePng: true,
          removeBackground: true
        });
        photoUrl = uploaded?.url || '';
        setForm((prev) => ({ ...prev, photoUrl }));
      }

      await api.post('/volunteers/public-register', {
        firstName: form.firstName,
        lastName: form.lastName,
        fullName: buildFullName(form),
        gender: form.gender,
        mobile: form.mobile,
        age: form.age,
        teamId: '',
        teamOther: 'General',
        photoUrl
      });

      // Go straight to done — build the composite photo immediately
      setStep('done');
      setBuildingPhoto(true);
      try {
        const cfg = loadTemplateConfig();
        const circle = { cx: cfg.cx ?? TEMPLATE_DEFAULTS.cx, cy: cfg.cy ?? TEMPLATE_DEFAULTS.cy, r: cfg.r ?? TEMPLATE_DEFAULTS.r };
        const textPos = { x: 50, y: cfg.textY ?? TEMPLATE_DEFAULTS.textY };
        const templateSrc = cfg.templateSrc || DEFAULT_TEMPLATE_SRC;
        const photoSrc = form.photoPreviewUrl || photoUrl;

        const canvas = await buildFinalCanvas(
          templateSrc, photoSrc, { x: 0, y: 0 }, circle,
          buildFullName(form), textPos, 'large'
        );
        doneCanvasRef.current = canvas;
        setDonePreviewUrl(canvas.toDataURL('image/jpeg', 0.90));
      } catch {
        // leave donePreviewUrl empty to show error state
      } finally {
        setBuildingPhoto(false);
      }
    } catch (error) {
      setFormError(error?.response?.data?.message || 'Failed to submit volunteer registration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDoneDownload = async () => {
    if (!doneCanvasRef.current) return;
    setDownloading(true);
    try {
      await downloadPhoto(doneCanvasRef.current, 'bk-awards-2026.jpg');
    } finally {
      setDownloading(false);
    }
  };

  const previewSrc = form.photoPreviewUrl || form.photoUrl;

  return (
    <Box sx={{ bgcolor: '#f0f7fc', minHeight: '100vh', pb: 5 }}>
      <Box
        sx={{
          bgcolor: '#2497d3',
          color: '#fff',
          pt: { xs: 4, sm: 5 },
          pb: { xs: 5, sm: 6 },
          px: 2,
          textAlign: 'center',
          borderRadius: '0 0 28px 28px'
        }}
      >
        <Groups sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h5" fontWeight={800}>Badte Kadam Scholar Awards</Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.95 }}>Sunday 14 June 2026</Typography>
      </Box>

      <Container maxWidth="sm" sx={{ mt: -3 }}>
        <Card sx={{ borderRadius: 3, border: '1px solid #d9d9d9', boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Stack spacing={2}>

              {step === 'form' && (
                <>
                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #d9d9d9', boxShadow: 'none' }}>
                    <Typography variant="h6" fontWeight={800} color="#2497d3">Volunteer Registration Form</Typography>
                  </Paper>

                  {formError && (
                    <Fade in>
                      <Alert severity="error" sx={{ borderRadius: 2 }}>{formError}</Alert>
                    </Fade>
                  )}

                  <TextField fullWidth size="small" label="First Name" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} sx={inputSx} />
                  <TextField fullWidth size="small" label="Last Name" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} sx={inputSx} />
                  <TextField fullWidth size="small" label="Mobile Number" value={form.mobile} onChange={(e) => updateField('mobile', e.target.value)} inputProps={{ inputMode: 'numeric' }} sx={inputSx} />
                  <TextField fullWidth size="small" label="Age" value={form.age} onChange={(e) => updateField('age', e.target.value.replace(/\D/g, ''))} inputProps={{ inputMode: 'numeric' }} sx={inputSx} />

                  <TextField select fullWidth size="small" label="Gender" value={form.gender} onChange={(e) => updateField('gender', e.target.value)} sx={inputSx}>
                    {['Male', 'Female'].map((option) => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>

                  <Button component="label" fullWidth variant="outlined" startIcon={<PhotoCamera />}
                    sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 700 }}>
                    {previewSrc ? 'Change Photo' : 'Upload Photo'}
                    <input hidden type="file" accept="image/*" onChange={handlePhotoPick} />
                  </Button>

                  {previewSrc && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: '2px solid #2497d3', bgcolor: '#f0f7fc' }}>
                      <Box
                        component="img"
                        src={previewSrc}
                        alt="Photo preview"
                        sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2497d3', flexShrink: 0 }}
                      />
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircle sx={{ color: '#2497d3', fontSize: 16 }} />
                          <Typography fontWeight={700} color="#2497d3" fontSize="0.9rem">Photo ready</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">This photo will appear on your award image.</Typography>
                      </Box>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving || !form.firstName || !form.lastName || !form.mobile || !form.age || !previewSrc}
                    sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 700, bgcolor: '#2497d3', '&:hover': { bgcolor: '#1e88c0' } }}
                  >
                    {saving ? 'Submitting...' : 'Submit Volunteer Registration'}
                  </Button>
                </>
              )}

              {step === 'done' && (
                <>
                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #d9d9d9', boxShadow: 'none' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle sx={{ color: '#2497d3', fontSize: 26 }} />
                      <Box>
                        <Typography variant="h6" fontWeight={800} color="#2497d3">Registration Complete!</Typography>
                        <Typography variant="body2" color="text.secondary">Your award photo is ready to download.</Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {buildingPhoto ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
                      <CircularProgress sx={{ color: '#2497d3' }} />
                      <Typography variant="body2" color="text.secondary">Creating your award photo…</Typography>
                    </Box>
                  ) : donePreviewUrl ? (
                    <>
                      <Box
                        component="img"
                        src={donePreviewUrl}
                        alt="Your award photo"
                        sx={{ width: '100%', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'block' }}
                      />
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download />}
                        disabled={downloading}
                        onClick={handleDoneDownload}
                        sx={{
                          borderRadius: 2, py: 1.5, textTransform: 'none', fontWeight: 800, fontSize: '1rem',
                          background: 'linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #B8860B 100%)',
                          color: '#000',
                          '&:hover': { background: 'linear-gradient(135deg, #FFD700 0%, #FFC300 50%, #FFD700 100%)' },
                          '&:disabled': { bgcolor: '#ccc', color: '#888' },
                        }}
                      >
                        {downloading ? 'Preparing…' : 'Download / Save to Photos'}
                      </Button>
                      <Typography variant="caption" align="center" display="block" color="text.secondary">
                        On iPhone: tap the button and choose "Save Image" from the share menu
                      </Typography>
                    </>
                  ) : (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      Could not generate photo. Please try again.
                    </Alert>
                  )}
                </>
              )}

            </Stack>
          </CardContent>
        </Card>
      </Container>

      <ImageCropDialog
        open={cropOpen}
        imageSrc={rawImageSrc}
        title="Crop your photo"
        cropShape="round"
        aspect={1}
        onClose={() => setCropOpen(false)}
        onDone={({ file, previewUrl }) => {
          setForm((prev) => ({ ...prev, photoFile: file, photoPreviewUrl: previewUrl, photoUrl: '' }));
          setCropOpen(false);
        }}
      />
    </Box>
  );
}
