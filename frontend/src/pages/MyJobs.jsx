import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';

function MyJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await jobsAPI.getMyJobs({ per_page: 1000 });
      setJobs(res.data.jobs || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId, serialNumber) => {
    if (!window.confirm(`Delete job ${serialNumber}? This cannot be undone.`)) return;
    try {
      await jobsAPI.deleteJob(jobId);
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete job');
    }
  };

  const getStatusClass = (status) => {
    const map = {
      WAITING: 'status-waiting',
      ASSIGNED: 'status-assigned',
      PICKED_UP: 'status-picked-up',
      IN_TRANSIT: 'status-in-transit',
      PROOF_UPLOADED: 'status-proof-uploaded',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return map[status] || '';
  };

  const getPriorityClass = (priority) => {
    const map = {
      NORMAL: 'priority-normal',
      HIGH: 'priority-high',
      URGENT: 'priority-urgent',
    };
    return map[priority] || '';
  };

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div className="main-content">
      <div className="flex-between mb-10">
        <h1>My Jobs</h1>
        <button className="btn" onClick={() => navigate('/create-job')}>
          + Create New Job
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {jobs.length === 0 ? (
          <p className="text-secondary text-center" style={{ padding: '30px' }}>
            No jobs found. Create your first job!
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f9fafb)', borderBottom: '2px solid var(--border)' }}>
                  <th style={th}>Serial #</th>
                  <th style={th}>Shop Name</th>
                  <th style={th}>Contact</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Payment</th>
                  <th style={th}>Priority</th>
                  <th style={th}>Status</th>
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={td}><strong>{job.serial_number}</strong></td>
                    <td style={td}>{job.shop_name}</td>
                    <td style={td}>{job.shop_contact}</td>
                    <td style={td}>{job.quantity}</td>
                    <td style={td}>₹{job.total_price}</td>
                    <td style={td}>
                      <span style={{ fontSize: '12px' }}>{job.payment_mode}</span>
                      <br />
                      <span style={{ fontSize: '11px', color: job.payment_status === 'PAID' || job.payment_status === 'RECEIVED' ? 'green' : '#f97316' }}>
                        {job.payment_status}
                      </span>
                    </td>
                    <td style={td}>
                      <span className={`status-badge ${getPriorityClass(job.priority)}`}>
                        {job.priority}
                      </span>
                    </td>
                    <td style={td}>
                      <span className={`status-badge ${getStatusClass(job.status)}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={td}>{new Date(job.created_at).toLocaleDateString()}</td>
                    <td style={td}>
                      {job.status === 'WAITING' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            onClick={() => navigate(`/edit-job/${job.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '4px 12px', fontSize: '12px', background: '#dc2626', color: 'white', border: 'none' }}
                            onClick={() => handleDelete(job.id, job.serial_number)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>—</span>
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
  );
}

const th = {
  padding: '12px 14px',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '13px',
  color: 'var(--text-secondary, #6b7280)',
  whiteSpace: 'nowrap',
};

const td = {
  padding: '12px 14px',
  fontSize: '13px',
  verticalAlign: 'middle',
};

export default MyJobs;
