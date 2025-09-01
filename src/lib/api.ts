const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetcher<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // 👈 attach token
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// -------------------- Dashboard --------------------
export const getDashboardStats = () => fetcher<any>("/dashboard/stats");

// -------------------- Leaves --------------------
export const getLeaves = (params?: Record<string, string>) =>
  fetcher<any>(`/leaves?${new URLSearchParams(params || {}).toString()}`);

// -------------------- Documents --------------------
export const getDocuments = (params?: Record<string, string>) =>
  fetcher<any>(`/documents?${new URLSearchParams(params || {}).toString()}`);

// -------------------- Salary slips --------------------
export const getSalarySlips = (userId: string) =>
  fetcher<any>(`/salary-slips?userId=${userId}`);

// -------------------- Users --------------------
export const getUsers = (params?: Record<string, string>) =>
  fetcher<any>(`/users?${new URLSearchParams(params || {}).toString()}`);

export const createUser = (body: any) =>
  fetcher<any>("/users", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateUser = (id: string, body: any) =>
  fetcher<any>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteUser = (id: string) =>
  fetcher<any>(`/users/${id}`, {
    method: "DELETE",
  });

  // Leave Balance
export const getLeaveBalance = (userId: string) =>
  fetcher<any>(`/users/${userId}/leave-balance`);

export const updateLeaveBalance = (userId: string, body: any) =>
  fetcher<any>(`/users/${userId}/leave-balance`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// Apply Leave
export const applyLeave = (body: any) =>
  fetcher<any>("/leaves", {
    method: "POST",
    body: JSON.stringify(body),
  });
