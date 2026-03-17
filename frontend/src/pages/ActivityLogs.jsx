import React, { useEffect, useState } from 'react';
import '../css/ActivityLogs.css';
import { activityLogsAPI } from '../services/api';
import { getUser } from '../services/auth';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUser();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const isAdmin = user?.role === 'ADMIN';
      const res = isAdmin ? await activityLogsAPI.getActivityLogs({ per_page: 50 }) : await activityLogsAPI.getMyActivityLogs({ per_page: 50 });
      const data = Array.isArray(res.data) ? res.data : [];
      setLogs(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="page-container">
      <h2>System Activity</h2>
      {error && <div className="error">{error}</div>}
      <div className="log-timeline">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-secondary">No activity found</div>
        ) : (
          logs.map((log) => (
            <div className="log-item" key={log.id}>
              <span className="time">{formatTime(log.created_at)}</span>
              <p>
                <strong>{log.user?.full_name || `User #${log.user_id}`}</strong>
                {log.user?.phone ? ` (${log.user.phone})` : ''} {log.action}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
