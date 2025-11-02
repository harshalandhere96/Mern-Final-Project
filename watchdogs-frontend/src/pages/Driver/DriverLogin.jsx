import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DriverLogin.css';

const DriverLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/driver/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Store token
        localStorage.setItem('driverToken', data.token);
        localStorage.setItem('driverData', JSON.stringify(data.driver));
        
        alert('✅ Login successful!');
        navigate('/driver/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-login">
      <div className="login-container">
        <div className="login-header">
          <h1>🚕 Driver Login</h1>
          <p>Sign in to your driver account</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary full-width"
            disabled={loading}
          >
            {loading ? 'Logging in...' : '🚗 Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account? 
            <Link to="/driver/register"> Register as Driver</Link>
          </p>
          <p>
            <Link to="/signin">Login as User</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;