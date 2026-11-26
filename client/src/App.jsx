import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Favorites from './pages/Favorites';
import Menu from './pages/Menu';
import Contact from './pages/Contact';
import AdminMenu from './pages/AdminMenu';
import Profile from './pages/Profile';
import OrderTracker from './pages/OrderTracker';
import Reservations from './pages/Reservations';
import GlobalDeliveryNotification from './components/GlobalDeliveryNotification';
import DriverDashboard from './pages/DriverDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import KitchenHistory from './pages/KitchenHistory';

export default function App() {
  return (
    <AuthProvider basename={import.meta.env.BASE_URL}>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function CustomerRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user?.role === 'admin' ? <Navigate to="/admin" replace /> : user?.role === 'driver' ? <Navigate to="/driver" replace /> : user?.role === 'kitchen' ? <Navigate to="/kitchen" replace /> : children;
}

function DriverRoute() {
  const { user } = useContext(AuthContext);
  return user?.role === 'driver' ? <DriverDashboard /> : <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
}

function KitchenRoute() {
  const { user } = useContext(AuthContext);
  return user?.role === 'kitchen' || user?.role === 'admin' ? <KitchenDashboard /> : <Navigate to={user?.role === 'driver' ? '/driver' : '/'} replace />;
}

function KitchenHistoryRoute() {
  const { user } = useContext(AuthContext);
  return user?.role === 'kitchen' ? <KitchenHistory /> : <Navigate to={user?.role === 'admin' ? '/admin' : user?.role === 'driver' ? '/driver' : '/'} replace />;
}

function AppContent() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';
  const isKitchen = user?.role === 'kitchen';

  return (
    <div className="app-container">
      <Navbar />
      {!isAdmin && !isDriver && !isKitchen && <GlobalDeliveryNotification />}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
          <Route path="/about" element={<CustomerRoute><About /></CustomerRoute>} />
          <Route path="/favorites" element={<CustomerRoute><Favorites /></CustomerRoute>} />
          <Route path="/menu" element={<CustomerRoute><Menu /></CustomerRoute>} />
          <Route path="/contact" element={<CustomerRoute><Contact /></CustomerRoute>} />
          <Route path="/reservations" element={<CustomerRoute><Reservations /></CustomerRoute>} />
          <Route path="/admin" element={<AdminMenu />} />
          <Route path="/driver" element={<DriverRoute />} />
          <Route path="/kitchen" element={<KitchenRoute />} />
          <Route path="/kitchen/history" element={<KitchenHistoryRoute />} />
          <Route path="/admin/operations" element={<AdminMenu />} />
          <Route path="/admin/marketing" element={<AdminMenu />} />
          <Route path="/admin/management" element={<AdminMenu />} />
          <Route path="/profile" element={<CustomerRoute><Profile /></CustomerRoute>} />
          <Route path="/track/:orderId" element={<CustomerRoute><OrderTracker /></CustomerRoute>} />
        </Routes>
      </div>
      {!isAdmin && !isDriver && !isKitchen && <Footer />}
    </div>
  );
}
