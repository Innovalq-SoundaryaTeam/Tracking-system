import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import '../css/SellerDashboard.css';

function SellerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalJobs: 0,
    waitingJobs: 0,
    inTransitJobs: 0,
    completedJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [sellerAcceptanceAlerts, setSellerAcceptanceAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenAlerts, setSeenAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('seller_seen_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);

      const [jobsResponse, alertsResponse] = await Promise.all([
        jobsAPI.getMyJobs({ per_page: 10 }),
        jobsAPI.getAssignmentAlerts(),
      ]);

      const jobs = jobsResponse.data.jobs || [];
      setSellerAcceptanceAlerts(Array.isArray(alertsResponse.data.seller_acceptance_alerts) ? alertsResponse.data.seller_acceptance_alerts : []);

      setStats({
        totalJobs: jobsResponse.data.total || jobs.length,
        waitingJobs: jobs.filter((job) => job.status === 'WAITING').length,
        inTransitJobs: jobs.filter((job) => job.status === 'IN_TRANSIT').length,
        completedJobs: jobs.filter((job) => job.status === 'COMPLETED').length,
      });
      setRecentJobs(jobs);
    } catch (error) {
      console.error('Seller dashboard error:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusClass = (status) => {
    const statusMap = {
      WAITING: 'status-waiting',
      ASSIGNED: 'status-assigned',
      PICKED_UP: 'status-picked-up',
      IN_TRANSIT: 'status-in-transit',
      PROOF_UPLOADED: 'status-proof-uploaded',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return statusMap[status] || '';
  };

  const getPriorityClass = (priority) => {
    const priorityMap = {
      NORMAL: 'priority-normal',
      HIGH: 'priority-high',
      URGENT: 'priority-urgent',
    };
    return priorityMap[priority] || '';
  };

  const popupAlerts = sellerAcceptanceAlerts.map((a) => ({
    key: `accept-${a.job_id}-${a.assigned_minutes_ago}`,
    text: `Driver accepted your job ${a.serial_number}.`,
  }));
  const seenKeys = seenAlerts.map((a) => a.key);
  const unseenAlerts = popupAlerts.filter((a) => !seenKeys.includes(a.key));
  const totalNotifications = unseenAlerts.length;

  const handleOpenNotifications = () => setShowNotifications(true);
  const handleSeenAndClose = () => {
    const newlySeen = unseenAlerts.map((a) => ({
      key: a.key,
      text: a.text,
      seen_at: new Date().toISOString(),
    }));
    if (newlySeen.length > 0) {
      setSeenAlerts((prev) => {
        const filtered = prev.filter((p) => !newlySeen.some((n) => n.key === p.key));
        return [...newlySeen, ...filtered];
      });
    }
    setShowNotifications(false);
  };

  useEffect(() => {
    localStorage.setItem('seller_seen_alerts', JSON.stringify(seenAlerts));
  }, [seenAlerts]);

  const handleDelete = async (jobId, serialNumber) => {
    if (!window.confirm(`Delete job ${serialNumber}? This cannot be undone.`)) return;
    try {
      await jobsAPI.deleteJob(jobId);
      fetchDashboardData(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete job');
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="main-content seller-dashboard">
      <h1>Seller Dashboard</h1>

      <button
        className={`notification-btn ${totalNotifications > 0 ? 'has-alert' : ''}`}
        onClick={handleOpenNotifications}
        type="button"
        title="Notifications"
        aria-label="Notifications"
      >
        <span aria-hidden="true">{"\uD83D\uDD14"}</span>
        {totalNotifications > 0 && (
          <span className="notification-badge">{totalNotifications}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal">
            <h3>Notifications</h3>
            {unseenAlerts.length > 0 ? (
              <ul className="notif-list">
                {unseenAlerts.map((item) => (
                  <li key={item.key}>{item.text}</li>
                ))}
              </ul>
            ) : seenAlerts.length > 0 ? (
              <>
                <p className="text-secondary">Seen History</p>
                <ul className="notif-list">
                  {seenAlerts.slice(0, 10).map((item) => (
                    <li key={item.key}>{item.text}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-secondary">No notifications.</p>
            )}
            <div className="notif-actions">
              <button className="btn" onClick={handleSeenAndClose}>
                {unseenAlerts.length > 0 ? 'Mark as Seen' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3>Total Jobs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.totalJobs}</div>
        </div>
        <div className="card">
          <h3>Completed Jobs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.completedJobs}</div>
        </div>
      </div>

      <div className="mt-20">
        <div className="flex-between mb-10">
          <h2>Recent Jobs</h2>
          <button className="btn" onClick={() => { window.location.href = '/create-job'; }}>
            Create New Job
          </button>
        </div>

        <div className="card">
          {recentJobs.length === 0 ? (
            <p className="text-secondary text-center">No jobs found</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Serial #</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Shop Name</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Priority</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px' }}>{job.serial_number}</td>
                      <td style={{ padding: '10px' }}>{job.shop_name}</td>
                      <td style={{ padding: '10px' }}>{job.quantity}</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`status-badge ${getPriorityClass(job.priority)}`}>{job.priority}</span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`status-badge ${getStatusClass(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{new Date(job.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px' }}>
                        {job.status === 'WAITING' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => navigate(`/edit-job/${job.id}`)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn"
                              style={{ padding: '4px 10px', fontSize: '12px', background: '#dc2626' }}
                              onClick={() => handleDelete(job.id, job.serial_number)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerDashboard;
