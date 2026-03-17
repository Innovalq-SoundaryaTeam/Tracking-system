import React, { useState, useEffect } from 'react';
import '../css/Drivers.css';
import { authAPI, directoryAPI } from '../services/api';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Tracks if we are editing
  const [currentDriver, setCurrentDriver] = useState({
    name: '', license: '', contact: '', username: '', password: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await directoryAPI.getDrivers();
        setDrivers(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // --- OPEN MODAL FOR NEW DRIVER ---
  const handleAddNewClick = () => {
    setIsEditing(false);
    setCurrentDriver({ name: '', license: '', contact: '', username: '', password: '' });
    setIsModalOpen(true);
  };

  // --- OPEN MODAL FOR EDITING ---
  const handleEditClick = (driver) => {
    setIsEditing(true);
    setCurrentDriver(driver);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const payload = {
          name: currentDriver.name,
          license: currentDriver.license,
          contact: currentDriver.contact,
          status: currentDriver.status || 'Active',
        };
        const res = await directoryAPI.updateDriver(currentDriver.id, payload);
        setDrivers(drivers.map(d => d.id === currentDriver.id ? res.data : d));
      } else {
        const email = (currentDriver.username || '').trim();
        if (!email || !email.includes('@') || !email.includes('.')) {
          alert('Please enter a valid email for Username');
          return;
        }
        let userId = null;
        try {
          const userRes = await authAPI.register({
            full_name: currentDriver.name,
            email,
            phone: currentDriver.contact,
            password: currentDriver.password,
            role: 'DRIVER',
          });
          userId = userRes.data.id;
        } catch (err) {
          const detail = err?.response?.data?.detail || '';
          if (!(err?.response?.status === 400 && String(detail).toLowerCase().includes('email already registered'))) {
            throw err;
          }
        }
        const profileRes = await directoryAPI.createDriver({
          user_id: userId,
          name: currentDriver.name,
          license: currentDriver.license,
          contact: currentDriver.contact,
          status: 'Active',
        });
        setDrivers([profileRes.data, ...drivers]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDriver = async (id) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        await directoryAPI.deleteDriver(id);
        setDrivers(drivers.filter(d => d.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="header-row">
        <h2>Drivers Management</h2>
        <button className="btn-add" onClick={handleAddNewClick}>+ Add Driver</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>License</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(driver => (
            <tr key={driver.id}>
              <td>{driver.name}</td>
              <td>{driver.license}</td>
              <td>{driver.contact}</td>
              <td><span className={`status-badge ${driver.status.toLowerCase()}`}>{driver.status}</span></td>
              <td className="action-buttons">
                <button className="btn-edit" onClick={() => handleEditClick(driver)}>Edit</button>
                <button className="btn-delete" onClick={() => deleteDriver(driver.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{isEditing ? "Update Driver Details" : "Create New Driver"}</h3>
            <form onSubmit={handleSave}>
              <input type="text" placeholder="Full Name" required value={currentDriver.name} 
                onChange={(e) => setCurrentDriver({...currentDriver, name: e.target.value})} />
              
              <input type="text" placeholder="License" required value={currentDriver.license} 
                onChange={(e) => setCurrentDriver({...currentDriver, license: e.target.value})} />
              
              <input type="text" placeholder="Contact" required value={currentDriver.contact} 
                onChange={(e) => setCurrentDriver({...currentDriver, contact: e.target.value})} />

              {!isEditing && (
                <>
                  <input type="email" placeholder="Email" required value={currentDriver.username} 
                    onChange={(e) => setCurrentDriver({...currentDriver, username: e.target.value})} />
                  <input type="password" placeholder="Password" required value={currentDriver.password} 
                    onChange={(e) => setCurrentDriver({...currentDriver, password: e.target.value})} />
                </>
              )}
              
              <div className="modal-actions">
                <button type="submit" className="btn-save">{isEditing ? "Update" : "Save"}</button>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
