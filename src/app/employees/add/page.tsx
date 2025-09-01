"use client";

import { useState } from "react";

export default function AddEmployeePage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    department: "",
    position: "",
    role: "EMPLOYEE",
    managerId: "",
    hrId: "",
    joiningDate: "",
  });

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/10 p-6 rounded-xl space-y-4 max-w-lg mx-auto"
    >
      <h2 className="text-xl font-bold text-white">Add Employee</h2>
      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="employeeId" placeholder="Employee ID" onChange={handleChange} />
      <input name="department" placeholder="Department" onChange={handleChange} />
      <input name="position" placeholder="Position" onChange={handleChange} />
      <select name="role" onChange={handleChange}>
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="HR">HR</option>
        <option value="ADMIN">Admin</option>
      </select>
      <input name="managerId" placeholder="Manager ID" onChange={handleChange} />
      <input name="hrId" placeholder="HR ID" onChange={handleChange} />
      <input type="date" name="joiningDate" onChange={handleChange} />
      <button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded">
        Save
      </button>
    </form>
  );
}
