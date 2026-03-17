import { useState, useEffect, useCallback } from 'react';
import { deliveryProofsAPI, jobsAPI } from '../services/api';
import Map from './Map';
import '../css/DeliveryProofUpload.css';

function DeliveryProofUpload({ jobId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState({ latitude: 13.0827, longitude: 80.2707 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [job, setJob] = useState(null);

  const fetchJobDetails = useCallback(async () => {
    try {
      const response = await jobsAPI.getMyJobs();
      const jobData = response.data.jobs.find(j => String(j.id) === String(jobId));
      if (jobData) {
        setJob(jobData);
        if (jobData.latitude != null && jobData.longitude != null) {
          setLocation({ latitude: jobData.latitude, longitude: jobData.longitude });
        }
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setError('');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only JPG and PNG files are allowed');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleLocationSelect = (newLocation) => {
    setLocation(newLocation);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
        },
        () => {
          setError('Unable to get current location');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!jobId) {
      setError('Invalid job. Please try again.');
      return;
    }

    if (!file) {
      setError('Please select a file');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);

      await deliveryProofsAPI.uploadProof(jobId, formData);
      setFile(null);

      setSuccess("Delivery proof uploaded successfully!");

      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card delivery-proof-upload">
      <h3>Upload Delivery Proof</h3>
      
      {job && (
        <div className="mb-20">
          <p><strong>Job:</strong> {job.serial_number}</p>
          <p><strong>Shop:</strong> {job.shop_name}</p>
          <p><strong>Quantity:</strong> {job.quantity}</p>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Delivery Photo *</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="form-input"
            required
          />
          <small className="text-secondary">
            Allowed formats: JPG, PNG. Max size: 5MB
          </small>
        </div>
        
        <div className="form-group">
          <label className="form-label">Delivery Location</label>
          <div className="flex gap-10 mb-10">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="btn btn-success"
            >
              Use Current Location
            </button>
            <div className="text-secondary" style={{ display: 'flex', alignItems: 'center' }}>
              {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <Map
            center={[location.latitude, location.longitude]}
            onLocationSelect={handleLocationSelect}
            height="300px"
            interactive={true}
          />
        </div>
        
        <button
          type="submit"
          className="btn"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Uploading...' : 'Upload Proof'}
        </button>
      </form>
    </div>
  );
}

export default DeliveryProofUpload;
