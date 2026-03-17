import { useState, useEffect } from 'react';
import { jobsAPI, driverRatingsAPI } from '../services/api';
import '../css/DriverDashboard.css';

function DriverDashboard() {
  const [stats, setStats] = useState({
    availableJobs: 0,
    assignedJobs: 0,
    inTransitJobs: 0,
    completedJobs: 0,
    averageRating: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [newJobAlerts, setNewJobAlerts] = useState([]);
  const [milestoneReminders, setMilestoneReminders] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenAlerts, setSeenAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('driver_seen_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);

      const results = await Promise.allSettled([
        jobsAPI.getAvailableJobs({ per_page: 100 }),
        jobsAPI.getMyJobs({ per_page: 10 }),
        driverRatingsAPI.getMyPerformance(),
        jobsAPI.getAssignmentAlerts(),
      ]);

      const availableData = results[0].status === 'fulfilled' ? results[0].value.data : {};
      const myJobsData = results[1].status === 'fulfilled' ? results[1].value.data : {};
      const ratingsData = results[2].status === 'fulfilled' ? results[2].value.data : [];
      const alertsData = results[3].status === 'fulfilled' ? results[3].value.data : {};

      const availableJobs = Array.isArray(availableData) ? availableData : (availableData.jobs || []);
      const myJobs = Array.isArray(myJobsData) ? myJobsData : (myJobsData.jobs || []);
      const ratings = Array.isArray(ratingsData) ? ratingsData : [];

      const newJobList = Array.isArray(alertsData.new_job_alerts) ? alertsData.new_job_alerts : [];
      const reminderList = Array.isArray(alertsData.driver_milestone_reminders) ? alertsData.driver_milestone_reminders : [];
      setNewJobAlerts(newJobList);
      setMilestoneReminders(reminderList);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
          : 0;

      setStats({
        availableJobs: availableJobs.length,
        assignedJobs: myJobs.filter((job) => job.status === 'ASSIGNED').length,
        inTransitJobs: myJobs.filter((job) => job.status === 'IN_TRANSIT').length,
        completedJobs: myJobs.filter((job) => job.status === 'COMPLETED').length,
        averageRating: averageRating.toFixed(1),
      });

      const sortedRecent = [...myJobs].sort((a, b) => {
        const ta = new Date(a.assigned_at || a.created_at || 0).getTime();
        const tb = new Date(b.assigned_at || b.created_at || 0).getTime();
        return tb - ta;
      });
      setRecentJobs(sortedRecent.slice(0, 5));
    } catch (error) {
      console.error('Error fetching driver dashboard:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(false), 2000);
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

  const popupAlerts = [
    ...newJobAlerts.map((a) => ({
      key: `new-${a.job_id}`,
      text: `New job available: ${a.serial_number} (${a.shop_name})`,
    })),
    ...milestoneReminders.map((a) => ({
      key: `milestone-${a.job_id}-${a.reminder_type}`,
      text: `Reminder ${a.reminder_type.replace('_', ' ')}: Take job ${a.serial_number} within 48 hours.`,
    })),
  ];

  const seenKeys = seenAlerts.map((a) => a.key);
  const unseenAlerts = popupAlerts.filter((a) => !seenKeys.includes(a.key));
  const totalNotifications = unseenAlerts.length;

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

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
    localStorage.setItem('driver_seen_alerts', JSON.stringify(seenAlerts));
  }, [seenAlerts]);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="main-content">
      <h1>Driver Dashboard</h1>

      <button
        className={`notification-btn ${totalNotifications > 0 ? 'has-alert' : ''}`}
        onClick={handleOpenNotifications}
        type="button"
        title="Notifications"
        aria-label="Notifications"
      >
        <span aria-hidden="true">🔔</span>
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

  <p style={{ fontSize: '12px', opacity: 0.6 }}>Live updating every 2 seconds...</p>

      <div className="grid grid-3">
        <div className="card">
          <h3>Available Jobs</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.availableJobs}</div>
        </div>
        <div className="card">
          <h3>Assigned</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.assignedJobs}</div>
        </div>
        <div className="card">
          <h3>In Transit</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.inTransitJobs}</div>
        </div>
        <div className="card">
          <h3>Completed</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.completedJobs}</div>
        </div>
        <div className="card">
          <h3>Average Rating</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.averageRating}</div>
        </div>
      </div>

      <div className="mt-20">
        <div className="flex-between mb-10">
          <h2>My Recent Assignments</h2>
          <button className="btn" onClick={() => { window.location.href = '/available-jobs'; }}>
            View Available Jobs
          </button>
        </div>

        <div className="card">
          {recentJobs.length === 0 ? (
            <p className="text-secondary text-center">No assignments found</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Serial #</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Shop</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Priority</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
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

export default DriverDashboard;
