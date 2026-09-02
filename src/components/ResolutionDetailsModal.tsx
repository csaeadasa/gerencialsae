import { X, Activity, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

export function ResolutionDetailsModal({ resolution, onClose }: { resolution: any, onClose: () => void }) {
  const [fullRes, setFullRes] = useState<any>(resolution);
  
  useEffect(() => {
    if (resolution && (!resolution.participations || resolution.participations.length === 0)) {
      fetch("/api/resolutions")
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.data) {
            const found = data.data.find((r: any) => r.id === resolution.id);
            if (found) setFullRes(found);
          }
        });
    } else {
      setFullRes(resolution);
    }
  }, [resolution]);

  if (!fullRes) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex gap-4 items-start">
            {fullRes.imagem_capa && (
              <div className="w-16 h-24 rounded-lg shadow-sm border border-slate-200 overflow-hidden shrink-0 bg-white">
                <img src={fullRes.imagem_capa} alt="Capa" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {fullRes.especie} Nº {fullRes.numero} / {fullRes.ano}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded">
                  {fullRes.area}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded">
                  {fullRes.segmento}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded ${fullRes.situacao === 'Vigente' ? 'bg-emerald-50 text-emerald-700' : fullRes.situacao === 'Revogada' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {fullRes.situacao}
                </span>
                {fullRes.tipo && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded border border-purple-100">
                    Norma {fullRes.tipo}
                  </span>
                )}
                {fullRes.data && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded">
                    Publicada em {fullRes.data}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors bg-white rounded-full shadow-sm border border-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ementa Reguladora</h4>
            <p className="text-sm text-slate-700 font-medium leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
              {fullRes.ementa}
            </p>
          </div>

          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} /> Participações Sociais Vinculadas
          </h4>

          {fullRes.participations && fullRes.participations.length > 0 ? (
            <div className="space-y-4">
              {fullRes.participations.map((part: any) => (
                <div key={part.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-sky-50 text-sky-700 text-[9px] font-black uppercase tracking-widest rounded mb-2">
                        {part.meio_participacao || "Consulta Pública"}
                      </span>
                      <h5 className="text-sm font-bold text-slate-800 leading-snug">{part.title}</h5>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {part.dataInicio ? String(part.dataInicio).split('T')[0] : '--'} a {part.dataFim ? String(part.dataFim).split('T')[0] : '--'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-800 leading-none">{part.totalArticles || 0}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dispositivos</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-800 leading-none">{part.totalContributions || 0}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Contribuições</div>
                      </div>
                    </div>
                  </div>

                  {part.anexos && part.anexos.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documentos da Participação</div>
                      <div className="flex flex-wrap gap-2">
                        {part.anexos.map((anexo: any) => (
                          <a key={anexo.id} href={anexo.url} download={anexo.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors text-[10px] font-bold">
                            <FileText size={12} className="text-indigo-500" /> {anexo.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <Activity size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-semibold text-sm">Nenhuma participação social vinculada a esta resolução.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center items-center relative">
           {fullRes.link && (
             <a href={fullRes.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
               <ExternalLink size={18} /> Acessar Documento na Íntegra
             </a>
           )}
           <button
              onClick={onClose}
              className="absolute right-4 px-6 py-2.5 text-xs font-black text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl uppercase tracking-wider transition-all"
            >
              Fechar
            </button>
        </div>
      </div>
    </div>
  );
}
