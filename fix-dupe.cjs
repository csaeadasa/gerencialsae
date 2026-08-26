const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `                            <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAddContribution(art)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-indigo-700 hover:text-indigo-700"
                            >
                              <MessageSquare size={14} className="text-indigo-600" /> Propor Alteração
                            </button>
                            <button 
                              onClick={() => setShowOrientacoesModal(true)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-800 hover:text-slate-800"
                              title="Orientações sobre como propor alterações"
                            >
                              <AlertTriangle size={14} className="text-amber-500" /> Orientações
                            </button>
                            </div>
                            <button 
                              onClick={() => setShowOrientacoesModal(true)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-800 hover:text-slate-800"
                              title="Orientações sobre como propor alterações"
                            >
                              <AlertTriangle size={14} className="text-amber-500" /> Orientações
                            </button>
                            </div>`;

const replace = `                            <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAddContribution(art)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-indigo-700 hover:text-indigo-700"
                            >
                              <MessageSquare size={14} className="text-indigo-600" /> Propor Alteração
                            </button>
                            <button 
                              onClick={() => setShowOrientacoesModal(true)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-800 hover:text-slate-800"
                              title="Orientações sobre como propor alterações"
                            >
                              <AlertTriangle size={14} className="text-amber-500" /> Orientações
                            </button>
                            </div>`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
