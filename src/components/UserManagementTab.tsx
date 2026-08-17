import React, { useState, useEffect } from "react";
import { Users, Shield, Plus, Edit, Trash2, Key, Check, Info, AlertCircle, UserPlus, UserCheck, X, Briefcase, Layers } from "lucide-react";
import { AppUser, UserRole, ModuleId, ActionType } from "../types";
import { useAuth } from "../lib/auth";

interface ResponsibleItem {
  id: number;
  name: string;
  email?: string;
  role?: string;
  userId?: number;
  areaIds?: number[];
}

interface AreaItem {
  id: number;
  name: string;
  description?: string;
}

export function UserManagementTab() {
  const { users, roles, currentUser, addUser, updateUser, deleteUser, addRole, updateRole, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [isEditingUser, setIsEditingUser] = useState<Partial<AppUser & { password?: string }> | null>(null);
  const [isEditingRole, setIsEditingRole] = useState<Partial<UserRole> | null>(null);

  // Responsibles & Areas state for verification
  const [responsibles, setResponsibles] = useState<ResponsibleItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [isLoadingResp, setIsLoadingResp] = useState(false);

  // Prompt modal state when user is not a responsible
  const [responsiblePromptUser, setResponsiblePromptUser] = useState<{ name: string; email: string; agency?: string } | null>(null);

  // Responsible registration modal state
  const [isResponsibleModalOpen, setIsResponsibleModalOpen] = useState(false);
  const [respFormName, setRespFormName] = useState("");
  const [respFormEmail, setRespFormEmail] = useState("");
  const [respFormRole, setRespFormRole] = useState("");
  const [respFormAreaIds, setRespFormAreaIds] = useState<number[]>([]);
  const [isSavingResp, setIsSavingResp] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "warning" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Fetch responsibles and areas
  const fetchResponsiblesAndAreas = async () => {
    setIsLoadingResp(true);
    try {
      const [respRes, areasRes] = await Promise.all([
        fetch("/api/responsibles").then(r => r.json()).catch(() => ({ success: false, data: [] })),
        fetch("/api/areas").then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ]);

      if (respRes.success && Array.isArray(respRes.data)) {
        setResponsibles(respRes.data);
      }
      if (areasRes.success && Array.isArray(areasRes.data)) {
        setAreas(areasRes.data);
      }
    } catch (err) {
      console.warn("Erro ao buscar dados de responsáveis e áreas:", err);
    } finally {
      setIsLoadingResp(false);
    }
  };

  useEffect(() => {
    fetchResponsiblesAndAreas();
  }, []);

  const canEdit = checkPermission("users", "edit");
  const canCreate = checkPermission("users", "create");
  const canDelete = checkPermission("users", "delete");

  // Helper to check if a user is already registered as responsible
  const checkIsResponsible = (userName?: string, userEmail?: string): boolean => {
    if (!userName && !userEmail) return false;
    const cleanEmail = (userEmail || "").trim().toLowerCase();
    const cleanName = (userName || "").trim().toLowerCase();

    return responsibles.some(r => {
      const rEmail = (r.email || "").trim().toLowerCase();
      const rName = (r.name || "").trim().toLowerCase();
      return (cleanEmail && rEmail === cleanEmail) || (cleanName && rName === cleanName);
    });
  };

  const handleSaveUser = async () => {
    if (!isEditingUser?.name?.trim() || !isEditingUser?.email?.trim() || !isEditingUser?.roleId) {
      alert("Preencha todos os campos obrigatórios (Nome, E-mail e Papel).");
      return;
    }

    const isNewUser = !isEditingUser.id;
    const savedName = isEditingUser.name.trim();
    const savedEmail = isEditingUser.email.trim();
    const savedAgency = isEditingUser.agency?.trim();

    if (isEditingUser.id) {
      await updateUser(isEditingUser.id, isEditingUser as any);
      showToast("Usuário atualizado com sucesso!", "success");
      setIsEditingUser(null);
    } else {
      // It's a new user registration
      await addUser(isEditingUser as any);
      setIsEditingUser(null);

      // Check if user is already a responsible
      const alreadyResponsible = checkIsResponsible(savedName, savedEmail);

      if (!alreadyResponsible) {
        // Open the informative prompt modal informing that this user is not yet a responsible
        setResponsiblePromptUser({
          name: savedName,
          email: savedEmail,
          agency: savedAgency
        });
      } else {
        showToast("Usuário cadastrado com sucesso! Este usuário já está registrado como responsável.", "success");
      }
    }
  };

  // Open the responsible modal pre-filled with the user's data
  const handleOpenResponsibleModalForUser = (user: { name: string; email: string; agency?: string }) => {
    setRespFormName(user.name);
    setRespFormEmail(user.email);
    setRespFormRole(user.agency || "");
    setRespFormAreaIds([]);
    setResponsiblePromptUser(null);
    setIsResponsibleModalOpen(true);
  };

  // Submit responsible creation
  const handleSaveResponsible = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respFormName.trim()) {
      alert("Nome do responsável é obrigatório.");
      return;
    }

    setIsSavingResp(true);
    try {
      const userSignature = currentUser?.name || currentUser?.email || "SGI Pro";
      const res = await fetch("/api/responsibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: respFormName.trim(),
          email: respFormEmail.trim(),
          role: respFormRole.trim(),
          areaIds: respFormAreaIds,
          createdBy: userSignature,
          updatedBy: userSignature
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Responsável "${respFormName}" cadastrado com sucesso no Módulo Atividades!`, "success");
        setIsResponsibleModalOpen(false);
        await fetchResponsiblesAndAreas();
      } else {
        alert(data.error || "Erro ao cadastrar responsável.");
      }
    } catch (err: any) {
      console.error("Erro ao cadastrar responsável:", err);
      alert("Erro ao conectar com o servidor para cadastrar o responsável.");
    } finally {
      setIsSavingResp(false);
    }
  };

  const moduleCategories: { category: string, modules: ModuleId[] }[] = [
    {
      category: 'Planejamento Estratégico',
      modules: ['planning_dashboard', 'planning_tasks', 'planning_plans', 'planning_areas', 'planning_categories', 'planning_responsibles', 'planning_models', 'planning_radar']
    },
    {
      category: 'Balanço Hídrico',
      modules: ['water_balances', 'systems', 'supply_sources', 'demands', 'explore', 'analyze', 'templates']
    },
    {
      category: 'Resoluções',
      modules: ['reg_cadastro', 'reg_painel']
    },
    {
      category: 'Agenda Regulatória',
      modules: ['reg_agenda', 'reg_agenda_painel']
    },
    {
      category: 'Publicações',
      modules: ['pub_cadastro', 'pub_painel']
    },
    {
      category: 'Fiscalização e Recursos',
      modules: ['fisc_operational', 'recurso_painel']
    },
    {
      category: 'Gerencial & Mapas',
      modules: ['dashboard', 'geo']
    },
    {
      category: 'Configurações',
      modules: ['users']
    }
  ];

  const moduleNames: Record<ModuleId, string> = {
    planning_dashboard: 'Painel de Atividades (Gerencial)',
    planning_tasks: 'Cadastrar Atividades',
    planning_plans: 'Cadastrar Planos',
    planning_areas: 'Cadastrar Áreas Temáticas',
    planning_categories: 'Cadastrar Categorias',
    planning_responsibles: 'Cadastrar Responsáveis',
    planning_models: 'Cadastrar Modelo de Atividades',
    planning_radar: 'Radar de Atividades',
    water_balances: 'Balanço Hídrico (Raiz)',
    systems: 'Configurar Sistemas',
    supply_sources: 'Configurar Fontes de Suprimento',
    demands: 'Configurar Demandas',
    explore: 'Cadastrar Balanço Hídrico',
    analyze: 'Painel do Balanço Hídrico e Comparações',
    templates: 'Arquivos de Modelo do Balanço',
    reg_cadastro: 'Cadastrar Resoluções',
    reg_painel: 'Painel de Resoluções',
    reg_agenda: 'Cadastrar Agenda Regulatória',
    reg_agenda_painel: 'Painel da Agenda Regulatória',
    pub_cadastro: 'Cadastrar Publicações',
    pub_painel: 'Painel de Publicações',
    fisc_operational: 'Painel de Fiscalização',
    recurso_painel: 'Painel de Qualidade do Atendimento',
    dashboard: 'Painel Geral Gerencial (Hub)',
    geo: 'Mapa Interativo Avançado',
    users: 'Gestão de Usuários e Permissões'
  };

  const allActions: ActionType[] = ['view', 'create', 'edit', 'delete'];

  const handleSaveRole = () => {
    if (!isEditingRole?.name) {
      alert("Preencha o nome do papel");
      return;
    }
    if (isEditingRole.id) {
      updateRole(isEditingRole.id, isEditingRole);
    } else {
      addRole(isEditingRole as Omit<UserRole, 'id'>);
    }
    setIsEditingRole(null);
  };

  const togglePermission = (moduleId: ModuleId, action: ActionType) => {
    if (!isEditingRole) return;
    
    const newPerms = [...(isEditingRole.permissions || [])];
    const existingModulePerm = newPerms.find(p => p.moduleId === moduleId);
    
    if (existingModulePerm) {
      if (existingModulePerm.actions.includes(action)) {
        existingModulePerm.actions = existingModulePerm.actions.filter(a => a !== action);
      } else {
        existingModulePerm.actions.push(action);
      }
      if (existingModulePerm.actions.length === 0) {
        // remove completely if no actions
        const index = newPerms.findIndex(p => p.moduleId === moduleId);
        newPerms.splice(index, 1);
      }
    } else {
      newPerms.push({ moduleId, actions: [action] });
    }
    setIsEditingRole({ ...isEditingRole, permissions: newPerms });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[200] max-w-md p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === "success" ? "bg-emerald-50 text-emerald-900 border-emerald-200" :
          toastMessage.type === "warning" ? "bg-amber-50 text-amber-900 border-amber-200" :
          toastMessage.type === "error" ? "bg-rose-50 text-rose-900 border-rose-200" :
          "bg-indigo-50 text-indigo-900 border-indigo-200"
        }`}>
          {toastMessage.type === "success" ? <Check size={18} className="text-emerald-600 shrink-0" /> :
           toastMessage.type === "warning" ? <AlertCircle size={18} className="text-amber-600 shrink-0" /> :
           <Info size={18} className="text-indigo-600 shrink-0" />}
          <p className="text-xs font-semibold leading-relaxed flex-1">{toastMessage.text}</p>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
        <button
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === "users" ? "border-b-2 border-indigo-500 text-indigo-600 font-bold" : "text-slate-500 font-medium"}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={16} /> Usuários
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 ${activeTab === "roles" ? "border-b-2 border-indigo-500 text-indigo-600 font-bold" : "text-slate-500 font-medium"}`}
          onClick={() => setActiveTab("roles")}
        >
          <Shield size={16} /> Papéis e Permissões
        </button>
      </div>

      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Usuários do Sistema</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Gerenciamento de contas de acesso e vínculo com os responsáveis de atividades.</p>
            </div>
            {canCreate && (
              <button onClick={() => setIsEditingUser({ status: 'active', roleId: roles[0]?.id })} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm">
                <Plus size={14} /> Novo Usuário
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Agência (Opcional)</th>
                  <th className="px-4 py-3">Responsável (Atividades)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map(u => {
                  const isResp = checkIsResponsible(u.name, u.email);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {u.name} {u.id === currentUser?.id && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 py-0.5 px-1.5 rounded-full uppercase font-black">Você</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">{roles.find(r => r.id === u.roleId)?.name || 'Desconhecido'}</span></td>
                      <td className="px-4 py-3 text-slate-500">{u.agency || '-'}</td>
                      <td className="px-4 py-3">
                        {isResp ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <Check size={11} className="text-emerald-600" /> Cadastrado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenResponsibleModalForUser({ name: u.name, email: u.email, agency: u.agency })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition-colors"
                            title="Cadastrar como responsável de atividades"
                          >
                            <UserPlus size={11} /> + Vincular Responsável
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {u.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button onClick={() => setIsEditingUser(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Editar Usuário">
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && u.id !== currentUser?.id && (
                            <button onClick={() => deleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Excluir Usuário">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-1">
             <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
               <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Papéis</h3>
               {canCreate && (
                 <button onClick={() => setIsEditingRole({ permissions: [] })} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition">
                   <Plus size={14} />
                 </button>
               )}
             </div>
             <div className="divide-y divide-slate-100">
               {roles.map(r => (
                 <div key={r.id} className="p-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => canEdit && setIsEditingRole(r)}>
                   <div className="flex items-center justify-between">
                     <span className="font-bold text-slate-700">{r.name}</span>
                     {r.id === 'admin' && <Shield size={14} className="text-amber-500" />}
                   </div>
                   <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description}</p>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="col-span-1 lg:col-span-2">
            {!isEditingRole ? (
               <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-400">
                 <Key size={32} className="mb-3 opacity-50" />
                 <p className="text-sm font-medium">Selecione um papel para visualizar ou editar permissões</p>
               </div>
            ) : (
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{isEditingRole.id ? 'Editar Papel' : 'Novo Papel'}</h3>
                   <div className="flex gap-2">
                     <button onClick={() => setIsEditingRole(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition">Cancelar</button>
                     <button onClick={handleSaveRole} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition">Salvar</button>
                   </div>
                 </div>
                 <div className="p-5 space-y-4">
                   {isEditingRole.id === 'admin' && (
                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm">
                       <Info size={16} className="mt-0.5 shrink-0" />
                       <p>O papel <strong>Administrador</strong> tem acesso total ao sistema. As permissões abaixo são apenas demonstrativas.</p>
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                       <input type="text" value={isEditingRole.name || ''} onChange={e => setIsEditingRole({...isEditingRole, name: e.target.value})} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" disabled={isEditingRole.id === 'admin'} />
                     </div>
                     <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                       <input type="text" value={isEditingRole.description || ''} onChange={e => setIsEditingRole({...isEditingRole, description: e.target.value})} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" disabled={isEditingRole.id === 'admin'} />
                     </div>
                   </div>
                   
                   <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-2">Módulo</th>
                           {allActions.map(a => <th key={a} className="px-4 py-2 text-center">{a === 'view' ? 'Visualizar' : a === 'create' ? 'Criar' : a === 'edit' ? 'Alterar' : 'Excluir'}</th>)}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {moduleCategories.map(category => (
                           <React.Fragment key={category.category}>
                             <tr className="bg-slate-100">
                               <td colSpan={5} className="px-4 py-2 font-black text-slate-600 text-[10px] uppercase tracking-wider">
                                 {category.category}
                               </td>
                             </tr>
                             {category.modules.map(mod => {
                               const perms = isEditingRole.permissions?.find(p => p.moduleId === mod)?.actions || [];
                               return (
                                 <tr key={mod} className="hover:bg-slate-50">
                                   <td className="px-4 py-3 font-medium text-slate-700 relative text-xs pl-8">
                                     {moduleNames[mod] || mod}
                                   </td>
                                   {allActions.map(action => (
                                     <td key={action} className="px-4 py-2 text-center">
                                       <button 
                                         onClick={() => togglePermission(mod, action)}
                                         disabled={isEditingRole.id === 'admin'}
                                         title={`${action === 'view' ? 'Visualizar' : action === 'create' ? 'Criar' : action === 'edit' ? 'Alterar' : 'Excluir'} ${moduleNames[mod]}`}
                                         className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${perms.includes(action) || isEditingRole.id === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent hover:bg-slate-200 border border-slate-200'}`}
                                       >
                                         <Check size={12} strokeWidth={4} />
                                       </button>
                                     </td>
                                   ))}
                                 </tr>
                               )
                             })}
                           </React.Fragment>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {isEditingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-black text-slate-800 uppercase tracking-wider">{isEditingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
               <button onClick={() => setIsEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-1">
                 <X size={18} />
               </button>
             </div>
             <div className="p-5 space-y-4">
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                 <input type="text" value={isEditingUser.name || ''} onChange={e => setIsEditingUser({...isEditingUser, name: e.target.value})} placeholder="Nome completo" className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">E-mail / Login</label>
                 <input type="email" value={isEditingUser.email || ''} onChange={e => setIsEditingUser({...isEditingUser, email: e.target.value})} placeholder="email@adasa.df.gov.br" className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                 <input type="password" value={isEditingUser.password || ''} onChange={e => setIsEditingUser({...isEditingUser, password: e.target.value})} placeholder={isEditingUser.id ? "Digite para alterar a senha" : "Senha do usuário (Padrão: 1234)"} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Papel</label>
                 <select value={isEditingUser.roleId || ''} onChange={e => setIsEditingUser({...isEditingUser, roleId: e.target.value})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white">
                   {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Agência (Opcional)</label>
                 <input type="text" value={isEditingUser.agency || ''} onChange={e => setIsEditingUser({...isEditingUser, agency: e.target.value})} placeholder="Ex: ADASA / CAESB" className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                 <select value={isEditingUser.status || 'active'} onChange={e => setIsEditingUser({...isEditingUser, status: e.target.value as any})} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white">
                   <option value="active">Ativo</option>
                   <option value="inactive">Inativo</option>
                 </select>
               </div>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsEditingUser(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                <button onClick={handleSaveUser} className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition shadow-sm">Salvar Usuário</button>
             </div>
          </div>
        </div>
      )}

      {/* Prompt Modal: Not yet registered as Responsible */}
      {responsiblePromptUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="p-6 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-md shadow-indigo-600/20">
                <UserPlus size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug">
                Cadastrar como Responsável de Atividades?
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Vínculo para atribuição de tarefas no Planejamento Estratégico.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-1 leading-relaxed">
                  <p>
                    O usuário <strong>{responsiblePromptUser.name}</strong> ({responsiblePromptUser.email}) foi cadastrado com sucesso no sistema.
                  </p>
                  <p className="font-semibold text-amber-900">
                    No entanto, ele ainda <u>não está cadastrado como responsável</u> para que lhe sejam atribuídas tarefas no <strong>Módulo Atividades</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dados do Usuário</span>
                <div className="text-xs text-slate-700 space-y-1">
                  <div><strong>Nome:</strong> {responsiblePromptUser.name}</div>
                  <div><strong>E-mail:</strong> {responsiblePromptUser.email}</div>
                  {responsiblePromptUser.agency && <div><strong>Agência / Órgão:</strong> {responsiblePromptUser.agency}</div>}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setResponsiblePromptUser(null);
                  showToast("Usuário cadastrado sem vínculo de responsável.", "info");
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition"
              >
                Concluir sem Cadastrar
              </button>
              <button
                type="button"
                onClick={() => handleOpenResponsibleModalForUser(responsiblePromptUser)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <UserCheck size={15} />
                Cadastrar como Responsável
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsible Registration Modal */}
      {isResponsibleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Cadastro de Responsável</h3>
                  <p className="text-xs text-slate-400 font-medium">Habilitar atribuição de tarefas no Módulo Atividades</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResponsibleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200/60 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveResponsible} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Nome do Responsável / Equipe <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={respFormName}
                  onChange={(e) => setRespFormName(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  E-mail do Responsável
                </label>
                <input
                  type="email"
                  value={respFormEmail}
                  onChange={(e) => setRespFormEmail(e.target.value)}
                  placeholder="email@adasa.df.gov.br"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Cargo / Função (Opcional)
                </label>
                <select
                  value={respFormRole}
                  onChange={(e) => setRespFormRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 outline-none transition shadow-2xs bg-white"
                >
                  <option value="">Selecione um cargo/função (Opcional)</option>
                  <option value="Superintendente (a)">Superintendente (a)</option>
                  <option value="Coordenador(a)">Coordenador(a)</option>
                  <option value="Regulador (a)">Regulador (a)</option>
                  <option value="Colaborador (a)">Colaborador (a)</option>
                  <option value="Estagiário (a)">Estagiário (a)</option>
                  {respFormRole && !["Superintendente (a)", "Coordenador(a)", "Regulador (a)", "Colaborador (a)", "Estagiário (a)"].includes(respFormRole) && (
                    <option value={respFormRole}>{respFormRole}</option>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-600" />
                  Áreas de Atuação Vinculadas (Opcional)
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5 custom-scrollbar">
                  {areas.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">Nenhuma área cadastrada no sistema.</span>
                  ) : (
                    areas.map((a) => (
                      <label key={a.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={respFormAreaIds.includes(a.id)}
                          onChange={(e) => {
                            if (e.target.checked) setRespFormAreaIds([...respFormAreaIds, a.id]);
                            else setRespFormAreaIds(respFormAreaIds.filter((id) => id !== a.id));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-semibold text-slate-700">{a.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ao cadastrar, este responsável ficará disponível imediatamente para ser selecionado em atividades, tarefas e metas no Módulo de Planejamento.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResponsibleModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingResp}
                  className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  {isSavingResp ? (
                    "Cadastrando..."
                  ) : (
                    <>
                      <Check size={14} /> Cadastrar Responsável
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
