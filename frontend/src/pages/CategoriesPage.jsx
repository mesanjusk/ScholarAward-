import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ResponsiveDialog from '../components/ResponsiveDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import api from '../api';
import PageHeader from '../components/PageHeader';
import ResponsiveTable from '../components/ResponsiveTable';
import StatusChip from '../components/StatusChip';

const defaultForm = {
  title: '',
  categoryType: 'AWARD',
  className: '',
  minPercentage: 0,
  calculationMethod: 'DIRECT_PERCENTAGE',
  notes: '',
  isActive: true,
};

function CategoryCard({ item, onEdit }) {
  const isVolunteer = item.categoryType === 'VOLUNTEER_TEAM';

  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {item.title}
              </Typography>
              <Chip
                size="small"
                label={isVolunteer ? 'Volunteer / Team' : 'Award'}
                color={isVolunteer ? 'secondary' : 'primary'}
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <StatusChip label={item.isActive ? 'Active' : 'Inactive'} />
          </Stack>

          {!isVolunteer && (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                Class: <strong>{item.className || '-'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Min %: <strong>{item.minPercentage || 0}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Method: <strong>{item.calculationMethod || '-'}</strong>
              </Typography>
            </Stack>
          )}

          {item.notes ? (
            <Typography variant="body2" color="text.secondary">
              {item.notes}
            </Typography>
          ) : null}

          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(item)}>
              Edit
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CategoryFormDialog({ open, onClose, onSaved, editItem }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title || '',
        categoryType: editItem.categoryType || 'AWARD',
        className: editItem.className || '',
        minPercentage: editItem.minPercentage || 0,
        calculationMethod: editItem.calculationMethod || 'DIRECT_PERCENTAGE',
        notes: editItem.notes || '',
        isActive: editItem.isActive !== undefined ? editItem.isActive : true,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editItem, open]);

  const isAwardCategory = form.categoryType === 'AWARD';
  const isEditMode = Boolean(editItem);

  const handleClose = () => {
    setForm(defaultForm);
    onClose();
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        categoryType: form.categoryType,
        className: isAwardCategory ? form.className : '',
        minPercentage: isAwardCategory ? Number(form.minPercentage || 0) : 0,
        calculationMethod: isAwardCategory ? form.calculationMethod : 'DIRECT_PERCENTAGE',
        notes: form.notes || '',
        isActive: form.isActive,
      };

      if (isEditMode) {
        await api.put(`/categories/${editItem._id}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      onSaved?.();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? 'Edit category' : 'Add category'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={save} sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Category Type"
              value={form.categoryType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  categoryType: e.target.value,
                  className: e.target.value === 'AWARD' ? prev.className : '',
                  minPercentage: e.target.value === 'AWARD' ? prev.minPercentage : 0,
                  calculationMethod:
                    e.target.value === 'AWARD' ? prev.calculationMethod : 'DIRECT_PERCENTAGE',
                }))
              }
              fullWidth
            >
              <MenuItem value="AWARD">Award Category</MenuItem>
              <MenuItem value="VOLUNTEER_TEAM">Volunteer / Team Category</MenuItem>
            </TextField>

            <TextField
              label={isAwardCategory ? 'Category Title' : 'Volunteer / Team Title'}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
            />

            {isAwardCategory && (
              <>
                <TextField
                  label="Class"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  fullWidth
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      type="number"
                      label="Min %"
                      value={form.minPercentage}
                      onChange={(e) =>
                        setForm({ ...form, minPercentage: Number(e.target.value) })
                      }
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      label="Calculation Method"
                      value={form.calculationMethod}
                      onChange={(e) =>
                        setForm({ ...form, calculationMethod: e.target.value })
                      }
                      fullWidth
                    >
                      <MenuItem value="DIRECT_PERCENTAGE">Direct %</MenuItem>
                      <MenuItem value="BEST_5">Best 5</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </>
            )}

            <TextField
              select
              label="Status"
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.value === 'true' })
              }
              fullWidth
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>

            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : isEditMode ? 'Update category' : 'Save category'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>
    </ResponsiveDialog>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [viewMode, setViewMode] = useState('card');
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    const { data } = await api.get('/categories');
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredCategories = useMemo(() => {
    if (tab === 'AWARD') {
      return categories.filter((c) => c.categoryType === 'AWARD');
    }
    if (tab === 'VOLUNTEER_TEAM') {
      return categories.filter((c) => c.categoryType === 'VOLUNTEER_TEAM');
    }
    return categories;
  }, [categories, tab]);

  const handleAdd = () => {
    setEditItem(null);
    setOpenForm(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setOpenForm(true);
  };

  const rows = filteredCategories.map((c) => {
    const isVolunteer = c.categoryType === 'VOLUNTEER_TEAM';

    return {
      title: c.title,
      categoryType: isVolunteer ? 'Volunteer / Team' : 'Award',
      className: isVolunteer ? '-' : c.className || '-',
      minPercentage: isVolunteer ? '-' : c.minPercentage || 0,
      calculationMethod: isVolunteer ? '-' : c.calculationMethod || '-',
      notes: c.notes || '-',
      active: () => <StatusChip label={c.isActive ? 'Active' : 'Inactive'} />,
      action: () => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(c)}>
          Edit
        </Button>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Manage award categories and volunteer/team categories from one place."
      />

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All (${categories.length})`} value="ALL" />
              <Tab
                label={`Award (${categories.filter((c) => c.categoryType === 'AWARD').length})`}
                value="AWARD"
              />
              <Tab
                label={`Volunteer / Team (${categories.filter((c) => c.categoryType === 'VOLUNTEER_TEAM').length})`}
                value="VOLUNTEER_TEAM"
              />
            </Tabs>

            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={viewMode}
                onChange={(_, value) => value && setViewMode(value)}
              >
                <ToggleButton value="card">
                  <ViewModuleIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="table">
                  <TableRowsIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                Add Category
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {filteredCategories.map((item) => (
            <Grid key={item._id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <CategoryCard item={item} onEdit={handleEdit} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <ResponsiveTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'categoryType', label: 'Type' },
            { key: 'className', label: 'Class' },
            { key: 'minPercentage', label: 'Min %' },
            { key: 'calculationMethod', label: 'Method' },
            { key: 'notes', label: 'Notes' },
            { key: 'active', label: 'Status' },
            { key: 'action', label: 'Action' },
          ]}
          rows={rows}
          mobileTitleKey="title"
        />
      )}

      <CategoryFormDialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditItem(null);
        }}
        onSaved={load}
        editItem={editItem}
      />
    </>
  );
}