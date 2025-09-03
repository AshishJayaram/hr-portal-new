const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Types for better type safety
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Employee' | 'Manager' | 'HR' | 'Admin';
  department?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  userId: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  from: string;
  to: string;
  reason?: string;
  startHalf?: 'FULL' | 'AM' | 'PM';
  endHalf?: 'FULL' | 'AM' | 'PM';
  days?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  type: string;
  total: number;
  used: number;
  remaining: number;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  isPublic: boolean;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface SalarySlip {
  id: string;
  userId: string;
  month: number;
  year: number;
  fileUrl: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include", // Include cookies for NextAuth
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(errorData.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

// Helper for multipart form data
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(errorData.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

// -------------------- Auth --------------------
export const login = (username: string, password: string) =>
  fetcher<ApiResponse<{ user: User; token: string }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () =>
  fetcher<ApiResponse<void>>("/auth/logout", {
    method: "POST",
  });

// -------------------- Users --------------------
export const getUsers = (params?: Record<string, string>) =>
  fetcher<ApiResponse<User[]>>(`/users?${new URLSearchParams(params || {}).toString()}`);

export const getUser = (id: string) =>
  fetcher<ApiResponse<User>>(`/users/${id}`);

export const createUser = (body: Partial<User>) =>
  fetcher<ApiResponse<User>>("/users", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateUser = (id: string, body: Partial<User>) =>
  fetcher<ApiResponse<User>>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteUser = (id: string) =>
  fetcher<ApiResponse<void>>(`/users/${id}`, {
    method: "DELETE",
  });

// -------------------- Leave Balance --------------------
export const getLeaveBalance = (userId: string) =>
  fetcher<ApiResponse<LeaveBalance[]>>(`/users/${userId}/leave-balance`);

export const updateLeaveBalance = (userId: string, body: Partial<LeaveBalance>) =>
  fetcher<ApiResponse<LeaveBalance>>(`/users/${userId}/leave-balance`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// -------------------- Leaves --------------------
export const getLeaves = (params?: Record<string, string>) =>
  fetcher<ApiResponse<Leave[]>>(`/leaves?${new URLSearchParams(params || {}).toString()}`);

export const getLeave = (id: string) =>
  fetcher<ApiResponse<Leave>>(`/leaves/${id}`);

export const applyLeave = (body: Partial<Leave>) =>
  fetcher<ApiResponse<Leave>>("/leaves", {
    method: "POST",
    body: JSON.stringify(body),
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
  fetcher<ApiResponse<Document[]>>(`/documents?${new URLSearchParams(params || {}).toString()}`);

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
  fetcher<ApiResponse<SalarySlip[]>>(`/salary-slips?${new URLSearchParams(params || {}).toString()}`);

export const getSalarySlip = (id: string) =>
  fetcher<ApiResponse<SalarySlip>>(`/salary-slips/${id}`);

export const uploadSalarySlip = (formData: FormData) =>
  uploadFile<ApiResponse<SalarySlip>>("/salary-slips", formData);

export const deleteSalarySlip = (id: string) =>
  fetcher<ApiResponse<void>>(`/salary-slips/${id}`, {
    method: "DELETE",
  });

// -------------------- Holidays --------------------
export const getHolidays = (params?: Record<string, string>) =>
  fetcher<ApiResponse<Holiday[]>>(`/holidays?${new URLSearchParams(params || {}).toString()}`);

export const createHoliday = (body: Partial<Holiday>) =>
  fetcher<ApiResponse<Holiday>>("/holidays", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateHoliday = (id: string, body: Partial<Holiday>) =>
  fetcher<ApiResponse<Holiday>>(`/holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteHoliday = (id: string) =>
  fetcher<ApiResponse<void>>(`/holidays/${id}`, {
    method: "DELETE",
  });

// -------------------- Organization Tree --------------------
export const getOrgTree = () =>
  fetcher<ApiResponse<any>>("/org/tree");

// -------------------- Dashboard --------------------
export const getDashboardStats = () =>
  fetcher<ApiResponse<DashboardStats>>("/dashboard/stats");

// -------------------- Team --------------------
export const getTeam = (params?: Record<string, string>) =>
  fetcher<ApiResponse<User[]>>(`/team?${new URLSearchParams(params || {}).toString()}`);

// -------------------- Current User --------------------
export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr || userStr === "undefined" || userStr === "null") return null;
  
  try {
    return JSON.parse(userStr);
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
  return user && requiredRoles.includes(user.role);
};

export const canManageUsers = () => hasRole(['hr', 'admin']);
export const canManageDocuments = () => hasRole(['hr', 'admin']);
export const canManageSalarySlips = () => hasRole(['hr', 'admin']);
export const canManageHolidays = () => hasRole(['hr', 'admin']);
export const canApproveLeaves = () => hasRole(['manager', 'hr', 'admin']);
export const isManager = () => hasRole(['manager', 'hr', 'admin']);
