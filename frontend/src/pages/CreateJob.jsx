import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function getStock() {
  const saved = localStorage.getItem('thiraaJuiceStock');
  if (saved) return JSON.parse(saved);
  return [
    { id: 1, name: "Thiraa Juice - Mango",   level: 60, count: 600 },
    { id: 2, name: "Thiraa Juice - Orange",  level: 40, count: 400 },
    { id: 3, name: "Thiraa Juice - Grapes",  level: 30, count: 300 },
    { id: 4, name: "Thiraa Juice - Apple",   level: 50, count: 500 },
    { id: 5, name: "Thiraa Juice - Lemon",   level: 20, count: 200 },
    { id: 6, name: "Thiraa Juice - Paneer",  level: 70, count: 700 },
  ];
}

function CreateJob() {
  const [formData, setFormData] = useState({
    shop_name: '',
    shop_contact: '',
    notes: '',
    latitude: 13.0827,
    longitude: 80.2707,
    price_per_case: '',
    priority: 'NORMAL',
  });

  // Per-flavor quantities
  const [flavorQty, setFlavorQty] = useState(
    FLAVOR_ITEMS.reduce((acc, f) => ({ ...acc, [f.id]: 0 }), {})
  );

  // Payment fields
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // 'Paid' | 'Unpaid'
  const [paymentMode, setPaymentMode] = useState('UPI');      // 'UPI' | 'Cash'
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const totalQuantity = Object.values(flavorQty).reduce((a, b) => a + b, 0);
  const total_price = totalQuantity * (Number(formData.price_per_case) || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'price_per_case' ? value : value });
  };

  const handleFlavorChange = (id, value) => {
    const stock = getStock();
    const item = stock.find(s => s.id === id);
    const available = item ? item.count : 0;
    const qty = Math.max(0, Math.min(Number(value) || 0, available));
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

    setLoading(true);
    setError('');
    setSuccess('');

    // Map Paid/Unpaid + mode → backend payment_mode
    const mapped_payment_mode =
      paymentStatus === 'Unpaid'
        ? 'COD'
        : paymentMode === 'Cash'
        ? 'CASH_RECEIVED'
        : 'UPI';

    // Build flavor breakdown (only non-zero quantities)
    const flavorBreakdown = FLAVOR_ITEMS
      .filter(f => flavorQty[f.id] > 0)
      .map(f => ({ id: f.id, name: f.name, qty: flavorQty[f.id] }));

    try {
      await jobsAPI.createJob({
        ...formData,
        price_per_case: Number(formData.price_per_case),
        quantity: totalQuantity,
        total_price,
        payment_mode: mapped_payment_mode,
        remarks: paymentStatus === 'Paid' ? remarks : undefined,
        flavors: JSON.stringify(flavorBreakdown),
      });

      // Deduct quantities from localStorage stock
      const stock = getStock();
      const updatedStock = stock.map(item => {
        const deduct = flavorQty[item.id] || 0;
        const newCount = Math.max(0, item.count - deduct);
        return { ...item, count: newCount, level: Math.min((newCount / 1000) * 100, 100) };
      });
      localStorage.setItem('thiraaJuiceStock', JSON.stringify(updatedStock));

      setSuccess('Job created successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
        setError(
          typeof err.response?.data?.detail === "string"
            ? err.response.data.detail
            : "Failed to create job"
        );
    } finally {
      setLoading(false);
    }
  };

  const stock = getStock();

  return (
    <div className="main-content">
      <h1>Create New Job</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid grid-2">

        {/* LEFT SIDE - FORM */}
        <div>
          <form id="createJobForm" onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input
                type="text"
                name="shop_name"
                value={formData.shop_name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shop Contact *</label>
              <input
                type="tel"
                name="shop_contact"
                value={formData.shop_contact}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {/* Flavor Quantities */}
            <div className="form-group">
              <label className="form-label">Select Flavors & Quantities *</label>
              {FLAVOR_ITEMS.map(flavor => {
                const stockItem = stock.find(s => s.id === flavor.id);
                const available = stockItem ? stockItem.count : 0;
                return (
                  <div key={flavor.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ flex: 1, fontSize: '14px' }}>{flavor.name}</span>
                    <span style={{ color: available < 50 ? '#dc2626' : '#666', fontSize: '12px', minWidth: '80px', textAlign: 'right' }}>
                      {available} avail.
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={available}
                      value={flavorQty[flavor.id]}
                      onChange={e => handleFlavorChange(flavor.id, e.target.value)}
                      className="form-input"
                      style={{ width: '75px', textAlign: 'center' }}
                    />
                  </div>
                );
              })}
              <small style={{ color: '#555' }}>
                Total: <strong>{totalQuantity} units</strong>
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Price Per Case *</label>
              <input
                type="number"
                name="price_per_case"
                value={formData.price_per_case}
                onChange={handleChange}
                className="form-input"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Price</label>
              <input
                type="text"
                className="form-input"
                value={total_price || 0}
                readOnly
              />
            </div>

            {/* Payment Status Radio */}
            <div className="form-group">
              <label className="form-label">Payment Status *</label>
              <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="Paid"
                    checked={paymentStatus === 'Paid'}
                    onChange={() => setPaymentStatus('Paid')}
                  />
                  Paid
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="Unpaid"
                    checked={paymentStatus === 'Unpaid'}
                    onChange={() => setPaymentStatus('Unpaid')}
                  />
                  Unpaid
                </label>
              </div>
            </div>

            {/* Paid-only fields */}
            {paymentStatus === 'Paid' && (
              <>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="form-select"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="form-textarea"
                    placeholder="Payment remarks..."
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="form-select"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Additional delivery instructions..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Location</label>
              <div className="text-secondary mb-10">
                Click on map or use current location
              </div>
              <small>
                Selected: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </small>
            </div>

          </form>
        </div>

        {/* RIGHT SIDE - MAP */}
        <div>
          <h3>Select Delivery Location</h3>

          {/* Current location button */}
          <button
            type="button"
            className="btn"
            onClick={handleGetCurrentLocation}
            style={{ marginBottom: '10px', width: '100%' }}
          >
            Use Current Location
          </button>

          {/* Manual coordinate entry */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '3px' }}>Latitude</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 13.0827"
                value={formData.latitude}
                onChange={e => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || prev.latitude }))}
                style={{ fontSize: '13px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '3px' }}>Longitude</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 80.2707"
                value={formData.longitude}
                onChange={e => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || prev.longitude }))}
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>

          <Map
            center={[formData.latitude, formData.longitude]}
            onLocationSelect={handleLocationSelect}
            height="500px"
            interactive={true}
          />
        </div>

      </div>

      <button
        type="submit"
        form="createJobForm"
        className="btn"
        disabled={loading}
        style={{ width: '100%', marginTop: '20px' }}
      >
        {loading ? 'Creating...' : 'Create Job'}
      </button>

    </div>
  );
}

export default CreateJob;
