import { useEffect, useState } from "react";
import { jobsAPI } from "../services/api";
import "../css/Myassignments.css";

function CompletedTasks() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  const fetchCompletedJobs = async () => {
    try {
      const res = await jobsAPI.getMyJobs({
        status_filter: "COMPLETED",
        per_page: 100
      });

      setJobs(res.data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading completed jobs...</div>;

  return (
    <div className="main-content">
      <h1>Completed Tasks</h1>

      {jobs.length === 0 ? (
        <p>No completed tasks</p>
      ) : (
        <div className="grid grid-2">
          {jobs.map((job) => (
            <div key={job.id} className="card">
              <h3>{job.serial_number}</h3>
              <p><strong>Shop:</strong> {job.shop_name}</p>
              <p><strong>Contact:</strong> {job.shop_contact}</p>
              <p><strong>Quantity:</strong> {job.quantity}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="status-badge status-completed">{job.status}</span>
              </p>
              <p>
                <strong>Payment Amount:</strong> ₹{job.total_price}
              </p>
              <p>
                <strong>Payment Mode:</strong> {job.payment_mode}{" "}
                {job.payment_mode === "COD" && (
                  <span className="status-badge status-completed ml-5">
                    Cash Collected
                  </span>
                )}
                {job.payment_mode === "UPI" && (
                  <span className="status-badge status-completed ml-5">Paid</span>
                )}
                {job.payment_mode === "CASH_RECEIVED" && (
                  <span className="status-badge status-completed ml-5">Received</span>
                )}
                {job.payment_mode === "CREDIT" && job.payment_status === "RECEIVED" && (
                  <span className="status-badge status-completed ml-5">Credit Collected</span>
                )}
                {job.payment_mode === "CREDIT" && job.payment_status === "PENDING" && (
                  <span className="status-badge status-waiting ml-5">Credit Pending</span>
                )}
              </p>

              {job.delivery_proofs && job.delivery_proofs.length > 0 && (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/uploads/${job.delivery_proofs[0].image_path}`}
                  alt="Delivery Proof"
                  style={{
                    width: "100%",
                    height: "250px",
                    objectFit: "contain",
                    backgroundColor: "#f5f5f5",
                    marginTop: "10px",
                    borderRadius: "8px"
                    }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompletedTasks;