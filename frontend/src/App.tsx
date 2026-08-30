import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import IncidentList from './pages/IncidentList';
import IncidentForm from './pages/IncidentForm';
import IncidentDetail from './pages/IncidentDetail';
import MyReportedIncidents from './pages/MyReportedIncidents';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import RiskTopicManagement from './pages/RiskTopicManagement';
import NrlsManagement from './pages/NrlsManagement';
import RiskMapping from './pages/RiskMapping';
import ProgramsManagement from './pages/ProgramsManagement';
import TelegramSettings from './pages/TelegramSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import TriggerToolReview from './pages/TriggerToolReview';
import RcaList from './pages/rca/RcaList';
import ConciseRcaForm from './pages/rca/ConciseRcaForm';
import StandardRcaForm from './pages/rca/StandardRcaForm';
import PersonnelManagement from './pages/PersonnelManagement';
import IndividualReportStats from './pages/IndividualReportStats';
import TeamRiskWorkspace from './pages/TeamRiskWorkspace';
import CapaWorkspace from './pages/CapaWorkspace';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.require_password_change) {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={user?.require_password_change ? '/change-password' : '/dashboard'} replace />;
  }
  return <Login />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function IncidentManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const canManage = isAdmin
    || user?.role === 'rm_committee'
    || user?.role === 'head';
  if (!canManage) return <Navigate to="/incidents/dept" replace />;
  return <>{children}</>;
}

function TeamRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  if (!isAdmin && !user?.teamId) return <Navigate to="/incidents/dept" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidents" element={<Navigate to="/incidents/dept" replace />} />
            <Route path="incidents/pending" element={<IncidentManagerRoute><IncidentList mode="pending" defaultTab="รายงาน" /></IncidentManagerRoute>} />
            <Route path="incidents/dept" element={<IncidentList mode="dept" />} />
            <Route path="incidents/team" element={<TeamRoute><TeamRiskWorkspace /></TeamRoute>} />
            <Route path="incidents/new" element={<IncidentForm />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="incidents/:id/edit" element={<Navigate to=".." replace />} />
            <Route path="my-reported" element={<MyReportedIncidents />} />
            
            {/* Trigger Tool & RCA Program Routes */}
            <Route path="trigger-tool" element={<TriggerToolReview />} />
            <Route path="rca" element={<Navigate to="/rca/list" replace />} />
            <Route path="rca/list" element={<RcaList />} />
            <Route path="rca/concise" element={<ConciseRcaForm />} />
            <Route path="rca/standard/:id" element={<StandardRcaForm />} />
            <Route path="capa" element={<CapaWorkspace />} />

            <Route path="reports" element={<Reports />} />
            <Route path="reporting-stats" element={<IndividualReportStats />} />
            <Route path="individual-stats" element={<Navigate to="/reporting-stats" replace />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="personnel" element={<AdminRoute><PersonnelManagement /></AdminRoute>} />
            <Route path="risk-topics" element={<AdminRoute><RiskTopicManagement /></AdminRoute>} />
            <Route path="nrls-topics" element={<AdminRoute><NrlsManagement /></AdminRoute>} />
            <Route path="risk-mapping" element={<AdminRoute><RiskMapping /></AdminRoute>} />
            <Route path="programs" element={<AdminRoute><ProgramsManagement /></AdminRoute>} />
            <Route path="telegram-settings" element={<AdminRoute><TelegramSettings /></AdminRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
