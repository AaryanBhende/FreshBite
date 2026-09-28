import React, { useContext, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AuthModal from "../pages/AuthModal";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <React.Fragment>
      <header className="navbar">
        <h2>
          <Link to="/" className="navbar-brand">
            FreshBite Cafe
          </Link>
        </h2>
        <nav>
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
              <NavLink to="/favorites" className={({ isActive }) => (isActive ? "active" : "")}>
                Menu
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => (isActive ? "active" : "")}>
                Contact
              </NavLink>
            </li>
            {user?.role === "admin" && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
                  Admin Panel
                </NavLink>
              </li>
            )}
            <li className="navbar-auth-item">
              {user ? (
                <div className="navbar-user-info">
                  <span className="navbar-username">
                    <strong>{user.name}</strong>
                  </span>
                  <button className="navbar-logout-btn" onClick={logout}>
                    Log Out
                  </button>
                </div>
              ) : (
                <button className="btn-primary navbar-login-btn" onClick={() => setIsModalOpen(true)}>
                  Log In / Sign Up
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