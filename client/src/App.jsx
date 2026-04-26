import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CandidatesPage from './pages/CandidatesPage';
import JobsPage from './pages/JobsPage';
import PipelinePage from './pages/PipelinePage';

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Employee goes to candidates, HR goes to dashboard
  return <Navigate to={user.role === 'Employee' ? '/candidates' : '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['HR']}><Dashboard /></ProtectedRoute>
          } />
          <Route path="/candidates" element={
            <ProtectedRoute><CandidatesPage /></ProtectedRoute>
          } />
          <Route path="/jobs" element={
            <ProtectedRoute allowedRoles={['HR']}><JobsPage /></ProtectedRoute>
          } />
          <Route path="/pipeline" element={
            <ProtectedRoute allowedRoles={['HR']}><PipelinePage /></ProtectedRoute>
          } />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
