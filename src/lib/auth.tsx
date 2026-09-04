import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole, ModuleId, ActionType, Department } from '../types';

export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema, todas as ações permitidas',
    permissions: [
      { moduleId: 'planning_my_tasks', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_dashboard', actions: ['view'] },
      { moduleId: 'planning_tasks', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_plans', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_areas', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_categories', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_responsibles', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_import', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_models', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'planning_radar', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'systems', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'supply_sources', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'demands', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'explore', actions: ['view'] },
      { moduleId: 'analyze', actions: ['view'] },
      { moduleId: 'compare', actions: ['view'] },
      { moduleId: 'templates', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_cadastro', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_painel', actions: ['view'] },
      { moduleId: 'reg_agenda', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_agenda_painel', actions: ['view'] },
      { moduleId: 'reg_subsidios', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_subsidios_painel', actions: ['view'] },
      { moduleId: 'reg_subsidios_portal', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_subsidios_oral', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_subsidios_analise', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'reg_subsidios_minuta', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'pub_cadastro', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'pub_painel', actions: ['view'] },
      { moduleId: 'dashboard', actions: ['view'] },
      { moduleId: 'public_hub', actions: ['view'] },
      { moduleId: 'geo', actions: ['view'] },
      { moduleId: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'fisc_operational', actions: ['view', 'create', 'edit', 'delete'] },
      { moduleId: 'recurso_painel', actions: ['view', 'create', 'edit', 'delete'] },
    ]
  },
  {
    id: 'regulator',
    name: 'Regulador',
    description: 'Acesso de auditoria, edição e alteração técnica, com restrições de exclusão.',
    permissions: [
      { moduleId: 'planning_my_tasks', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_dashboard', actions: ['view'] },
      { moduleId: 'planning_tasks', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_plans', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_areas', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_categories', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_responsibles', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_import', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_models', actions: ['view', 'create', 'edit'] },
      { moduleId: 'planning_radar', actions: ['view', 'create', 'edit'] },
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit'] },
      { moduleId: 'systems', actions: ['view', 'create', 'edit'] },
      { moduleId: 'supply_sources', actions: ['view', 'create', 'edit'] },
      { moduleId: 'demands', actions: ['view', 'create', 'edit'] },
      { moduleId: 'explore', actions: ['view'] },
      { moduleId: 'analyze', actions: ['view'] },
      { moduleId: 'compare', actions: ['view'] },
      { moduleId: 'templates', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_cadastro', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_painel', actions: ['view'] },
      { moduleId: 'reg_agenda', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_agenda_painel', actions: ['view'] },
      { moduleId: 'reg_subsidios', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_subsidios_painel', actions: ['view'] },
      { moduleId: 'reg_subsidios_portal', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_subsidios_oral', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_subsidios_analise', actions: ['view', 'create', 'edit'] },
      { moduleId: 'reg_subsidios_minuta', actions: ['view', 'create', 'edit'] },
      { moduleId: 'pub_cadastro', actions: ['view', 'create', 'edit'] },
      { moduleId: 'pub_painel', actions: ['view'] },
      { moduleId: 'dashboard', actions: ['view'] },
      { moduleId: 'public_hub', actions: ['view'] },
      { moduleId: 'geo', actions: ['view'] },
      { moduleId: 'users', actions: ['view'] },
      { moduleId: 'fisc_operational', actions: ['view', 'create', 'edit'] },
      { moduleId: 'recurso_painel', actions: ['view', 'create', 'edit'] },
    ]
  },
  {
    id: 'provider',
    name: 'Prestador',
    description: 'Acesso restrito às suas próprias funcionalidades e envio de dados.',
    permissions: [
      { moduleId: 'water_balances', actions: ['view', 'create', 'edit'] },
      { moduleId: 'systems', actions: ['view'] },
      { moduleId: 'supply_sources', actions: ['view'] },
      { moduleId: 'demands', actions: ['view'] },
      { moduleId: 'explore', actions: ['view'] },
      { moduleId: 'compare', actions: ['view'] },
      { moduleId: 'dashboard', actions: ['view'] },
      { moduleId: 'public_hub', actions: ['view'] },
    ]
  }
];

export const DEFAULT_DEPARTMENTS: Department[] = [];

export const DEFAULT_USERS: AppUser[] = [];

interface AuthContextType {
  currentUser: AppUser | null;
  users: AppUser[];
  roles: UserRole[];
  departments: Department[];
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkPermission: (moduleId: ModuleId, action: ActionType) => boolean;
  hasRole: (roleId: string) => boolean;
  addUser: (user: Omit<AppUser, 'id'>) => Promise<{ success: boolean; data?: AppUser; error?: string }>;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  fetchRoles: () => Promise<void>;
  addRole: (role: Omit<UserRole, 'id'>) => Promise<{ success: boolean; data?: UserRole; error?: string }>;
  updateRole: (id: string, updates: Partial<UserRole>) => Promise<{ success: boolean; data?: UserRole; error?: string }>;
  deleteRole: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchDepartments: () => Promise<void>;
  addDepartment: (dept: { sigla: string; nome: string }) => Promise<{ success: boolean; data?: Department; error?: string }>;
  updateDepartment: (id: number, dept: { sigla: string; nome: string }) => Promise<{ success: boolean; data?: Department; error?: string }>;
  deleteDepartment: (id: number) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem("adasa-sgi-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem("adasa-sgi-user");
      return null;
    }
  });
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data) && resData.data.length > 0) {
          setRoles(resData.data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch roles from database:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data)) {
          setDepartments(resData.data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch departments from database:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data)) {
          setUsers(resData.data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch users from database, using client defaults:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
        if (!active) return;
        if (!response.ok || !data?.success || !data.user) {
          setCurrentUser(null);
          localStorage.removeItem("adasa-sgi-user");
          return;
        }
        setCurrentUser(data.user);
        localStorage.setItem("adasa-sgi-user", JSON.stringify(data.user));
        await Promise.all([fetchRoles(), fetchDepartments(), fetchUsers()]);
      } catch {
        if (active) {
          setCurrentUser(null);
          localStorage.removeItem("adasa-sgi-user");
        }
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, [currentUser?.id]);

  const loginWithCredentials = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem("adasa-sgi-user", JSON.stringify(data.user));
          await Promise.all([fetchRoles(), fetchDepartments(), fetchUsers()]);
          return { success: true };
        } else {
          return { success: false, error: data.error || "Erro na autenticação" };
        }
      }
      return { success: false, error: "Serviço de autenticação temporariamente indisponível. Tente novamente." };
    } catch (err: any) {
      console.error("Login verification error:", err);
      return { success: false, error: "Serviço de autenticação indisponível." };
    }
  };

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    setCurrentUser(null);
    localStorage.removeItem("adasa-sgi-user");
  };

  const checkPermission = (moduleId: ModuleId, action: ActionType): boolean => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;
    
    // Admin override (business rule)
    if (role.id === 'admin') return true;

    const modulePerms = role.permissions.find(p => p.moduleId === moduleId);
    if (!modulePerms) return false;

    return modulePerms.actions.includes(action);
  };

  const hasRole = (roleId: string): boolean => {
    return currentUser?.roleId === roleId;
  };

  const addUser = async (userData: Omit<AppUser, 'id'>): Promise<{ success: boolean; data?: AppUser; error?: string }> => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.data) {
          await fetchUsers();
          return { success: true, data: data.data };
        }
      }
      // Fallback local
      const newUser = { ...userData, id: Date.now().toString() };
      setUsers(prev => [...prev, newUser]);
      return { success: true, data: newUser };
    } catch (err: any) {
      console.error("Error creating database user, falling back:", err);
      const newUser = { ...userData, id: Date.now().toString() };
      setUsers(prev => [...prev, newUser]);
      return { success: true, data: newUser };
    }
  };

  const updateUser = async (id: string, updates: Partial<AppUser>) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success) {
          await fetchUsers();
          if (currentUser && currentUser.id === id) {
            const updatedUser = { ...currentUser, ...updates };
            setCurrentUser(updatedUser);
            localStorage.setItem("adasa-sgi-user", JSON.stringify(updatedUser));
          }
          return;
        }
      }
      // Fallback local
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch (err) {
      console.error("Error updating database user, falling back:", err);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success) {
          await fetchUsers();
          return;
        }
      }
      // Fallback local
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error("Error deleting database user, falling back:", err);
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const addRole = async (roleData: Omit<UserRole, 'id'>): Promise<{ success: boolean; data?: UserRole; error?: string }> => {
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleData)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.data) {
          await fetchRoles();
          return { success: true, data: data.data };
        } else {
          return { success: false, error: data.error || "Erro ao salvar papel" };
        }
      }
      const newRole = { ...roleData, id: 'role_' + Date.now() };
      setRoles(prev => [...prev, newRole]);
      return { success: true, data: newRole };
    } catch (err: any) {
      console.error("Erro ao adicionar papel no banco:", err);
      const newRole = { ...roleData, id: 'role_' + Date.now() };
      setRoles(prev => [...prev, newRole]);
      return { success: true, data: newRole };
    }
  };

  const updateRole = async (id: string, updates: Partial<UserRole>): Promise<{ success: boolean; data?: UserRole; error?: string }> => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.data) {
          await fetchRoles();
          return { success: true, data: data.data };
        } else {
          return { success: false, error: data.error || "Erro ao atualizar papel" };
        }
      }
      setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao atualizar papel no banco:", err);
      setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return { success: true };
    }
  };

  const deleteRole = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: "DELETE"
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success) {
          await fetchRoles();
          return { success: true };
        } else {
          return { success: false, error: data.error || "Erro ao excluir papel" };
        }
      }
      setRoles(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao excluir papel:", err);
      setRoles(prev => prev.filter(r => r.id !== id));
      return { success: false, error: err.message };
    }
  };

  const addDepartment = async (dept: { sigla: string; nome: string }): Promise<{ success: boolean; data?: Department; error?: string }> => {
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dept)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.data) {
          await fetchDepartments();
          return { success: true, data: data.data };
        }
      }
      const newDept: Department = { id: Date.now(), sigla: dept.sigla.toUpperCase(), nome: dept.nome };
      setDepartments(prev => [...prev, newDept]);
      return { success: true, data: newDept };
    } catch (err: any) {
      console.error("Erro ao cadastrar departamento:", err);
      const newDept: Department = { id: Date.now(), sigla: dept.sigla.toUpperCase(), nome: dept.nome };
      setDepartments(prev => [...prev, newDept]);
      return { success: true, data: newDept };
    }
  };

  const updateDepartment = async (id: number, dept: { sigla: string; nome: string }): Promise<{ success: boolean; data?: Department; error?: string }> => {
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dept)
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.data) {
          await fetchDepartments();
          return { success: true, data: data.data };
        }
      }
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...dept, sigla: dept.sigla.toUpperCase() } : d));
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao atualizar departamento:", err);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...dept, sigla: dept.sigla.toUpperCase() } : d));
      return { success: true };
    }
  };

  const deleteDepartment = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE"
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success) {
          await fetchDepartments();
          await fetchUsers();
          return { success: true };
        } else {
          return { success: false, error: data.error || "Erro ao excluir departamento do banco de dados" };
        }
      }
      setDepartments(prev => prev.filter(d => d.id !== id));
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao deletar departamento:", err);
      setDepartments(prev => prev.filter(d => d.id !== id));
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, users, roles, departments,
        loginWithCredentials, logout, checkPermission, hasRole,
        addUser, updateUser, deleteUser,
        fetchRoles, addRole, updateRole, deleteRole,
        fetchDepartments, addDepartment, updateDepartment, deleteDepartment
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ==========================================
// Middleware / Decorators (Wrapper Components)
// ==========================================

interface ProtectedRouteProps {
  moduleId: ModuleId;
  action?: ActionType;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to protect routes or blocks of UI.
 * If user doesn't have permission to `action` in `moduleId`, renders fallback.
 */
export const RequirePermission = ({ moduleId, action = 'view', children, fallback = null }: ProtectedRouteProps) => {
  const { checkPermission } = useAuth();
  
  if (!checkPermission(moduleId, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
