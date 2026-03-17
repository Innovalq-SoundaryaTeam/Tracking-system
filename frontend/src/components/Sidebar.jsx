import { Link, useLocation } from 'react-router-dom';
import { getUser, clearAuth } from '../services/auth';
import '../css/Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'ADMIN':
        return [
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/jobs', label: 'All Jobs' },
          { path: '/drivers', label: 'Drivers' },
          { path: '/sellers', label: 'Sellers' },
          { path: '/stock', label: 'Stock Management' },
          { path: '/accounts', label: 'Accounts' },
          { path: '/activity-logs', label: 'Activity Logs' },
          { path: '/location', label: 'Location' },
        ];
      case 'SELLER':
        return [
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/create-job', label: 'Create Job' },
          { path: '/my-jobs', label: 'My Jobs' },
        ];
      case 'DRIVER':
        return [
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/available-jobs', label: 'Available Jobs' },
          { path: '/my-assignments', label: 'My Assignments' },
          { path: '/navigation', label: 'Navigation' },
          { path: '/completed-tasks', label: 'Completed Tasks' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="sidebar">
      <div className="mb-20">
        <h3 style={{ color: 'var(--accent)', marginBottom: '5px' }}>
          Tracking System
        </h3>
        <div className="text-secondary" style={{ fontSize: '14px' }}>
          {user?.full_name} ({user?.role})
        </div>
      </div>

      <nav>
        {getNavItems().map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <button onClick={handleLogout} className="btn btn-error" style={{ width: '100%' }}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
