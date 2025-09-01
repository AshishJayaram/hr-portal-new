const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetcher<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // so cookies/session pass through
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---- Endpoints ----

// Dashboard stats
export const getDashboardStats = () => fetcher<any>("/dashboard/stats");

// Leaves
export const getLeaves = (params?: Record<string, string>) =>
  fetcher<any>(`/leaves?${new URLSearchParams(params || {}).toString()}`);

// Documents
export const getDocuments = (params?: Record<string, string>) =>
  fetcher<any>(`/documents?${new URLSearchParams(params || {}).toString()}`);

// Salary slips
export const getSalarySlips = (userId: string) =>
  fetcher<any>(`/salary-slips?userId=${userId}`);
