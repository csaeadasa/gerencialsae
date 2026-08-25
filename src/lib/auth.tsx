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

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 1, sigla: 'ADASA', nome: 'Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal' },
  { id: 2, sigla: 'CAESB', nome: 'Companhia de Saneamento Ambiental do Distrito Federal' },
  { id: 3, sigla: 'CSAE', nome: 'Superintendência de Abastecimento de Água e Esgoto' },
  { id: 4, sigla: 'SEDUH', nome: 'Secretaria de Estado de Desenvolvimento Urbano e Habitação' },
  { id: 5, sigla: 'GDF', nome: 'Governo do Distrito Federal' },
];

export const DEFAULT_USERS: AppUser[] = [
  { id: '1', name: 'Administrador ADASA', email: 'csaeadasa@gmail.com', roleId: 'admin', status: 'active', departmentId: 1, department: DEFAULT_DEPARTMENTS[0] },
  { id: '2', name: 'Admin', email: 'admin@adasa.gov.br', roleId: 'admin', status: 'active', departmentId: 1, department: DEFAULT_DEPARTMENTS[0] },
  { id: '3', name: 'Joao Regulador', email: 'joao@adasa.gov.br', roleId: 'regulator', status: 'active', departmentId: 1, department: DEFAULT_DEPARTMENTS[0] },
  { id: '4', name: 'Maria CAESB', email: 'maria@caesb.gov.br', roleId: 'provider', agency: 'CAESB', status: 'active', departmentId: 2, department: DEFAULT_DEPARTMENTS[1] },
];

interface AuthContextType {
  currentUser: AppUser | null;
  users: AppUser[];
  roles: UserRole[];
  departments: Department[];
  login: (email: string) => void;
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkPermission: (moduleId: ModuleId, action: ActionType) => boolean;
  hasRole: (roleId: string) => boolean;
  addUser: (user: Omit<AppUser, 'id'>) => Promise<{ success: boolean; data?: AppUser; error?: string }>;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Omit<UserRole, 'id'>) => void;
  updateRole: (id: string, updates: Partial<UserRole>) => void;
  fetchDepartments: () => Promise<void>;
  addDepartment: (dept: { sigla: string; nome: string }) => Promise<{ success: boolean; data?: Department; error?: string }>;
  updateDepartment: (id: number, dept: { sigla: string; nome: string }) => Promise<{ success: boolean; data?: Department; error?: string }>;
  deleteDepartment: (id: number) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("adasa-sgi-user");
    return saved ? JSON.parse(saved) : null; // Start as null to show login screen
  });
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [roles, setRoles] = useState<UserRole[]>(DEFAULT_ROLES);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data) && resData.data.length > 0) {
          setDepartments(resData.data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch departments from database, using client defaults:", err);
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
    fetchDepartments();
    fetchUsers();
  }, []);

  const loginWithCredentials = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password || "1234" })
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem("adasa-sgi-user", JSON.stringify(data.user));
          await fetchUsers(); // Refresh users list
          return { success: true };
        } else {
          return { success: false, error: data.error || "Erro na autenticação" };
        }
      } else {
        // Fallback for offline/local environment or proxy response
        const cleanEmail = email.trim().toLowerCase();
        const localUser = users.find(u => u.email.toLowerCase() === cleanEmail) ||
                          DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
        if (localUser) {
          setCurrentUser(localUser);
          localStorage.setItem("adasa-sgi-user", JSON.stringify(localUser));
          return { success: true };
        }
        return { success: false, error: "Serviço de autenticação temporariamente indisponível. Tente novamente." };
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      const cleanEmail = email.trim().toLowerCase();
      const localUser = users.find(u => u.email.toLowerCase() === cleanEmail) ||
                        DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (localUser) {
        setCurrentUser(localUser);
        localStorage.setItem("adasa-sgi-user", JSON.stringify(localUser));
        return { success: true };
      }
      return { success: false, error: "Serviço de autenticação indisponível." };
    }
  };

  const login = (email: string) => {
    loginWithCredentials(email, "1234");
  };

  const logout = () => {
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

  const addRole = (roleData: Omit<UserRole, 'id'>) => {
    const newRole = { ...roleData, id: Date.now().toString() };
    setRoles(prev => [...prev, newRole]);
  };

  const updateRole = (id: string, updates: Partial<UserRole>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
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
          return { success: true };
        }
      }
      setDepartments(prev => prev.filter(d => d.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error("Erro ao deletar departamento:", err);
      setDepartments(prev => prev.filter(d => d.id !== id));
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, users, roles, departments,
        login, loginWithCredentials, logout, checkPermission, hasRole,
        addUser, updateUser, deleteUser,
        addRole, updateRole,
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
