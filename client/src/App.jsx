import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkItemsPage } from './pages/WorkItemsPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { CreateWorkItemPage } from './pages/CreateWorkItemPage';
import { EditWorkItemPage } from './pages/EditWorkItemPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TeamsPage } from './pages/TeamsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

function ProtectedLayout() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-xs text-slate-500">
        Authenticating operational session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/work-items" element={<WorkItemsPage />} />
            <Route path="/my-work" element={<WorkItemsPage presetAssignee={user?._id || user?.id} />} />
            <Route path="/team-work" element={<WorkItemsPage presetTeamOnly={true} />} />
            <Route path="/work-items/new" element={<CreateWorkItemPage />} />
            <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
            <Route path="/work-items/:id/edit" element={<EditWorkItemPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/simulation-lab" element={<SimulationLabPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
