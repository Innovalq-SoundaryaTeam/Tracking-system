import React, { useState, useEffect } from 'react';
import '../css/Sellers.css';
import { authAPI, directoryAPI } from '../services/api';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSeller, setCurrentSeller] = useState({
    company: '', contact: '', type: '', aadhar: '', username: '', password: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await directoryAPI.getSellers();
        setSellers(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // --- OPEN MODAL FOR NEW SELLER ---
  const handleAddNewClick = () => {
    setIsEditing(false);
    setCurrentSeller({ company: '', contact: '', type: '', aadhar: '', username: '', password: '' });
    setIsModalOpen(true);
  };

  // --- OPEN MODAL FOR EDITING ---
  const handleEditClick = (seller) => {
    setIsEditing(true);
    setCurrentSeller(seller);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const payload = {
          company: currentSeller.company,
          contact: currentSeller.contact,
          type: currentSeller.type,
          aadhar: currentSeller.aadhar,
          rating: currentSeller.rating || "New",
        };
        const res = await directoryAPI.updateSeller(currentSeller.id, payload);
        setSellers(sellers.map(s => s.id === currentSeller.id ? res.data : s));
      } else {
        const email = (currentSeller.username || '').trim();
        if (!email || !email.includes('@') || !email.includes('.')) {
          alert('Please enter a valid email for Username');
          return;
        }
        try {
          await authAPI.register({
            full_name: currentSeller.company,
            email,
            phone: currentSeller.contact,
            password: currentSeller.password,
            role: 'SELLER',
          });
        } catch (err) {
          const detail = err?.response?.data?.detail || '';
          if (!(err?.response?.status === 400 && String(detail).toLowerCase().includes('email already registered'))) {
            throw err;
          }
        }
        const profileRes = await directoryAPI.createSeller({
          company: currentSeller.company,
          contact: currentSeller.contact,
          type: currentSeller.type,
          aadhar: currentSeller.aadhar,
          rating: "New",
        });
        setSellers([profileRes.data, ...sellers]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSeller = async (id) => {
    if(window.confirm("Are you sure you want to delete this seller?")) {
      try {
        await directoryAPI.deleteSeller(id);
        setSellers(sellers.filter(s => s.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="header-row">
        <h2>Sellers Directory</h2>
        <button className="btn-add" onClick={handleAddNewClick}>+ Add Seller</button>
      </div>

      <div className="seller-list">
        {sellers.map(seller => (
          <div className="seller-card" key={seller.id}>
            <div className="seller-info">
              <h3>{seller.company}</h3>
              <p><strong>Contact:</strong> {seller.contact}</p>
              <p><strong>Category:</strong> {seller.type}</p>
              <p><strong>Aadhar:</strong> {seller.aadhar}</p>
              <span className="trust-tag">{seller.rating} Reliability</span>
            </div>
            <div className="action-buttons">
              <button className="btn-edit-small" onClick={() => handleEditClick(seller)}>Edit</button>
              <button className="btn-delete-small" onClick={() => deleteSeller(seller.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{isEditing ? "Update Seller Details" : "Add New Seller"}</h3>
            <form onSubmit={handleSave}>
              <input type="text" placeholder="Company Name" required value={currentSeller.company} 
                onChange={(e) => setCurrentSeller({...currentSeller, company: e.target.value})} />
              
              <input type="text" placeholder="Contact Person" required value={currentSeller.contact} 
                onChange={(e) => setCurrentSeller({...currentSeller, contact: e.target.value})} />
              
              <input type="text" placeholder="Category" required value={currentSeller.type} 
                onChange={(e) => setCurrentSeller({...currentSeller, type: e.target.value})} />
              
              <input type="text" placeholder="Aadhar Number" required value={currentSeller.aadhar} 
                onChange={(e) => setCurrentSeller({...currentSeller, aadhar: e.target.value})} />
              
              {!isEditing && (
                <>
                  <hr />
                  <input type="email" placeholder="Email" required value={currentSeller.username} 
                    onChange={(e) => setCurrentSeller({...currentSeller, username: e.target.value})} />
                  <input type="password" placeholder="Password" required value={currentSeller.password} 
                    onChange={(e) => setCurrentSeller({...currentSeller, password: e.target.value})} />
                </>
              )}
              
              <div className="modal-actions">
                <button type="submit" className="btn-save">{isEditing ? "Update" : "Register"}</button>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;
