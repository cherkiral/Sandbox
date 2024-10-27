import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import { AuthContext, AuthProvider } from './context/AuthContext';
import './App.css'; // Assuming global styles are in App.css
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  const { authToken } = useContext(AuthContext);

  return (
    <div className="app-container">  {/* Apply your background styles here */}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={authToken ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </div>
  );
};

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
