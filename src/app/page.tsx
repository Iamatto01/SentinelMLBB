"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check } from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // Store the real JWT token and user info
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else if (res.status === 403) {
        setError("Account pending activation. Contact admin.");
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch (err) {
      setError("Cannot reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#e0e5ec] flex items-center justify-center p-4">
      <div className="bg-[#e0e5ec] p-8 md:p-12 rounded-[2rem] w-full max-w-md shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] flex flex-col items-center">
        
        {/* Avatar Icon */}
        <div className="w-20 h-20 bg-[#e0e5ec] rounded-full shadow-[6px_6px_10px_0_rgba(163,177,198,0.6),-6px_-6px_10px_0_rgba(255,255,255,0.5)] flex items-center justify-center mb-8">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-700 mb-2">Welcome back</h1>
        <p className="text-sm text-slate-500 mb-8">Please sign in to continue</p>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          
          {/* Email Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-12 pr-4 py-4 bg-[#e0e5ec] rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none shadow-[inset_6px_6px_10px_0_rgba(163,177,198,0.6),inset_-6px_-6px_10px_0_rgba(255,255,255,0.5)] transition-shadow"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 bg-[#e0e5ec] rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none shadow-[inset_6px_6px_10px_0_rgba(163,177,198,0.6),inset_-6px_-6px_10px_0_rgba(255,255,255,0.5)] transition-shadow"
              required
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
              <div className="w-5 h-5 bg-[#e0e5ec] rounded shadow-[inset_2px_2px_5px_0_rgba(163,177,198,0.6),inset_-2px_-2px_5px_0_rgba(255,255,255,0.5)] flex items-center justify-center">
                {rememberMe && <Check className="w-3.5 h-3.5 text-slate-500" />}
              </div>
              <span>Remember me</span>
            </label>
          </div>

          {error && (
            <div className="text-center text-sm font-medium text-red-500 bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#e0e5ec] text-slate-600 font-bold rounded-2xl shadow-[6px_6px_10px_0_rgba(163,177,198,0.6),-6px_-6px_10px_0_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_0_rgba(163,177,198,0.6),inset_-4px_-4px_8px_0_rgba(255,255,255,0.5)] transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-8">
          Don&apos;t have an account? <a href="#" className="font-bold text-slate-700 hover:underline">Sign up</a>
        </p>
      </div>
    </main>
  );
}
