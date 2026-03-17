import { useState, useEffect, useRef, useCallback } from 'react';
import { jobsAPI, stockAPI } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import '../css/AdminDasboard.css';

function AdminDashboard({ totalStock }) {

  const [stats, setStats] = useState({
    totalJobs: 0,
    waitingJobs: 0,
    inTransitJobs: 0,
    completedJobs: 0,
    availableStock: 0,
  });

  const [weeklyData, setWeeklyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [acceptanceAlerts, setAcceptanceAlerts] = useState([]);
  const [newJobAlerts, setNewJobAlerts] = useState([]);
  const [expiredAlerts, setExpiredAlerts] = useState([]);
  const [milestoneReminders, setMilestoneReminders] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenAlerts, setSeenAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_seen_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyJobs, setDailyJobs] = useState([]);
  const selectedDateRef = useRef(null);

  const fetchDateData = useCallback(async (date) => {
    try {
      const formattedDate = date.toISOString().split("T")[0];
      const [statsRes, jobsRes] = await Promise.all([
        jobsAPI.getDailyStats(formattedDate),
        jobsAPI.getJobsByDate(formattedDate)
      ]);
      const data = statsRes.data;
      setStats((prev) => ({
        ...prev,
        totalJobs: data.total_jobs,
        waitingJobs: data.waiting_jobs,
        inTransitJobs: data.transit_jobs,
        completedJobs: data.completed_jobs,
      }));
      setDailyJobs(jobsRes.data.jobs || []);
    } catch (error) {
      console.error("Calendar fetch error:", error);
    }
  }, []);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    selectedDateRef.current = date;
    fetchDateData(date);
  };
  const fetchDashboardData = async () => {

    try {

      const [jobsResponse, stockResponse, alertsResponse] = await Promise.all([
        jobsAPI.getAllJobs({ per_page: 1000 }),
        stockAPI.getStock(),
        jobsAPI.getAssignmentAlerts(),
      ]);

      const jobs = jobsResponse.data.jobs || [];
      const stock = stockResponse.data || {};
      setAcceptanceAlerts(alertsResponse.data.admin_acceptance_alerts || []);
      setNewJobAlerts(alertsResponse.data.admin_new_job_alerts || []);
      setExpiredAlerts(alertsResponse.data.admin_expired_alerts || []);
      setMilestoneReminders(alertsResponse.data.admin_milestone_reminders || []);

      const transit = jobs.filter(j => j.status === "IN_TRANSIT").length;
      const completed = jobs.filter(j => j.status === "COMPLETED").length;
      const waiting = jobs.length - transit - completed;

      // Weekly chart
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekly = [0, 0, 0, 0, 0, 0, 0];

      jobs.forEach(job => {
        if (job.created_at) {
          const date = new Date(job.created_at);
          const index = date.getDay();
          weekly[index]++;
        }
      });

      const weeklyChart = days.map((day, index) => ({
        day,
        jobs: weekly[index]
      }));

      setWeeklyData(weeklyChart);

      // Only set overall stats when no date is selected
      if (!selectedDateRef.current) {
        setStats({
          totalJobs: jobs.length,
          waitingJobs: waiting,
          inTransitJobs: transit,
          completedJobs: completed,
          availableStock: stock.available_stock || 0,
        });
      }

      setStatusData([
        { name: "Pending", value: waiting },
        { name: "Transit", value: transit },
        { name: "Completed", value: completed },
      ]);

      // Auto-refresh selected date data if a date is active
      if (selectedDateRef.current) {
        await fetchDateData(selectedDateRef.current);
      }

    } catch (error) {
      console.error(error);
    }

  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2000);
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#f59e0b', '#8b5cf6', '#10b981'];
  const popupAlerts = [
    ...newJobAlerts.map((a) => ({
      key: `new-${a.job_id}-${a.minutes_passed}`,
      text: `New job posted: ${a.serial_number} (${a.shop_name}).`,
    })),
    ...acceptanceAlerts.map((a) => ({
      key: `accept-${a.job_id}-${a.assigned_minutes_ago}`,
      text: `Driver accepted job ${a.serial_number}.`,
    })),
    ...expiredAlerts.map((a) => ({
      key: `expired-${a.job_id}-${a.minutes_passed}`,
      text: `Job ${a.serial_number} was not accepted within 48 hours.`,
    })),
    ...milestoneReminders.map((a) => ({
      key: `milestone-${a.job_id}-${a.reminder_type}`,
      text: `Reminder ${a.reminder_type.replace('_', ' ')}: Job ${a.serial_number} still waiting.`,
    })),
  ];
  const seenKeys = seenAlerts.map((a) => a.key);
  const unseenAlerts = popupAlerts.filter((a) => !seenKeys.includes(a.key));
  const totalNotifications = unseenAlerts.length;

  const handleOpenNotifications = () => setShowNotifications(true);
  const handleSeenAndClose = () => {
    const newlySeen = unseenAlerts.map((a) => ({
      key: a.key,
      text: a.text,
      seen_at: new Date().toISOString(),
    }));
    if (newlySeen.length > 0) {
      setSeenAlerts((prev) => {
        const filtered = prev.filter((p) => !newlySeen.some((n) => n.key === p.key));
        return [...newlySeen, ...filtered];
      });
    }
    setShowNotifications(false);
  };

  useEffect(() => {
    localStorage.setItem('admin_seen_alerts', JSON.stringify(seenAlerts));
  }, [seenAlerts]);

  return (
    <div className="main-content">

      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Overview</h1>
        <button
          className={`notification-btn ${totalNotifications > 0 ? 'has-alert' : ''}`}
          onClick={handleOpenNotifications}
          type="button"
          title="Notifications"
          aria-label="Notifications"
        >
          <span aria-hidden="true">🔔</span>
          {totalNotifications > 0 && (
            <span className="notification-badge">{totalNotifications}</span>
          )}
        </button>
      </div>

      {showNotifications && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal">
            <h3>Notifications</h3>
            {unseenAlerts.length > 0 ? (
              <ul className="notif-list">
                {unseenAlerts.map((item) => (
                  <li key={item.key}>{item.text}</li>
                ))}
              </ul>
            ) : seenAlerts.length > 0 ? (
              <>
                <p className="text-secondary">Seen History</p>
                <ul className="notif-list">
                  {seenAlerts.slice(0, 10).map((item) => (
                    <li key={item.key}>{item.text}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-secondary">No notifications.</p>
            )}
            <div className="notif-actions">
              <button className="btn" onClick={handleSeenAndClose}>
                {unseenAlerts.length > 0 ? 'Mark as Seen' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">

        <div className="stat-box">
          <p>Total Jobs</p>
          <h2>{stats.totalJobs}</h2>
        </div>

        <div className="stat-box">
          <p>Pending</p>
          <h2>{stats.waitingJobs}</h2>
        </div>

        <div className="stat-box">
          <p>In Transit</p>
          <h2>{stats.inTransitJobs}</h2>
        </div>

        <div className="stat-box">
          <p>Completed</p>
          <h2>{stats.completedJobs}</h2>
        </div>

        <div className="stat-box">
          <p>Available Stock</p>
          <h2>{totalStock !== undefined ? totalStock : stats.availableStock}</h2>
        </div>

      </div>

      <div className="charts-row">

        <div className="chart-card">
          <h3>Weekly Jobs</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="jobs"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Job Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="calendar-card">
          <h3>Job Calendar</h3>
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
          />
        </div>
      </div>
      {/* JOB TABLE BELOW CALENDAR */}
{selectedDate && dailyJobs.length === 0 && (
  <div className="daily-jobs-card">
    <p className="text-secondary text-center">
      No jobs found for {selectedDate.toISOString().split("T")[0]}
    </p>
  </div>
)}

{selectedDate && dailyJobs.length > 0 && (
  <div className="daily-jobs-card">

    <h3 className="daily-title">
      Jobs on {selectedDate.toISOString().split("T")[0]}
    </h3>

    <table className="jobs-table">
      <thead>
        <tr>
          <th>Serial</th>
          <th>Shop</th>
          <th>Status</th>
          <th>Quantity</th>
          <th>Payment Mode</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        {dailyJobs.map((job) => (
          <tr key={job.id}>
            <td>{job.serial_number}</td>
            <td>{job.shop_name}</td>
            <td>
              <span className={`status-badge ${job.status.toLowerCase()}`}>
                {job.status === 'WAITING' ? 'PENDING' : job.status}
              </span>
            </td>
            <td>{job.quantity}</td>
            <td>{job.payment_mode}</td>
            <td>₹{Number(job.total_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
      </tbody>

    </table>

  </div>
)}

    </div>
  );
}

export default AdminDashboard;
