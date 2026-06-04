import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  CheckCircle,
  DriveFolderUpload,
  Insights,
  Delete,
  EmojiEvents
} from '@mui/icons-material';
import {
  emptySubject,
  isOtherCategory,
  getSelectedCategory,
  isCbseCategory,
  calculateBest5Preview
} from './studentFormConfig';
import { uploadPublicFile } from '../../services/uploadService';
import ImageCropDialog from '../common/ImageCropDialog';

const steps = ['Profile', 'Academic', 'Uploads', ''];

// ── className removed from required fields ──
const requiredByStep = {
  0: ['firstName', 'lastName', 'fatherName', 'gender', 'address', 'mobile', 'parentMobile'],
  1: ['categoryId', 'schoolName', 'percentage'],
  2: ['marksheetFileUrl', 'studentPhotoUrl']
};

const isPresent = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const fieldLabels = {
  firstName: 'Student First Name',
  lastName: 'Surname / Last Name',
  fatherName: "Father's Name",
  gender: 'Gender',
  address: 'Address',
  mobile: 'Student Mobile Number',
  parentMobile: 'Parent Mobile Number',
  categoryId: 'Category',
  categoryOther: 'Other Category',
  schoolName: 'School or College Name',
  // className intentionally omitted
  percentage: 'Percentage',
  marksheetFileUrl: 'Marksheet Upload',
  studentPhotoUrl: 'Student Photo Upload'
};

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    bgcolor: '#fff'
  }
};

const sectionPaperSx = {
  p: { xs: 1.5, sm: 2 },
  borderRadius: 2,
  border: '1px solid #d9d9d9',
  bgcolor: '#fff'
};

const topTabSx = {
  minHeight: 34,
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'none',
  px: 1.6,
  py: 0.7,
  borderRadius: 0,
  border: '1px solid #cfcfcf',
  color: '#6b7280',
  bgcolor: '#e5e5e5'
};

const activeTopTabSx = {
  ...topTabSx,
  color: '#fff',
  bgcolor: '#2497d3',
  borderColor: '#2497d3'
};

const DetailLine = ({ label, value }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    spacing={2}
    sx={{
      py: 0.7,
      borderBottom: '1px dashed #e5e7eb',
      '&:last-child': { borderBottom: 'none', pb: 0 }
    }}
  >
    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
      {label}
    </Typography>
    <Typography fontWeight={600} textAlign="right" sx={{ fontSize: 14 }}>
      {value || '-'}
    </Typography>
  </Stack>
);

function buildFullName(form) {
  return [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
}

// ── Personal step — 10-digit mobile validation ──
export function StudentWizardStepPersonal({ form, setForm, errors }) {
  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      next.fullName = buildFullName(next);
      return next;
    });
  };

  const handleMobileChange = (key, value) => {
    // Allow only digits, max 10
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, [key]: digits }));
  };

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        label="Student First Name"
        value={form.firstName || ''}
        error={Boolean(errors.firstName)}
        helperText={errors.firstName}
        sx={inputSx}
        onChange={(e) => updateField('firstName', e.target.value)}
      />

      <TextField
        fullWidth
        size="small"
        label="Surname / Last Name"
        value={form.lastName || ''}
        error={Boolean(errors.lastName)}
        helperText={errors.lastName}
        sx={inputSx}
        onChange={(e) => updateField('lastName', e.target.value)}
      />

      <TextField
        fullWidth
        size="small"
        label="Father's Name"
        value={form.fatherName || ''}
        error={Boolean(errors.fatherName)}
        helperText={errors.fatherName}
        sx={inputSx}
        onChange={(e) => updateField('fatherName', e.target.value)}
      />

      <Box>
        <Typography
          sx={{
            mb: 0.8,
            fontSize: '0.92rem',
            color: errors.gender ? 'error.main' : 'text.secondary'
          }}
        >
          Gender :{' '}
          <RadioGroup
            row
            value={form.gender || ''}
            onChange={(e) => updateField('gender', e.target.value)}
          >
            <FormControlLabel value="Female" control={<Radio size="small" />} label="Female" />
            <FormControlLabel value="Male" control={<Radio size="small" />} label="Male" />
          </RadioGroup>
        </Typography>

        {errors.gender ? (
          <Typography sx={{ mt: 0.4, fontSize: '0.75rem', color: 'error.main' }}>
            {errors.gender}
          </Typography>
        ) : null}
      </Box>

      <TextField
        fullWidth
        size="small"
        multiline
        minRows={4}
        label="Address"
        value={form.address}
        error={Boolean(errors.address)}
        helperText={errors.address}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
      />

      <TextField
        fullWidth
        size="small"
        label="Student Mobile Number"
        value={form.mobile}
        error={Boolean(errors.mobile)}
        helperText={errors.mobile || (form.mobile && form.mobile.length < 10 ? 'Must be 10 digits' : '')}
        inputProps={{ inputMode: 'numeric', maxLength: 10 }}
        sx={inputSx}
        onChange={(e) => handleMobileChange('mobile', e.target.value)}
      />

      <TextField
        fullWidth
        size="small"
        label="Parent Mobile Number"
        value={form.parentMobile}
        error={Boolean(errors.parentMobile)}
        helperText={errors.parentMobile || (form.parentMobile && form.parentMobile.length < 10 ? 'Must be 10 digits' : '')}
        inputProps={{ inputMode: 'numeric', maxLength: 10 }}
        sx={inputSx}
        onChange={(e) => handleMobileChange('parentMobile', e.target.value)}
      />
    </Stack>
  );
}

// ── Academic step — class removed, CBSE / subjects section removed ──
export function StudentWizardStepAcademic({
  form,
  setForm,
  errors,
  categories = []
}) {
  const handleCategoryChange = (value) => {
    setForm((prev) => ({
      ...prev,
      categoryId: value,
      categoryOther: value === 'OTHER' ? prev.categoryOther || '' : ''
    }));
  };

  return (
    <Stack spacing={2}>
      {/* Category */}
      <TextField
        select
        fullWidth
        size="small"
        label="Category"
        value={form.categoryId || ''}
        error={Boolean(errors.categoryId)}
        helperText={errors.categoryId}
        sx={inputSx}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        {categories.map((cat) => (
          <MenuItem key={cat._id} value={cat._id}>
            {cat.title || cat.name}
          </MenuItem>
        ))}
        <MenuItem value="OTHER">Other</MenuItem>
      </TextField>

      {isOtherCategory(form.categoryId) && (
        <TextField
          fullWidth
          size="small"
          label="Specify Category"
          value={form.categoryOther || ''}
          error={Boolean(errors.categoryOther)}
          helperText={errors.categoryOther}
          sx={inputSx}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryOther: e.target.value }))}
        />
      )}

      {/* School name */}
      <TextField
        fullWidth
        size="small"
        label="School or College Name"
        value={form.schoolName || ''}
        error={Boolean(errors.schoolName)}
        helperText={errors.schoolName}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
      />

      {/* Percentage — numbers only, no class, no CBSE subjects */}
      <TextField
        fullWidth
        size="small"
        type="number"
        label="Percentage"
        value={form.percentage}
        error={Boolean(errors.percentage)}
        helperText={errors.percentage}
        inputProps={{ min: 0, max: 100, step: 0.01 }}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, percentage: e.target.value }))}
      />
    </Stack>
  );
}

// ── Uploads step — 1 MB file size limit ──
export function StudentWizardStepUploads({ form, setForm, errors }) {
  const [uploadingField, setUploadingField] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState('');

  const handleMarksheetFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = '';
      return;
    }

    setUploadError('');
    setUploadingField('marksheetFileUrl');

    try {
      const uploaded = await uploadPublicFile(file, 'bk_awards/marksheets');
      const url = uploaded?.url || '';
      setForm((prev) => ({ ...prev, marksheetFileUrl: url, resultImageUrl: url }));
    } catch (error) {
      setUploadError(error?.response?.data?.message || 'File upload failed. Please try a smaller file.');
    } finally {
      setUploadingField('');
      event.target.value = '';
    }
  };

  const handlePhotoPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Photo is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = '';
      return;
    }

    setUploadError('');

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setCropOpen(true);
    };
    reader.onerror = () => setUploadError('Unable to read selected image. Please try another file.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropDone = ({ file, previewUrl }) => {
    setForm((prev) => ({
      ...prev,
      studentPhotoFile: file,
      studentPhotoPreviewUrl: previewUrl,
      studentPhotoUrl: '',
      certificatePhotoUrl: ''
    }));
    setCropOpen(false);
  };

  const previewSrc = form.studentPhotoPreviewUrl || form.studentPhotoUrl || form.certificatePhotoUrl || '';

  return (
    <Stack spacing={1.75}>
      {uploadingField ? <LinearProgress sx={{ borderRadius: 999, height: 6 }} /> : null}

      {uploadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {uploadError}
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.82rem' }}>
        Maximum file size is <strong>{MAX_FILE_SIZE_MB} MB</strong> per upload.
      </Alert>

      <Paper sx={sectionPaperSx}>
        <Stack spacing={1.25}>
          <Button
            component="label"
            fullWidth
            variant="outlined"
            startIcon={<DriveFolderUpload />}
            sx={{
              py: 1.4,
              borderStyle: 'solid',
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600
            }}
            color={errors.marksheetFileUrl ? 'error' : 'primary'}
            disabled={Boolean(uploadingField)}
          >
            {uploadingField === 'marksheetFileUrl'
              ? 'Uploading marksheet...'
              : form.marksheetFileUrl || form.resultImageUrl
                ? 'Marksheet Uploaded ✓'
                : 'Upload Marksheet *'}
            <input hidden type="file" accept="image/*,.pdf" onChange={handleMarksheetFile} />
          </Button>

          <Button
            component="label"
            fullWidth
            variant="outlined"
            startIcon={<DriveFolderUpload />}
            sx={{
              py: 1.4,
              borderStyle: 'solid',
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600
            }}
            color={errors.studentPhotoUrl ? 'error' : 'primary'}
            disabled={Boolean(uploadingField)}
          >
            {previewSrc ? 'Student Photo Cropped ✓' : 'Upload Student Photo *'}
            <input hidden type="file" accept="image/*" onChange={handlePhotoPick} />
          </Button>
        </Stack>
      </Paper>

      {previewSrc ? (
        <Paper sx={sectionPaperSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Photo Preview
          </Typography>
          <Box
            component="img"
            src={previewSrc}
            alt="Student preview"
            sx={{
              width: 84,
              height: 100,
              borderRadius: 1.5,
              display: 'block',
              objectFit: 'cover',
              border: '1px solid #e5e7eb'
            }}
          />
        </Paper>
      ) : null}

      <TextField
        fullWidth
        size="small"
        multiline
        minRows={3}
        label="Remarks (optional)"
        value={form.remarks || ''}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
      />

      <ImageCropDialog
        open={cropOpen}
        imageSrc={rawImageSrc}
        title="Crop student photo"
        cropShape="round"
        aspect={1}
        onClose={() => setCropOpen(false)}
        onDone={handleCropDone}
      />
    </Stack>
  );
}

// ── Review step — class and CBSE best5 removed ──
export function StudentWizardStepReview({ form, categories = [] }) {
  const selectedCategory = getSelectedCategory(categories, form.categoryId);

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={sectionPaperSx}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Personal Details
        </Typography>
        <DetailLine label="Student First Name" value={form.firstName} />
        <DetailLine label="Surname / Last Name" value={form.lastName} />
        <DetailLine label="Father's Name" value={form.fatherName} />
        <DetailLine label="Full Name" value={form.fullName} />
        <DetailLine label="Gender" value={form.gender} />
        <DetailLine label="Address" value={form.address} />
        <DetailLine label="Mobile Number" value={form.mobile} />
        <DetailLine label="Parent Mobile Number" value={form.parentMobile} />
      </Paper>

      <Paper variant="outlined" sx={sectionPaperSx}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Academic Details
        </Typography>
        <DetailLine
          label="Category"
          value={isOtherCategory(form.categoryId) ? form.categoryOther : selectedCategory?.title}
        />
        <DetailLine label="School or College Name" value={form.schoolName} />
        <DetailLine label="Percentage" value={form.percentage ? `${form.percentage}%` : '-'} />
      </Paper>

      <Paper variant="outlined" sx={sectionPaperSx}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Uploads
        </Typography>
        <DetailLine
          label="Marksheet"
          value={form.marksheetFileUrl || form.resultImageUrl ? 'Uploaded' : 'Missing'}
        />
        <DetailLine
          label="Photo"
          value={
            form.studentPhotoFile ||
            form.studentPhotoPreviewUrl ||
            form.studentPhotoUrl ||
            form.certificatePhotoUrl
              ? 'Uploaded'
              : 'Missing'
          }
        />
        <DetailLine label="Remarks" value={form.remarks || '-'} />
      </Paper>
    </Stack>
  );
}

export function StudentCertificatePreviewSection({ form, editable = false, onAdjustmentsChange }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid #d9d9d9',
        boxShadow: 'none'
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
          Certificate Preview
        </Typography>

        <Box
          sx={{
            borderRadius: 2,
            bgcolor: '#fff7e6',
            minHeight: 260,
            p: 2,
            position: 'relative',
            border: '1px dashed #e2b866'
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <EmojiEvents fontSize="small" color="warning" />
            <Typography variant="caption" color="text.secondary">
              Award certificate preview
            </Typography>
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, fontWeight: 700 }}>
            {form.fullName || 'Student Name'}
          </Typography>
          <Typography color="text.secondary">
            {form.percentage ? `${form.percentage}%` : ''}
          </Typography>

          <Box
            sx={{
              width: 100,
              height: 120,
              bgcolor: 'rgba(21,94,239,0.12)',
              borderRadius: 2,
              position: 'absolute',
              right: 24 + (form.certificateAdjustments?.photoX || 0) / 5,
              top: 48 + (form.certificateAdjustments?.photoY || 0) / 5,
              transform: `scale(${form.certificateAdjustments?.photoScale || 1}) rotate(${form.certificateAdjustments?.photoRotation || 0}deg)`,
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              fontWeight: 700
            }}
          >
            {form.studentPhotoPreviewUrl || form.studentPhotoUrl ? (
              <img
                src={form.studentPhotoPreviewUrl || form.studentPhotoUrl}
                alt="Student"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              'PHOTO'
            )}
          </Box>
        </Box>

        {editable ? (
          <Stack spacing={1.1} sx={{ mt: 2.25 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Certificate Photo Alignment
            </Typography>

            <Typography variant="caption" color="text.secondary">Scale</Typography>
            <Slider
              min={0.6} max={2} step={0.1}
              value={form.certificateAdjustments?.photoScale || 1}
              onChange={(_, v) => onAdjustmentsChange({ photoScale: Number(v) })}
            />

            <Typography variant="caption" color="text.secondary">Rotation</Typography>
            <Slider
              min={-20} max={20} step={1}
              value={form.certificateAdjustments?.photoRotation || 0}
              onChange={(_, v) => onAdjustmentsChange({ photoRotation: Number(v) })}
            />

            <Typography variant="caption" color="text.secondary">Move X</Typography>
            <Slider
              min={-100} max={100} step={1}
              value={form.certificateAdjustments?.photoX || 0}
              onChange={(_, v) => onAdjustmentsChange({ photoX: Number(v) })}
            />

            <Typography variant="caption" color="text.secondary">Move Y</Typography>
            <Slider
              min={-100} max={100} step={1}
              value={form.certificateAdjustments?.photoY || 0}
              onChange={(_, v) => onAdjustmentsChange({ photoY: Number(v) })}
            />
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Main Wizard ──
export default function StudentFormWizard({
  mode,
  form,
  setForm,
  categories = [],
  onSubmit,
  saving,
  successMessage,
  topInfo,
  showCertificatePreview = false
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm((prev) => {
      const nextFullName = buildFullName(prev);
      if (nextFullName === (prev.fullName || '')) return prev;
      return { ...prev, fullName: nextFullName };
    });
  }, [form.firstName, form.lastName, setForm]);

  const validateStep = (step) => {
    const requiredFields = step === 2 && mode === 'admin' ? [] : requiredByStep[step] || [];
    const nextErrors = {};

    requiredFields.forEach((field) => {
      const value =
        field === 'marksheetFileUrl'
          ? form.marksheetFileUrl || form.resultImageUrl
          : field === 'studentPhotoUrl'
            ? form.studentPhotoFile || form.studentPhotoPreviewUrl || form.studentPhotoUrl || form.certificatePhotoUrl
            : form[field];

      if (!isPresent(value)) {
        nextErrors[field] = `${fieldLabels[field]} is required`;
      }
    });

    // Mobile 10-digit validation
    if (step === 0) {
      if (form.mobile && form.mobile.length !== 10) {
        nextErrors.mobile = 'Mobile number must be exactly 10 digits';
      }
      if (form.parentMobile && form.parentMobile.length !== 10) {
        nextErrors.parentMobile = 'Parent mobile number must be exactly 10 digits';
      }
    }

    // Percentage validation — must be a positive number
    if (step === 1) {
      if (isOtherCategory(form.categoryId) && !isPresent(form.categoryOther)) {
        nextErrors.categoryOther = 'Other Category is required';
      }
      if (!isPresent(form.percentage)) {
        nextErrors.percentage = 'Percentage is required';
      } else if (isNaN(Number(form.percentage)) || Number(form.percentage) < 0 || Number(form.percentage) > 100) {
        nextErrors.percentage = 'Enter a valid percentage between 0 and 100';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const onBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const submit = async () => {
    if (!validateStep(2)) return;
    await onSubmit();
  };

  return (
    <Stack spacing={2}>
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: '#fff',
          border: '1px solid #d9d9d9'
        }}
      >
        <Stack spacing={1.3}>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              color: '#2497d3',
              textTransform: 'uppercase',
              fontSize: { xs: '1rem', sm: '1.12rem' }
            }}
          >
            {topInfo?.title || 'Multi Steps Form Widget'}
          </Typography>

          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
            {topInfo?.description || 'Fill all details carefully'}
          </Typography>

          <Stack direction="row" spacing={0.7} justifyContent="center" flexWrap="wrap" useFlexGap>
            {steps.map((label, index) => (
              <Box key={label} sx={index === activeStep ? activeTopTabSx : topTabSx}>
                {label}
              </Box>
            ))}
          </Stack>

          <LinearProgress
            variant="determinate"
            value={((activeStep + 1) / steps.length) * 100}
            sx={{ height: 6, borderRadius: 999 }}
          />
        </Stack>
      </Paper>

      {successMessage ? (
        <Alert icon={<CheckCircle />} severity="success" sx={{ borderRadius: 2 }}>
          {successMessage}
        </Alert>
      ) : null}

      <Box sx={{ display: 'none' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Card
        sx={{
          borderRadius: 2,
          border: '1px solid #d9d9d9',
          boxShadow: 'none',
          maxWidth: 700,
          width: '100%',
          mx: 'auto'
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2.4 } }}>
          {activeStep === 0 ? (
            <StudentWizardStepPersonal form={form} setForm={setForm} errors={errors} />
          ) : null}

          {activeStep === 1 ? (
            <StudentWizardStepAcademic
              form={form}
              setForm={setForm}
              errors={errors}
              categories={categories}
            />
          ) : null}

          {activeStep === 2 ? (
            <StudentWizardStepUploads form={form} setForm={setForm} errors={errors} />
          ) : null}

          {activeStep === 3 ? (
            <StudentWizardStepReview form={form} categories={categories} />
          ) : null}
        </CardContent>
      </Card>

      {showCertificatePreview ? <StudentCertificatePreviewSection form={form} /> : null}

      <Paper
        sx={{
          p: 1.2,
          borderRadius: 2,
          border: '1px solid #d9d9d9',
          boxShadow: 'none',
          maxWidth: 700,
          width: '100%',
          mx: 'auto',
          bgcolor: '#fff'
        }}
      >
        <Stack direction="row" spacing={1.2}>
          <Button
            fullWidth
            variant="outlined"
            disabled={activeStep === 0 || saving}
            onClick={onBack}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, py: 1 }}
          >
            Back
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              fullWidth
              variant="contained"
              onClick={onNext}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                bgcolor: '#2497d3',
                '&:hover': { bgcolor: '#1e88c0' }
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              disabled={saving}
              onClick={submit}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                bgcolor: '#2497d3',
                '&:hover': { bgcolor: '#1e88c0' }
              }}
            >
              {saving ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
