with open("src/components/ResolutionDetailsModal.tsx", "r") as f:
    text = f.read()

old_imports = 'import { X, Activity, FileText, CheckCircle2, ExternalLink } from "lucide-react";'
new_imports = 'import { X, Activity, FileText, CheckCircle2, ExternalLink } from "lucide-react";\nimport { useState, useEffect } from "react";'

old_component = """export function ResolutionDetailsModal({ resolution, onClose }: { resolution: any, onClose: () => void }) {
  if (!resolution) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">"""

new_component = """export function ResolutionDetailsModal({ resolution, onClose }: { resolution: any, onClose: () => void }) {
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">"""

text = text.replace(old_imports, new_imports)
text = text.replace(old_component, new_component)
# Also need to replace all instances of `resolution.` with `fullRes.` EXCEPT in the useEffect.
text = text.replace('resolution.imagem_capa', 'fullRes.imagem_capa')
text = text.replace('resolution.especie', 'fullRes.especie')
text = text.replace('resolution.numero', 'fullRes.numero')
text = text.replace('resolution.ano', 'fullRes.ano')
text = text.replace('resolution.area', 'fullRes.area')
text = text.replace('resolution.segmento', 'fullRes.segmento')
text = text.replace('resolution.situacao', 'fullRes.situacao')
text = text.replace('resolution.ementa', 'fullRes.ementa')
text = text.replace('resolution.participations', 'fullRes.participations')
text = text.replace('resolution.link', 'fullRes.link')

with open("src/components/ResolutionDetailsModal.tsx", "w") as f:
    f.write(text)

