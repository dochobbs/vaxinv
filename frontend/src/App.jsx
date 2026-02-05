import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReceiveInventory from './pages/ReceiveInventory';
import AdministerDose from './pages/AdministerDose';
import Adjustments from './pages/Adjustments';
import TemperatureLog from './pages/TemperatureLog';
import Reports from './pages/Reports';
import AdminUsers from './pages/admin/Users';
import AdminVaccines from './pages/admin/Vaccines';
import AdminLocations from './pages/admin/Locations';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="receive" element={<ReceiveInventory />} />
        <Route path="administer" element={<AdministerDose />} />
        <Route path="adjustments" element={<Adjustments />} />
        <Route path="temperature" element={<TemperatureLog />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="admin/vaccines" element={<AdminRoute><AdminVaccines /></AdminRoute>} />
        <Route path="admin/locations" element={<AdminRoute><AdminLocations /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
