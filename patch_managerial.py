import re

with open("src/components/ManagerialHub.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add `onStartPresentation?: (panels: string[], interval: number) => void;` to ManagerialHubProps
props_re = r"interface ManagerialHubProps \{([^}]+)\}"
m_props = re.search(props_re, content)
if m_props:
    new_props = m_props.group(1) + "  onStartPresentation?: (panels: string[], interval: number) => void;\n"
    content = content.replace(m_props.group(0), "interface ManagerialHubProps {" + new_props + "}")

# 2. Add onStartPresentation to the component args
args_re = r"export function ManagerialHub\(\{([^}]+)\}: ManagerialHubProps\)"
m_args = re.search(args_re, content)
if m_args:
    args_content = m_args.group(1)
    new_args_content = args_content.rstrip()
    if new_args_content.endswith(','):
        new_args_content += "\n  onStartPresentation"
    else:
        new_args_content += ",\n  onStartPresentation"
    content = content.replace(m_args.group(0), f"export function ManagerialHub({{{new_args_content}\n}}: ManagerialHubProps)")

# 3. Add state for presentation modal
state_injection = """
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [presentationInterval, setPresentationInterval] = useState(30);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([
    "planning", "reg_painel", "reg_agenda_painel", "reg_subsidios_painel", "analyze", "fisc_operational", "pub_painel"
  ]);

  const togglePanelSelection = (panelId: string) => {
    setSelectedPanels(prev => 
      prev.includes(panelId) ? prev.filter(p => p !== panelId) : [...prev, panelId]
    );
  };
"""
content = content.replace("const [isShareModalOpen, setIsShareModalOpen] = useState(false);", state_injection + "\n  const [isShareModalOpen, setIsShareModalOpen] = useState(false);")

# 4. Add the button to the banner
button_injection = """
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!showOnlyPublic && onStartPresentation && (
              <button
                onClick={() => setIsPresentationModalOpen(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-400/30 text-white active:scale-95 transition-all rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer backdrop-blur-md"
              >
                <MonitorPlay size={16} className="text-indigo-300" />
                <span>Modo Apresentação (TV)</span>
              </button>
            )}
            {showOnlyPublic && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 transition-all rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
              >
                <Share2 size={16} className="text-adasa-dark" />
                <span>Compartilhar Links Públicos</span>
              </button>
            )}
          </div>
"""
# Replace the existing `{showOnlyPublic && (` block
old_block = """          {/* Action Buttons in Banner (Public Portal Only) */}
          {showOnlyPublic && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 transition-all rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
              >
                <Share2 size={16} className="text-adasa-dark" />
                <span>Compartilhar Links Públicos</span>
              </button>
            </div>
          )}"""
content = content.replace(old_block, button_injection)

# Add MonitorPlay to lucide-react imports if it's missing
if "MonitorPlay" not in content:
    content = content.replace("import { \n  ArrowRight,", "import { \n  ArrowRight,\n  MonitorPlay,")

# 5. Add Presentation Modal at the end of the file (before the last closing tag, which is `);`)
presentation_modal = """
      {/* Presentation Mode Configuration Modal */}
      <AnimatePresence>
        {isPresentationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPresentationModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <MonitorPlay size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Modo Apresentação</h3>
                    <p className="text-[11px] font-bold text-slate-500 tracking-wider">Configure o carrossel de painéis</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPresentationModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    Tempo de Exibição por Painel
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 60, 120].map(time => (
                      <button
                        key={time}
                        onClick={() => setPresentationInterval(time)}
                        className={`py-2 rounded-xl text-sm font-bold border transition-colors ${
                          presentationInterval === time
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    Painéis Selecionados
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "planning", title: "Painel de Atividades", icon: FolderKanban },
                      { id: "reg_painel", title: "Painel de Resoluções", icon: FileText },
                      { id: "reg_agenda_painel", title: "Painel da Agenda Regulatória", icon: BookOpen },
                      { id: "reg_subsidios_painel", title: "Painel Participação Social", icon: MessageSquare },
                      { id: "analyze", title: "Painel do Balanço Hídrico", icon: Droplets },
                      { id: "fisc_operational", title: "Painel de Fiscalização", icon: Shield },
                      { id: "pub_painel", title: "Painel de Publicações", icon: BookOpen },
                    ].map(panel => (
                      <div 
                        key={panel.id}
                        onClick={() => togglePanelSelection(panel.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedPanels.includes(panel.id)
                            ? "bg-indigo-50/50 border-indigo-200"
                            : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                          selectedPanels.includes(panel.id) 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-white border-slate-300"
                        }`}>
                          {selectedPanels.includes(panel.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                        <panel.icon size={16} className={selectedPanels.includes(panel.id) ? "text-indigo-600" : "text-slate-400"} />
                        <span className={`text-sm font-bold ${selectedPanels.includes(panel.id) ? "text-slate-800" : "text-slate-500"}`}>
                          {panel.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsPresentationModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedPanels.length === 0) {
                      showToast?.("Atenção", "Selecione pelo menos um painel para a apresentação.", "warning");
                      return;
                    }
                    if (onStartPresentation) {
                      setIsPresentationModalOpen(false);
                      onStartPresentation(selectedPanels, presentationInterval);
                    }
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Play size={14} className="fill-current" />
                  Iniciar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
"""

# Insert modal before `    </div>\n  );\n}`
content = content.replace("    </div>\n  );\n}", presentation_modal + "\n    </div>\n  );\n}")

with open("src/components/ManagerialHub.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("done")
