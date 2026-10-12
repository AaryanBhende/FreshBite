import React, { useContext, useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AuthModal from "../pages/AuthModal";

export default function Navbar() {
  const { user, token, logout } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
      <header className="navbar">
        <h2 className="navbar-title">
          <Link to="/" className="navbar-brand">
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
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "")}>
                About
              </NavLink>
            </li>
            <li>
              <NavLink to="/menu" className={({ isActive }) => (isActive ? "active" : "")}>
                Menu
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => (isActive ? "active" : "")}>
                Contact
              </NavLink>
            </li>
            <li>
              <NavLink to="/reservations" className={({ isActive }) => (isActive ? "active" : "")}>
                Reservations
              </NavLink>
            </li>

            {user?.role === "admin" && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `navbar-admin-link${isActive ? " active" : ""}`
                  }
                >
                  Admin Panel
                  {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
                </NavLink>
              </li>
            )}

            <li className="navbar-auth-item">
              {user ? (
                <div className="navbar-user-info">
                  <NavLink
                    to="/profile"
                    className="navbar-username"
                    onClick={closeMenu}
                    title="My Profile"
                  >
                    <strong>{user.name}</strong>
                  </NavLink>
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
