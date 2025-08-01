import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import Class from './components/Class'; // Import the Class component
import Notes from './components/Notes'; // Import the Notes component 
import Payments from './components/Payments';
import Sidebar from './components/parts/Sidebar';
import Classbar from './components/parts/Classbar'; // Import the Sidebar component
import { AuthProvider, useAuth } from './context/AuthContext';
import Chat from './components/Chat';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};
function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="flex">
                  {/* <Sidebar /> */}
                  <div className="flex-1">
                    <Dashboard />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:batchId"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Classbar /> {/* Assuming Classbar is used for Class pages */}
                  <div className="flex-1">
                    <Class />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:batchId/resources"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Classbar />
                  <div className="flex-1">
                    <Notes />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:batchId/chat"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Classbar />
                  <div className="flex-1">
                    <Chat />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Sidebar />
                  <div className="flex-1">
                    <Payments />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;