import React, { useContext, useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AuthModal from "../pages/AuthModal";

export default function Navbar() {
  const { user, token, logout } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kitchenOrderCount, setKitchenOrderCount] = useState(0);
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isDriver = user?.role === "driver";
  const isKitchen = user?.role === "kitchen";

  const closeMenu = () => setMenuOpen(false);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock page scroll while drawer is open, close on Esc / when resized to desktop
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    const onResize = () => window.innerWidth > 768 && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (user?.role !== "admin" || !token) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);

    const handleReadStateChange = () => {
      fetchUnreadCount();
    };
    window.addEventListener("adminReadMessagesUpdated", handleReadStateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("adminReadMessagesUpdated", handleReadStateChange);
    };
  }, [user, token]);

  useEffect(() => {
    if (!isKitchen || !token) return;
    const loadKitchenCount = async () => {
      try {
        const response = await fetch('/api/kds/orders', { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) setKitchenOrderCount((await response.json()).orders?.length || 0);
      } catch { /* The dashboard displays its own connection state. */ }
    };
    loadKitchenCount();
    const interval = setInterval(loadKitchenCount, 5000);
    return () => clearInterval(interval);
  }, [isKitchen, token]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/contact/mailtrap", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const messages = await res.json();

      let readMessageIds = [];
      try {
        const saved = localStorage.getItem("admin_read_msg_ids");
        readMessageIds = saved ? JSON.parse(saved) : [];
      } catch {
        readMessageIds = [];
      }

      const unreadMsgs = messages.filter((m) => !readMessageIds.includes(m.id));
      setUnreadCount(unreadMsgs.length);
    } catch (err) {
      console.error("Failed to fetch unread count in Navbar:", err);
    }
  };

  return (
    <React.Fragment>
      <header className={`navbar${isDriver || isKitchen ? " navbar-driver" : ""}`}>
        <h2 className="navbar-title">
          <Link to={isAdmin ? "/admin" : isDriver ? "/driver" : isKitchen ? "/kitchen" : "/"} className="navbar-brand">
            <img
              className="navbar-logo"
              src="/assets/images/logo.jpg"
              alt="FreshBite Logo"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/45x45/2e7d32/ffffff?text=FB";
              }}
            />
            <span>FreshBite Cafe</span>
          </Link>
        </h2>

        {/* Hamburger (mobile only) */}
        <button
          type="button"
          className={`navbar-toggle${menuOpen ? " open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Dimmed backdrop behind drawer */}
        <div
          className={`navbar-backdrop${menuOpen ? " show" : ""}`}
          onClick={closeMenu}
          aria-hidden="true"
        />

        <nav id="main-nav" className={menuOpen ? "open" : ""}>
          <ul className="navbar-links">
            {isKitchen && <li className="driver-portal-badge"><NavLink to="/kitchen" end className={({ isActive }) => isActive ? 'active' : ''}>Kitchen · {kitchenOrderCount} active</NavLink></li>}
            {isKitchen && <li><NavLink to="/kitchen/history" className={({ isActive }) => isActive ? 'active' : ''}>History</NavLink></li>}
            {!isAdmin && !isDriver && !isKitchen && <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
                Home
              </NavLink>
            </li>}
            {!isAdmin && !isDriver && !isKitchen && <li>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "")}>
                About
              </NavLink>
            </li>}
            {!isAdmin && !isDriver && !isKitchen && <li>
              <NavLink to="/menu" className={({ isActive }) => (isActive ? "active" : "")}>
                Menu
              </NavLink>
            </li>}
            {!isAdmin && !isDriver && !isKitchen && <li>
              <NavLink to="/contact" className={({ isActive }) => (isActive ? "active" : "")}>
                Contact
              </NavLink>
            </li>}
            {!isAdmin && !isDriver && !isKitchen && <li>
              <NavLink to="/reservations" className={({ isActive }) => (isActive ? "active" : "")}>
                Reservations
              </NavLink>
            </li>}

            {isAdmin && <>
              <li><NavLink to="/admin" end className={({ isActive }) => isActive ? "active" : ""}>📋 Dashboard</NavLink></li>
              <li><NavLink to="/admin/operations" className={({ isActive }) => isActive ? "active" : ""}>⚡ Operations</NavLink></li>
              <li><NavLink to="/admin/marketing" className={({ isActive }) => isActive ? "active" : ""}>📢 Marketing</NavLink></li>
              <li><NavLink to="/admin/management" className={({ isActive }) => isActive ? "active" : ""}>🛠️ Management</NavLink></li>
            </>}

            {isDriver && <li className="driver-portal-badge"><NavLink to="/driver" end className={({ isActive }) => isActive ? "active" : ""}>Assigned Deliveries</NavLink></li>}

            <li className={`navbar-auth-item${isAdmin || isDriver ? " navbar-admin-auth-item" : ""}`}>
              {user ? (
                <div className="navbar-user-info">
                  {isAdmin || isDriver || isKitchen ? <strong className="navbar-username">{user.name}</strong> : (
                    <NavLink to="/profile" className="navbar-username" onClick={closeMenu} title="My Profile">
                      <strong>{user.name}</strong>
                    </NavLink>
                  )}
                  <button
                    className="navbar-logout-btn"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  className="btn-primary navbar-login-btn"
                  onClick={() => {
                    closeMenu();
                    setIsModalOpen(true);
                  }}
                >
                  Log In/Sign Up
                </button>
              )}
            </li>
          </ul>
        </nav>
      </header>


      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </React.Fragment>
  );
}
