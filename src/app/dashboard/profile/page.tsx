"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Users, Save, Loader2, Check } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string; role: string; squad?: string } | null>(null);
  const [name, setName] = useState("");
  const [squad, setSquad] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      const parsedUser = JSON.parse(userJson);
      setUser(parsedUser);
      setName(parsedUser.name || "");
      setSquad(parsedUser.squad || "");
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    
    setTimeout(() => {
      if (user) {
        const updatedUser = { ...user, name, squad };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setSaved(true);
        // Dispatch a storage event so layout.tsx can pick up changes if it listens (or just rely on reload)
        window.dispatchEvent(new Event("user-updated"));
      }
      setSaving(false);
      setTimeout(() => setSaved(false), 3000);
    }, 600); // simulate network delay
  };

  if (!user) return null;

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-300 max-w-2xl mx-auto mt-4">
      <div>
        <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
          <User className="w-8 h-8 text-indigo-500" />
          Profile Settings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Update your admin details and squad information.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-sm">
        
        <div className="flex flex-col gap-6">
          {/* Admin Name Field */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
              <Shield className="w-4 h-4 text-teal-500" />
              Admin Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              placeholder="Enter your admin name"
            />
          </div>

          {/* Squad Name Field */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
              <Users className="w-4 h-4 text-purple-500" />
              Squad Name
            </label>
            <input
              type="text"
              value={squad}
              onChange={(e) => setSquad(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              placeholder="e.g. Sentinel Esports"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-end border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
