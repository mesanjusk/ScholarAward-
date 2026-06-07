export const MODULE_PERMISSIONS = {
  dashboard:          'dashboard:view',
  students:           'students:manage',
  volunteers:         'volunteers:manage',
  anchors:            'anchors:manage',
  categories:         'categories:manage',
  stage:              'stage:manage',
  budget:             'budget:manage',
  responsibilities:   'task:manage',
  notifications:      'notifications:view',
  admin:              'users:manage',
  whatsapp:           'whatsapp:send',
  superAdminSettings: 'super_admin:settings',
  templateConfig:     'super_admin:settings',
};

export const APP_ROUTES = [
  { label: 'Dashboard',       to: '/',                     permission: MODULE_PERMISSIONS.dashboard },
  { label: 'Students',        to: '/students',             permission: MODULE_PERMISSIONS.students },
  { label: 'Volunteers',      to: '/volunteers',           permission: MODULE_PERMISSIONS.volunteers },
  { label: 'Anchors',         to: '/anchors',              permission: MODULE_PERMISSIONS.anchors },
  { label: 'Categories',      to: '/categories',           permission: MODULE_PERMISSIONS.categories },
  { label: 'Live Stage',      to: '/stage',                permission: MODULE_PERMISSIONS.stage },
  { label: 'Budget',          to: '/budget',               permission: MODULE_PERMISSIONS.budget },
  { label: 'Tasks',           to: '/responsibilities',     permission: MODULE_PERMISSIONS.responsibilities },
  { label: 'Notifications',   to: '/notifications',        permission: MODULE_PERMISSIONS.notifications },
  { label: 'WhatsApp',        to: '/whatsapp',             permission: MODULE_PERMISSIONS.whatsapp },
  { label: 'Admin',           to: '/admin',                permission: MODULE_PERMISSIONS.admin },
  { label: 'System Settings', to: '/super-admin/settings', permission: MODULE_PERMISSIONS.superAdminSettings },
  { label: 'Photo Template',  to: '/template-config',      permission: MODULE_PERMISSIONS.templateConfig },
];

export function getPermissions(user) {
  return user?.roleId?.permissions || [];
}

export function canAccess(user, permission) {
  if (!permission) return true;
  const permissions = getPermissions(user);
  if (!permissions.length) return true;
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  if (permission === MODULE_PERMISSIONS.volunteers) {
    return permissions.includes(MODULE_PERMISSIONS.students) || permissions.includes(MODULE_PERMISSIONS.admin);
  }
  return false;
}

export function isSuperAdmin(user) {
  const permissions = getPermissions(user);
  return permissions.includes('*');
}
