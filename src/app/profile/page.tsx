"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getCurrentUser, changePassword } from "@/lib/api";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const initials = useMemo(() => (user?.name ? user.name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase() : 'U'), [user]);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

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

      {/* Password Change Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Change Password</h2>
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? "Cancel" : "Change Password"}
          </Button>
        </div>
        
        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={6}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                loading={passwordMutation.isPending}
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                Update Password
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}


