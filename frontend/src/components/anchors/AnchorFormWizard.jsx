import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Collapse,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

const ANCHOR_COLOR = '#7c3aed';
const ANCHOR_HOVER = '#6d28d9';

const steps = ['Profile', 'Instructions'];

const LANGUAGES = ['Sindhi', 'Hindi', 'English'];

const INSTRUCTIONS = [
  'I confirm that I am available on 14th June 2026 (Event Day) and have no other prior commitments on that date.',
  'I am willing to dedicate daily practice time from now until the event day and will attend all required rehearsals.',
  'I understand that punctuality is mandatory for all practice sessions and the event. Repeated absence may result in disqualification.',
  'I will maintain a respectful and disciplined attitude towards coordinators, judges, and fellow participants throughout the programme.',
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    bgcolor: '#fff'
  }
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

function validateProfile(form) {
  const errors = {};
  if (!String(form.firstName || '').trim()) errors.firstName = 'First Name is required';
  if (!String(form.lastName || '').trim()) errors.lastName = 'Last Name is required';
  if (!form.gender) errors.gender = 'Gender is required';
  if (!form.age) {
    errors.age = 'Age is required';
  } else {
    const age = Number(form.age);
    if (isNaN(age) || age < 16 || age > 35) errors.age = 'Age must be between 16 and 35';
  }
  if (!String(form.address || '').trim()) errors.address = 'Address is required';
  if (!form.mobile) {
    errors.mobile = 'Mobile number is required';
  } else if (form.mobile.length !== 10) {
    errors.mobile = 'Mobile number must be exactly 10 digits';
  }
  if (!Array.isArray(form.language) || form.language.length === 0) {
    errors.language = 'Please select at least one language';
  }
  return errors;
}

function AnchorStepProfile({ form, setForm, errors }) {
  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      next.fullName = [next.firstName, next.lastName].filter(Boolean).join(' ').trim();
      return next;
    });
  };

  const handleMobile = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, mobile: digits }));
  };

  const handleLanguage = (lang, checked) => {
    setForm((prev) => {
      const current = Array.isArray(prev.language) ? prev.language : [];
      const next = checked ? [...current, lang] : current.filter((l) => l !== lang);
      return { ...prev, language: next };
    });
  };

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        label="Anchor First Name"
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

      <Box>
        <Typography
          sx={{ mb: 0.5, fontSize: '0.92rem', color: errors.gender ? 'error.main' : 'text.secondary' }}
        >
          Gender :
        </Typography>
        <RadioGroup
          row
          value={form.gender || ''}
          onChange={(e) => updateField('gender', e.target.value)}
        >
          <FormControlLabel value="Female" control={<Radio size="small" />} label="Female" />
          <FormControlLabel value="Male" control={<Radio size="small" />} label="Male" />
        </RadioGroup>
        {errors.gender ? (
          <Typography sx={{ fontSize: '0.75rem', color: 'error.main' }}>{errors.gender}</Typography>
        ) : null}
      </Box>

      <TextField
        fullWidth
        size="small"
        label="Age"
        type="number"
        value={form.age || ''}
        error={Boolean(errors.age)}
        helperText={errors.age || 'Must be between 16 and 35'}
        inputProps={{ min: 16, max: 35 }}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
      />

      <TextField
        fullWidth
        size="small"
        multiline
        minRows={3}
        label="Address"
        value={form.address || ''}
        error={Boolean(errors.address)}
        helperText={errors.address}
        sx={inputSx}
        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
      />

      <TextField
        fullWidth
        size="small"
        label="Mobile Number"
        value={form.mobile || ''}
        error={Boolean(errors.mobile)}
        helperText={errors.mobile || (form.mobile && form.mobile.length < 10 ? 'Must be 10 digits' : '')}
        inputProps={{ inputMode: 'numeric', maxLength: 10 }}
        sx={inputSx}
        onChange={(e) => handleMobile(e.target.value)}
      />

      <Box>
        <Typography
          sx={{ mb: 0.5, fontSize: '0.92rem', color: errors.language ? 'error.main' : 'text.secondary' }}
        >
          Language (select one or more) :
        </Typography>
        <FormGroup row>
          {LANGUAGES.map((lang) => (
            <FormControlLabel
              key={lang}
              control={
                <Checkbox
                  size="small"
                  checked={Array.isArray(form.language) && form.language.includes(lang)}
                  onChange={(e) => handleLanguage(lang, e.target.checked)}
                  sx={{ color: ANCHOR_COLOR, '&.Mui-checked': { color: ANCHOR_COLOR } }}
                />
              }
              label={lang}
            />
          ))}
        </FormGroup>
        {errors.language ? <FormHelperText error>{errors.language}</FormHelperText> : null}
      </Box>
    </Stack>
  );
}

function AnchorStepInstructions({ checked, onToggle }) {
  const allChecked = checked.every(Boolean);

  return (
    <Stack spacing={2}>
      <Alert
        severity="info"
        sx={{ borderRadius: 2, fontSize: '0.85rem', border: `1px solid ${ANCHOR_COLOR}30`, bgcolor: '#f5f3ff' }}
      >
        Please read and accept each term to proceed. 
      </Alert>

      {INSTRUCTIONS.map((instruction, index) => {
        const isVisible = index === 0 || checked[index - 1];
        const isChecked = checked[index];

        return (
          <Collapse key={index} in={isVisible} timeout={350}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1.5px solid ${isChecked ? ANCHOR_COLOR : '#d9d9d9'}`,
                bgcolor: isChecked ? '#f5f3ff' : '#fff',
                transition: 'border-color 0.2s ease, background-color 0.2s ease'
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Checkbox
                  size="small"
                  checked={isChecked}
                  onChange={(e) => onToggle(index, e.target.checked)}
                  sx={{ pt: 0.3, color: ANCHOR_COLOR, '&.Mui-checked': { color: ANCHOR_COLOR } }}
                />
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ display: 'block', mb: 0.4, color: isChecked ? ANCHOR_COLOR : 'text.secondary' }}
                  >
                    {index + 1} of {INSTRUCTIONS.length}
                    {isChecked ? ' ✓' : ''}
                  </Typography>
                  <Typography sx={{ fontSize: '0.91rem', lineHeight: 1.65, color: '#1f2937' }}>
                    {instruction}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Collapse>
        );
      })}

      {allChecked ? (
        <Collapse in>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1.5px solid #22c55e' }}>
            <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
            <Typography fontWeight={700} sx={{ color: '#15803d', fontSize: '0.9rem' }}>
              All terms accepted. You may now submit.
            </Typography>
          </Stack>
        </Collapse>
      ) : null}
    </Stack>
  );
}

export default function AnchorFormWizard({ form, setForm, saving, onSubmit }) {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [instructionChecked, setInstructionChecked] = useState(
    Array(INSTRUCTIONS.length).fill(false)
  );
  const [instructionError, setInstructionError] = useState('');

  const activeTopTabSx = {
    ...topTabSx,
    color: '#fff',
    bgcolor: ANCHOR_COLOR,
    borderColor: ANCHOR_COLOR
  };

  const handleToggle = (index, value) => {
    setInstructionChecked((prev) => {
      const next = [...prev];
      next[index] = value;
      if (!value) {
        for (let i = index + 1; i < next.length; i++) next[i] = false;
      }
      return next;
    });
    if (value) setInstructionError('');
  };

  const onNext = () => {
    const errs = validateProfile(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setActiveStep(1);
  };

  const onBack = () => {
    setActiveStep(0);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!instructionChecked.every(Boolean)) {
      setInstructionError('Please read and accept all instructions to proceed.');
      return;
    }
    await onSubmit();
  };

  const allInstructionsChecked = instructionChecked.every(Boolean);

  return (
    <Stack spacing={2}>
      <Paper
        sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: '#fff', border: '1px solid #d9d9d9' }}
      >
        <Stack spacing={1.3}>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              color: ANCHOR_COLOR,
              textTransform: 'uppercase',
              fontSize: { xs: '1rem', sm: '1.12rem' }
            }}
          >
            Anchor Audition Form
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
            Fill all details carefully
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
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: '#ede9fe',
              '& .MuiLinearProgress-bar': { bgcolor: ANCHOR_COLOR }
            }}
          />
        </Stack>
      </Paper>

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
            <AnchorStepProfile form={form} setForm={setForm} errors={errors} />
          ) : null}
          {activeStep === 1 ? (
            <AnchorStepInstructions
              checked={instructionChecked}
              onToggle={handleToggle}
            />
          ) : null}
        </CardContent>
      </Card>

      {instructionError && activeStep === 1 ? (
        <Alert severity="error" sx={{ borderRadius: 2, maxWidth: 700, mx: 'auto', width: '100%' }}>
          {instructionError}
        </Alert>
      ) : null}

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
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              py: 1,
              color: ANCHOR_COLOR,
              borderColor: ANCHOR_COLOR,
              '&:hover': { borderColor: ANCHOR_HOVER, color: ANCHOR_HOVER }
            }}
          >
            Back
          </Button>

          {activeStep === 0 ? (
            <Button
              fullWidth
              variant="contained"
              onClick={onNext}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                bgcolor: ANCHOR_COLOR,
                '&:hover': { bgcolor: ANCHOR_HOVER }
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              disabled={saving || !allInstructionsChecked}
              onClick={handleSubmit}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                bgcolor: ANCHOR_COLOR,
                '&:hover': { bgcolor: ANCHOR_HOVER },
                '&.Mui-disabled': { bgcolor: '#c4b5fd', color: '#fff' }
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
