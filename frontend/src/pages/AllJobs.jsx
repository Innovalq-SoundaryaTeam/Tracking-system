import { useEffect, useState } from "react";
import api from "../services/api";
import "../css/Alljobs.css";

export default function AllJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get("/jobs/all?page=1&per_page=1000");
      setJobs(res.data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return `badge status-${status.toLowerCase()}`;
  };

  const getPriorityClass = (priority) => {
    return `badge priority-${priority.toLowerCase()}`;
  };

  return (
    <div className="main-content all-jobs-page">
      <div className="page-header">
        <h1>All Jobs</h1>
        <p className="sub-text">Manage and monitor all delivery jobs</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">No jobs found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Quantity</th>
                <th>Price / Case</th>
                <th>Total Price</th>
                <th>Payment Mode</th>
                <th>Payment Status</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="serial">{job.serial_number}</td>

                  <td>
                    <span className={getStatusClass(job.status)}>
                      {job.status}
                    </span>
                  </td>

                  <td>
                    <span className={getPriorityClass(job.priority)}>
                      {job.priority}
                    </span>
                  </td>

                  <td>{job.quantity}</td>

                  <td>₹{job.price_per_case}</td>

                  <td>₹{job.total_price}</td>

                  <td>{job.payment_mode}</td>

                  <td>{job.payment_status}</td>

                  <td>{job.latitude}</td>

                  <td>{job.longitude}</td>

                  <td>
                    <a
                      href={`https://www.google.com/maps?q=${job.latitude},${job.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-btn"
                    >
                      View Map
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
