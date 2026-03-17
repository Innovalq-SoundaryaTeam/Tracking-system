import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { jobsAPI } from '../services/api';
import '../css/DriverNavigation.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

const SHOP_ICON = L.divIcon({
  html: `<div style="background:#ef4444;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.45);">S</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: '',
});

function createStopIcon(number, priority, isActive, isDone) {
  if (isDone) {
    return L.divIcon({
      html: `<div style="background:#16a34a;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);opacity:0.7;">✓</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14], className: '',
    });
  }
  const colors = { URGENT: '#dc2626', HIGH: '#f97316', NORMAL: '#2563eb' };
  const color = isActive ? '#16a34a' : (colors[priority] || '#2563eb');
  const size = isActive ? 42 : 32;
  return L.divIcon({
    html: `<div style="background:${color};color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:${isActive ? 16 : 13}px;border:${isActive ? 3 : 2}px solid white;box-shadow:0 ${isActive ? 4 : 2}px ${isActive ? 14 : 7}px rgba(0,0,0,0.4);">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

function FocusMap({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom || 15, { duration: 1.2 });
  }, [position, zoom, map]);
  return null;
}

function DriverNavigation() {
  const shopLocation =
    JSON.parse(localStorage.getItem('juice_shop_location') || 'null') ||
    { lat: 13.0827, lng: 80.2707 };

  const [route, setRoute]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [started, setStarted]   = useState(false);
  const [activeStop, setActiveStop] = useState(0); // index of current stop

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await jobsAPI.getMyJobs({ per_page: 1000 });
        const active = (res.data.jobs || []).filter(
          j => j.status !== 'COMPLETED' && j.latitude && j.longitude
        );
        setRoute(buildOptimalRoute(shopLocation.lat, shopLocation.lng, active));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const openGoogleMaps = (fromLat, fromLng, toLat, toLng) => {
    const url = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}/?travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleStart = () => {
    setStarted(true);
    setActiveStop(0);
    if (route.length > 0) {
      openGoogleMaps(shopLocation.lat, shopLocation.lng, route[0].latitude, route[0].longitude);
    }
  };

  const handleNextStop = () => {
    const next = activeStop + 1;
    setActiveStop(next);
    if (next < route.length) {
      const from = route[activeStop];
      const to   = route[next];
      openGoogleMaps(from.latitude, from.longitude, to.latitude, to.longitude);
    }
  };

  const handleNavigateCurrent = () => {
    if (activeStop >= route.length) return;
    const stop = route[activeStop];
    const prev = activeStop === 0 ? shopLocation : { lat: route[activeStop - 1].latitude, lng: route[activeStop - 1].longitude };
    openGoogleMaps(prev.lat ?? prev.latitude, prev.lng ?? prev.longitude, stop.latitude, stop.longitude);
  };

  const priorityColor = (p) => ({ URGENT: '#dc2626', HIGH: '#f97316', NORMAL: '#2563eb' }[p] || '#2563eb');

  const routePositions = [
    [shopLocation.lat, shopLocation.lng],
    ...route.map(j => [j.latitude, j.longitude]),
  ];

  const focusPos = started && activeStop < route.length
    ? [route[activeStop].latitude, route[activeStop].longitude]
    : [shopLocation.lat, shopLocation.lng];

  const totalDistance = route.reduce((s, r) => s + parseFloat(r.distanceKm), 0).toFixed(1);
  const allDone = started && activeStop >= route.length;

  return (
    <div className="driver-nav-page">
      {/* Header */}
      <div className="dn-header">
        <div>
          <h1 className="dn-title">Delivery Navigation</h1>
          <p className="dn-subtitle">
            {route.length} stops · ~{totalDistance} km
            {started && !allDone && ` · Stop ${activeStop + 1} of ${route.length}`}
          </p>
        </div>
        <div className="dn-header-right">
          {!started ? (
            <button
              className="btn-start-delivery"
              onClick={handleStart}
              disabled={route.length === 0}
            >
              ▶&nbsp; Start Delivery
            </button>
          ) : allDone ? (
            <button className="btn-reset" onClick={() => { setStarted(false); setActiveStop(0); }}>
              ↺ New Route
            </button>
          ) : (
            <div className="dn-progress-pill">
              Stop {activeStop + 1} / {route.length}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="dn-loading">Loading your delivery route...</div>
      ) : (
        <div className="dn-content">
          {/* MAP */}
          <div className="dn-map-wrap">
            <MapContainer
              center={[shopLocation.lat, shopLocation.lng]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              {started && <FocusMap position={focusPos} zoom={15} />}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {route.length > 0 && (
                <Polyline
                  positions={routePositions}
                  color="#6366f1"
                  weight={3.5}
                  dashArray="10 6"
                  opacity={0.8}
                />
              )}

              {/* Shop */}
              <Marker position={[shopLocation.lat, shopLocation.lng]} icon={SHOP_ICON}>
                <Popup><strong>📦 Juice Shop — Start Point</strong></Popup>
              </Marker>

              {/* Stops */}
              {route.map((stop, i) => (
                <Marker
                  key={stop.id}
                  position={[stop.latitude, stop.longitude]}
                  icon={createStopIcon(stop.stopNumber, stop.priority, started && i === activeStop, started && i < activeStop)}
                >
                  <Popup>
                    <strong>Stop #{stop.stopNumber} — {stop.shop_name}</strong><br />
                    Priority: <b>{stop.priority}</b><br />
                    Qty: {stop.quantity}<br />
                    Contact: {stop.shop_contact}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* SIDE PANEL */}
          <div className="dn-panel">
            {!started ? (
              /* ── PREVIEW MODE ── */
              <div className="dn-preview">
                <h3 className="panel-title">Route Preview</h3>

                <div className="dn-shop-row">
                  <div className="dn-num shop-dot">S</div>
                  <div className="dn-info">
                    <span className="dn-name">Juice Shop</span>
                    <span className="dn-sub">Start · Pickup Point</span>
                  </div>
                </div>

                {route.map((stop, i) => (
                  <div key={stop.id} className="dn-preview-row">
                    <div className="dn-connector" />
                    <div className="dn-num" style={{ background: priorityColor(stop.priority) }}>
                      {stop.stopNumber}
                    </div>
                    <div className="dn-info">
                      <span className="dn-name">{stop.shop_name}</span>
                      <span className="dn-sub">
                        <span className={`pbadge pb-${stop.priority?.toLowerCase()}`}>{stop.priority}</span>
                        &nbsp;· {stop.distanceKm} km · Qty {stop.quantity}
                      </span>
                    </div>
                  </div>
                ))}

                {route.length === 0 && (
                  <p className="dn-empty">No active assignments found.</p>
                )}

                {route.length > 0 && (
                  <button className="btn-start-delivery full-btn" onClick={handleStart}>
                    ▶&nbsp; Start &amp; Navigate to Stop 1
                  </button>
                )}
              </div>
            ) : allDone ? (
              /* ── ALL DONE ── */
              <div className="dn-done">
                <div className="done-circle">✓</div>
                <h2>All Deliveries Done!</h2>
                <p>You completed all {route.length} stops successfully.</p>
                <button className="btn-reset" onClick={() => { setStarted(false); setActiveStop(0); }}>
                  ↺ Start New Route
                </button>
              </div>
            ) : (
              /* ── ACTIVE MODE ── */
              <div className="dn-active">
                {/* Current stop card */}
                <div className="current-stop-card">
                  <div className="cs-header">
                    <span className="cs-label">Current Delivery</span>
                    <span className={`pbadge pb-${route[activeStop].priority?.toLowerCase()}`}>
                      {route[activeStop].priority}
                    </span>
                  </div>
                  <div className="cs-body">
                    <div
                      className="cs-num"
                      style={{ background: priorityColor(route[activeStop].priority) }}
                    >
                      {route[activeStop].stopNumber}
                    </div>
                    <div className="cs-info">
                      <span className="cs-name">{route[activeStop].shop_name}</span>
                      <span className="cs-detail">📦 Qty: {route[activeStop].quantity}</span>
                      <span className="cs-detail">📞 {route[activeStop].shop_contact}</span>
                      <span className="cs-detail">📍 {route[activeStop].distanceKm} km from previous</span>
                    </div>
                  </div>
                  <div className="cs-actions">
                    <button className="btn-maps" onClick={handleNavigateCurrent}>
                      🗺️ Open in Google Maps
                    </button>
                    <button
                      className="btn-delivered"
                      onClick={handleNextStop}
                    >
                      ✓ Delivered — {activeStop + 1 < route.length ? `Go to Stop ${activeStop + 2}` : 'Finish'}
                    </button>
                  </div>
                </div>

                {/* Next stop preview */}
                {activeStop + 1 < route.length && (
                  <div className="next-stop-preview">
                    <span className="next-label">Up next</span>
                    <div className="dn-preview-row compact">
                      <div className="dn-num small" style={{ background: priorityColor(route[activeStop + 1].priority) }}>
                        {activeStop + 2}
                      </div>
                      <div className="dn-info">
                        <span className="dn-name">{route[activeStop + 1].shop_name}</span>
                        <span className="dn-sub">{route[activeStop + 1].distanceKm} km</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* All stops tracker */}
                <div className="stops-tracker">
                  <span className="tracker-label">All Stops</span>
                  {route.map((stop, i) => (
                    <div
                      key={stop.id}
                      className={`tracker-row ${i < activeStop ? 'done' : i === activeStop ? 'active' : 'pending'}`}
                    >
                      <div
                        className="tracker-dot"
                        style={{ background: i < activeStop ? '#16a34a' : priorityColor(stop.priority) }}
                      >
                        {i < activeStop ? '✓' : stop.stopNumber}
                      </div>
                      <span className="tracker-name">{stop.shop_name}</span>
                      {i === activeStop && <span className="tracker-here">← here</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverNavigation;
