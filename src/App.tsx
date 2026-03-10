/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Statistics } from './components/Statistics';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { dbService } from './services/db';
import { LayoutGrid, BarChart3, LogOut, Users, Clock } from 'lucide-react';
import { cn } from './utils/cn';
import { UserProfile } from './types';

function MainApp() {
  const { user, loading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null | false>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stats' | 'admin'>('dashboard');

  useEffect(() => {
    if (user) {
      dbService.getProfile(user.uid).then(p => {
        setProfile(p ? p : false);
      });
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (profile === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (profile === false) {
    return <Onboarding onComplete={() => dbService.getProfile(user.uid).then(p => setProfile(p ? p : false))} />;
  }

  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Awaiting Approval</h1>
        <p className="text-gray-500 mb-8 max-w-sm">Your account is currently pending approval from an administrator. Please check back later.</p>
        <button 
          onClick={logout}
          className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (profile.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8 max-w-sm">Your account request was declined.</p>
        <button onClick={logout} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-colors">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={logout}
          className="p-2 bg-white text-gray-400 hover:text-gray-600 rounded-xl shadow-sm hover:shadow-md transition-all"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'stats' && <Statistics />}
      {activeTab === 'admin' && profile.role === 'admin' && <AdminDashboard />}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around items-center p-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all",
              activeTab === 'dashboard' ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutGrid className="w-6 h-6 mb-1" strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Today</span>
          </button>
          
          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all",
              activeTab === 'stats' ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <BarChart3 className="w-6 h-6 mb-1" strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Insights</span>
          </button>

          {profile.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all",
                activeTab === 'admin' ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Users className="w-6 h-6 mb-1" strokeWidth={activeTab === 'admin' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
