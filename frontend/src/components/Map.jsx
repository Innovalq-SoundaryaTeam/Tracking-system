import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ✅ This makes map move when center changes
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function MapEvents({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect({ latitude: lat, longitude: lng });
    },
  });
  return null;
}

function Map({ 
  center = [13.0827, 80.2707],
  zoom = 12,
  markers = [],
  onLocationSelect,
  height = '400px',
  interactive = true 
}) {

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        {/* ✅ IMPORTANT: This makes map react to center changes */}
        <ChangeMapView center={center} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Selected Location Marker */}
        {center && (
          <Marker position={center}>
            <Popup>
              Selected Location
            </Popup>
          </Marker>
        )}
        
        {/* Extra markers */}
        {markers.map((marker, index) => (
          <Marker key={index} position={[marker.latitude, marker.longitude]}>
            <Popup>
              <div>
                <strong>{marker.title || 'Location'}</strong>
                {marker.shop_name && <p>Shop: {marker.shop_name}</p>}
                {marker.quantity && <p>Quantity: {marker.quantity}</p>}
                {marker.status && <p>Status: {marker.status}</p>}
                {marker.serial_number && <p>Serial: {marker.serial_number}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {interactive && onLocationSelect && (
          <MapEvents onLocationSelect={onLocationSelect} />
        )}
      </MapContainer>
    </div>
  );
}

export default Map;
