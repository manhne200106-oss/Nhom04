import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import MeetingMinutes from './pages/MeetingMinutes';
import AIChatbot from './pages/AIChatbot';
import './api'; // Initialize API client & interceptors

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
    setCurrentProjectId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium text-sm">
        Đang khởi tạo TaskMaster AI...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            setCurrentPage={setCurrentPage}
          />
        );
      case 'kanban':
        return <Kanban currentProjectId={currentProjectId} />;
      case 'meeting':
        return <MeetingMinutes currentProjectId={currentProjectId} />;
      case 'chatbot':
        return <AIChatbot currentProjectId={currentProjectId} />;
      default:
        return (
          <Dashboard
            user={user}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            setCurrentPage={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
