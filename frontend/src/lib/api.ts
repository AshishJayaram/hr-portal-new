const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Types for better type safety
export type Role = 'Employee' | 'HR' | 'Admin' | 'God';

export interface Organization {
  id: number;
  name: string;
  domain: string;
  logo?: string;
  description: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  designation?: string;
  department?: string;
  manager_id?: number;
  manager?: User;
  ctc?: string;
  joining_date?: string;
  birthday?: string;
  organization_id?: number;
  organization?: Organization;
  created_at: string;
  updated_at: string;
}

export interface LeaveCategory {
  id: string;
  name: string;
  description?: string;
  defaultDays: number;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  isActive: boolean;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveAllocation {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  userId: string;
  type: 'Sick Leave' | 'Casual Leave' | 'Professional Leave' | 'Sick' | 'Casual' | 'Professional';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  from: string; // ISO date string
  to: string;   // ISO date string
  createdAt: string;
}


export interface Document {
  id: string;
  title: string;
  category: string;
  isPublic: boolean;
  fileUrl: string;
  uploadedBy?: string;
  organizationId?: string;
  createdAt: string;
  // Added fields to support filtering and scoping
  userId?: string;
  documentScope?: string; // 'public' | 'hr_private' | 'user_private'
}

export interface SalarySlip {
  id: string;
  userId: string;
  month: number;
  year: number;
  fileUrl: string; // mapped from file_path
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date?: string; // yyyy-mm-dd - optional for notices
  dateRange?: string; // yyyy-mm-dd to yyyy-mm-dd - for multi-day events
  type: 'holiday' | 'event' | 'notice';
  description?: string;
  isCalendarEvent: boolean;
  color?: string; // For calendar display
  organizationId?: string;
  createdAt?: string;
}

export interface LeaveBalance {
  category_id: string;
  category_name: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
}

export interface OffSite {
  id: string;
  title: string;
  description?: string;
  location?: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface DashboardStats {
  total_users: number;
  total_leaves: number;
  pending_leaves: number;
  approved_leaves: number;
  total_documents: number;
  upcoming_holidays: Holiday[];
  recent_leaves: Leave[];
  recent_documents: Document[];
  recent_salary_slips: SalarySlip[];
  leave_balances: LeaveBalance[];
  recent_off_sites: OffSite[];
  user_birthdays: UserBirthday[];
}

export interface UserBirthday {
  id: string;
  name: string;
  birthday: string;
  birthday_visible: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    message: string;
    code?: string;
  };
}

async function fetcher<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let organizationId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;
  
  // Fallback: get organizationId from user object if not in localStorage
  if (!organizationId && typeof window !== "undefined") {
    const user = getCurrentUser();
    organizationId = user?.organization_id ? String(user.organization_id) : null;
    
    // If still no organizationId, try to decode it from the JWT token
    if (!organizationId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        organizationId = payload.organization_id?.toString() || null;
      } catch (e) {
        // Ignore JWT decode errors
      }
    }
  }

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(organizationId ? { "X-Organization-ID": organizationId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add /api prefix if not already present
  const fullPath = path.startsWith('/api/') ? path : `/api${path}`;

  const res = await fetch(`${API_URL}${fullPath}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies for NextAuth
  });

  if (!res.ok) {
    // Handle authentication errors (token expired/invalid)
    if (res.status === 401) {
      // Clear local storage and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("organizationId");
        // Redirect to login page
        window.location.href = "/signin";
      }
      throw new Error("Session expired. Please log in again.");
    }

    const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    // Handle both error formats: {"error": "msg"} and {"error": {"message": "msg"}}
    let message = `API error ${res.status}`;
    if (errorData?.error) {
      if (typeof errorData.error === 'string') {
        message = errorData.error;
      } else if (errorData.error?.message) {
        message = errorData.error.message;
      }
    }
    throw new Error(message);
  }
  return res.json();
}

// Helper for multipart form data
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let organizationId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;
  
  // Fallback: get organizationId from user object if not in localStorage
  if (!organizationId && typeof window !== "undefined") {
    const user = getCurrentUser();
    organizationId = user?.organization_id ? String(user.organization_id) : null;
    
    // If still no organizationId, try to decode it from the JWT token
    if (!organizationId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        organizationId = payload.organization_id?.toString() || null;
      } catch (e) {
        // Ignore JWT decode errors
      }
    }
  }

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(organizationId ? { "X-Organization-ID": organizationId } : {}),
  };

  // Add /api prefix if not already present
  const fullPath = path.startsWith('/api/') ? path : `/api${path}`;
  
  const res = await fetch(`${API_URL}${fullPath}`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(errorData.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

// -------------------- Mock helpers --------------------
// Mock functions removed









// -------------------- Auth --------------------
export const login = (username: string, password: string) =>
  fetcher<ApiResponse<{ user: User; token: string; organizationId: string }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () =>
  fetcher<ApiResponse<void>>("/auth/logout", {
    method: "POST",
  });

export const sendOTP = async (email: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await fetcher<ApiResponse<{ message: string }>>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
};

export const verifyOTP = async (email: string, otp: string): Promise<ApiResponse<{ user: User; token: string; organizationId: string }>> => {
  const response = await fetcher<ApiResponse<{ user: User; token: string; organizationId: string }>>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  return response;
};

export const forgotPassword = async (email: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await fetcher<ApiResponse<{ message: string }>>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
};

export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await fetcher<ApiResponse<{ message: string }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  return response;
};

// -------------------- Users --------------------
export const getUsers = (params?: Record<string, string>) =>
  fetcher<any>(`/users?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: User[] = items.map((u: any) => ({
      id: String(u.id),
      email: u.email ?? u.username ?? '',
      name: u.name ?? u.username ?? 'User',
      role: toCanonicalRole(u.role) as Role,
      department: u.department,
      manager_id: u.manager_id !== undefined && u.manager_id !== null ? Number(u.manager_id) : undefined,
      created_at: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updated_at: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<User[]>;
  }).catch(() => ({ data: [] } as ApiResponse<User[]>));

export const getUser = (id: string) =>
  fetcher<any>(`/users/${id}`).then((raw) => {
    const u = raw?.data ?? raw ?? {};
    const mapped: User = {
      id: String(u.id ?? id),
      email: u.email ?? u.username ?? 'No email available',
      name: u.name ?? u.username ?? 'User',
      role: toCanonicalRole(u.role) as Role,
      department: u.department,
      designation: u.designation,
      ctc: u.ctc ? String(u.ctc) : undefined,
      manager_id: u.manager_id,
      joining_date: u.joining_date ?? u.joiningDate ?? undefined,
      birthday: u.birthday ?? undefined,
      created_at: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updated_at: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    };
    return { data: mapped } as ApiResponse<User>;
  }).catch(() => ({ data: [][0] } as ApiResponse<User>));

export const createUser = (body: Partial<User> & any) => {
  // Support backend schema: { username, password, name, email, role, department, manager_id, joining_date, birthday }
  const hasRaw = body?.username || body?.password || typeof body?.manager_id !== 'undefined';
  const payload = hasRaw
    ? {
        username: body.username,
        password: body.password,
        name: body.name || body.username, // Use username as name if name not provided
        email: body.email || `${body.username}@company.com`, // Generate email if not provided
        role: body.role,
        department: body.department,
        manager_id: body.manager_id,
        designation: body.designation,
        ctc: body.ctc,
        joining_date: body.joining_date || undefined,
        birthday: body.birthday || undefined,
      }
    : {
        name: body.name,
        email: body.email,
        role: body.role,
        department: body.department,
        managerId: body.managerId,
        joining_date: body.joining_date || undefined,
        birthday: body.birthday || undefined,
      };
  return fetcher<ApiResponse<User>>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateUser = (id: string, body: Partial<User>) => {
  const payload: any = { ...body };
  if (payload.ctc !== undefined && payload.ctc !== null) {
    const coerced = typeof payload.ctc === 'string' ? parseFloat(payload.ctc) : payload.ctc;
    if (!Number.isNaN(coerced)) {
      payload.ctc = coerced;
    } else {
      delete payload.ctc; // avoid sending invalid type
    }
  }
  return fetcher<ApiResponse<User>>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export const deleteUser = (id: string) =>
  fetcher<ApiResponse<void>>(`/api/users/${id}`, {
    method: "DELETE",
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  fetcher<ApiResponse<void>>("/api/users/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

// -------------------- Leave Categories --------------------
export const getLeaveCategories = () =>
  fetcher<any>("/api/leave-categories").then((raw) => {
    const items = (raw?.leave_categories || raw?.data || raw || []) as any[];
    const mapped: LeaveCategory[] = items.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      description: c.description,
      defaultDays: Number(c.default_days || c.defaultDays || 0),
      maxDaysPerYear: Number(c.max_days_per_year || c.maxDaysPerYear || 0),
      requiresApproval: Boolean(c.requires_approval ?? c.requiresApproval ?? true),
      isActive: Boolean(c.isActive ?? c.is_active ?? true),
      organizationId: c.organizationId ?? c.organization_id,
      createdAt: c.createdAt ?? c.created_at ?? new Date().toISOString(),
      updatedAt: c.updatedAt ?? c.updated_at ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<LeaveCategory[]>;
  }).catch(() => ({ data: [] } as ApiResponse<LeaveCategory[]>));

export const createLeaveCategory = (body: Partial<LeaveCategory>) =>
  fetcher<ApiResponse<LeaveCategory>>("/leave-categories", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      description: body.description,
      default_days: body.defaultDays,
      max_days_per_year: body.maxDaysPerYear,
      requires_approval: true, // Default to true
    }),
  });

export const updateLeaveCategory = (id: string, body: Partial<LeaveCategory>) =>
  fetcher<ApiResponse<LeaveCategory>>(`/leave-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: body.name,
      description: body.description,
      default_days: body.defaultDays,
      max_days_per_year: body.maxDaysPerYear,
      requires_approval: true, // Default to true
    }),
  });

export const deleteLeaveCategory = (id: string) =>
  fetcher<ApiResponse<void>>(`/leave-categories/${id}`, {
    method: "DELETE",
  });

// -------------------- Leave Allocations --------------------
export const getLeaveAllocations = (userId: string, year?: number) =>
  fetcher<any>(`/api/leave-allocations/${userId}${year ? `?year=${year}` : ''}`).then((raw) => {
    const items = (raw?.leave_allocations || raw?.data || raw || []) as any[];
    const mapped: LeaveAllocation[] = items.map((a: any) => ({
      id: String(a.id),
      userId: String(a.userId ?? a.user_id ?? userId),
      categoryId: String(a.categoryId ?? a.category_id ?? ''),
      categoryName: a.categoryName ?? a.category_name ?? '',
      totalDays: Number(a.totalDays ?? a.total_days ?? 0),
      usedDays: Number(a.usedDays ?? a.used_days ?? 0),
      remainingDays: Number(a.remainingDays ?? a.remaining_days ?? 0),
      year: Number(a.year ?? new Date().getFullYear()),
      createdAt: a.createdAt ?? a.created_at ?? new Date().toISOString(),
      updatedAt: a.updatedAt ?? a.updated_at ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<LeaveAllocation[]>;
  }).catch(() => ({ data: [] } as ApiResponse<LeaveAllocation[]>));

export const createLeaveAllocation = (userId: string, body: Partial<LeaveAllocation>) =>
  fetcher<ApiResponse<LeaveAllocation>>(`/api/leave-allocations`, {
    method: "POST",
    body: JSON.stringify({
      user_id: String(userId), // Ensure user_id is always a string
      category_id: String(body.categoryId || ''),
      category_name: body.categoryName || '',
      total_days: Number(body.totalDays) || 0,
      year: Number(body.year) || new Date().getFullYear(),
    }),
  });

export const updateLeaveAllocation = (userId: string, allocationId: string, body: Partial<LeaveAllocation>) =>
  fetcher<ApiResponse<LeaveAllocation>>(`/api/leave-allocations/${allocationId}`, {
    method: "PATCH",
    body: JSON.stringify({
      total_days: body.totalDays,
      used_days: body.usedDays,
    }),
  });

export const deleteLeaveAllocation = (userId: string, allocationId: string) =>
  fetcher<ApiResponse<void>>(`/api/leave-allocations/${allocationId}`, {
    method: "DELETE",
  });

// -------------------- Leave Balance (Legacy Support) --------------------
export const getLeaveBalance = (userId: string) =>
  fetcher<any>(`/api/leaves/balance/${userId}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: LeaveBalance[] = items.map((b: any) => ({
      id: String(b.id ?? ''),
      userId: String(b.user_id ?? userId),
      category_id: String(b.category_id ?? b.categoryId ?? ''),
      categoryId: String(b.category_id ?? b.categoryId ?? ''),
      category_name: b.category_name || b.categoryName || 'Leave',
      categoryName: b.category_name || b.categoryName || 'Leave',
      total_days: b.total_days ?? b.totalDays ?? 0,
      totalDays: b.total_days ?? b.totalDays ?? 0,
      used_days: b.used_days ?? b.usedDays ?? 0,
      usedDays: b.used_days ?? b.usedDays ?? 0,
      remaining_days: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
      remainingDays: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
      year: b.year ?? new Date().getFullYear(),
      type: b.category_name || b.categoryName || 'Leave',
      total: b.total_days ?? b.totalDays ?? 0,
      used: b.used_days ?? b.usedDays ?? 0,
      remaining: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<LeaveBalance[]>;
  }).catch(() => ({ data: [] } as ApiResponse<LeaveBalance[]>));

export const updateLeaveBalance = (userId: string, body: Partial<LeaveBalance>) =>
  fetcher<ApiResponse<LeaveBalance>>(`/leaves/balance/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const getTeamLeaveBalances = () =>
  fetcher<any>("/leaves/team-balances").then((raw) => {
    const teamBalances = raw?.data || {};
    const mapped: Record<string, LeaveBalance[]> = {};
    
    // Transform the team balances data
    Object.entries(teamBalances).forEach(([userId, balances]: [string, any]) => {
      const userBalances = (balances || []) as any[];
      mapped[userId] = userBalances.map((b: any) => ({
        id: String(b.id ?? ''),
        userId: String(b.user_id ?? userId),
        category_id: String(b.category_id ?? b.categoryId ?? ''),
        categoryId: String(b.category_id ?? b.categoryId ?? ''),
        category_name: b.category_name || b.categoryName || 'Leave',
        categoryName: b.category_name || b.categoryName || 'Leave',
        total_days: b.total_days ?? b.totalDays ?? 0,
        totalDays: b.total_days ?? b.totalDays ?? 0,
        used_days: b.used_days ?? b.usedDays ?? 0,
        usedDays: b.used_days ?? b.usedDays ?? 0,
        remaining_days: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
        remainingDays: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
        year: b.year ?? new Date().getFullYear(),
        type: b.category_name || b.categoryName || 'Leave',
        total: b.total_days ?? b.totalDays ?? 0,
        used: b.used_days ?? b.usedDays ?? 0,
        remaining: b.remaining_days ?? b.remainingDays ?? (b.total_days != null && b.used_days != null ? b.total_days - b.used_days : 0),
      }));
    });
    
    return { data: mapped } as ApiResponse<Record<string, LeaveBalance[]>>;
  }).catch((error) => {
    console.error("Error fetching team leave balances:", error);
    return { data: {} } as ApiResponse<Record<string, LeaveBalance[]>>;
  });

// -------------------- Leaves --------------------
export const getLeaves = (params?: Record<string, string>) =>
  fetcher<any>(`/leaves?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: Leave[] = items.map((l: any) => ({
      id: String(l.id),
      userId: String(l.user_id ?? l.userId ?? ''),
      type: (l.type === 'Sick Leave' || l.type === 'Casual Leave' || l.type === 'Professional Leave' || l.type === 'Sick' || l.type === 'Casual' || l.type === 'Professional') ? l.type : l.type || 'Professional',
      status: String(l.status || 'Pending').toLowerCase() as any,
      from: l.from ?? l.from_date,
      to: l.to ?? l.to_date,
      reason: l.reason,
      user: l.user ? {
        id: String(l.user.id),
        name: l.user.name,
        email: l.user.email,
        designation: l.user.designation,
        department: l.user.department,
      } : undefined,
      createdAt: l.createdAt ?? l.created_at ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<Leave[]>;
  }).catch(() => ({ data: [] } as ApiResponse<Leave[]>));

export const getLeavesPaginated = (params?: Record<string, string>) =>
  fetcher<any>(`/leaves?${new URLSearchParams({ ...(params || {}), paginated: 'true' }).toString()}`).then((raw) => {
    // Handle both direct response and wrapped response
    // Backend returns: { data: [...], total: ..., page: ..., per_page: ..., total_pages: ... }
    const responseData = raw?.data !== undefined ? raw : raw;
    const items = (responseData?.data || []) as any[];
    
    
    const mapped: Leave[] = items.map((l: any) => ({
      id: String(l.id),
      userId: String(l.user_id ?? l.userId ?? ''),
      type: (l.type === 'Sick Leave' || l.type === 'Casual Leave' || l.type === 'Professional Leave' || l.type === 'Sick' || l.type === 'Casual' || l.type === 'Professional') ? l.type : l.type || 'Professional',
      status: String(l.status || 'Pending').toLowerCase() as any,
      from: l.from ?? l.from_date,
      to: l.to ?? l.to_date,
      reason: l.reason,
      user: l.user ? {
        id: String(l.user.id),
        name: l.user.name,
        email: l.user.email,
        designation: l.user.designation,
        department: l.user.department,
      } : undefined,
      createdAt: l.createdAt ?? l.created_at ?? new Date().toISOString(),
    }));
    return {
      data: mapped,
      total: (responseData?.total ?? raw?.total) || 0,
      page: (responseData?.page ?? raw?.page) || 1,
      per_page: (responseData?.per_page ?? raw?.per_page) || 10,
      total_pages: (responseData?.total_pages ?? raw?.total_pages) || 1,
    };
  }).catch((error) => {
    console.error('❌ getLeavesPaginated error:', error);
    return { 
      data: [], 
      total: 0, 
      page: 1, 
      per_page: 10, 
      total_pages: 1 
    };
  });

export const getLeave = (id: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}`);

export const applyLeave = (body: Partial<Leave> & { reason?: string; userId?: string }) =>
  fetcher<any>("/leaves", {
    method: "POST",
    body: JSON.stringify({
      user_id: body.userId, // Include userId if provided (for HR/Admin applying on behalf)
      type: body.type,
      from_date: body.from ? new Date(body.from).toISOString() : body.from,
      to_date: body.to ? new Date(body.to).toISOString() : (body.from ? new Date(body.from).toISOString() : body.from),
      reason: body.reason,
    }),
  }).then((raw) => {
    const l = raw?.data ?? raw;
    const mapped: Leave = {
      id: String(l.id),
      userId: String(l.user_id ?? l.userId ?? ''),
      type: (l.type === 'Sick Leave' || l.type === 'Casual Leave' || l.type === 'Professional Leave' || l.type === 'Sick' || l.type === 'Casual' || l.type === 'Professional') ? l.type : (body.type as any),
      status: String(l.status || 'Pending').toLowerCase() as any,
      from: l.from ?? l.from_date ?? (body.from as string),
      to: l.to ?? l.to_date ?? (body.to as string) ?? (body.from as string),
      createdAt: l.createdAt ?? l.created_at ?? new Date().toISOString(),
    };
    return { data: mapped } as ApiResponse<Leave>;
  });

export const updateLeave = (id: string, body: Partial<Leave>) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const approveLeave = (id: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}/approve`, {
    method: "POST",
  });

export const rejectLeave = (id: string, reason?: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const editLeave = (id: string, body: {
  category_id: string;
  type: string;
  reason?: string;
  from_date: string;
  to_date: string;
  start_half?: string;
  end_half?: string;
}) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}/edit`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

// -------------------- Documents --------------------
export const getDocuments = (params?: Record<string, string>) =>
  fetcher<any>(`/documents?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.documents || raw?.data || raw || []) as any[];
    const mapped: Document[] = items.map((d: any) => ({
      id: String(d.id),
      title: d.title,
      category: d.category,
      isPublic: Boolean(d.is_public ?? d.isPublic),
      fileUrl: d.file_url ?? d.fileUrl ?? d.file_path,
      createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
      userId: d.user_id != null ? String(d.user_id) : (d.userId != null ? String(d.userId) : undefined),
      documentScope: d.document_scope ?? d.documentScope,
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<Document[]>;
  }).catch(() => ({ data: [] } as ApiResponse<Document[]>));

export const getDocument = (id: string) =>
  fetcher<ApiResponse<Document>>(`/documents/${id}`);

export const uploadDocument = (formData: FormData) =>
  uploadFile<ApiResponse<Document>>("/api/documents", formData);

export const updateDocument = (id: string, body: Partial<Document>) =>
  fetcher<ApiResponse<Document>>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteDocument = (id: string) =>
  fetcher<ApiResponse<void>>(`/documents/${id}`, {
    method: "DELETE",
  });

// -------------------- Document Access (ACL) --------------------
export const getDocumentAccess = (id: string) =>
  fetcher<ApiResponse<any>>(`/documents/${id}/access`);

export const setDocumentAccess = (id: string, body: any) =>
  fetcher<ApiResponse<any>>(`/documents/${id}/access`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateDocumentAccess = (id: string, userId: string, body: any) =>
  fetcher<ApiResponse<any>>(`/documents/${id}/access/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const removeDocumentAccess = (id: string, userId: string) =>
  fetcher<ApiResponse<void>>(`/documents/${id}/access/${userId}`, {
    method: "DELETE",
  });

export const downloadDocument = (id: string) =>
  fetcher<{ fileUrl: string; title: string }>(`/documents/${id}/download`);

// -------------------- Salary Slips --------------------
export const getSalarySlips = (params?: Record<string, string>) =>
  fetcher<any>(`/salary-slips?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.salary_slips || raw?.data || raw || []) as any[];
    const mapped: SalarySlip[] = items.map((s: any) => ({
      id: String(s.id),
      userId: String(s.user_id ?? s.userId ?? ''),
      month: Number(s.month),
      year: Number(s.year),
      fileUrl: s.fileUrl ?? s.file_path,
      createdAt: s.createdAt ?? s.created_at ?? new Date().toISOString(),
    }));
    const uid = params?.userId;
    return { data: mapped.length ? mapped : [] } as ApiResponse<SalarySlip[]>;
  }).catch(() => ({ data: [] } as ApiResponse<SalarySlip[]>));

export const getSalarySlip = (id: string) =>
  fetcher<ApiResponse<SalarySlip>>(`/salary-slips/${id}`);

export const downloadSalarySlip = (id: string) =>
  fetcher<{ fileUrl: string; title: string }>(`/salary-slips/${id}/download`);

export const addSalarySlip = (formData: FormData) =>
  uploadFile<ApiResponse<SalarySlip>>("/api/salary-slips", formData);

export const deleteSalarySlip = (id: string) =>
  fetcher<ApiResponse<void>>(`/salary-slips/${id}`, {
    method: "DELETE",
  });

export const downloadPayslipPDF = (id: string) => {
  const token = localStorage.getItem("token");
  const organizationId = localStorage.getItem("organizationId");

  return fetch(`${API_URL}/salary-slips/${id}/pdf`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-Organization-ID": organizationId || "",
    },
  });
};

// Per-employee private documents
export const getUserDocuments = (userId: string) =>
  fetcher<any>(`/documents?userId=${userId}`).then((raw) => {
    const items = (raw?.documents || raw?.data || raw || []) as any[];
    const mapped: Document[] = items.map((d: any) => ({
      id: String(d.id),
      title: d.title,
      category: d.category ?? 'Payslip Document',
      isPublic: Boolean(d.is_public ?? d.isPublic ?? false),
      fileUrl: d.file_url ?? d.fileUrl ?? d.file_path,
      createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
      userId: d.user_id != null ? String(d.user_id) : (d.userId != null ? String(d.userId) : undefined),
      documentScope: d.document_scope ?? d.documentScope,
    }));
    return { data: mapped } as ApiResponse<Document[]>;
  }).catch(() => {
    // Fallback: filter all documents by userId if endpoint not available
    return fetcher<any>(`/documents?userId=${encodeURIComponent(userId)}`).then((raw2) => {
      const items = (raw2?.documents || raw2?.data || raw2 || []) as any[];
      const mapped: Document[] = items.map((d: any) => ({
        id: String(d.id),
        title: d.title,
        category: d.category ?? 'Payslip Document',
        isPublic: Boolean(d.is_public ?? d.isPublic ?? false),
        fileUrl: d.file_url ?? d.fileUrl ?? d.file_path,
        createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
        userId: d.user_id != null ? String(d.user_id) : (d.userId != null ? String(d.userId) : undefined),
        documentScope: d.document_scope ?? d.documentScope,
      }));
      return { data: mapped } as ApiResponse<Document[]>;
    });
  });

export const uploadUserDocument = (userId: string, formData: FormData) => {
  // Safety check to prevent undefined formData
  if (!formData) {
    throw new Error('FormData is required for document upload');
  }
  
  // Ensure private by default for employee-scoped docs
  if (!formData.has('isPublic')) formData.append('isPublic', 'false');
  if (!formData.has('userId')) formData.append('userId', userId);
  return uploadFile<ApiResponse<Document>>('/api/documents', formData);
};

// -------------------- Holidays --------------------
export const getHolidays = (params?: Record<string, string>) =>
  fetcher<any>(`/api/holidays?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: Holiday[] = items.map((h: any) => ({
      id: String(h.id),
      name: h.name,
      date: h.date,
      dateRange: h.date_range,
      type: h.type || 'holiday',
      description: h.description,
      isCalendarEvent: h.isCalendarEvent ?? h.is_calendar_event ?? true,
      color: h.color,
      createdAt: h.createdAt ?? h.created_at,
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<Holiday[]>;
  }).catch(() => ({ data: [] } as ApiResponse<Holiday[]>));

export const createHoliday = (body: Partial<Holiday>) =>
  fetcher<any>("/holidays", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      // Prioritize dateRange, but also handle dates with " to " misrouted to date field
      ...(body.dateRange ? { date_range: body.dateRange } :
          (body.date && body.date.includes(' to ') ? { date_range: body.date } : 
           body.date ? { date: body.date } : {})),
      type: body.type || 'holiday',
      description: body.description,
      isCalendarEvent: body.isCalendarEvent ?? true,
      color: body.color
    }),
  }).then((raw) => ({
    data: {
      id: String(raw?.data?.id ?? raw.id),
      name: raw?.data?.name ?? raw.name,
      date: raw?.data?.date_range ?? raw?.data?.date ?? raw.date_range ?? raw.date,
      dateRange: raw?.data?.date_range ?? raw.date_range,
      type: raw?.data?.type ?? raw.type ?? 'holiday',
      description: raw?.data?.description ?? raw.description,
      isCalendarEvent: raw?.data?.isCalendarEvent ?? raw?.data?.is_calendar_event ?? raw.isCalendarEvent ?? true,
      color: raw?.data?.color ?? raw.color,
      createdAt: raw?.data?.created_at ?? raw?.data?.createdAt ?? raw?.created_at,
    },
  } as ApiResponse<Holiday>));

export const updateHoliday = (id: string, body: Partial<Holiday>) =>
  fetcher<any>(`/holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ 
      name: body.name, 
      date: body.dateRange || body.date, // Send dateRange if available, otherwise date
      type: body.type,
      description: body.description,
      isCalendarEvent: body.isCalendarEvent,
      color: body.color
    }),
  }).then((raw) => ({
    data: {
      id: String(raw?.data?.id ?? raw.id ?? id),
      name: raw?.data?.name ?? raw.name ?? (body.name as string),
      date: raw?.data?.date_range ?? raw?.data?.date ?? raw.date_range ?? raw.date ?? (body.date as string),
      dateRange: raw?.data?.date_range ?? raw.date_range,
      type: raw?.data?.type ?? raw.type ?? body.type ?? 'holiday',
      description: raw?.data?.description ?? raw.description ?? body.description,
      isCalendarEvent: raw?.data?.isCalendarEvent ?? raw?.data?.is_calendar_event ?? raw.isCalendarEvent ?? body.isCalendarEvent ?? true,
      color: raw?.data?.color ?? raw.color ?? body.color,
      createdAt: raw?.data?.created_at ?? raw?.data?.createdAt ?? raw?.created_at,
    },
  } as ApiResponse<Holiday>));

export const deleteHoliday = (id: string) =>
  fetcher<ApiResponse<void>>(`/holidays/${id}`, {
    method: "DELETE",
  });

// -------------------- Off-site Tracker --------------------
export const getOffSites = (params?: string) =>
  fetcher<any>(`/off-sites?${params || ''}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped = items.map((o: any) => ({
      id: String(o.id),
      title: o.title,
      description: o.description,
      location: o.location,
      type: o.type,
      status: o.status,
      start_date: o.start_date,
      end_date: o.end_date,
      user: o.user ? {
        id: String(o.user.id),
        name: o.user.name,
        designation: o.user.designation,
      } : null,
    }));
    return { 
      data: mapped.length ? mapped : [],
      total: raw?.total || 0,
      total_pages: raw?.total_pages || 0,
    } as ApiResponse<any[]>;
  }).catch(() => ({ data: [], total: 0, total_pages: 0 } as ApiResponse<any[]>));

export const createOffSite = (body: any) =>
  fetcher<ApiResponse<any>>("/off-sites", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateOffSite = (id: string, body: any) =>
  fetcher<ApiResponse<any>>(`/off-sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteOffSite = (id: string) =>
  fetcher<ApiResponse<void>>(`/off-sites/${id}`, {
    method: "DELETE",
  });

export const canManageOffSites = () => {
  const user = getCurrentUser();
  return user?.role === "HR" || user?.role === "Admin" || user?.role === "God";
};

// -------------------- Organization Tree --------------------
// Note: getOrgTree endpoint not implemented as it's not currently used

// -------------------- Dashboard --------------------
export const getDashboardStats = () =>
  fetcher<any>("/dashboard/stats").then((raw) => {
    const d = raw?.data ?? raw ?? {};
    const mapped: DashboardStats = {
      total_users: d.total_users ?? 0,
      total_leaves: d.total_leaves ?? 0,
      pending_leaves: d.pending_leaves ?? 0,
      approved_leaves: d.approved_leaves ?? 0,
      total_documents: d.total_documents ?? 0,
      upcoming_holidays: d.upcoming_holidays ?? [],
      recent_leaves: d.recent_leaves ?? [],
      recent_documents: d.recent_documents ?? [],
      recent_salary_slips: d.recent_salary_slips ?? [],
      leave_balances: d.leave_balances ?? [],
      recent_off_sites: d.recent_off_sites ?? [],
      user_birthdays: d.user_birthdays ?? [],
    };
    return { data: mapped } as ApiResponse<DashboardStats>;
  }).catch(() => ({
    data: {
      total_users: 0,
      total_leaves: 0,
      pending_leaves: 0,
      approved_leaves: 0,
      total_documents: 0,
      upcoming_holidays: [],
      recent_leaves: [],
      recent_documents: [],
      recent_salary_slips: [],
      leave_balances: [],
      recent_off_sites: [],
      user_birthdays: []
    }
  } as ApiResponse<DashboardStats>));

// -------------------- Team --------------------
export const getTeam = (params?: Record<string, string>) =>
  fetcher<any>(`/team?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: User[] = items.map((u: any) => ({
      id: String(u.id),
      email: u.email ?? u.username ?? '',
      name: u.name ?? u.username ?? 'User',
      role: toCanonicalRole(u.role) as Role,
      department: u.department,
      designation: u.designation,
      manager_id: u.manager_id,
      manager: u.manager ? {
        id: String(u.manager.id),
        email: u.manager.email ?? '',
        name: u.manager.name,
        role: toCanonicalRole(u.manager.role) as Role,
        department: u.manager.department,
        designation: u.manager.designation,
        created_at: u.manager.created_at ?? u.manager.createdAt ?? new Date().toISOString(),
        updated_at: u.manager.updated_at ?? u.manager.updatedAt ?? new Date().toISOString(),
      } : undefined,
      ctc: u.ctc ? String(u.ctc) : undefined,
      organization_id: u.organization_id,
      created_at: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updated_at: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<User[]>;
  }).catch(() => ({ data: [] } as ApiResponse<User[]>));

// -------------------- Company Payroll Settings --------------------
import type { PayrollSettings } from "./payroll";

const localSettingsKey = (companyId: string) => `payroll_settings:${companyId}`;

export const getCompanySettings = async (companyId: string): Promise<ApiResponse<PayrollSettings & { currency?: string }>> => {
  try {
    const res = await fetcher<any>(`/company/settings`);
    if (res?.data) return { data: res.data as PayrollSettings & { currency?: string } };
  } catch (_) {
    // ignore and fallback
  }
  // fallback to localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(localSettingsKey(companyId));
    if (saved) {
      try {
        return { data: JSON.parse(saved) as PayrollSettings & { currency?: string } };
      } catch {}
    }
  }
  const { defaultPayrollSettings } = await import("./payroll");
  return { data: defaultPayrollSettings };
};

export const updateCompanySettings = async (companyId: string, settings: PayrollSettings, currency?: string): Promise<ApiResponse<PayrollSettings>> => {
  try {
    const payload = currency ? { ...settings, currency } : settings;
    const res = await fetcher<any>(`/company/settings`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (res?.data) return { data: res.data as PayrollSettings };
  } catch (_) {
    // ignore and persist locally
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(localSettingsKey(companyId), JSON.stringify(settings));
  }
  return { data: settings };
};

// -------------------- Reimbursements --------------------
export interface ReimbursementRequest {
  id?: string;
  user_id?: number;
  reason: string;
  description?: string;
  amount: number;
  date: string;
  status?: 'pending' | 'approved' | 'rejected' | 'returned';
  bills?: Array<{
    id: string;
    file_name: string;
    file_url: string;
  }>;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  rejection_reason?: string;
  return_reason?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  returned_by?: number;
  returned_at?: string;
  created_at?: string;
}

export const getReimbursements = async (status?: string, view?: 'my' | 'team'): Promise<ApiResponse<ReimbursementRequest[]>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (view) params.append('view', view);
  const queryString = params.toString();
  return await fetcher<ApiResponse<ReimbursementRequest[]>>(`/reimbursements${queryString ? `?${queryString}` : ''}`).then(raw => raw || { data: [] });
};

export const createReimbursement = async (data: {
  reason: string;
  description?: string;
  amount: number;
  date: string;
  bills: File[];
  applyForUserId?: string;
}): Promise<ApiResponse<ReimbursementRequest>> => {
  const formData = new FormData();
  formData.append('reason', data.reason);
  if (data.description) {
    formData.append('description', data.description);
  }
  formData.append('amount', data.amount.toString());
  formData.append('date', data.date);
  
  if (data.applyForUserId) {
    formData.append('apply_for_user_id', data.applyForUserId);
  }
  
  data.bills.forEach((file) => {
    formData.append('bills', file);
  });

  return await fetcher<ApiResponse<ReimbursementRequest>>('/reimbursements', {
    method: 'POST',
    body: formData,
  }).then(raw => raw || { data: {} as ReimbursementRequest });
};

export const updateReimbursementStatus = async (
  id: string, 
  status: 'approved' | 'rejected' | 'returned',
  message?: string
): Promise<ApiResponse<ReimbursementRequest>> => {
  // Use the appropriate endpoint based on status
  const endpoint = status === 'approved' 
    ? `/reimbursements/${id}/approve` 
    : status === 'rejected'
    ? `/reimbursements/${id}/reject`
    : `/reimbursements/${id}/return`;
  
  // Only send message for reject and return actions
  const body = (status === 'rejected' || status === 'returned') 
    ? JSON.stringify({ reason: message })
    : undefined;
  
  return await fetcher<ApiResponse<ReimbursementRequest>>(endpoint, {
    method: 'POST',
    body,
  }).then(raw => raw || { data: {} as ReimbursementRequest });
};

export const updateReimbursement = async (id: string, data: {
  reason: string;
  description?: string;
  amount: number;
  date: string;
  bills?: File[];
}): Promise<ApiResponse<ReimbursementRequest>> => {
  const formData = new FormData();
  formData.append('reason', data.reason);
  if (data.description) {
    formData.append('description', data.description);
  }
  formData.append('amount', data.amount.toString());
  formData.append('date', data.date);
  
  if (data.bills) {
    data.bills.forEach((file) => {
      formData.append('bills', file);
    });
  }

  return await fetcher<ApiResponse<ReimbursementRequest>>(`/reimbursements/${id}`, {
    method: 'PATCH',
    body: formData,
  }).then(raw => raw || { data: {} as ReimbursementRequest });
};

export const deleteReimbursement = async (id: string): Promise<ApiResponse<void>> => {
  return await fetcher<ApiResponse<void>>(`/reimbursements/${id}`, {
    method: 'DELETE',
  }).then(() => ({ data: undefined }));
};

// -------------------- Employee Growth --------------------
export interface EmployeeGrowthRecord {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'promotion' | 'skill_development' | 'certification' | 'project_completion' | 'achievement' | 'milestone';
  date: string;
  added_by: string;
  created_at?: string;
}

export const getEmployeeGrowth = async (userId: string): Promise<ApiResponse<EmployeeGrowthRecord[]>> => {
  return await fetcher<ApiResponse<EmployeeGrowthRecord[]>>(`/employee-growth/${userId}`).then(raw => raw || { data: [] });
};

export const getGrowthStats = async (userId: string): Promise<ApiResponse<any>> => {
  return await fetcher<any>(`/employee-growth/stats/${userId}`);
};

export const createGrowthRecord = async (data: {
  user_id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
}): Promise<ApiResponse<EmployeeGrowthRecord>> => {
  return await fetcher<ApiResponse<EmployeeGrowthRecord>>('/employee-growth', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(raw => raw || { data: {} as EmployeeGrowthRecord });
};

export const updateGrowthRecord = async (id: string, data: {
  title: string;
  description?: string;
  type: string;
  date: string;
}): Promise<ApiResponse<EmployeeGrowthRecord>> => {
  return await fetcher<ApiResponse<EmployeeGrowthRecord>>(`/employee-growth/record/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }).then(raw => raw || { data: {} as EmployeeGrowthRecord });
};

export const deleteGrowthRecord = async (id: string): Promise<ApiResponse<void>> => {
  return await fetcher<ApiResponse<void>>(`/employee-growth/record/${id}`, {
    method: 'DELETE',
  }).then(() => ({ data: undefined }));
};

// -------------------- Current User --------------------
export const toCanonicalRole = (inputRole: string | undefined | null): Role => {
  const value = (inputRole || '').toString().trim().toLowerCase();
  switch (value) {
    case 'god':
      return 'God';
    case 'admin':
      return 'Admin';
    case 'hr':
    case 'human resources':
      return 'HR';
    case 'employee':
    default:
      return 'Employee';
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr || userStr === "undefined" || userStr === "null") return null;
  
  try {
    const parsed = JSON.parse(userStr);
    // Normalize role casing and known aliases
    const normalized: User = {
      ...parsed,
      role: toCanonicalRole(parsed?.role),
    };
    // Persist normalized value back to storage if it differs
    if (parsed?.role !== normalized.role) {
      localStorage.setItem('user', JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    // Failed to parse user from localStorage
    localStorage.removeItem("user"); // Clear invalid data
    return null;
  }
};

export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
};

export const hasRole = (requiredRoles: string[]) => {
  const user = getCurrentUser();
  if (!user) return false;
  const allowed = requiredRoles.map((r) => toCanonicalRole(r));
  return allowed.includes(toCanonicalRole(user.role));
};

export const canManageUsers = () => hasRole(['HR', 'Admin']);
export const canManageDocuments = () => hasRole(['HR', 'Admin']);
export const canManageSalarySlips = () => hasRole(['HR', 'Admin']);
export const canManageHolidays = () => hasRole(['HR', 'Admin']);
export const canApproveLeaves = () => hasRole(['HR', 'Admin']);
export const isManager = () => hasRole(['HR', 'Admin']);
export const isGod = () => hasRole(['God']);

// God API functions
export const getPlatformStats = async (): Promise<PlatformStats> => {
  const response = await fetcher<ApiResponse<PlatformStats>>(`/god/stats`);
  return response.data;
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await fetcher<any>(`/god/organizations`);
  const orgs = response.organizations || response.data || [];
  
  // Map backend response to frontend interface
  return orgs.map((org: any) => ({
    id: org.id,
    name: org.name,
    domain: org.domain,
    logo: org.logo || '',
    description: org.description || '',
    is_active: org.is_active,
    user_count: org.user_count || 0, // Default to 0 if not provided
    created_at: org.created_at,
    updated_at: org.updated_at,
  }));
};

export const uploadOrganizationLogo = async (organizationId: string, file: File): Promise<{ logo_url: string }> => {
  const formData = new FormData();
  formData.append('logo', file);

  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/api/god/organizations/${organizationId}/logo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload logo');
  }

  return response.json();
};

export const createOrganization = async (orgData: {
  name: string;
  domain: string;
  description: string;
  admin_user: {
    username: string;
    email: string;
    password: string;
    name: string;
  };
}): Promise<{ organization: Organization; admin_user: User; message: string }> => {
  const response = await fetcher<{ organization: Organization; admin_user: User; message: string }>(`/god/organizations`, {
    method: "POST",
    body: JSON.stringify(orgData),
  });
  return response;
};

export const getOrganizationDetails = async (id: number): Promise<{ organization: Organization; admin_user?: any }> => {
  const response = await fetcher<{ organization: Organization; admin_user?: any }>(`/god/organizations/${id}`);
  return response;
};

export const updateOrganization = async (id: number, orgData: {
  name?: string;
  domain?: string;
  description?: string;
  is_active?: boolean;
  admin_user?: {
    username?: string;
    email?: string;
    name?: string;
  };
}): Promise<{ data: Organization; message: string }> => {
  const response = await fetcher<{ data: Organization; message: string }>(`/god/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(orgData),
  });
  return response;
};

export const deleteOrganization = async (id: number): Promise<{ message: string }> => {
  const response = await fetcher<{ message: string }>(`/god/organizations/${id}`, {
    method: "DELETE",
  });
  return response;
};

// -------------------- Leave Categories --------------------

// -------------------- Leave Allocations --------------------

// -------------------- Audit Logs --------------------
export const getAuditLogs = (filters?: { 
  entity_type?: string; 
  entity_id?: string; 
  changed_by?: string; 
  action?: string; 
  page?: number; 
  limit?: number; 
}) => {
  const queryParams = new URLSearchParams();
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.entity_id) queryParams.append('entity_id', filters.entity_id);
  if (filters?.changed_by) queryParams.append('changed_by', filters.changed_by);
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const queryString = queryParams.toString();
  return fetcher<any>(`/audit/logs${queryString ? `?${queryString}` : ''}`)
    .then((raw) => {
      // Return both data and pagination info
      const items = raw?.data || [];
      const pagination = raw?.pagination;
      return { 
        data: items, 
        pagination: pagination 
      } as ApiResponse<any[]> & { pagination?: any };
    });
};

export const getUserAuditLogs = (userId: string) =>
  fetcher<any>(`/audit/logs/user/${userId}`)
    .then((raw) => {
      const items = raw?.data || raw || [];
      return { data: items } as ApiResponse<any[]>;
    });

export const getEntityAuditLogs = (entityType: string, entityId: string) => {
  const queryParams = new URLSearchParams();
  queryParams.append('entity_type', entityType);
  queryParams.append('entity_id', entityId);
  
  return fetcher<any>(`/audit/logs/entity?${queryParams.toString()}`)
    .then((raw) => {
      const items = raw?.data || raw || [];
      return { data: items } as ApiResponse<any[]>;
    });
};

// -------------------- Holidays --------------------
export const getAvailableHolidayYears = () => {
  return fetcher<any>(`/holidays/years`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<number[]>;
    });
};

// -------------------- Document Acknowledgments --------------------
export const acknowledgeDocument = (documentId: string) =>
  fetcher<any>(`/document-acknowledgments/${documentId}`, {
    method: 'POST',
  });

export const getDocumentAcknowledgments = (documentId: string) =>
  fetcher<any>(`/document-acknowledgments/document/${documentId}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<any[]>;
    });

export const getUserAcknowledgments = () =>
  fetcher<any>(`/document-acknowledgments/user`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<any[]>;
    });

export const getAcknowledgedUsersForDocument = (documentId: string) =>
  fetcher<any>(`/document-acknowledgments/document/${documentId}/users`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<any[]>;
    });

// -------------------- Private Documents (Salary Slips) --------------------
export const uploadPrivateDocument = (userId: string, formData: FormData) => {
  if (!formData) {
    throw new Error('FormData is required for private document upload');
  }
  
  // Ensure userId is set
  if (!formData.has('userId')) formData.append('userId', userId);
  
  return uploadFile<ApiResponse<any>>('/api/private-documents', formData);
};

export const getPrivateDocumentsByUser = (userId: string) =>
  fetcher<any>(`/api/private-documents/user/${userId}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<any[]>;
    });

export const deletePrivateDocument = (docId: string) =>
  fetcher<any>(`/api/private-documents/${docId}`, {
    method: 'DELETE',
  });

// -------------------- Feedback --------------------
export const getFeedback = () =>
  fetcher<any>('/feedback');

export const getArchivedFeedback = () =>
  fetcher<any>('/api/feedback/archived')
    .then((raw) => {
      const items = raw?.data || [];
      
      // Ensure consistent field mapping from backend to frontend (same as getFeedback)
      const mappedItems = items.map((item: any) => {
        // Properly extract user object with all its fields
        const userObj = item.user || item.User || null;
        let mappedUser = null;
        
        if (userObj && typeof userObj === 'object' && userObj !== null) {
          // Check if it's an actual user object with data
          const userId = userObj.id || userObj.ID || userObj.user_id || userObj.UserID;
          const userName = userObj.name || userObj.Name || userObj.username || userObj.Username;
          const userEmail = userObj.email || userObj.Email;
          
          if (userId || userName || userEmail) {
            mappedUser = {
              id: String(userId || ''),
              name: String(userName || ''),
              email: String(userEmail || ''),
              username: String(userObj.username || userObj.Username || ''),
            };
          }
        }
        
        // If user is still null but user_id exists, try alternative extraction
        if (!mappedUser && (item.user_id || item.userId || item.UserID)) {
          // Try alternative extraction - maybe user is nested differently
          if (item.User && typeof item.User === 'object') {
            const altUser = item.User;
            mappedUser = {
              id: String(altUser.id || altUser.ID || ''),
              name: String(altUser.name || altUser.Name || altUser.username || altUser.Username || ''),
              email: String(altUser.email || altUser.Email || ''),
              username: String(altUser.username || altUser.Username || ''),
            };
          }
        }
        
        // Handle anonymous feedback
        if (item.is_anonymous || item.isAnonymous) {
          mappedUser = null; // Clear user info for anonymous feedback
        }

        // Extract ID - handle numeric 0 as valid (though should never be 0 for auto-increment)
        const itemId = item.id !== undefined && item.id !== null && item.id !== '' ? item.id : (item.ID !== undefined && item.ID !== null && item.ID !== '' ? item.ID : null);

        return {
          id: itemId ? String(itemId) : '', // Only convert to string if ID exists, otherwise empty string
          title: item.title || item.Title || '',
          description: item.description || item.Description || '',
          type: item.type || item.Type || 'other',
          priority: item.priority || item.Priority || 'medium',
          status: item.status || item.Status || 'open',
          created_at: item.created_at || item.createdAt || item.CreatedAt || item.Created_At || '',
          updated_at: item.updated_at || item.updatedAt || item.UpdatedAt || '',
          user: mappedUser,
          user_id: item.user_id || item.userId || item.UserID || '',
          is_anonymous: item.is_anonymous || item.isAnonymous || false,
        };
      });
      return { data: mappedItems } as ApiResponse<any[]>;
    });

export const getFeedbackStats = () =>
  fetcher<any>('/feedback/stats')
    .then((raw) => raw?.data || {});

export const createFeedback = (data: FormData) =>
  uploadFile<any>('/feedback', data);

export const updateFeedbackStatus = (id: string, status: string, resolution?: string) => {
  const body: any = { status };
  // Only include resolution if it's provided and not empty
  if (resolution && resolution.trim() !== '') {
    body.resolution = resolution;
  }
  return fetcher<any>(`/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

export const archiveFeedback = (id: string) =>
  fetcher<any>(`/api/feedback/${id}/archive`, {
    method: 'POST',
  });

export const deleteFeedback = (id: string) =>
  fetcher<any>(`/feedback/${id}`, {
    method: 'DELETE',
  });

export const deleteAllFeedback = () =>
  fetcher<any>(`/api/feedback`, {
    method: 'DELETE',
  });

// -------------------- KRA (Key Result Areas) --------------------
export interface KRA {
  id: string;
  user_id: number;
  organization_id: number;
  year: number;
  title: string;
  description?: string;
  weight: number;
  target_value: string;
  measurement_unit: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  set_by: number;
  set_at: string;
  actual_value?: string; // deprecated
  employee_actual_value?: string;
  manager_actual_value?: string;
  rating?: number;
  comments?: string;
  evaluated_by?: number;
  evaluated_at?: string;
  employee_comments?: string;
  employee_rating?: number;
  employee_rated_at?: string;
  employee_rated_by?: number;
  user?: User;
  set_by_user?: User;
  evaluator?: User;
  employee_rater?: User;
  manager_feedback_visible?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKRARequest {
  user_id: string;
  year: number;
  title: string;
  description?: string;
  weight: number;
  target_value: string;
  measurement_unit: string;
}

export interface UpdateKRARequest {
  title?: string;
  description?: string;
  weight?: number;
  target_value?: string;
  measurement_unit?: string;
  status?: string;
}

export interface EvaluateKRARequest {
  actual_value: string;
  rating: number;
  comments?: string;
  manager_feedback_visible?: boolean;
}

export interface SelfAssessKRARequest {
  actual_value: string;
  employee_rating: number;
  employee_comments?: string;
}

export interface KRASummary {
  user_id: string;
  user_name: string;
  year: number;
  total_kras: number;
  completed_kras: number;
  average_rating: number;
  total_weight: number;
  weighted_score: number;
  overall_rating: string;
  kras: KRA[];
}

// KRA API functions
export const getKRAs = (params?: Record<string, string>) => {
  const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
  return fetcher<any>(`/kras${queryString}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<KRA[]>;
    });
};

export const getKRA = (id: string) =>
  fetcher<any>(`/kras/${id}`)
    .then((raw) => raw?.data as KRA);

export const createKRA = (data: CreateKRARequest) =>
  fetcher<any>('/kras', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateKRA = (id: string, data: UpdateKRARequest) =>
  fetcher<any>(`/kras/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteKRA = (id: string) =>
  fetcher<any>(`/kras/${id}`, {
    method: 'DELETE',
  });

export const evaluateKRA = (id: string, data: EvaluateKRARequest) =>
  fetcher<any>(`/kras/${id}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const selfAssessKRA = (id: string, data: SelfAssessKRARequest) =>
  fetcher<any>(`/kras/${id}/self-assess`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getReporteesKRAs = (year: number) =>
  fetcher<any>(`/kras/reportees?year=${year}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<KRA[]>;
    });

export const getUserKRAs = (userId: string, year: number) =>
  fetcher<any>(`/kras/user/${userId}?year=${year}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<KRA[]>;
    });

export const getAllUserKRAs = (userId: string) =>
  fetcher<any>(`/kras/user/${userId}/all`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<KRA[]>;
    });

export const getTeamKRAs = (year: number) =>
  fetcher<any>(`/kras/team?year=${year}`)
    .then((raw) => {
      const items = raw?.data || [];
      return { data: items } as ApiResponse<KRA[]>;
    });

export const getKRASummary = (userId: string, year: number) =>
  fetcher<any>(`/kras/user/${userId}/summary?year=${year}`)
    .then((raw) => raw?.data as KRASummary);

// Bulk Assessment API Functions
export interface BulkEvaluateKRAItem {
  kra_id: string;
  manager_actual_value: string;
  rating: number;
  comments?: string;
  manager_feedback_visible?: boolean;
}

export interface BulkSelfAssessKRAItem {
  kra_id: string;
  employee_actual_value: string;
  employee_rating: number;
  employee_comments?: string;
}

export interface BulkAssessmentResponse {
  success_count: number;
  error_count: number;
  results: Array<{
    kra_id: string;
    success: boolean;
    error?: string;
  }>;
}

export const bulkEvaluateKRAs = (assessments: BulkEvaluateKRAItem[]) =>
  fetcher<any>('/kras/bulk-evaluate', {
    method: 'POST',
    body: JSON.stringify({ assessments }),
  }).then((raw) => raw?.data as BulkAssessmentResponse);

export const bulkSelfAssessKRAs = (assessments: BulkSelfAssessKRAItem[]) =>
  fetcher<any>('/kras/bulk-self-assess', {
    method: 'POST',
    body: JSON.stringify({ assessments }),
  }).then((raw) => raw?.data as BulkAssessmentResponse);

// -------------------- KRA Settings --------------------
export interface KRASettings {
  default_fields: KRAField[];
  measurement_units: string[];
  rating_scale: KRARatingScale;
  weight_distribution: KRAWeightConfig;
  evaluation_criteria: KRACriteria[];
  notification_settings: KRANotifications;
}

export interface KRAField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'percentage' | 'select' | 'textarea';
  required: boolean;
  default: string;
  options?: string[];
  placeholder: string;
  help_text: string;
  order: number;
}

export interface KRARatingScale {
  min: number;
  max: number;
  step: number;
  labels: Record<string, string>;
  description: string;
}

export interface KRAWeightConfig {
  max_total_weight: number;
  min_individual_weight: number;
  max_individual_weight: number;
  allow_overflow: boolean;
  auto_distribute: boolean;
}

export interface KRACriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  required: boolean;
  type: 'performance' | 'behavior' | 'skill' | 'goal';
}

export interface KRANotifications {
  reminder_days_before_due: number[];
  notify_on_creation: boolean;
  notify_on_evaluation: boolean;
  notify_on_completion: boolean;
  email_templates: Record<string, string>;
}

// KRA Settings API functions
export const getKRASettings = () =>
  fetcher<any>('/company/settings/kra')
    .then((raw) => raw?.data as KRASettings);

export const updateKRASettings = (settings: KRASettings) =>
  fetcher<any>('/company/settings/kra', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
