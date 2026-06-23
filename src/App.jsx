import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import ProtectedRoute from './components/Layout/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GameLogPage from './pages/GameLogPage';
import OCRUploadPage from './pages/OCRUploadPage';
import PlayerStatsPage from './pages/PlayerStatsPage';
import HeroPoolPage from './pages/HeroPoolPage';
import TeamCompsPage from './pages/TeamCompsPage';
import PlayersManagePage from './pages/PlayersManagePage';
import SettingsPage from './pages/SettingsPage';
import AdminPortalPage from './pages/AdminPortalPage';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="log" element={<GameLogPage />} />
        <Route path="ocr" element={<OCRUploadPage />} />
        <Route path="players" element={<PlayerStatsPage />} />
        <Route path="heroes" element={<HeroPoolPage />} />
        <Route path="comps" element={<TeamCompsPage />} />
        <Route path="manage" element={<PlayersManagePage />} />
        <Route path="admin" element={<AdminPortalPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<div className="text-center py-20 text-xl text-gray-400">Page under construction</div>} />
      </Route>
    </Routes>
  );
}

export default App;
