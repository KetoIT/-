import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { ScreenPage } from './pages/ScreenPage';
import { HubPage } from './pages/HubPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/screen" element={<ScreenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
