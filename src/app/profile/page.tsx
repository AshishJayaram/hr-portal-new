"use client";

import Card from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/api";
import { useMemo } from "react";

export default function ProfilePage() {
  const user = getCurrentUser();
  const initials = useMemo(() => (user?.name ? user.name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase() : 'U'), [user]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">My Profile</h1>
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div>
            <div className="text-xl font-semibold">{user?.name || 'User'}</div>
            <div className="text-sm text-gray-400">{user?.email || 'user@example.com'}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-gray-400">Role</div>
            <div className="font-medium">{user?.role || 'Employee'}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-gray-400">Department</div>
            <div className="font-medium">{user?.department || '—'}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-gray-400">User ID</div>
            <div className="font-medium">{user?.id || '—'}</div>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-gray-400">Member Since</div>
            <div className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}


