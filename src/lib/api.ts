const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Types for better type safety
export type Role = 'Employee' | 'Manager' | 'HR' | 'Admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string;
  managerId?: string;
  ctc?: number;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveCategory {
  id: string;
  name: string;
  description?: string;
  defaultDays: number;
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
  type: 'Sick' | 'Casual' | 'Professional';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  from: string; // ISO date string
  to: string;   // ISO date string
  createdAt: string;
}

export type LeaveBalance =
  | { type: 'Sick' | 'Casual' | 'Professional'; balance: number }
  | { id?: string; userId?: string; type: string; total: number; used: number; remaining: number }
  | LeaveAllocation;

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
  date: string; // yyyy-mm-dd
  organizationId?: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  approvedLeaves: number;
  totalDocuments: number;
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
  const organizationId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(organizationId ? { "X-Organization-ID": organizationId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
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
  const organizationId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;

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
const mockUsers = (): User[] => [
  { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'Admin', department: 'IT', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', email: 'hr@example.com', name: 'HR Lead', role: 'HR', department: 'People', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', email: 'manager@example.com', name: 'Eng Manager', role: 'Manager', department: 'Engineering', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', email: 'employee@example.com', name: 'Employee One', role: 'Employee', department: 'Engineering', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockLeaveCategories = (): LeaveCategory[] => [
  { id: '1', name: 'Casual Leave', description: 'General purpose leave', defaultDays: 24, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Sick Leave', description: 'Medical leave', defaultDays: 10, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: 'Professional Leave', description: 'Training and development', defaultDays: 5, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', name: 'Maternity Leave', description: 'Maternity and childcare', defaultDays: 90, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', name: 'Paternity Leave', description: 'Paternity and childcare', defaultDays: 15, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const mockLeaveAllocations = (userId: string, year?: number): LeaveAllocation[] => {
  const currentYear = year || new Date().getFullYear();
  return [
    { id: '1', userId, categoryId: '1', categoryName: 'Casual Leave', totalDays: 24, usedDays: 8, remainingDays: 16, year: currentYear, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '2', userId, categoryId: '2', categoryName: 'Sick Leave', totalDays: 10, usedDays: 2, remainingDays: 8, year: currentYear, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '3', userId, categoryId: '3', categoryName: 'Professional Leave', totalDays: 5, usedDays: 1, remainingDays: 4, year: currentYear, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
};

const mockLeaveBalances = (userId: string): LeaveBalance[] => [
  { type: 'Casual', total: 24, used: 8, remaining: 16 },
  { type: 'Sick', total: 10, used: 2, remaining: 8 },
  { type: 'Professional', total: 5, used: 1, remaining: 4 },
];

const mockLeaves = (userId?: string): Leave[] => [
  { id: '101', userId: userId || '4', type: 'Casual', status: 'approved', from: '2025-05-10', to: '2025-05-12', createdAt: new Date().toISOString() },
  { id: '102', userId: userId || '4', type: 'Sick', status: 'pending', from: '2025-06-02', to: '2025-06-02', createdAt: new Date().toISOString() },
  { id: '103', userId: userId || '4', type: 'Professional', status: 'rejected', from: '2025-04-20', to: '2025-04-21', createdAt: new Date().toISOString() },
];

const mockDocuments = (): Document[] => [
  { id: '201', title: 'Company Handbook', category: 'HR', isPublic: true, fileUrl: '/docs/handbook.pdf', createdAt: new Date().toISOString() },
  { id: '202', title: 'Security Policy', category: 'IT', isPublic: false, fileUrl: '/docs/security.pdf', createdAt: new Date().toISOString() },
];

const mockSlips = (userId?: string): SalarySlip[] => [
  { id: '301', userId: userId || '4', month: 5, year: 2025, fileUrl: '/slips/2025-05.pdf', createdAt: new Date().toISOString() },
  { id: '302', userId: userId || '4', month: 4, year: 2025, fileUrl: '/slips/2025-04.pdf', createdAt: new Date().toISOString() },
];

const mockHolidays = (): Holiday[] => [
  { id: '401', name: 'New Year', date: '2025-01-01', createdAt: new Date().toISOString() },
  { id: '402', name: 'Independence Day', date: '2025-07-04', createdAt: new Date().toISOString() },
];

const mockStats = (): DashboardStats => ({
  totalEmployees: 128,
  pendingLeaves: 3,
  approvedLeaves: 22,
  totalDocuments: 18,
});

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
    return { data: mapped.length ? mapped : mockUsers() } as ApiResponse<User[]>;
  }).catch(() => ({ data: mockUsers() } as ApiResponse<User[]>));

export const getUser = (id: string) =>
  fetcher<any>(`/users/${id}`).then((raw) => {
    const u = raw?.data ?? raw ?? {};
    const mapped: User = {
      id: String(u.id ?? id),
      email: u.email ?? u.username ?? 'user@example.com',
      name: u.name ?? u.username ?? 'User',
      role: toCanonicalRole(u.role) as Role,
      department: u.department,
      createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    };
    return { data: mapped } as ApiResponse<User>;
  }).catch(() => ({ data: mockUsers()[0] } as ApiResponse<User>));

export const createUser = (body: Partial<User> & any) => {
  // Support backend schema: { username, password, role, department, manager_id }
  const hasRaw = body?.username || body?.password || typeof body?.manager_id !== 'undefined';
  const payload = hasRaw
    ? {
        username: body.username,
        password: body.password,
        role: body.role,
        department: body.department,
        manager_id: body.manager_id,
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
  fetcher<ApiResponse<User>>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteUser = (id: string) =>
  fetcher<ApiResponse<void>>(`/users/${id}`, {
    method: "DELETE",
  });

// -------------------- Leave Categories --------------------
export const getLeaveCategories = () =>
  fetcher<any>("/leave-categories").then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: LeaveCategory[] = items.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      description: c.description,
      defaultDays: Number(c.defaultDays ?? c.default_days ?? 0),
      isActive: Boolean(c.isActive ?? c.is_active ?? true),
      createdAt: c.createdAt ?? c.created_at ?? new Date().toISOString(),
      updatedAt: c.updatedAt ?? c.updated_at ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : mockLeaveCategories() } as ApiResponse<LeaveCategory[]>;
  }).catch(() => ({ data: mockLeaveCategories() } as ApiResponse<LeaveCategory[]>));

export const createLeaveCategory = (body: Partial<LeaveCategory>) =>
  fetcher<ApiResponse<LeaveCategory>>("/leave-categories", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateLeaveCategory = (id: string, body: Partial<LeaveCategory>) =>
  fetcher<ApiResponse<LeaveCategory>>(`/leave-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteLeaveCategory = (id: string) =>
  fetcher<ApiResponse<void>>(`/leave-categories/${id}`, {
    method: "DELETE",
  });

// -------------------- Leave Allocations --------------------
export const getLeaveAllocations = (userId: string, year?: number) =>
  fetcher<any>(`/users/${userId}/leave-allocations${year ? `?year=${year}` : ''}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
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
    return { data: mapped.length ? mapped : mockLeaveAllocations(userId, year) } as ApiResponse<LeaveAllocation[]>;
  }).catch(() => ({ data: mockLeaveAllocations(userId, year) } as ApiResponse<LeaveAllocation[]>));

export const createLeaveAllocation = (userId: string, body: Partial<LeaveAllocation>) =>
  fetcher<ApiResponse<LeaveAllocation>>(`/users/${userId}/leave-allocations`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateLeaveAllocation = (userId: string, allocationId: string, body: Partial<LeaveAllocation>) =>
  fetcher<ApiResponse<LeaveAllocation>>(`/users/${userId}/leave-allocations/${allocationId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteLeaveAllocation = (userId: string, allocationId: string) =>
  fetcher<ApiResponse<void>>(`/users/${userId}/leave-allocations/${allocationId}`, {
    method: "DELETE",
  });

// -------------------- Leave Balance (Legacy Support) --------------------
export const getLeaveBalance = (userId: string) =>
  fetcher<any>(`/users/${userId}/leave-balance`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped = items.map((b: any) => ({
      type: b.type,
      total: b.total ?? b.balance ?? 0,
      used: b.used ?? 0,
      remaining: b.remaining ?? b.balance ?? (b.total != null && b.used != null ? b.total - b.used : 0),
    }));
    return { data: mapped.length ? mapped : mockLeaveBalances(userId) } as ApiResponse<LeaveBalance[]>;
  }).catch(() => ({ data: mockLeaveBalances(userId) } as ApiResponse<LeaveBalance[]>));

export const updateLeaveBalance = (userId: string, body: Partial<LeaveBalance>) =>
  fetcher<ApiResponse<LeaveBalance>>(`/users/${userId}/leave-balance`, {
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
      type: (l.type === 'Sick' || l.type === 'Casual' || l.type === 'Professional') ? l.type : 'Professional',
      status: String(l.status || 'Pending').toLowerCase() as any,
      from: l.from ?? l.from_date,
      to: l.to ?? l.to_date,
      createdAt: l.createdAt ?? l.created_at ?? new Date().toISOString(),
    }));
    const uid = params?.userId;
    return { data: mapped.length ? mapped : mockLeaves(uid) } as ApiResponse<Leave[]>;
  }).catch(() => ({ data: mockLeaves(params?.userId) } as ApiResponse<Leave[]>));

export const getLeave = (id: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}`);

export const applyLeave = (body: Partial<Leave> & { reason?: string }) =>
  fetcher<any>("/leaves", {
    method: "POST",
    body: JSON.stringify({
      type: body.type,
      from_date: body.from,
      to_date: body.to ?? body.from,
      reason: body.reason,
    }),
  }).then((raw) => {
    const l = raw?.data ?? raw;
    const mapped: Leave = {
      id: String(l.id),
      userId: String(l.user_id ?? l.userId ?? ''),
      type: (l.type === 'Sick' || l.type === 'Casual' || l.type === 'Professional') ? l.type : (body.type as any),
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

// -------------------- Documents --------------------
export const getDocuments = (params?: Record<string, string>) =>
  fetcher<any>(`/documents?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: Document[] = items.map((d: any) => ({
      id: String(d.id),
      title: d.title,
      category: d.category,
      isPublic: Boolean(d.is_public ?? d.isPublic),
      fileUrl: d.fileUrl ?? d.file_path,
      createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : mockDocuments() } as ApiResponse<Document[]>;
  }).catch(() => ({ data: mockDocuments() } as ApiResponse<Document[]>));

export const getDocument = (id: string) =>
  fetcher<ApiResponse<Document>>(`/documents/${id}`);

export const uploadDocument = (formData: FormData) =>
  uploadFile<ApiResponse<Document>>("/documents", formData);

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

// -------------------- Salary Slips --------------------
export const getSalarySlips = (params?: Record<string, string>) =>
  fetcher<any>(`/salary-slips?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: SalarySlip[] = items.map((s: any) => ({
      id: String(s.id),
      userId: String(s.user_id ?? s.userId ?? ''),
      month: Number(s.month),
      year: Number(s.year),
      fileUrl: s.fileUrl ?? s.file_path,
      createdAt: s.createdAt ?? s.created_at ?? new Date().toISOString(),
    }));
    const uid = params?.userId;
    return { data: mapped.length ? mapped : mockSlips(uid) } as ApiResponse<SalarySlip[]>;
  }).catch(() => ({ data: mockSlips(params?.userId) } as ApiResponse<SalarySlip[]>));

export const getSalarySlip = (id: string) =>
  fetcher<ApiResponse<SalarySlip>>(`/salary-slips/${id}`);

export const uploadSalarySlip = (formData: FormData) =>
  uploadFile<ApiResponse<SalarySlip>>("/salary-slips", formData);

export const deleteSalarySlip = (id: string) =>
  fetcher<ApiResponse<void>>(`/salary-slips/${id}`, {
    method: "DELETE",
  });

// Per-employee private documents
export const getUserDocuments = (userId: string) =>
  fetcher<any>(`/users/${userId}/documents`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: Document[] = items.map((d: any) => ({
      id: String(d.id),
      title: d.title,
      category: d.category ?? 'Payslip Document',
      isPublic: Boolean(d.is_public ?? d.isPublic ?? false),
      fileUrl: d.fileUrl ?? d.file_path,
      createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
    }));
    return { data: mapped } as ApiResponse<Document[]>;
  }).catch(() => {
    // Fallback: filter all documents by userId if endpoint not available
    return fetcher<any>(`/documents?userId=${encodeURIComponent(userId)}`).then((raw2) => {
      const items = (raw2?.data || raw2 || []) as any[];
      const mapped: Document[] = items.map((d: any) => ({
        id: String(d.id),
        title: d.title,
        category: d.category ?? 'Payslip Document',
        isPublic: Boolean(d.is_public ?? d.isPublic ?? false),
        fileUrl: d.fileUrl ?? d.file_path,
        createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),
      }));
      return { data: mapped } as ApiResponse<Document[]>;
    });
  });

export const uploadUserDocument = (userId: string, formData: FormData) => {
  // Ensure private by default for employee-scoped docs
  if (!formData.has('isPublic')) formData.append('isPublic', 'false');
  if (!formData.has('userId')) formData.append('userId', userId);
  return uploadFile<ApiResponse<Document>>(`/users/${userId}/documents`, formData)
    .catch(() => uploadFile<ApiResponse<Document>>('/documents', formData));
};

// -------------------- Holidays --------------------
export const getHolidays = (params?: Record<string, string>) =>
  fetcher<any>(`/holidays?${new URLSearchParams(params || {}).toString()}`).then((raw) => {
    const items = (raw?.data || raw || []) as any[];
    const mapped: Holiday[] = items.map((h: any) => ({
      id: String(h.id),
      name: h.name,
      date: h.date,
      createdAt: h.createdAt ?? h.created_at,
    }));
    return { data: mapped.length ? mapped : mockHolidays() } as ApiResponse<Holiday[]>;
  }).catch(() => ({ data: mockHolidays() } as ApiResponse<Holiday[]>));

export const createHoliday = (body: Partial<Holiday>) =>
  fetcher<any>("/holidays", {
    method: "POST",
    body: JSON.stringify({ name: body.name, date: body.date }),
  }).then((raw) => ({
    data: {
      id: String(raw?.data?.id ?? raw.id),
      name: raw?.data?.name ?? raw.name,
      date: raw?.data?.date ?? raw.date,
      createdAt: raw?.data?.created_at ?? raw?.data?.createdAt ?? raw?.created_at,
    },
  } as ApiResponse<Holiday>));

export const updateHoliday = (id: string, body: Partial<Holiday>) =>
  fetcher<any>(`/holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: body.name, date: body.date }),
  }).then((raw) => ({
    data: {
      id: String(raw?.data?.id ?? raw.id ?? id),
      name: raw?.data?.name ?? raw.name ?? (body.name as string),
      date: raw?.data?.date ?? raw.date ?? (body.date as string),
      createdAt: raw?.data?.created_at ?? raw?.data?.createdAt ?? raw?.created_at,
    },
  } as ApiResponse<Holiday>));

export const deleteHoliday = (id: string) =>
  fetcher<ApiResponse<void>>(`/holidays/${id}`, {
    method: "DELETE",
  });

// -------------------- Organization Tree --------------------
export const getOrgTree = () =>
  fetcher<ApiResponse<any>>("/org/tree");

// -------------------- Dashboard --------------------
export const getDashboardStats = () =>
  fetcher<any>("/dashboard/stats").then((raw) => {
    const d = raw?.data ?? raw ?? {};
    const mapped: DashboardStats = {
      totalEmployees: d.totalEmployees ?? d.total_users ?? 0,
      pendingLeaves: d.pendingLeaves ?? d.pending_leaves ?? 0,
      approvedLeaves: d.approvedLeaves ?? d.approved_leaves ?? 0,
      totalDocuments: d.totalDocuments ?? d.total_documents ?? 0,
    };
    const fallback = mapped.totalEmployees || mapped.pendingLeaves || mapped.approvedLeaves || mapped.totalDocuments
      ? mapped
      : mockStats();
    return { data: fallback } as ApiResponse<DashboardStats>;
  }).catch(() => ({ data: mockStats() } as ApiResponse<DashboardStats>));

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
      ctc: u.ctc ? Number(u.ctc) : undefined,
      createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updated_at ?? u.updatedAt ?? new Date().toISOString(),
    }));
    return { data: mapped.length ? mapped : mockUsers() } as ApiResponse<User[]>;
  }).catch(() => ({ data: mockUsers() } as ApiResponse<User[]>));

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

export const updateCompanySettings = async (companyId: string, settings: PayrollSettings): Promise<ApiResponse<PayrollSettings>> => {
  try {
    const res = await fetcher<any>(`/companies/${companyId}/payroll-settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
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

// -------------------- Current User --------------------
export const toCanonicalRole = (inputRole: string | undefined | null): Role => {
  const value = (inputRole || '').toString().trim().toLowerCase();
  switch (value) {
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
