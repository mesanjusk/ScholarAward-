import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Badge, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, SpeedDial, SpeedDialAction, Toolbar, Tooltip, Typography, useMediaQuery, Stack
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import CategoryIcon from '@mui/icons-material/Category';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ChatIcon from '@mui/icons-material/Chat';
import MicIcon from '@mui/icons-material/Mic';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Groups3Icon from '@mui/icons-material/Groups3';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import OnlineStatusBanner from './pwa/OnlineStatusBanner';
import PwaInstallPrompt from './pwa/PwaInstallPrompt';
import { APP_ROUTES, canAccess, isSuperAdmin } from '../utils/accessControl';

const drawerWidth = 292;

const navIcons = {
  '/':                     <DashboardIcon />,
  '/students':             <GroupsIcon />,
  '/volunteers':           <VolunteerActivismIcon />,
  '/anchors':              <MicIcon />,
  '/categories':           <CategoryIcon />,
  '/stage':                <EventSeatIcon />,
  '/budget':               <AccountBalanceWalletIcon />,
  '/responsibilities':     <AssignmentTurnedInIcon />,
  '/notifications':        <NotificationsIcon />,
  '/admin':                <AdminPanelSettingsIcon />,
  '/whatsapp':             <ChatIcon />,
  '/super-admin/settings': <TuneIcon />,
};

const liveModePaths = ['/stage', '/notifications', '/whatsapp'];

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const theme = useTheme();
  const navigate = useNavigate();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { connected, events } = useLive();
  const isOnline = useOnlineStatus();
  const isLiveMode = liveModePaths.some((path) => pathname.startsWith(path));
  const navItems = useMemo(() => APP_ROUTES.filter((item) => canAccess(user, item.permission)), [user]);
  const superAdmin = useMemo(() => isSuperAdmin(user), [user]);

  const quickActions = [
    { icon: <PersonAddAlt1Icon />, name: 'Add Student',     onClick: () => navigate('/students?action=add') },
    { icon: <VolunteerActivismIcon />, name: 'Add Volunteer', onClick: () => navigate('/volunteers?action=add') },
    { icon: <EmojiEventsIcon />,   name: 'Add Guest',       onClick: () => navigate('/admin?tab=guests&action=add') },
    { icon: <Groups3Icon />,       name: 'Add Team Member', onClick: () => navigate('/admin?tab=team&action=add') },
  ];

  const drawer = (
    <Box sx={{ width: drawerWidth, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8fbfa' }}>
      <Box sx={{ p: 2.25, background: 'linear-gradient(180deg, #128C7E 0%, #25D366 100%)', color: '#fff' }}>
        <Typography variant="h6" fontWeight={900}>BK Awards</Typography>
        <Typography variant="body2" sx={{ opacity: 0.92 }}>WhatsApp style operations</Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.25, py: 1.25, flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={pathname === item.to || pathname.startsWith(item.to + '/')}
            onClick={() => setOpen(false)}
            sx={{
              borderRadius: 4,
              mb: 0.75,
              '&.Mui-selected': {
                bgcolor: '#dcf8e7',
                color: 'secondary.main',
                '& .MuiListItemIcon-root': { color: 'secondary.main' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{navIcons[item.to]}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}><CardFooter user={user} logout={logout} /></Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', pb: 'env(safe-area-inset-bottom)' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          pt: 'env(safe-area-inset-top)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(14px)',
          bgcolor: 'rgba(255,255,255,0.82)',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 66, sm: 72 } }}>
          {mobile && <IconButton onClick={() => setOpen(true)}><MenuIcon /></IconButton>}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.roleId?.name || 'Dashboard'}</Typography>
            <Typography variant="subtitle1" fontWeight={900} noWrap>{user?.name || 'User'}</Typography>
          </Box>
          <Tooltip title="Notifications">
            <IconButton component={RouterLink} to="/notifications" size={mobile ? 'small' : 'medium'}>
              <Badge badgeContent={events.length} color="error"><NotificationsIcon /></Badge>
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size={mobile ? 'small' : 'medium'}><MoreVertIcon /></IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem component={RouterLink} to="/notifications" onClick={() => setMenuAnchor(null)}>Notifications</MenuItem>
            {canAccess(user, 'whatsapp:send') && <MenuItem component={RouterLink} to="/whatsapp" onClick={() => setMenuAnchor(null)}>WhatsApp</MenuItem>}
            {canAccess(user, 'users:manage') && <MenuItem component={RouterLink} to="/admin" onClick={() => setMenuAnchor(null)}>Admin</MenuItem>}
            {superAdmin && <MenuItem component={RouterLink} to="/super-admin/settings" onClick={() => setMenuAnchor(null)}>System Settings</MenuItem>}
          </Menu>
        </Toolbar>
      </AppBar>

      {mobile
        ? <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: drawerWidth } }}>{drawer}</Drawer>
        : <Drawer variant="permanent" open PaperProps={{ sx: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' } }}>{drawer}</Drawer>
      }

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.25, sm: 2, md: 2.5 },
          pt: { xs: 9.5, sm: 10.5, md: 11 },
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100vw',
          overflowX: 'hidden',
        }}
      >
        <Stack spacing={1} sx={{ mb: 1.75 }}>
          <PwaInstallPrompt />
          <OnlineStatusBanner isOnline={isOnline} isLiveMode={isLiveMode} />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={user?.eventDutyType || 'NONE'} color="primary" variant="outlined" />
            <Chip size="small" color={connected && isOnline ? 'success' : 'warning'} label={connected && isOnline ? 'Connected' : 'Syncing'} />
          </Stack>
        </Stack>
        {children}
      </Box>

      {pathname === '/' ? (
        <SpeedDial ariaLabel="Quick add" sx={{ position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 } }} icon={<AddIcon />} FabProps={{ color: 'primary' }}>
          {quickActions.map((action) => <SpeedDialAction key={action.name} icon={action.icon} tooltipTitle={action.name} onClick={action.onClick} />)}
        </SpeedDial>
      ) : null}
    </Box>
  );
}

function CardFooter({ user, logout }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 4, bgcolor: '#ecfff3' }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar sx={{ width: 42, height: 42, bgcolor: 'primary.main' }}>{(user?.name || 'U').slice(0, 1)}</Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography fontWeight={800} noWrap>{user?.name || 'User'}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{user?.roleId?.name || 'Role'}</Typography>
        </Box>
        <IconButton color="inherit" onClick={logout}><LogoutIcon fontSize="small" /></IconButton>
      </Stack>
    </Box>
  );
}
