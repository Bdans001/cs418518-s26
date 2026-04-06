import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [view, setView] = useState('login');
  const [subView, setSubView] = useState('home');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', uin: '', password: '' });
  const [message, setMessage] = useState('');

  // Milestone 2 State
  const [advisingHistory, setAdvisingHistory] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [advisingForm, setAdvisingForm] = useState({
    lastTerm: '', lastGpa: '', currentTerm: '', pastCourses: '', plannedCourses: []
  });

  const availableCourses = ["CS410", "CS411", "CS417", "CS418", "CS462", "CS471", "CS488"];

  useEffect(() => {
    if (view === 'dashboard' && subView === 'advising-history' && user) {
      axios.get(`http://localhost:5000/api/advising-history/${user.email}`)
        .then(res => setAdvisingHistory(res.data))
        .catch(err => console.error(err));
    }
  }, [view, subView, user]);

  const isFrozen = editingRecordId && advisingHistory.find(r => r.id === editingRecordId)?.status !== 'Pending';

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = view === 'login' ? '/login' : '/register';
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, formData);
      if (view === 'login') {
        setUser(res.data.user);
        setView('2fa');
      } else {
        setMessage("Registration successful! Please log in.");
        setView('login');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Authentication failed');
    }
  };

  const submitAdvising = async (e) => {
    e.preventDefault();
    if (isFrozen) return;
    try {
      const payload = {
        email: user.email,
        lastTerm: advisingForm.lastTerm, lastGpa: advisingForm.lastGpa,
        currentTerm: advisingForm.currentTerm,
        pastCourses: advisingForm.pastCourses.split(',').map(s => s.trim()),
        plannedCourses: advisingForm.plannedCourses
      };
      if (editingRecordId) await axios.put(`http://localhost:5000/api/update-advising/${editingRecordId}`, payload);
      else await axios.post('http://localhost:5000/api/submit-advising', payload);
      setSubView('advising-history');
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed");
    }
  };

  const loadRecord = async (id, status) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/advising-record/${id}`);
      setAdvisingForm({
        lastTerm: res.data.last_term_attended || '', lastGpa: res.data.last_gpa || '',
        currentTerm: res.data.current_term || '', pastCourses: '',
        plannedCourses: res.data.plannedCourses || []
      });
      setEditingRecordId(id);
      setSubView('advising-form');
    } catch (err) { alert("Failed to load record."); }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Enter your registered email address:");
    if (!email) return;
    const newPass = prompt("Enter your new password:");
    if (!newPass) return;
    try {
      await axios.post('http://localhost:5000/reset-password', { email, newPassword: newPass });
      alert("Password reset successfully! You can now log in.");
    } catch (err) {
      alert("Failed to reset password. Make sure the email is registered.");
    }
  };

  // ==========================================
  // CUSTOM CSS FOR PREMIUM UI
  // ==========================================
  const customStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; font-family: 'Inter', sans-serif; background-color: #f3f4f6; color: #1f2937; }
    input, select { font-family: 'Inter', sans-serif; }
    
    .login-container { display: flex; height: 100vh; }
    .login-left { flex: 1; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); display: flex; flex-direction: column; justify-content: center; padding: 4rem; color: white; }
    .login-right { flex: 1; display: flex; align-items: center; justify-content: center; background: white; }
    .auth-box { width: 100%; max-width: 400px; }
    
    .input-field { width: 100%; padding: 12px 16px; margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; font-size: 15px; transition: border-color 0.2s; }
    .input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .input-field:disabled { background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
    
    .btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background-color: #2563eb; color: white; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
    .btn-primary:hover { background-color: #1d4ed8; }
    .btn-secondary { background-color: #e5e7eb; color: #374151; }
    .btn-secondary:hover { background-color: #d1d5db; }
    .btn-danger { background-color: #ef4444; color: white; padding: 8px 12px; border-radius: 6px; }
    
    .dashboard { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; background-color: #0f172a; color: white; display: flex; flex-direction: column; }
    .sidebar-header { padding: 24px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; }
    .nav-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 24px; background: none; border: none; color: #94a3b8; text-align: left; font-size: 15px; font-weight: 500; cursor: pointer; transition: 0.2s; }
    .nav-btn:hover { background-color: #1e293b; color: white; }
    .nav-active { background-color: #1e293b; color: white; border-left: 4px solid #3b82f6; }
    
    .main-content { flex: 1; padding: 40px; overflow-y: auto; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); margin-bottom: 24px; border: 1px solid #f3f4f6;}
    
    .table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .table th { background-color: #f9fafb; padding: 14px 20px; text-align: left; font-size: 14px; font-weight: 600; color: #6b7280; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
    .table td { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
    .table tr:last-child td { border-bottom: none; }
    
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-pending { background-color: #fef3c7; color: #92400e; }
    .badge-approved { background-color: #d1fae5; color: #065f46; }
    .badge-rejected { background-color: #fee2e2; color: #991b1b; }
    
    .svg-icon { width: 20px; height: 20px; }
  `;

  // ==========================================
  // AUTHENTICATION & 2FA VIEWS
  // ==========================================
  if (view === '2fa') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' }}>
        <style>{customStyles}</style>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ background: '#e0e7ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
             <svg className="svg-icon" style={{color: '#4f46e5', width: '30px', height: '30px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2>Security Checkpoint</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Enter the 6-digit code sent to your device.</p>
          <input type="text" id="mfa-code" className="input-field" placeholder="123456" style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }} />
          <button className="btn btn-primary" onClick={() => {
            if (document.getElementById('mfa-code').value === "123456") setView('dashboard');
            else alert("Invalid code. Try 123456.");
          }}>Verify Identity</button>
        </div>
      </div>
    );
  }

  if (view === 'login' || view === 'register') {
    return (
      <div className="login-container">
        <style>{customStyles}</style>
        <div className="login-left">
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Academic Portal</h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: '1.6' }}>
            Manage your course advising, update your profile, and secure your academic future all in one place.
          </p>
        </div>
        <div className="login-right">
          <div className="auth-box">
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{view === 'login' ? 'Welcome back' : 'Create an account'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>{view === 'login' ? 'Please enter your details to sign in.' : 'Fill out the form below to register.'}</p>
            
            {message && <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{message}</div>}

            <form onSubmit={handleAuth}>
              {view === 'register' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <input className="input-field" type="text" placeholder="First Name" onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                  <input className="input-field" type="text" placeholder="Last Name" onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                </div>
              )}
              {view === 'register' && (
                <input className="input-field" type="text" placeholder="University ID (UIN)" onChange={e => setFormData({...formData, uin: e.target.value})} required />
              )}
              <input className="input-field" type="email" placeholder="Email Address" onChange={e => setFormData({...formData, email: e.target.value})} required />
              <input className="input-field" type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} required />
              
              {view === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <span onClick={handleForgotPassword} style={{ fontSize: '14px', color: '#2563eb', cursor: 'pointer', fontWeight: '500' }}>Forgot password?</span>
                </div>
              )}
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: view === 'register' ? '16px' : '0' }}>
                {view === 'login' ? 'Sign In' : 'Complete Registration'}
              </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '32px', color: '#6b7280', fontSize: '14px' }}>
              {view === 'login' ? "Don't have an account? " : "Already registered? "}
              <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }} onClick={() => { setView(view === 'login' ? 'register' : 'login'); setMessage(''); }}>
                {view === 'login' ? 'Sign up' : 'Log in'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD VIEW
  // ==========================================
  return (
    <div className="dashboard">
      <style>{customStyles}</style>
      
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.isAdmin ? '#ef4444' : '#10b981' }}></div>
            {user.isAdmin ? 'Admin Console' : 'Student Hub'}
          </h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>{user.email}</p>
        </div>
        
        <button className={`nav-btn ${subView === 'home' ? 'nav-active' : ''}`} onClick={() => setSubView('home')}>
          <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          Dashboard Overview
        </button>
        <button className={`nav-btn ${subView === 'profile' ? 'nav-active' : ''}`} onClick={() => setSubView('profile')}>
          <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          My Profile
        </button>
        <button className={`nav-btn ${subView === 'security' ? 'nav-active' : ''}`} onClick={() => setSubView('security')}>
          <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          Security Settings
        </button>
        <button className={`nav-btn ${subView.includes('advising') ? 'nav-active' : ''}`} onClick={() => setSubView('advising-history')}>
          <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Course Advising
        </button>
        
        <div style={{ flex: 1 }}></div>
        <button className="nav-btn" style={{ borderTop: '1px solid #1e293b', color: '#f87171' }} onClick={() => { setView('login'); setUser(null); }}>
          <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Secure Logout
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        
        {subView === 'home' && (
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#111827' }}>Welcome back, {user.firstName}</h1>
            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '32px' }}>Here is a summary of your academic profile and recent activities.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '12px' }}><svg className="svg-icon" style={{color: '#2563eb', width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>
                 <div><h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Active Term</h3><p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>Spring 2026</p></div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <div style={{ background: '#d1fae5', padding: '16px', borderRadius: '12px' }}><svg className="svg-icon" style={{color: '#059669', width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                 <div><h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Account Status</h3><p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>Verified</p></div>
              </div>
            </div>
          </div>
        )}

        {subView === 'profile' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>Personal Information</h2>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Registered Email (Immutable)</label>
              <div style={{ fontWeight: '500', color: '#334155' }}>{user.email}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>First Name</label><input className="input-field" value={user.firstName} onChange={e => setUser({...user, firstName: e.target.value})} /></div>
              <div><label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Last Name</label><input className="input-field" value={user.lastName || ''} onChange={e => setUser({...user, lastName: e.target.value})} /></div>
            </div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>University ID (UIN)</label>
            <input className="input-field" value={user.uin || ''} onChange={e => setUser({...user, uin: e.target.value})} />
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => axios.post('http://localhost:5000/update-profile', user).then(() => alert('Profile Details Saved'))}>Save Changes</button>
          </div>
        )}

        {subView === 'security' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>Security Settings</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Ensure your account is using a strong password to protect your academic records.</p>
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <strong>Note:</strong> You will remain logged in after changing your password.
            </div>
            <button className="btn btn-secondary" style={{ border: '1px solid #d1d5db' }} onClick={() => {
              const p = prompt("Enter your new password:");
              if(p) axios.post('http://localhost:5000/reset-password', {email: user.email, newPassword: p}).then(() => alert('Password Successfully Updated!'))
            }}>Update Password</button>
          </div>
        )}

        {/* MILESTONE 2: HISTORY TABLE */}
        {subView === 'advising-history' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>Course Advising Records</h2>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
                setEditingRecordId(null); 
                setAdvisingForm({lastTerm:'', lastGpa:'', currentTerm:'', pastCourses:'', plannedCourses:[]}); 
                setSubView('advising-form');
              }}>
                <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                New Advising Form
              </button>
            </div>
            
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Term</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {advisingHistory.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No records</td></tr>}
                  {advisingHistory.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.date_submitted).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td style={{ fontWeight: '500' }}>{r.current_term}</td>
                      <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 16px', fontSize: '13px' }} onClick={() => loadRecord(r.id, r.status)}>
                          {r.status === 'Pending' ? 'Edit Record' : 'View Read-Only'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MILESTONE 2: DYNAMIC FORM */}
        {subView === 'advising-form' && (
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '24px', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }} onClick={() => setSubView('advising-history')}>
              <svg className="svg-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Back to Records
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid #e5e7eb', paddingBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0' }}>{isFrozen ? 'Advising Record (Locked)' : 'Course Advising Submission'}</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>Fill out your academic history and plan your upcoming term.</p>
              </div>
              {isFrozen && <span className="badge badge-approved" style={{ fontSize: '14px', padding: '8px 16px' }}>Read-Only Mode</span>}
            </div>
            
            <form onSubmit={submitAdvising}>
              <h3 style={{ fontSize: '16px', color: '#111827', marginBottom: '16px' }}>1. Academic History</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Last Term</label>
                  <input disabled={isFrozen} className="input-field" value={advisingForm.lastTerm} onChange={e => setAdvisingForm({...advisingForm, lastTerm: e.target.value})} placeholder="e.g., Fall 2024" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Last GPA</label>
                  <input disabled={isFrozen} className="input-field" value={advisingForm.lastGpa} onChange={e => setAdvisingForm({...advisingForm, lastGpa: e.target.value})} placeholder="e.g., 3.8" required />
                </div>
              </div>

              {!editingRecordId && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Courses Taken Last Term</label>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '12px' }}>Enter courses separated by commas to prevent overlapping in your plan below.</p>
                  <input className="input-field" style={{ marginBottom: 0 }} value={advisingForm.pastCourses} onChange={e => setAdvisingForm({...advisingForm, pastCourses: e.target.value})} placeholder="CS410, CS411" />
                </div>
              )}

              <h3 style={{ fontSize: '16px', color: '#111827', marginBottom: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>2. Course Planning</h3>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Current Term</label>
                <input disabled={isFrozen} className="input-field" value={advisingForm.currentTerm} onChange={e => setAdvisingForm({...advisingForm, currentTerm: e.target.value})} placeholder="e.g., Spring 2025" required />
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '16px' }}>Planned Courses</label>
                
                {advisingForm.plannedCourses.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic', margin: '0 0 16px 0' }}>No courses added yet.</p>}
                
                {advisingForm.plannedCourses.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-end', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ width: '200px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Level</label>
                      <select disabled={isFrozen} className="input-field" style={{ marginBottom: 0, width: '100%' }} value={c.level} onChange={e => {
                        const updated = [...advisingForm.plannedCourses]; updated[i].level = e.target.value; setAdvisingForm({...advisingForm, plannedCourses: updated});
                      }}>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Graduate">Graduate</option>
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Course Name</label>
                      <select disabled={isFrozen} required className="input-field" style={{ marginBottom: 0, width: '100%' }} value={c.course_name} onChange={e => {
                        const updated = [...advisingForm.plannedCourses]; updated[i].course_name = e.target.value; setAdvisingForm({...advisingForm, plannedCourses: updated});
                      }}>
                        <option value="">-- Select Course --</option>
                        {availableCourses.map(course => <option key={course} value={course}>{course}</option>)}
                      </select>
                    </div>

                    {!isFrozen && (
                      <button type="button" className="btn-danger" style={{ height: '42px', padding: '0 12px', display: 'flex', alignItems: 'center' }} onClick={() => {
                        const updated = advisingForm.plannedCourses.filter((_, idx) => idx !== i); setAdvisingForm({...advisingForm, plannedCourses: updated});
                      }}>
                        <svg className="svg-icon" style={{width:'18px', height:'18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    )}
                  </div>
                ))}

                {!isFrozen && (
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 20px', border: '1px dashed #cbd5e1', background: 'transparent' }} onClick={() => {
                    setAdvisingForm({...advisingForm, plannedCourses: [...advisingForm.plannedCourses, {level: 'Undergraduate', course_name: ''}]});
                  }}>+ Add Course</button>
                )}
              </div>

              {!isFrozen && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '12px 32px' }}>
                    {editingRecordId ? 'Update Record' : 'Submit for Approval'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;