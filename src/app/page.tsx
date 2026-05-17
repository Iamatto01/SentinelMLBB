"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Web3Forms Submission
      // IMPORTANT: Replace the access_key below with your actual Web3Forms access key
      // generated for muhammadsaifudinmj@gmail.com at https://web3forms.com/
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "ea8b4bd6-a9a3-4e0d-b6f8-34aa7cb0fc50",
          subject: "New Login Attempt on SentinelMLBB",
          from_name: "SentinelMLBB System",
          message: `A user has attempted to login with the email: ${email}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Check your email for the login link!");
        // Simulate login success and redirect to dashboard
        localStorage.setItem("user", JSON.stringify({ name: "User", role: "user", email }));
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setMessage("Error sending email. Check access key.");
      }
    } catch (err) {
      setMessage("An error occurred during login.");
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

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer">
              <div className="w-5 h-5 bg-[#e0e5ec] rounded shadow-[inset_2px_2px_5px_0_rgba(163,177,198,0.6),inset_-2px_-2px_5px_0_rgba(255,255,255,0.5)] flex items-center justify-center">
                {/* Checkbox visual placeholder */}
              </div>
              <span>Remember me</span>
            </label>
          </div>

          {message && (
            <div className="text-center text-sm font-medium text-teal-600 bg-teal-50 p-2 rounded-lg">
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#e0e5ec] text-slate-600 font-bold rounded-2xl shadow-[6px_6px_10px_0_rgba(163,177,198,0.6),-6px_-6px_10px_0_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_0_rgba(163,177,198,0.6),inset_-4px_-4px_8px_0_rgba(255,255,255,0.5)] transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Sending..." : "Sign In"}
          </button>
        </form>

        <div className="w-full flex items-center justify-center mt-10 mb-8 relative">
          <div className="border-t border-slate-300 w-full absolute top-1/2 left-0 z-0"></div>
          <span className="bg-[#e0e5ec] px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest z-10 relative">
            Or continue with
          </span>
        </div>

        {/* Social Buttons */}
        <div className="flex space-x-6 mb-8">
          <button type="button" className="w-12 h-12 bg-[#e0e5ec] rounded-full shadow-[4px_4px_8px_0_rgba(163,177,198,0.6),-4px_-4px_8px_0_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_0_rgba(163,177,198,0.6),inset_-4px_-4px_8px_0_rgba(255,255,255,0.5)] flex items-center justify-center text-slate-600 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          </button>
          <button type="button" className="w-12 h-12 bg-[#e0e5ec] rounded-full shadow-[4px_4px_8px_0_rgba(163,177,198,0.6),-4px_-4px_8px_0_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_0_rgba(163,177,198,0.6),inset_-4px_-4px_8px_0_rgba(255,255,255,0.5)] flex items-center justify-center text-slate-600 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </button>
          <button type="button" className="w-12 h-12 bg-[#e0e5ec] rounded-full shadow-[4px_4px_8px_0_rgba(163,177,198,0.6),-4px_-4px_8px_0_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_0_rgba(163,177,198,0.6),inset_-4px_-4px_8px_0_rgba(255,255,255,0.5)] flex items-center justify-center text-slate-600 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Don't have an account? <a href="#" className="font-bold text-slate-700 hover:underline">Sign up</a>
        </p>
      </div>
    </main>
  );
}
