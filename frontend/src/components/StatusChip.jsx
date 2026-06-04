import { Chip } from '@mui/material';

const map = {
  Eligible: 'success',
  Pending: 'warning',
  'Review Needed': 'warning',
  Rejected: 'error',
  Selected: 'success',
  PENDING: 'warning',
  CALLED: 'info',
  ON_STAGE: 'secondary',
  COMPLETED: 'success',
  SKIPPED: 'default',
  REASSIGNED: 'warning',
  PAID: 'success',
  PARTIAL: 'warning',
  UNPAID: 'error',
  DONE: 'success',
  IN_PROGRESS: 'info'
};

export default function StatusChip({ label }) {
  return <Chip size="small" label={label || '-'} color={map[label] || 'default'} />;
}
