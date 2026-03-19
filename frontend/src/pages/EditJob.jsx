import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import Map from '../components/Map';
import '../css/Createjob.css';

const FLAVOR_ITEMS = [
  { id: 1, name: "Thiraa Juice - Mango" },
  { id: 2, name: "Thiraa Juice - Orange" },
  { id: 3, name: "Thiraa Juice - Grapes" },
  { id: 4, name: "Thiraa Juice - Apple" },
  { id: 5, name: "Thiraa Juice - Lemon" },
  { id: 6, name: "Thiraa Juice - Paneer" },
];

function EditJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    shop_name: '',
    shop_contact: '',
    notes: '',
    latitude: 13.0827,
    longitude: 80.2707,
    price_per_case: '',
    priority: 'NORMAL',
  });

  const [flavorQty, setFlavorQty] = useState(
    FLAVOR_ITEMS.reduce((acc, f) => ({ ...acc, [f.id]: 0 }), {})
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await jobsAPI.getMyJobs({ per_page: 1000 });
        const job = res.data.jobs.find(j => j.id === parseInt(jobId));
        if (!job) {
          setError('Job not found');
          setLoading(false);
          return;
        }
        if (job.status !== 'WAITING') {
          setError('Only WAITING jobs can be edited');
          setLoading(false);
          return;
        }
        setFormData({
          shop_name: job.shop_name || '',
          shop_contact: job.shop_contact || '',
          notes: job.notes || '',
          latitude: job.latitude || 13.0827,
          longitude: job.longitude || 80.2707,
          price_per_case: job.price_per_case || '',
          priority: job.priority || 'NORMAL',
        });

        // Pre-fill flavors if available
        if (job.flavors) {
          const flavors = typeof job.flavors === 'string' ? JSON.parse(job.flavors) : job.flavors;
          const newQty = FLAVOR_ITEMS.reduce((acc, f) => ({ ...acc, [f.id]: 0 }), {});
          flavors.forEach(f => { if (newQty[f.id] !== undefined) newQty[f.id] = f.qty; });
          setFlavorQty(newQty);
        }
      } catch {
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  const totalQuantity = Object.values(flavorQty).reduce((a, b) => a + b, 0);
  const total_price = totalQuantity * (Number(formData.price_per_case) || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFlavorChange = (id, value) => {
    const qty = Math.max(0, Number(value) || 0);
    setFlavorQty({ ...flavorQty, [id]: qty });
  };

  const handleLocationSelect = (location) => {
    setFormData({ ...formData, latitude: location.latitude, longitude: location.longitude });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFormData(prev => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude })),
      () => alert("Unable to fetch location. Please select manually.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalQuantity === 0) {
      setError('Please select at least one unit of any flavor.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const flavorBreakdown = FLAVOR_ITEMS
      .filter(f => flavorQty[f.id] > 0)
      .map(f => ({ id: f.id, name: f.name, qty: flavorQty[f.id] }));

    try {
      await jobsAPI.updateJob(jobId, {
        shop_name: formData.shop_name,
        shop_contact: formData.shop_contact,
        notes: formData.notes,
        latitude: formData.latitude,
        longitude: formData.longitude,
        quantity: totalQuantity,
        priority: formData.priority,
        flavors: JSON.stringify(flavorBreakdown),
      });

      setSuccess('Job updated successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to update job'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading job...</div>;

  return (
    <div className="main-content">
      <h1>Edit Job</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid grid-2">
        <div>
          <form id="editJobForm" onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input type="text" name="shop_name" value={formData.shop_name} onChange={handleChange} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Shop Contact *</label>
              <input type="tel" name="shop_contact" value={formData.shop_contact} onChange={handleChange} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Select Flavors & Quantities *</label>
              {FLAVOR_ITEMS.map(flavor => (
                <div key={flavor.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ flex: 1, fontSize: '14px' }}>{flavor.name}</span>
                  <input
                    type="number"
                    min="0"
                    value={flavorQty[flavor.id]}
                    onChange={e => handleFlavorChange(flavor.id, e.target.value)}
                    className="form-input"
                    style={{ width: '75px', textAlign: 'center' }}
                  />
                </div>
              ))}
              <small style={{ color: '#555' }}>Total: <strong>{totalQuantity} units</strong></small>
            </div>

            <div className="form-group">
              <label className="form-label">Price Per Case</label>
              <input type="number" name="price_per_case" value={formData.price_per_case} onChange={handleChange} className="form-input" min="1" required />
            </div>

            <div className="form-group">
              <label className="form-label">Total Price</label>
              <input type="text" className="form-input" value={total_price || 0} readOnly />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="form-select">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-textarea" placeholder="Additional delivery instructions..." />
            </div>

          </form>
        </div>

        <div>
          <h3>Select Delivery Location</h3>
          <button type="button" className="btn" onClick={handleGetCurrentLocation} style={{ marginBottom: '10px', width: '100%' }}>
            Use Current Location
          </button>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '3px' }}>Latitude</label>
              <input type="number" step="any" className="form-input" value={formData.latitude}
                onChange={e => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || prev.latitude }))}
                style={{ fontSize: '13px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '3px' }}>Longitude</label>
              <input type="number" step="any" className="form-input" value={formData.longitude}
                onChange={e => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || prev.longitude }))}
                style={{ fontSize: '13px' }} />
            </div>
          </div>

          <Map center={[formData.latitude, formData.longitude]} onLocationSelect={handleLocationSelect} height="500px" interactive={true} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="btn" style={{ flex: 1, background: '#6b7280' }} onClick={() => navigate('/dashboard')}>
          Cancel
        </button>
        <button type="submit" form="editJobForm" className="btn" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default EditJob;
