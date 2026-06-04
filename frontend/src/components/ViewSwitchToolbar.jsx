import { Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AddIcon from '@mui/icons-material/Add';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';

export default function ViewSwitchToolbar({
  viewMode = 'card',
  onViewModeChange,
  onAdd,
  addLabel = 'Add',
  onReport,
  reportLabel = 'Report',
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      {onViewModeChange ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_, value) => value && onViewModeChange(value)}
          sx={{ bgcolor: 'background.paper', borderRadius: 4 }}
        >
          <ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="table"><TableRowsIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      ) : null}
      {onReport ? <Button variant="outlined" startIcon={<AssessmentOutlinedIcon />} onClick={onReport}>{reportLabel}</Button> : null}
      {onAdd ? <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>{addLabel}</Button> : null}
    </Stack>
  );
}
