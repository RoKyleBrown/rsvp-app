import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// const API_URL = 'http://localhost:5000/api';
const API_URL = '/api';  // Relative path — uses OpenLiteSpeed proxy

function App() {
  const [view, setView] = useState('rsvp'); // rsvp | adminLogin | adminDash
  const [stage, setStage] = useState('initial');
  const [formData, setFormData] = useState({
  first_name: '', last_name: '',
  guest1_first: '', guest1_last: '',
  guest2_first: '', guest2_last: '',
  guest3_first: '', guest3_last: '',
  guest4_first: '', guest4_last: '',
  note: ''
});

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitRSVP = async (response) => {
  const data = { ...formData, response };

  // Combine guest first + last names
  if (response === 'yes') {
    for (let i = 1; i <= 4; i++) {
      const first = (data[`guest${i}_first`] || '').trim();
      const last = (data[`guest${i}_last`] || '').trim();

      if (first && last) {
        data[`guest${i}`] = `${first} ${last}`;
      } else if (first || last) {
        alert(`Guest ${i}: Please enter both first and last name.`);
        return;
      } else {
        data[`guest${i}`] = null;
      }

      // Clean up temp fields
      delete data[`guest${i}_first`];
      delete data[`guest${i}_last`];
    }
  }

  try {
    await axios.post(`${API_URL}/rsvp`, data);
    setView('confirmed');
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Error. Please try again.';
    alert(msg);
  }
};

  const goToAdmin = () => setView('adminLogin');
  const goToRSVP = () => setView('rsvp');
  const handleAdminLogin = () => setView('adminDash');
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setView('rsvp');
  };

  return (
    <div className="app">
        <div className="background-image">
            <img src="https://kandrlab.s3.us-east-2.amazonaws.com/ultrasound.jpg" alt="" />
            {view === 'rsvp' && (
        <>
          <button className="admin-link" onClick={goToAdmin}>Admin</button>

          <div className="overlay">
            <div className="KR-sign">
                <img src="https://kandrlab.s3.us-east-2.amazonaws.com/invitation-header-new.png" alt="" />
            </div>
            {stage === 'initial' && (
                <div>
                    <button className="rsvp-btn" onClick={() => setStage('options')}>
                     RSVP
                    </button>
                </div>
            )}

            {stage === 'options' && (
              <div className="options">
                <button onClick={() => setStage('yes')} className="option-btn yes">I can make it!</button>
                <button onClick={() => setStage('no')} className="option-btn no">I cannot attend</button>
                <button onClick={() => setStage('maybe')} className="option-btn maybe">I'm not sure</button>
              </div>
            )}

            {/* RSVP FORM MODAL */}
{(stage === 'yes' || stage === 'no' || stage === 'maybe') && (
  <div className="modal-backdrop" onClick={() => setStage('options')}>
    <div className="rsvp-modal" onClick={(e) => e.stopPropagation()}>
      <form className="rsvp-form" onSubmit={(e) => { e.preventDefault(); submitRSVP(stage); }}>
        <button 
          type="button" 
          className="close-modal-btn" 
          onClick={() => setStage('options')}
        >
          ×
        </button>

        <h3>
          {stage === 'yes' && "We'd love to have you!"}
          {stage === 'no' && "We're sorry you can't make it"}
          {stage === 'maybe' && "That's okay! Let us know if plans change"}
        </h3>
         <p>Enter your name</p>
        <div className="input-group">
          <input name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleInput} required />
          <input name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleInput} required />
        </div>

        {stage === 'yes' && (
  <>
    <div className="guests-section">
      <p className="guest-instructions">
        Please provide <strong>first and last name</strong> for each additional person in your party. Don't include yourself:
      </p>
      {[1,2,3,4].map(i => (
        <div key={i} className="guest-pair">
          <input
            name={`guest${i}_first`}
            placeholder={`Guest ${i} First Name`}
            value={formData[`guest${i}_first`] || ''}
            onChange={handleInput}
            className="guest-first"
            required={formData[`guest${i}_last`] ? true : false}
          />
          <input
            name={`guest${i}_last`}
            placeholder={`Guest ${i} Last Name`}
            value={formData[`guest${i}_last`] || ''}
            onChange={handleInput}
            className="guest-last"
            required={formData[`guest${i}_first`] ? true : false}
          />
        </div>
      ))}
    </div>
            <textarea
              name="note"
              placeholder="Dietary restrictions or notes?"
              value={formData.note}
              onChange={handleInput}
              rows="3"
            />
          </>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => setStage('options')} className="back-btn">Back</button>
          <button type="submit" className="submit-btn">Submit</button>
        </div>
      </form>
    </div>
  </div>
)}
        </div>
        <div className="footer">
            <strong>
                <p>Please RSVP by Nov. 19<sup>th</sup> &mdash; <a  href="https://www.babylist.com/list/kandr4ever">Registry</a>.</p>
            </strong>
        </div>
        </>
      )}

      {view === 'adminLogin' && (
        <div className="admin-overlay">
          <button className="back-to-rsvp" onClick={goToRSVP}>Back</button>
          <AdminLogin onLogin={handleAdminLogin} />
        </div>
      )}

      {view === 'adminDash' && (
        <div className="admin-overlay">
          <AdminDashboard onLogout={handleLogout} />
        </div>
      )}
            {view === 'confirmed' && (
        <div className="confirmation-overlay">
          <div className="confirmation-card">
            <h2>Thank You!</h2>
            <p className="conf-message">
              Your RSVP has been received.
            </p>
            <div className="registry-link">
              <a 
                href="https://www.babylist.com/list/kandr4ever" 
                target="_blank" 
                rel="noopener noreferrer"
                className="registry-btn"
              >
                View Registry
              </a>
            </div>
            <button 
              onClick={() => {
                setView('rsvp');
                setStage('initial');
                setFormData({
  first_name: '', last_name: '',
  guest1_first: '', guest1_last: '',
  guest2_first: '', guest2_last: '',
  guest3_first: '', guest3_last: '',
  guest4_first: '', guest4_last: '',
  note: ''
});
              }} 
              className="back-to-rsvp-btn"
            >
              Back to Invitation
            </button>
          </div>
        </div>
      )}
        </div> 
    </div>
  );
}

export default App;