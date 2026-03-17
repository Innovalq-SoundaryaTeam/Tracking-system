import React, { useState, useEffect } from 'react'; // Added useState and useEffect
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin, isSeller, isDriver } from './services/auth';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AllJobs from './pages/AllJobs';
import CreateJob from './pages/CreateJob';
import MyAssignments from './pages/MyAssignments';
import AvailableJobs from './pages/AvailableJobs';
import Drivers from './pages/Drivers';
import Sellers from './pages/Sellers';
import StockManagement from './pages/StockManagement';
import ActivityLogs from './pages/ActivityLogs';
import Layout from './components/Layout';
import CompletedTasks from "./pages/CompletedTasks";
import Accounts from './pages/Accounts';
import LocationRoute from './pages/LocationRoute';
import DriverNavigation from './pages/DriverNavigation';

// ✅ FIXED ProtectedRoute
function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && !requiredRole()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ✅ Updated DashboardRoute to accept props
function DashboardRoute({ totalStock }) {
  if (isAdmin()) return <AdminDashboard totalStock={totalStock} />;
  if (isSeller()) return <SellerDashboard />;
  if (isDriver()) return <DriverDashboard />;
  return <Navigate to="/login" replace />;
}

function App() {
  // 📦 1. Shared Stock State with LocalStorage
  const [stockItems, setStockItems] = useState(() => {
    const savedData = localStorage.getItem('hotelStock');
    return savedData ? JSON.parse(savedData) : [
      { id: 1, name: "Bottled Water", level: 100, count: 957 },
      { id: 2, name: "Canned Goods", level: 10, count: 50 },
    ];
  });

  // 💾 2. Sync LocalStorage whenever stock changes
  useEffect(() => {
    localStorage.setItem('hotelStock', JSON.stringify(stockItems));
  }, [stockItems]);

  // 🔔 3. Notification Polling (New)
  useEffect(() => {
    const checkAlerts = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:8000/jobs/pickup-alerts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.total_alerts > 0) {
            // Check if any alert is URGENT to change the title
            const hasUrgent = data.alerts.some(a => a.priority === 'URGENT');
            const title = hasUrgent ? '⚠️ URGENT NOTIFICATIONS' : 'NOTIFICATIONS';

            const displayAlerts = data.alerts.slice(0, 3);
            const messages = displayAlerts.map(a => a.message).join('\n');
            const more = data.total_alerts > 3 ? `\n...and ${data.total_alerts - 3} more.` : '';
            alert(`${title}:\n${messages}${more}`); 
          }
        }
      } catch (error) {
        console.error("Failed to fetch alerts", error);
      }
    };

    const interval = setInterval(checkAlerts, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  // 🧮 4. Calculate total for the Dashboard
  const totalAvailableStock = stockItems.reduce((acc, item) => acc + item.count, 0);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/completed-tasks" element={<CompletedTasks />} />
        <Route path="/accounts" element={<Accounts />} />
        
        <Route
          path="/create-job"
          element={
            <ProtectedRoute requiredRole={isSeller}>
              <Layout>
                <CreateJob />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/available-jobs"
          element={
            <ProtectedRoute requiredRole={isDriver}>
              <Layout>
                <AvailableJobs />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-assignments"
          element={
            <ProtectedRoute requiredRole={() => isDriver() || isSeller()}>
              <Layout>
                <MyAssignments />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                {/* 🎯 Passing total stock to the dashboard */}
                <DashboardRoute totalStock={totalAvailableStock} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                <AllJobs />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/drivers"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                <Drivers />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sellers"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                <Sellers />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                {/* 🎯 Passing state and setter to management page */}
                <StockManagement stockItems={stockItems} setStockItems={setStockItems} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                <ActivityLogs />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/location"
          element={
            <ProtectedRoute requiredRole={isAdmin}>
              <Layout>
                <LocationRoute />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/navigation"
          element={
            <ProtectedRoute requiredRole={isDriver}>
              <Layout>
                <DriverNavigation />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
