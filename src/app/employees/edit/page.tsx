"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { getUsers, updateUser } from "../../../lib/api";

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user", params.id],
    queryFn: () => getUsers({ id: params.id }),
  });

  const mutation = useMutation({
    mutationFn: (body: any) => updateUser(params.id, body),
  });

  if (isLoading) return <p>Loading...</p>;

  const user = data?.data?.[0];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit {user?.name}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget as HTMLFormElement);
          const updates = Object.fromEntries(formData.entries());
          mutation.mutate(updates);
        }}
        className="space-y-3"
      >
        <input name="position" defaultValue={user?.position} />
        <input name="department" defaultValue={user?.department} />
        <select name="role" defaultValue={user?.role}>
          <option>EMPLOYEE</option>
          <option>MANAGER</option>
          <option>HR</option>
          <option>ADMIN</option>
        </select>
        <button className="bg-green-600 text-white p-2 rounded">
          Save Changes
        </button>
      </form>
    </div>
  );
}
