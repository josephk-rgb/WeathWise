import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Goals from './pages/Goals';
import Portfolio from './pages/Portfolio';
import Debt from './pages/Debt';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Import from './pages/Import';
import TalkToFinances from './pages/TalkToFinances';

function App() {
  const { user, darkMode } = useStore();

  if (!user) {
    return <Login />;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/debt" element={<Debt />} />
            <Route path="/import" element={<Import />} />
            <Route path="/talk-to-finances" element={<TalkToFinances />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App;