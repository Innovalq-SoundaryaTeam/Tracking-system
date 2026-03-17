import React, { useState, useEffect } from 'react';
import { stockAPI } from '../services/api';
import '../css/StockManagement.css';

const StockManagement = () => {
  // 1. Initialize state: Check if data exists in LocalStorage first
  const [stockItems, setStockItems] = useState(() => {
  const savedData = localStorage.getItem('thiraaJuiceStock');

  return savedData
    ? JSON.parse(savedData)
    : [
        { id: 1, name: "Thiraa Juice - Mango", level: 60, count: 600 },
        { id: 2, name: "Thiraa Juice - Orange", level: 40, count: 400 },
        { id: 3, name: "Thiraa Juice - Grapes", level: 30, count: 300 },
        { id: 4, name: "Thiraa Juice - Apple", level: 50, count: 500 },
        { id: 5, name: "Thiraa Juice - Lemon", level: 20, count: 200 },
        { id: 6, name: "Thiraa Juice - Paneer", level: 70, count: 700 },
      ];
});
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [newCount, setNewCount] = useState("");

  // 2. Save to LocalStorage automatically whenever stockItems changes
  useEffect(() => {
    localStorage.setItem('thiraaJuiceStock', JSON.stringify(stockItems));
  }, [stockItems]);

  // 3. On mount, sync current localStorage total to backend if backend stock is 0
  useEffect(() => {
    const syncToBackend = async () => {
      try {
        const res = await stockAPI.getStock();
        if (res.data.available_stock === 0) {
          const total = stockItems.reduce((sum, item) => sum + item.count, 0);
          await stockAPI.updateStock({
            total_produced: total,
            available_stock: total,
            damaged_stock: 0,
          });
        }
      } catch (err) {
        // Not admin or network error — ignore silently
      }
    };
    syncToBackend();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditClick = (item) => {
    setCurrentItem(item);
    setNewCount(item.count);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const updatedCount = parseInt(newCount);
    const updatedItems = stockItems.map(item =>
      item.id === currentItem.id
        ? { ...item, count: updatedCount, level: Math.min((updatedCount / 1000) * 100, 100) }
        : item
    );

    setStockItems(updatedItems);
    setIsEditing(false);

    // Sync total available stock to backend
    const totalAvailable = updatedItems.reduce((sum, item) => sum + item.count, 0);
    try {
      await stockAPI.updateStock({
        total_produced: totalAvailable,
        available_stock: totalAvailable,
        damaged_stock: 0,
      });
    } catch (err) {
      console.error('Failed to sync stock with backend:', err);
    }
  };

  return (
    <div className="page-container">
      <h2>Stock Inventory</h2>
      <div className="stock-grid">
        {stockItems.map(item => (
          <div className="stock-card" key={item.id}>
            <h4>{item.name}</h4>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${item.level}%`, backgroundColor: item.level < 20 ? 'red' : '#4caf50' }}></div>
            </div>
            <p>{item.count} Units Available</p>
            <button className="btn-update" onClick={() => handleEditClick(item)}>Update Stock</button>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update {currentItem.name}</h3>
            <form onSubmit={handleUpdate}>
              <label>New Stock Count:</label>
              <input 
                type="number" 
                value={newCount} 
                onChange={(e) => setNewCount(e.target.value)} 
                required 
              />
              <div className="modal-actions">
                <button type="submit" className="btn-save">Save Changes</button>
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;