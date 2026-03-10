import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { UserProfile } from '../types';
import { Check, X, Clock, Shield, ShieldAlert } from 'lucide-react';

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await dbService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await dbService.updateUserStatus(userId, newStatus);
      setUsers(users.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update user status.');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved' || !u.status);
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading users...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32">
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          Admin Dashboard
        </h1>
        <p className="text-gray-500">Manage user access and approvals.</p>
      </div>

      <div className="space-y-8">
        {/* Pending Users */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Approval ({pendingUsers.length})
          </h2>
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 italic bg-white p-4 rounded-2xl border border-gray-100">No pending requests.</p>
          ) : (
            <div className="grid gap-4">
              {pendingUsers.map(user => (
                <UserCard key={user.userId} user={user} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </section>

        {/* Approved Users */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Approved Users ({approvedUsers.length})
          </h2>
          <div className="grid gap-4">
            {approvedUsers.map(user => (
              <UserCard key={user.userId} user={user} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </section>

        {/* Rejected Users */}
        {rejectedUsers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Rejected Users ({rejectedUsers.length})
            </h2>
            <div className="grid gap-4">
              {rejectedUsers.map(user => (
                <UserCard key={user.userId} user={user} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function UserCard({ user, onStatusChange }: { user: UserProfile, onStatusChange: (id: string, status: 'approved' | 'rejected') => void }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold text-gray-900">{user.displayName || 'Unknown User'}</h3>
        <p className="text-sm text-gray-500">{user.email || 'No email provided'}</p>
        <div className="flex gap-2 mt-2 text-xs text-gray-400">
          <span className="bg-gray-50 px-2 py-1 rounded-md">Role: {user.role}</span>
          <span className="bg-gray-50 px-2 py-1 rounded-md">Goal: {user.goal}</span>
        </div>
      </div>
      
      {user.role !== 'admin' && (
        <div className="flex gap-2">
          {user.status !== 'approved' && (
            <button
              onClick={() => onStatusChange(user.userId, 'approved')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
          )}
          {user.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(user.userId, 'rejected')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors"
            >
              <X className="w-4 h-4" /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
