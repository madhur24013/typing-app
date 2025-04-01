import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import Navbar from './components/layout/Navbar';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/routes/ProtectedRoute';

// Dashboard Components
import Dashboard from './components/dashboard/Dashboard';

// Document Components
import DocumentList from './components/documents/DocumentList';
import DocumentUpload from './components/documents/DocumentUpload';

// Practice Component
import TypingPractice from './components/practice/TypingPractice';

// Statistics Component
import Statistics from './components/statistics/Statistics';

// Progress Components
import Progress from './components/progress/Progress';

// Streak Components
import StreakDashboard from './components/streaks/StreakDashboard';

// Import CSS
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/documents" element={<DocumentList />} />
              <Route path="/documents/upload" element={<DocumentUpload />} />
              <Route path="/practice/:documentId" element={<TypingPractice />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/streaks" element={<StreakDashboard />} />
            </Route>
            
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 