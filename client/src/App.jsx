import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminMenu />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/track/:orderId" element={<OrderTracker />} />
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  );
}