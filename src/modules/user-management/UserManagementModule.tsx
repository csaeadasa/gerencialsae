import React from "react";
import { UserManagementProvider } from "./UserManagementContext";
import { UserManagementTab } from "../../components/UserManagementTab";

export interface UserManagementModuleProps {
  initialTab?: "users" | "roles" | "departments";
}

export function UserManagementModule({ initialTab = "users" }: UserManagementModuleProps) {
  return (
    <UserManagementProvider>
      <div className="user-management-module-root w-full h-full">
        <UserManagementTab initialTab={initialTab} />
      </div>
    </UserManagementProvider>
  );
}
