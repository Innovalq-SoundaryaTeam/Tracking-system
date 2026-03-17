import { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';
import { isDriver } from '../services/auth';
import Map from '../components/Map';
import DeliveryProofUpload from '../components/DeliveryProofUpload';
import '../css/Myassignments.css';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildOptimalRoute(shopLat, shopLng, jobs) {
  const groups = {
    URGENT: jobs.filter(j => j.priority === 'URGENT'),
    HIGH:   jobs.filter(j => j.priority === 'HIGH'),
    NORMAL: jobs.filter(j => j.priority === 'NORMAL'),
  };
  const route = [];
  let curLat = shopLat, curLng = shopLng;
  for (const priority of ['URGENT', 'HIGH', 'NORMAL']) {
    const remaining = [...groups[priority]];
    while (remaining.length > 0) {
      let nearestIdx = 0, minDist = Infinity;
      remaining.forEach((job, i) => {
        const d = haversineDistance(curLat, curLng, job.latitude, job.longitude);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      });
      const [job] = remaining.splice(nearestIdx, 1);
      route.push({ ...job, stopNumber: route.length + 1, distanceKm: minDist.toFixed(1) });
      curLat = job.latitude;
      curLng = job.longitude;
    }
  }
  return route;
}

function MyAssignments() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showProofUpload, setShowProofUpload] = useState(false);

  // Payment collection form state per job id
  const [paymentForms, setPaymentForms] = useState({});

  const userIsDriver = isDriver();

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      const res = await jobsAPI.getMyJobs({ per_page: 1000 });

      const activeJobs = res.data.jobs.filter(
        (job) => job.status !== "COMPLETED"
      );

      const shop = JSON.parse(localStorage.getItem('juice_shop_location') || 'null') || { lat: 13.0827, lng: 80.2707 };
      const jobsWithCoords = activeJobs.filter(j => j.latitude && j.longitude);
      const jobsNoCoords   = activeJobs.filter(j => !j.latitude || !j.longitude);
      const routeSorted = buildOptimalRoute(shop.lat, shop.lng, jobsWithCoords);

      setJobs([...routeSorted, ...jobsNoCoords]);

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentForm = (jobId) =>
    paymentForms[jobId] || { open: false, method: 'Cash', remarks: '' };

  const setPaymentForm = (jobId, updates) => {
    setPaymentForms(prev => ({
      ...prev,
      [jobId]: { ...getPaymentForm(jobId), ...updates },
    }));
  };

  const handleCollectPayment = async (jobId) => {
    const form = getPaymentForm(jobId);
    try {
      const res = await jobsAPI.collectPayment(jobId, {
        payment_method: form.method,
        remarks: form.remarks || undefined,
      });

      if (res.data.payment_status === "RECEIVED") {
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job.id === jobId
              ? { ...job, payment_status: "RECEIVED", payment_mode: res.data.payment_mode || job.payment_mode }
              : job
          )
        );
        // Close form and open proof upload
        setPaymentForm(jobId, { open: false });
        setSelectedJob(jobId);
        setShowProofUpload(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to collect payment");
    }
  };

  const handleJobAction = async (jobId, action) => {
    try {
      switch (action) {
        case 'pickup':
          await jobsAPI.pickupJob(jobId);
          break;
        case 'transit':
          await jobsAPI.startTransit(jobId);
          break;
        case 'upload-proof':
          setSelectedJob(jobId);
          setShowProofUpload(true);
          return;
        case 'complete':
          await jobsAPI.completeJob(jobId);
          break;
        default:
          break;
      }
      await fetchMyJobs();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action}`);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'WAITING': 'status-waiting',
      'ASSIGNED': 'status-assigned',
      'PICKED_UP': 'status-picked-up',
      'IN_TRANSIT': 'status-in-transit',
      'PROOF_UPLOADED': 'status-proof-uploaded',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
    };
    return statusMap[status] || '';
  };

  const getPriorityClass = (priority) => {
    const priorityMap = {
      'NORMAL': 'priority-normal',
      'HIGH': 'priority-high',
      'URGENT': 'priority-urgent',
    };
    return priorityMap[priority] || '';
  };

  // Determine if this job needs payment collection
  const needsPaymentCollection = (job) =>
    job.status === "IN_TRANSIT" &&
    job.payment_mode === "COD" &&
    job.payment_status === "COLLECT_FROM_CUSTOMER";

  // Determine if delivery proof can be uploaded
  const canUploadProof = (job) =>
    job.status === "IN_TRANSIT" &&
    (job.payment_mode !== "COD" || job.payment_status === "RECEIVED");

  const getActionButtons = (job) => {
    const buttons = [];

    switch (job.status) {
      case 'ASSIGNED':
        if (userIsDriver) {
          buttons.push(
            <button key="pickup" onClick={() => handleJobAction(job.id, 'pickup')} className="btn btn-success">
              Mark as Picked Up
            </button>
          );
        }
        break;

      case 'PICKED_UP':
        if (userIsDriver) {
          buttons.push(
            <button key="transit" onClick={() => handleJobAction(job.id, 'transit')} className="btn btn-warning">
              Start Transit
            </button>
          );
        }
        break;

      case 'IN_TRANSIT':
        // Payment collection form for COD/Unpaid jobs
        if (needsPaymentCollection(job)) {
          const form = getPaymentForm(job.id);
          if (!form.open) {
            buttons.push(
              <button
                key="open-collect"
                className="btn btn-warning"
                onClick={() => setPaymentForm(job.id, { open: true })}
              >
                Collect Payment
              </button>
            );
          } else {
            buttons.push(
              <div key="collect-form" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fafafa', width: '100%' }}>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Collect Payment</p>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                  {['Cash', 'UPI', 'Credit'].map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`method-${job.id}`}
                        value={m}
                        checked={form.method === m}
                        onChange={() => setPaymentForm(job.id, { method: m })}
                      />
                      {m}
                    </label>
                  ))}
                </div>
                <textarea
                  placeholder="Remarks (optional)..."
                  value={form.remarks}
                  onChange={e => setPaymentForm(job.id, { remarks: e.target.value })}
                  style={{ width: '100%', minHeight: '60px', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleCollectPayment(job.id)}>
                    Confirm Payment
                  </button>
                  <button className="btn btn-error" onClick={() => setPaymentForm(job.id, { open: false })}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          }
        }

        // Upload proof only after payment collected (or for pre-paid jobs)
        if (canUploadProof(job)) {
          buttons.push(
            <button key="upload-proof" className="btn" onClick={() => handleJobAction(job.id, 'upload-proof')}>
              Upload Delivery Proof
            </button>
          );
        }
        break;

      case 'PROOF_UPLOADED':
        if (userIsDriver) {
          buttons.push(
            <button key="complete" onClick={() => handleJobAction(job.id, 'complete')} className="btn btn-success">
              Mark as Delivered
            </button>
          );
        }
        break;

      default:
        break;
    }

    return buttons;
  };

  if (loading) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="main-content my-assignments-page">
      <h1>My Assignments / எனது ஒதுக்கீடுகள்</h1>

      {error && <div className="error">{error}</div>}

      {showProofUpload && selectedJob && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowProofUpload(false)}
            className="btn btn-error mb-10"
          >
            Close Upload
          </button>
          <DeliveryProofUpload
            jobId={selectedJob}
            onUploadSuccess={() => {
              setShowProofUpload(false);
              setSelectedJob(null);
              fetchMyJobs();
            }}
          />
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="card">
          <p className="text-secondary text-center">
            No assignments found / ஒதுக்கீடுகள் இல்லை
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {jobs.map((job) => (
            <div key={job.id} className="card">
              <div className="flex-between mb-10">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {job.stopNumber && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '28px', height: '28px', borderRadius: '50%', fontSize: '12px',
                      fontWeight: '800', color: 'white', flexShrink: 0,
                      background: job.priority === 'URGENT' ? '#dc2626' : job.priority === 'HIGH' ? '#f97316' : '#2563eb',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }} title={`Delivery Stop #${job.stopNumber}`}>
                      {job.stopNumber}
                    </span>
                  )}
                  <h3 style={{ margin: 0 }}>{job.serial_number}</h3>
                </div>
                <span className={`status-badge ${getStatusClass(job.status)}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mb-10">
                <p><strong>Shop / கடை:</strong> {job.shop_name}</p>
                <p><strong>Contact / தொடர்பு:</strong> {job.shop_contact}</p>
                {(() => {
                  let flavors = [];
                  try { flavors = job.flavors ? JSON.parse(job.flavors) : []; } catch {}
                  return flavors.length > 0 ? (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Flavors / சுவைகள்:</strong>
                      <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
                        {flavors.map(f => (
                          <div key={f.id} style={{ fontSize: '13px' }}>
                            {f.name}: <strong>{f.qty} cases</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                <p><strong>Total Quantity / மொத்த அளவு:</strong> {job.quantity}</p>

                <p>
                  <strong>{job.payment_mode === "COD" ? "Amount to Collect" : "Payment Amount"}:</strong>{" "}
                  ₹{job.total_price}
                </p>

                <p>
                  <strong>Payment:</strong>{" "}
                  {job.payment_mode === "COD" ? "Unpaid (COD)" : job.payment_mode}

                  {job.payment_mode === "COD" && job.payment_status === "COLLECT_FROM_CUSTOMER" && (
                    <span className="status-badge status-waiting ml-5">
                      Pending Collection
                    </span>
                  )}

                  {job.payment_status === "RECEIVED" && (
                    <span className="status-badge status-completed ml-5">
                      Payment Collected
                    </span>
                  )}

                  {job.payment_status === "PAID" && (
                    <span className="status-badge status-completed ml-5">
                      Paid
                    </span>
                  )}
                </p>

                <p><strong>Priority / முன்னுரிமை:</strong>
                  <span className={`status-badge ${getPriorityClass(job.priority)} ml-5`}>
                    {job.priority}
                  </span>
                </p>
                {job.remarks && <p><strong>Remarks:</strong> {job.remarks}</p>}
                {job.notes && <p><strong>Notes / குறிப்புகள்:</strong> {job.notes}</p>}
              </div>

              <div className="mb-10">
                <Map
                  center={[job.latitude, job.longitude]}
                  markers={[{
                    latitude: job.latitude,
                    longitude: job.longitude,
                    title: job.shop_name,
                    shop_name: job.shop_name,
                    quantity: job.quantity,
                    status: job.status,
                    serial_number: job.serial_number
                  }]}
                  height="200px"
                  interactive={false}
                />
              </div>

              <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
                {getActionButtons(job)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAssignments;
