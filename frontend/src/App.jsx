import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { LiveProvider } from './context/LiveContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import AppUpdatePrompt from './components/pwa/AppUpdatePrompt';
import theme from './theme';
import { MODULE_PERMISSIONS } from './utils/accessControl';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import VolunteersPage from './pages/VolunteersPage';
import CategoriesPage from './pages/CategoriesPage';
import StagePage from './pages/StagePage';
import BudgetPage from './pages/BudgetPage';
import ResponsibilitiesPage from './pages/ResponsibilitiesPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import WhatsAppPage from './pages/WhatsAppPage';
import SuperAdminSettingsPage from './pages/SuperAdminSettingsPage';
import PublicStudentFormPage from './pages/PublicStudentFormPage';
import PublicVolunteerFormPage from './pages/PublicVolunteerFormPage';
import PublicAnchorFormPage from './pages/PublicAnchorFormPage';
import RegistrationClosedPage from './pages/RegistrationClosedPage';
import AnchorsPage from './pages/AnchorsPage';
import PublicPhotoTemplatePage from './pages/PublicPhotoTemplatePage';
import TemplateConfigPage from './pages/TemplateConfigPage';
import PublicInvitationPage from './pages/PublicInvitationPage';
import AgendaPage from './pages/AgendaPage';

// Set to true to open registrations, false to show the "Registration Closed" page
const STUDENT_REGISTRATION_OPEN = false;
const ANCHOR_REGISTRATION_OPEN = false;
const VOLUNTEER_REGISTRATION_OPEN = false;

function Layout({ children }) {
  return <AppShell>{children}</AppShell>;
}

const protectedPages = [
  ['/',                     <DashboardPage />,         MODULE_PERMISSIONS.dashboard],
  ['/students',             <StudentsPage />,           MODULE_PERMISSIONS.students],
  ['/volunteers',           <VolunteersPage />,         MODULE_PERMISSIONS.volunteers],
  ['/anchors',              <AnchorsPage />,            MODULE_PERMISSIONS.anchors],
  ['/categories',           <CategoriesPage />,         MODULE_PERMISSIONS.categories],
  ['/stage',                <StagePage />,              MODULE_PERMISSIONS.stage],
  ['/budget',               <BudgetPage />,             MODULE_PERMISSIONS.budget],
  ['/responsibilities',     <ResponsibilitiesPage />,   MODULE_PERMISSIONS.responsibilities],
  ['/notifications',        <NotificationsPage />,      MODULE_PERMISSIONS.notifications],
  ['/admin',                <AdminPage />,              MODULE_PERMISSIONS.admin],
  ['/whatsapp',             <WhatsAppPage />,           MODULE_PERMISSIONS.whatsapp],
  ['/super-admin/settings', <SuperAdminSettingsPage />, MODULE_PERMISSIONS.superAdminSettings],
  ['/template-config',      <TemplateConfigPage />,      MODULE_PERMISSIONS.templateConfig],
  ['/agenda',               <AgendaPage />,              MODULE_PERMISSIONS.agenda],
];

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LiveProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/student-register" element={STUDENT_REGISTRATION_OPEN ? <PublicStudentFormPage /> : <RegistrationClosedPage title="BK Awards – Scholar Registration" color="#2497d3" />} />
              <Route path="/student-edit/:token" element={<PublicStudentFormPage />} />
              <Route path="/volunteer-register" element={VOLUNTEER_REGISTRATION_OPEN ? <PublicVolunteerFormPage /> : <RegistrationClosedPage title="BK Awards – Volunteer Registration" color="#4caf50" />} />
              <Route path="/anchor-register" element={ANCHOR_REGISTRATION_OPEN ? <PublicAnchorFormPage /> : <RegistrationClosedPage />} />
              <Route path="/anchor-edit/:token" element={<PublicAnchorFormPage />} />
              <Route path="/photo-template" element={<PublicPhotoTemplatePage />} />
              <Route path="/public-invite" element={<PublicInvitationPage />} />
              {protectedPages.map(([path, page, permission]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute permission={permission}>
                      <Layout>{page}</Layout>
                    </ProtectedRoute>
                  }
                />
              ))}
            </Routes>
            <AppUpdatePrompt />
          </BrowserRouter>
        </LiveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
