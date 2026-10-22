import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon, Logo } from '../ui';
import { NotificationBell } from './NotificationBell';

export const Nav = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = user?.role || 'candidate';

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'HL';

  const displayName = user?.name ? user.name.toUpperCase() : 'USER';
  const roleLabel = role === 'candidate' ? 'CANDIDATE' : 'RECRUITER';

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const handleLogout = () => {
    signOut();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="portal-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="menu-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
            title="Toggle sidebar"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="topbar-branding">
            <Logo className="portal-logo" />
            <span className="topbar-title-divider">|</span>
            <span className="topbar-subtext">Smart Resume Screener</span>
          </div>
        </div>

        <div className="topbar-right" ref={menuRef}>
          <button
            type="button"
            className="user-badge-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="User profile options"
          >
            <div className="user-avatar-circle">{initials}</div>
            <span className="user-identity-text">
              {displayName} <span className="user-role-tag">[{roleLabel}]</span>
            </span>
            <Icon name="chevron" size={14} />
          </button>

          <NotificationBell />

          {menuOpen && (
            <div className="avatar-menu portal-menu-dropdown" role="menu">
              <strong>{user?.name || 'Account'}</strong>
              <small>{user?.email || ''}</small>
              {user?.company && <small className="company-tag">{user.company}</small>}
              {role === 'candidate' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/candidate/notifications');
                    }}
                  >
                    Notifications
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/candidate/settings');
                    }}
                  >
                    Notification settings
                  </button>
                </>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/system');
                }}
              >
                Design system
              </button>
              <button type="button" role="menuitem" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Left Sidebar Toolbar (links stacked vertically one below another) */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`} aria-label="Main Navigation">
        <div className="sidebar-header-label">PORTAL NAVIGATION</div>

        <nav className="sidebar-links-list">
          {role === 'candidate' ? (
            <>
              <NavLink
                to="/candidate"
                end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="user" size={19} />
                </span>
                <span className="sidebar-item-label">My Profile / Overview</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/candidate/dashboard"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="sliders" size={19} />
                </span>
                <span className="sidebar-item-label">Dashboard & Analytics</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/candidate/profiles"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="code" size={19} />
                </span>
                <span className="sidebar-item-label">Profiles & Stats</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/candidate/applications"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="file" size={19} />
                </span>
                <span className="sidebar-item-label">Applications</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/candidate/jobs"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="briefcase" size={19} />
                </span>
                <span className="sidebar-item-label">Course / Job Openings</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/candidate/certificates"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="shield" size={19} />
                </span>
                <span className="sidebar-item-label">My Proof & Certificates</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/recruiter"
                end
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="user" size={19} />
                </span>
                <span className="sidebar-item-label">Recruiter Overview</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/recruiter/applications"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="file" size={19} />
                </span>
                <span className="sidebar-item-label">All Applications</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>

              <NavLink
                to="/recruiter/jobs/new"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon name="plus" size={19} />
                </span>
                <span className="sidebar-item-label">Post New Role</span>
                <span className="sidebar-item-arrow">›</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-bottom-actions">
          <button type="button" className="sidebar-signout-btn" onClick={handleLogout}>
            <Icon name="back" size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
