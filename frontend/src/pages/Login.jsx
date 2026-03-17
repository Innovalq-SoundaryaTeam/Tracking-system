import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setAuth } from '../services/auth';
import '../css/login.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1️⃣ Login
      const response = await authAPI.login(formData);
      const token = response.data.access_token;

      if (!token) {
        throw new Error("Token not received");
      }

      // 2️⃣ Fetch current user (KEEPING YOUR STRUCTURE - using fetch)
      const userResponse = await fetch("http://localhost:8000/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        throw new Error(errorText || "Failed to fetch user");
      }

      const userData = await userResponse.json(); // ✅ Only declared once

      // 3️⃣ Store auth
      setAuth(token, userData);

      // 4️⃣ Redirect
      navigate("/dashboard", { replace: true });

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="login-page">
    <div className="login-card">
      <h2 className="text-center mb-20">Login</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  </div>
);
}

export default Login;
