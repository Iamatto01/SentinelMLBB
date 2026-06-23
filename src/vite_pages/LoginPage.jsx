import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoggingIn(true);
    setError('');
    
    const result = await login(email);
    if (!result.success) {
      setError(result.message);
    }
    
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] opacity-20"></div>
      
      <div className="card w-full max-w-md relative z-10 text-center p-8">
        <div className="w-20 h-20 bg-accent rounded-2xl mx-auto flex items-center justify-center text-4xl font-bold mb-6 shadow-[0_0_30px_rgba(233,69,96,0.5)]">
          S
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Sentinel<span className="text-accent">MLBB</span></h1>
        <p className="text-gray-400 mb-8">Advanced Squad Analytics & AI OCR</p>
        
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@gmail.com"
              className="input-field"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-white text-gray-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors shadow-lg mt-4 disabled:opacity-50"
          >
            {isLoggingIn ? "Authenticating..." : "Continue to Dashboard"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500 space-y-2">
          <p>SentinelMLBB is a private portal.</p>
          <p>Please contact an Admin to purchase access and register your email.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
