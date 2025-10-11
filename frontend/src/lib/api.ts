const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Types for better type safety
export type Role = 'Employee' | 'Manager' | 'HR' | 'Admin' | 'God';

export interface Organization {
  id: number;
  name: string;
  domain: string;
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
  ctc?: number;
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
    organizationId = user?.organizationId || null;
    
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
    const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    const message = typeof (errorData?.error) === 'string' ? errorData.error : (errorData?.error?.message || `API error ${res.status}`);
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
    organizationId = user?.organizationId || null;
    
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

  const res = await fetch(`${API_URL}${path}`, {
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
      createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<User[]>;
  }).catch(() => ({ data: [] } as ApiResponse<User[]>));

export const getUser = (id: string) =>
  fetcher<any>(`/users/${id}`).then((raw) => {
    const u = raw?.data ?? raw ?? {};
    const mapped: User = {
      id: String(u.id ?? id),
      email: u.email ?? u.username ?? 'user@example.com',
      name: u.name ?? u.username ?? 'User',
      role: toCanonicalRole(u.role) as Role,
      department: u.department,
      designation: u.designation,
      ctc: u.ctc,
      manager_id: u.manager_id,
      createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    };
    return { data: mapped } as ApiResponse<User>;
  }).catch(() => ({ data: [][0] } as ApiResponse<User>));

export const createUser = (body: Partial<User> & any) => {
  // Support backend schema: { username, password, name, email, role, department, manager_id }
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
      }
    : {
        name: body.name,
        email: body.email,
        role: body.role,
        department: body.department,
        managerId: body.managerId,
      };
  return fetcher<ApiResponse<User>>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateUser = (id: string, body: Partial<User>) =>
  fetcher<ApiResponse<User>>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

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
      defaultDays: Number(c.max_days_per_year || c.defaultDays || 0),
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
      max_days_per_year: body.defaultDays,
      requires_approval: true, // Default to true
    }),
  });

export const updateLeaveCategory = (id: string, body: Partial<LeaveCategory>) =>
  fetcher<ApiResponse<LeaveCategory>>(`/leave-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: body.name,
      description: body.description,
      max_days_per_year: body.defaultDays,
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
      user_id: userId,
      category_id: body.categoryId,
      category_name: body.categoryName,
      total_days: body.totalDays,
      year: body.year,
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
    const mapped = items.map((b: any) => ({
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
  fetcher<any>(`/leaves?${new URLSearchParams({ ...params, paginated: 'true' } || {}).toString()}`).then((raw) => {
    const items = (raw?.data || []) as any[];
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
      total: raw?.total || 0,
      page: raw?.page || 1,
      per_page: raw?.per_page || 10,
      total_pages: raw?.total_pages || 1,
    };
  }).catch(() => ({ 
    data: [], 
    total: 0, 
    page: 1, 
    per_page: 10, 
    total_pages: 1 
  }));

export const getLeave = (id: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}`);

export const applyLeave = (body: Partial<Leave> & { reason?: string }) =>
  fetcher<any>("/leaves", {
    method: "POST",
    body: JSON.stringify({
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

export const uploadSalarySlip = (formData: FormData) =>
  uploadFile<ApiResponse<SalarySlip>>("/api/salary-slips", formData);

export const deleteSalarySlip = (id: string) =>
  fetcher<ApiResponse<void>>(`/salary-slips/${id}`, {
    method: "DELETE",
  });

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
      }));
      return { data: mapped } as ApiResponse<Document[]>;
    });
  });

export const uploadUserDocument = (userId: string, formData: FormData) => {
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
      date: body.date,
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
      date: body.date,
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
  return user?.role === "Manager" || user?.role === "HR" || user?.role === "Admin" || user?.role === "God";
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
      recent_off_sites: []
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
        name: u.manager.name,
        role: toCanonicalRole(u.manager.role) as Role,
        department: u.manager.department,
        designation: u.manager.designation,
      } : undefined,
      ctc: u.ctc ? Number(u.ctc) : undefined,
      organization_id: u.organization_id,
      created_at: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updated_at: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : [] } as ApiResponse<User[]>;
  }).catch(() => ({ data: [] } as ApiResponse<User[]>));

// -------------------- Company Payroll Settings --------------------
import type { PayrollSettings } from "./payroll";

const localSettingsKey = (companyId: string) => `payroll_settings:${companyId}`;

export const getCompanySettings = async (companyId: string): Promise<ApiResponse<PayrollSettings>> => {
  try {
    const res = await fetcher<any>(`/companies/${companyId}/payroll-settings`);
    if (res?.data) return { data: res.data as PayrollSettings };
  } catch (_) {
    // ignore and fallback
  }
  // fallback to localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(localSettingsKey(companyId));
    if (saved) {
      try {
        return { data: JSON.parse(saved) as PayrollSettings };
      } catch {}
    }
  }
  const { defaultPayrollSettings } = await import("./payroll");
  return { data: defaultPayrollSettings };
};

export const updateCompanySettings = async (companyId: string, settings: PayrollSettings, currency?: string): Promise<ApiResponse<PayrollSettings>> => {
  try {
    const payload = currency ? { ...settings, currency } : settings;
    const res = await fetcher<any>(`/companies/${companyId}/payroll-settings`, {
      method: "PUT",
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
  reason: string;
  amount: number;
  date: string;
  status?: 'pending' | 'approved' | 'rejected' | 'returned';
  bills?: Array<{
    id: string;
    file_name: string;
    file_url: string;
  }>;
  created_at?: string;
}

export const getReimbursements = async (status?: string): Promise<ApiResponse<ReimbursementRequest[]>> => {
  const params = status ? `?status=${status}` : '';
  return await fetcher<ReimbursementRequest[]>(`/reimbursements${params}`);
};

export const createReimbursement = async (data: {
  reason: string;
  amount: number;
  date: string;
  bills: File[];
}): Promise<ApiResponse<ReimbursementRequest>> => {
  const formData = new FormData();
  formData.append('reason', data.reason);
  formData.append('amount', data.amount.toString());
  formData.append('date', data.date);
  
  data.bills.forEach((file) => {
    formData.append('bills', file);
  });

  return await fetcher<ReimbursementRequest>('/reimbursements', {
    method: 'POST',
    body: formData,
  });
};

export const updateReimbursementStatus = async (
  id: string, 
  status: 'approved' | 'rejected' | 'returned',
  reason?: string
): Promise<ApiResponse<ReimbursementRequest>> => {
  return await fetcher<ReimbursementRequest>(`/reimbursements/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, reason }),
  });
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
  return await fetcher<EmployeeGrowthRecord[]>(`/employee-growth/${userId}`);
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
  return await fetcher<EmployeeGrowthRecord>('/employee-growth', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateGrowthRecord = async (id: string, data: {
  title: string;
  description?: string;
  type: string;
  date: string;
}): Promise<ApiResponse<EmployeeGrowthRecord>> => {
  return await fetcher<EmployeeGrowthRecord>(`/employee-growth/record/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteGrowthRecord = async (id: string): Promise<ApiResponse<void>> => {
  return await fetcher<void>(`/employee-growth/record/${id}`, {
    method: 'DELETE',
  });
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
    case 'manager':
      return 'Manager';
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
    console.error("Failed to parse user from localStorage:", error);
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
export const canApproveLeaves = () => hasRole(['Manager', 'HR', 'Admin']);
export const isManager = () => hasRole(['Manager', 'HR', 'Admin']);
export const isGod = () => hasRole(['God']);

// God API functions
export const getPlatformStats = async (): Promise<PlatformStats> => {
  const response = await fetcher(`/god/stats`);
  return response.data;
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await fetcher(`/god/organizations`);
  const orgs = response.organizations || response.data || [];
  
  // Map backend response to frontend interface
  return orgs.map((org: any) => ({
    id: org.id,
    name: org.name,
    domain: org.domain,
    description: org.description || '',
    is_active: org.is_active,
    user_count: org.user_count || 0, // Default to 0 if not provided
    created_at: org.created_at,
    updated_at: org.updated_at,
  }));
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
  const response = await fetcher(`/god/organizations`, {
    method: "POST",
    body: JSON.stringify(orgData),
  });
  return response;
};

export const getOrganizationDetails = async (id: number): Promise<{ organization: Organization; admin_user?: any }> => {
  const response = await fetcher(`/god/organizations/${id}`);
  return response;
};

export const updateOrganization = async (id: number, orgData: {
  name?: string;
  domain?: string;
  description?: string;
  is_active?: boolean;
}): Promise<{ data: Organization; message: string }> => {
  const response = await fetcher(`/god/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(orgData),
  });
  return response;
};

export const deleteOrganization = async (id: number): Promise<{ message: string }> => {
  const response = await fetcher(`/god/organizations/${id}`, {
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
