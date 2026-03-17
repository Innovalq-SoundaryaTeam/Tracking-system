import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { jobsAPI } from '../services/api';
import '../css/LocationRoute.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor route (priority groups: URGENT → HIGH → NORMAL)
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

// ── Icons ──────────────────────────────────────────────────────────────────
const SHOP_ICON = L.divIcon({
  html: `<div style="background:#ef4444;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:15px;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.45);">S</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19], className: '',
});

const PREVIEW_ICON = L.divIcon({
  html: `<div style="background:#8b5cf6;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:15px;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.45);">?</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19], className: '',
});

function createStopIcon(number, priority) {
  const colors = { URGENT: '#dc2626', HIGH: '#f97316', NORMAL: '#2563eb' };
  const color = colors[priority] || '#2563eb';
  return L.divIcon({
    html: `<div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${number}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], className: '',
  });
}

// ── Map helpers ────────────────────────────────────────────────────────────
function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

// Handles click-to-place when in picking mode
function MapClickHandler({ pickingMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (pickingMode) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function ShopLocationModal({ onClose, onUseCurrentLocation, onPickOnMap }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2rem 2.5rem',
        maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
          📦 Set Shop / Godown Location
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          Choose how you'd like to set the starting point for deliveries.
        </p>

        <button
          onClick={onUseCurrentLocation}
          style={{
            background: '#2563eb', color: '#fff', border: 'none',
            borderRadius: 10, padding: '0.85rem 1.25rem',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
        >
          📍 Use My Current Location
          <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>(GPS)</span>
        </button>

        <button
          onClick={onPickOnMap}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: 10, padding: '0.85rem 1.25rem',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
          onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
        >
          🗺️ Tap a Spot on the Map
          <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>(Manual)</span>
        </button>

        <button
          onClick={onClose}
          style={{
            background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '0.6rem 1rem',
            fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function LocationRoute() {
  const getDefaultShop = () =>
    JSON.parse(localStorage.getItem('juice_shop_location') || 'null');

  const [shopLocation, setShopLocation]   = useState(getDefaultShop());
  const [jobs, setJobs]                   = useState([]);
  const [route, setRoute]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(!localStorage.getItem('juice_shop_location'));
  const [pickingMode, setPickingMode]     = useState(false);   // click-on-map mode
  const [previewLoc, setPreviewLoc]       = useState(null);    // pending tap location
  const [gpsLoading, setGpsLoading]       = useState(false);

  // Fetch jobs
  useEffect(() => {
    (async () => {
      try {
        const res = await jobsAPI.getAllJobs({ per_page: 1000 });
        const active = (res.data.jobs || []).filter(
          j => j.status !== 'COMPLETED' && j.latitude && j.longitude
        );
        setJobs(active);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Rebuild route when shop or jobs change
  useEffect(() => {
    if (!shopLocation) return;
    setRoute(buildOptimalRoute(shopLocation.lat, shopLocation.lng, jobs));
  }, [jobs, shopLocation]);

  // Persist shop location
  useEffect(() => {
    if (shopLocation) localStorage.setItem('juice_shop_location', JSON.stringify(shopLocation));
  }, [shopLocation]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setGpsLoading(true);
    setShowModal(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setShopLocation({ lat: coords.latitude, lng: coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        alert('❌ Unable to fetch GPS location. Try picking on map instead.');
        setGpsLoading(false);
        setShowModal(true);
        console.error(err);
      },
      { timeout: 10000 }
    );
  }, []);

  const handlePickOnMap = useCallback(() => {
    setShowModal(false);
    setPickingMode(true);
    setPreviewLoc(null);
  }, []);

  const handleMapClick = useCallback((loc) => {
    setPreviewLoc(loc);
  }, []);

  const confirmPreview = useCallback(() => {
    if (!previewLoc) return;
    setShopLocation(previewLoc);
    setPreviewLoc(null);
    setPickingMode(false);
  }, [previewLoc]);

  const cancelPicking = useCallback(() => {
    setPickingMode(false);
    setPreviewLoc(null);
    if (!shopLocation) setShowModal(true);
  }, [shopLocation]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const priorityColor = (p) => ({ URGENT: '#dc2626', HIGH: '#f97316', NORMAL: '#2563eb' }[p] || '#2563eb');

  const routePositions = shopLocation
    ? [[shopLocation.lat, shopLocation.lng], ...route.map(j => [j.latitude, j.longitude])]
    : [];

  const totalDistance = route.reduce((sum, s) => sum + parseFloat(s.distanceKm), 0).toFixed(1);

  const mapCenter = shopLocation
    ? [shopLocation.lat, shopLocation.lng]
    : previewLoc
    ? [previewLoc.lat, previewLoc.lng]
    : [20, 78];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="location-route-page">
      {/* Modal */}
      {showModal && (
        <ShopLocationModal
          onClose={() => setShowModal(false)}
          onUseCurrentLocation={handleUseCurrentLocation}
          onPickOnMap={handlePickOnMap}
        />
      )}

      {/* Header */}
      <div className="lr-header">
        <div>
          <h1 className="lr-title">Delivery Route Planner</h1>
          <p className="lr-subtitle">{route.length} stops · ~{totalDistance} km total</p>
        </div>
        <div className="lr-header-actions">
          {/* Change shop location button */}
          {!pickingMode && (
            <button
              className="btn-set-shop"
              onClick={() => setShowModal(true)}
              disabled={gpsLoading}
            >
              {gpsLoading ? '⏳ Getting GPS…' : '📍 Change Shop Location'}
            </button>
          )}

          {/* Picking-mode banner + confirm/cancel */}
          {pickingMode && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#f5f3ff', border: '1.5px dashed #7c3aed',
              borderRadius: 10, padding: '0.5rem 1rem',
            }}>
              <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: 13 }}>
                🗺️ Tap the map to place shop
              </span>
              {previewLoc && (
                <button
                  onClick={confirmPreview}
                  style={{
                    background: '#16a34a', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '0.35rem 0.8rem', fontWeight: 600,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  ✅ Confirm
                </button>
              )}
              <button
                onClick={cancelPicking}
                style={{
                  background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '0.35rem 0.8rem', fontWeight: 600,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                ✕ Cancel
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="lr-legend">
            <span className="legend-item"><span className="ldot shop">S</span>Shop</span>
            <span className="legend-item"><span className="ldot urgent">!</span>Urgent</span>
            <span className="legend-item"><span className="ldot high">H</span>High</span>
            <span className="legend-item"><span className="ldot normal">N</span>Normal</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lr-loading">Loading delivery locations...</div>
      ) : (
        <div className="lr-content">
          {/* Map */}
          <div className={`lr-map-wrap ${pickingMode ? 'crosshair' : ''}`}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <MapCenter center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Click handler (only active in picking mode) */}
              <MapClickHandler pickingMode={pickingMode} onMapClick={handleMapClick} />

              {/* Route polyline */}
              {route.length > 0 && shopLocation && (
                <Polyline
                  positions={routePositions}
                  color="#6366f1"
                  weight={3}
                  dashArray="10 5"
                  opacity={0.85}
                />
              )}

              {/* Shop marker */}
              {shopLocation && (
                <Marker position={[shopLocation.lat, shopLocation.lng]} icon={SHOP_ICON}>
                  <Popup>
                    <strong>📦 Juice Shop — Pickup Point</strong><br />
                    Lat: {shopLocation.lat.toFixed(5)}<br />
                    Lng: {shopLocation.lng.toFixed(5)}
                  </Popup>
                </Marker>
              )}

              {/* Preview marker (tap-to-place pending confirmation) */}
              {previewLoc && (
                <Marker position={[previewLoc.lat, previewLoc.lng]} icon={PREVIEW_ICON}>
                  <Popup>
                    <strong>🟣 Pending — Click ✅ Confirm to save</strong><br />
                    Lat: {previewLoc.lat.toFixed(5)}<br />
                    Lng: {previewLoc.lng.toFixed(5)}
                  </Popup>
                </Marker>
              )}

              {/* Delivery stop markers */}
              {route.map(stop => (
                <Marker
                  key={stop.id}
                  position={[stop.latitude, stop.longitude]}
                  icon={createStopIcon(stop.stopNumber, stop.priority)}
                >
                  <Popup>
                    <strong>Stop #{stop.stopNumber} — {stop.shop_name}</strong><br />
                    Priority: <b>{stop.priority}</b><br />
                    Distance: {stop.distanceKm} km<br />
                    Qty: {stop.quantity}<br />
                    Contact: {stop.shop_contact}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Route List */}
          <div className="lr-route-list">
            <h3 className="lr-list-title">Optimized Route</h3>

            {/* Shop row */}
            <div className="lr-stop-row shop-row">
              <div className="lr-stop-num shop-num">S</div>
              <div className="lr-stop-info">
                <span className="lr-stop-name">Juice Shop</span>
                <span className="lr-stop-meta">Start — Pickup Point</span>
              </div>
            </div>

            {route.length > 0 && <div className="lr-arrow">↓</div>}

            {route.map((stop, i) => (
              <div key={stop.id}>
                <div className="lr-stop-row">
                  <div className="lr-stop-num" style={{ background: priorityColor(stop.priority) }}>
                    {stop.stopNumber}
                  </div>
                  <div className="lr-stop-info">
                    <span className="lr-stop-name">{stop.shop_name}</span>
                    <span className="lr-stop-meta">
                      <span className={`p-tag p-${stop.priority?.toLowerCase()}`}>{stop.priority}</span>
                      &nbsp;·&nbsp;{stop.distanceKm} km&nbsp;·&nbsp;Qty: {stop.quantity}
                    </span>
                    <span className="lr-stop-contact">📞 {stop.shop_contact}</span>
                  </div>
                </div>
                {i < route.length - 1 && <div className="lr-arrow">↓</div>}
              </div>
            ))}

            {route.length === 0 && (
              <p className="lr-empty">No active deliveries found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationRoute;
