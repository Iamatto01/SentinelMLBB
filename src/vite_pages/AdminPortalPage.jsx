import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminPortalPage = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState([]);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    
    try {
      const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "registerUser",
          email: email
        }),
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        }
      });
      
      const result = await res.json();
      if (result.status === "success") {
        setMessage(`✅ ${result.message}`);
        setClients(prev => [...prev, { email, sheetId: result.sheetId, status: 'Active' }]);
        setEmail('');
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (err) {
      console.error(err);
      setMessage(`❌ Network Error: Failed to register.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-outfit mb-1 text-accent">Admin Portal</h2>
        <p className="text-gray-400">Register new SaaS clients. The system will auto-create their personal Google Sheet.</p>
      </div>

      {/* REGISTER NEW CLIENT */}
      <div className="card">
        <h3 className="text-xl font-bold font-outfit mb-4">Register New Client</h3>
        <p className="text-sm text-gray-400 mb-6">
          Enter the client's email address. The system will automatically:
        </p>
        <ul className="text-sm text-gray-400 mb-6 space-y-1 list-disc list-inside">
          <li>Create a brand new Google Sheet for the client</li>
          <li>Set up all required tabs (Game Log, Player Stats, Hero Pool, etc.)</li>
          <li>Share the sheet with the client's email</li>
          <li>Register the client in the SaaS_Users database</li>
        </ul>

        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${message.includes('✅') ? 'bg-win/20 text-win border border-win/50' : 'bg-lose/20 text-lose border border-lose/50'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Client Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. client@gmail.com"
              className="input-field"
              required
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="btn-primary w-full disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating Sheet & Registering...
                </span>
              ) : 'Register Client'}
            </button>
          </div>
        </form>
      </div>

      {/* RECENTLY REGISTERED */}
      {clients.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold font-outfit mb-4">Recently Registered</h3>
          <div className="space-y-3">
            {clients.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-bg3 p-4 rounded-lg">
                <div>
                  <div className="font-semibold">{c.email}</div>
                  <div className="text-xs text-gray-500 mt-1">Sheet ID: {c.sheetId}</div>
                </div>
                <span className="text-xs bg-win/20 text-win px-3 py-1 rounded-full font-bold">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSTRUCTIONS */}
      <div className="card border-accent/30">
        <h3 className="text-lg font-bold font-outfit mb-3">⚠️ Important Notes</h3>
        <ul className="text-sm text-gray-400 space-y-2">
          <li>• Client sheets are created in <strong>YOUR Google Drive</strong> (the Admin account).</li>
          <li>• The sheet is automatically shared with the client's email (Editor access).</li>
          <li>• <strong>No scripts</strong> are attached to the client's sheet — your code stays protected!</li>
          <li>• After deploying new API code, remember to <strong>re-deploy</strong> the Web App to activate changes.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPortalPage;
