"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/lib/api";

// Global users cache hook - fetch once, use everywhere
export function useUsersCache() {
  return useQuery({
    queryKey: ["users", "global"],
    queryFn: () => getUsers({}),
    staleTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Filtered users hook - uses global cache
export function useFilteredUsers(query: string = "") {
  const { data: usersData, isLoading, error } = useUsersCache();
  
  const filteredUsers = React.useMemo(() => {
    if (!usersData?.data) return [];
    if (!query) return usersData.data;
    
    return usersData.data.filter((user: any) => 
      user.name?.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase()) ||
      user.designation?.toLowerCase().includes(query.toLowerCase())
    );
  }, [usersData?.data, query]);

  return {
    users: filteredUsers,
    allUsers: usersData?.data || [],
    isLoading,
    error
  };
}

// User name lookup hook - uses global cache
export function useUserName(userId: string) {
  const { allUsers } = useFilteredUsers();
  
  const userName = React.useMemo(() => {
    const user = allUsers.find((u: any) => String(u.id) === String(userId));
    return user?.name || `Employee`;
  }, [allUsers, userId]);

  return userName;
}
