import re

with open("src/components/ResolutionDetailsModal.tsx", "r") as f:
    text = f.read()

old_details = """              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded">
                  {fullRes.area}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded">
                  {fullRes.segmento}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded ${fullRes.situacao === 'Vigente' ? 'bg-emerald-50 text-emerald-700' : fullRes.situacao === 'Revogada' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {fullRes.situacao}
                </span>
              </div>"""

new_details = """              <div className="flex flex-wrap items-center gap-2 mt-2">
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
              </div>"""

if old_details in text:
    text = text.replace(old_details, new_details)
    print("Patched more data")

with open("src/components/ResolutionDetailsModal.tsx", "w") as f:
    f.write(text)

