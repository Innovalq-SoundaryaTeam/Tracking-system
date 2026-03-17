import { useState, useEffect } from "react";
import { paymentsAPI } from "../services/api";
import "../css/AdminDasboard.css";

function Accounts() {
  const [data, setData] = useState({
    total_received: 0,
    total_pending: 0,
    upi_received: 0,
    cash_received: 0,
    cod_received: 0,
    credit_pending: 0,
  });
  const [creditJobs, setCreditJobs] = useState([]);
  const [loadingCollect, setLoadingCollect] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  const fetchAll = async () => {
    try {
      const [summaryRes, creditRes] = await Promise.all([
        paymentsAPI.getSummary(),
        paymentsAPI.getCreditPending(),
      ]);
      setData(summaryRes.data);
      setCreditJobs(creditRes.data.jobs || []);
    } catch (err) {
      console.error("Accounts fetch error", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCollect = async (jobId) => {
    setLoadingCollect(jobId);
    try {
      await paymentsAPI.collectCreditPayment(jobId);
      setMessage({ text: "Payment marked as received successfully.", type: "success" });
      await fetchAll();
    } catch (err) {
      setMessage({
        text: err.response?.data?.detail || "Failed to collect payment.",
        type: "error",
      });
    } finally {
      setLoadingCollect(null);
      setTimeout(() => setMessage({ text: "", type: "" }), 3500);
    }
  };

  const fmt = (val) =>
    `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const summaryCards = [
    { label: "Total Received", value: data.total_received, color: "#10b981" },
    { label: "Total Pending", value: data.total_pending, color: "#ef4444" },
    { label: "UPI Received", value: data.upi_received, color: "#3b82f6" },
    { label: "Cash Received", value: data.cash_received, color: "#8b5cf6" },
    { label: "COD Received", value: data.cod_received, color: "#f59e0b" },
    { label: "Credit Pending", value: data.credit_pending, color: "#ec4899" },
  ];

  return (
    <div className="main-content">
      <h1>Accounts</h1>

      {message.text && (
        <div className={message.type === "error" ? "error" : "success"} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-row">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="stat-box"
            style={{ borderTop: `4px solid ${card.color}` }}
          >
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 4 }}>{card.label}</p>
            <h2 style={{ color: card.color, fontSize: 22 }}>{fmt(card.value)}</h2>
          </div>
        ))}
      </div>

      {/* Credit Pending Collections */}
      <div className="daily-jobs-card" style={{ marginTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 className="daily-title" style={{ margin: 0 }}>
            Credit Pending Collections
          </h3>
          <span
            style={{
              background: "#fdf2f8",
              color: "#ec4899",
              border: "1px solid #fbcfe8",
              borderRadius: 20,
              padding: "2px 14px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {creditJobs.length} pending
          </span>
        </div>

        {creditJobs.length === 0 ? (
          <p className="text-secondary text-center" style={{ padding: 24 }}>
            No pending credit collections. All payments are cleared.
          </p>
        ) : (
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Serial No.</th>
                <th>Shop</th>
                <th>Contact</th>
                <th>Amount</th>
                <th>Job Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {creditJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.serial_number}</td>
                  <td>{job.shop_name}</td>
                  <td>{job.shop_contact}</td>
                  <td>
                    <strong style={{ color: "#10b981" }}>{fmt(job.total_price)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${job.status.toLowerCase()}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>
                    {job.created_at
                      ? new Date(job.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="btn btn-success"
                      style={{ padding: "4px 14px", fontSize: 13 }}
                      disabled={loadingCollect === job.id}
                      onClick={() => handleCollect(job.id)}
                    >
                      {loadingCollect === job.id ? "Collecting..." : "Mark as Received"}
                    </button>
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

export default Accounts;
