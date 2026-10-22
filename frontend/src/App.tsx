import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Nav } from './components/layout/Nav';
import { Assistant } from './components/layout/Assistant';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { DesignSystem } from './pages/DesignSystem';

// Candidate pages
import { CandidateHome } from './pages/candidate/CandidateHome';
import { Applications } from './pages/candidate/Applications';
import { Jobs } from './pages/candidate/Jobs';
import { JobDetail } from './pages/candidate/JobDetail';
import { Report } from './pages/candidate/Report';
import { Certificates } from './pages/candidate/Certificates';
import { Profiles } from './pages/candidate/Profiles';
import { NotificationsPage } from './pages/candidate/NotificationsPage';
import { NotificationSettings } from './pages/candidate/NotificationSettings';
import { Dashboard } from './pages/candidate/Dashboard';

// Recruiter pages
import { RecruiterHome } from './pages/recruiter/RecruiterHome';
import { AllApplications } from './pages/recruiter/AllApplications';
import { CreateJob } from './pages/recruiter/CreateJob';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Applicants } from './pages/recruiter/Applicants';
import { Duplicates } from './pages/recruiter/Duplicates';

function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Nav />
      <div className="app-main-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      {user?.role === 'candidate' && <Assistant />}
    </div>
  );
}

function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={user.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes without main app nav */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Application routes with shared Nav & Assistant */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<RoleHomeRedirect />} />

              {/* Candidate Routes */}
              <Route
                path="/candidate"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <CandidateHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/dashboard"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/applications"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Applications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/jobs"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Jobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/jobs/:id"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <JobDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/jobs/:id/report"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Report />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/certificates"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Certificates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/profiles"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <Profiles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/notifications"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/settings"
                element={
                  <ProtectedRoute allowedRole="candidate">
                    <NotificationSettings />
                  </ProtectedRoute>
                }
              />

              {/* Recruiter Routes */}
              <Route
                path="/recruiter"
                element={
                  <ProtectedRoute allowedRole="recruiter">
                    <RecruiterHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/applications"
                element={
                  <ProtectedRoute allowedRole="recruiter">
                    <AllApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/jobs/new"
                element={
                  <ProtectedRoute allowedRole="recruiter">
                    <CreateJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/jobs/:id/applicants"
                element={
                  <ProtectedRoute allowedRole="recruiter">
                    <Applicants />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter/jobs/:id/duplicates"
                element={
                  <ProtectedRoute allowedRole="recruiter">
                    <Duplicates />
                  </ProtectedRoute>
                }
              />

              {/* Design system showcase */}
              <Route
                path="/system"
                element={
                  <ProtectedRoute>
                    <DesignSystem />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
