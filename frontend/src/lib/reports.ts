// Utility functions for generating and downloading reports

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateLeavesReport(leaves: any[], month?: string, year?: number): string {
  const headers = ['Employee Name', 'Employee ID', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason'];
  const rows = leaves.map(leave => [
    leave.user?.name || 'N/A',
    leave.user?.employee_id || 'N/A',
    leave.type || leave.category?.name || 'N/A',
    leave.from_date || leave.from || 'N/A',
    leave.to_date || leave.to || 'N/A',
    leave.days || '0',
    leave.status || 'pending',
    (leave.reason || '').replace(/"/g, '""') // Escape quotes for CSV
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export function generateOffSitesReport(offSites: any[], month?: string, year?: number): string {
  const headers = ['Employee Name', 'Employee ID', 'Title', 'Location', 'Type', 'Start Date', 'End Date', 'Status'];
  const rows = offSites.map(offSite => [
    offSite.user?.name || 'N/A',
    offSite.user?.employee_id || 'N/A',
    (offSite.title || '').replace(/"/g, '""'),
    (offSite.location || '').replace(/"/g, '""'),
    offSite.type || 'N/A',
    offSite.start_date || 'N/A',
    offSite.end_date || 'N/A',
    offSite.status || 'N/A'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export function generateNewEmployeesReport(employees: any[], month?: string, year?: number): string {
  const headers = ['Employee Name', 'Employee ID', 'Email', 'Department', 'Designation', 'Role', 'Joining Date', 'Manager'];
  const rows = employees.map(emp => [
    emp.name || 'N/A',
    emp.employee_id || 'N/A',
    emp.email || 'N/A',
    emp.department || 'N/A',
    emp.designation || 'N/A',
    emp.role || 'N/A',
    emp.joining_date || 'N/A',
    emp.manager?.name || 'N/A'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export function filterByMonth<T extends { created_at?: string; from_date?: string; start_date?: string; joining_date?: string }>(
  items: T[],
  month?: string,
  year?: number
): T[] {
  if (!month && !year) return items;
  
  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();
  
  return items.filter(item => {
    const dateStr = item.created_at || item.from_date || item.start_date || item.joining_date;
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear;
  });
}

