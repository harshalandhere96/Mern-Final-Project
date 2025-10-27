import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import '../Auth.css';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('Error', 'Please fix the form errors', 'error');
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      showNotification('Success', 'Welcome back!', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to sign in. Please try again.';
      
      showNotification('Error', errorMessage, 'error');
      
      // Handle specific errors
      if (error.response?.status === 401) {
        setErrors({
          email: 'Invalid credentials',
          password: 'Invalid credentials'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setFormData({
      email: 'demo@watchdogs.com',
      password: 'demo123'
    });
    
    showNotification('Info', 'Demo credentials loaded. Click Sign In.', 'info');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-logo">
            <h1>🐕 WatchDogs</h1>
            <p>Travel Safe, Stay Protected</p>
          </div>
          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">🛡️</span>
              <div>
                <h3>Real-time Safety Alerts</h3>
                <p>Get instant notifications about safety concerns</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <div>
                <h3>Community Reports</h3>
                <p>Share and access safety information from travelers</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <div>
                <h3>AI Travel Companion</h3>
                <p>Get personalized safety recommendations</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🆔</span>
              <div>
                <h3>Digital ID Integration</h3>
                <p>Secure DigiYatra for seamless travel</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h2>Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your WatchDogs account</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                error={errors.email}
                disabled={loading}
                required
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                error={errors.password}
                disabled={loading}
                required
              />

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="demo-btn"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                🎮 Try Demo Account
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup">Sign up for free</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;