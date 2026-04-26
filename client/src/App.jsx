import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CandidatesPage from './pages/CandidatesPage';
import JobsPage from './pages/JobsPage';
import PipelinePage from './pages/PipelinePage';
import AdminPage from './pages/AdminPage';

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'Employee' ? '/candidates' : '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
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
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['HR']}><AdminPage /></ProtectedRoute>
          } />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
