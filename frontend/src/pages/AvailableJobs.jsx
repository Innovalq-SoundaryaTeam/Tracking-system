import { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';
import '../css/DriverDashboard.css';

function AvailableJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAvailable = async () => {
    try {
      setLoading(true);
      const res = await jobsAPI.getAvailableJobs({ per_page: 1000 });
      const data = res.data;
      const list = Array.isArray(data) ? data : data.jobs || [];
      setJobs(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch available jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailable();
  }, []);

  const assign = async (jobId) => {
    try {
      await jobsAPI.assignJob(jobId);
      await fetchAvailable();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to assign job');
    }
  };

  const getPriorityClass = (priority) => {
    const map = { NORMAL: 'priority-normal', HIGH: 'priority-high', URGENT: 'priority-urgent' };
    return map[priority] || '';
  };

  return (
    <div className="main-content">
      <h1>Available Jobs</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : jobs.length === 0 ? (
          <p className="text-secondary text-center">No jobs available</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Serial #</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Shop</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Flavors & Quantity</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Priority</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                let flavors = [];
                try { flavors = job.flavors ? JSON.parse(job.flavors) : []; } catch {}
                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px' }}>{job.serial_number}</td>
                    <td style={{ padding: '10px' }}>{job.shop_name}</td>
                    <td style={{ padding: '10px' }}>
                      {flavors.length > 0 ? (
                        <div>
                          {flavors.map(f => (
                            <div key={f.id} style={{ fontSize: '13px' }}>
                              {f.name}: <strong>{f.qty}</strong>
                            </div>
                          ))}
                          <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                            Total: <strong>{job.quantity}</strong>
                          </div>
                        </div>
                      ) : (
                        job.quantity
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className={`status-badge ${getPriorityClass(job.priority)}`}>{job.priority}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button className="btn" onClick={() => assign(job.id)}>Assign</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AvailableJobs;
