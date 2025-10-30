import React from 'react';  // ← ADD THIS
import { useState } from 'react';
import axios from 'axios';

export default function AdminLogin({ onLogin }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/login', creds);
      localStorage.setItem('adminToken', res.data.token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="admin-login">
      <h2>Admin Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Username"
          value={creds.username}
          onChange={e => setCreds({ ...creds, username: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={creds.password}
          onChange={e => setCreds({ ...creds, password: e.target.value })}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}