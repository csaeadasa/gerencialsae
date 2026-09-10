import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states for options
state_addition = """  const [duplicateMode, setDuplicateMode] = useState<"proposed" | "final" | "none">("proposed");
  const [duplicateCopyAnexos, setDuplicateCopyAnexos] = useState<boolean>(true);
  const [duplicateCopySubjects, setDuplicateCopySubjects] = useState<boolean>(true);"""

content = re.sub(r'const \[duplicateMode, setDuplicateMode\] = useState<"proposed" \| "final">.*?;', state_addition, content)

# 2. Fix handleConfirmDuplicate
new_handle = """  const handleConfirmDuplicate = async () => {
    if (!duplicateModalTomada) return;
    setIsDuplicating(true);
    
    const autoNumero = getNextSequentialNumber(duplicateModalTomada.meioParticipacao || "Consulta Pública", tomadas);
    
    let duplicateArticlesData = [];
    if (duplicateMode !== "none") {
      duplicateArticlesData = duplicateArticles
        .filter(a => duplicateSelectedArticles.includes(String(a.id)))
        .map(a => {
          return {
            ...a,
            id: crypto.randomUUID(),
            tomadaId: "",
            proposedText: duplicateMode === "final" && a.finalText ? a.finalText : a.proposedText,
            finalText: "", 
          };
        });
    }

    const newTomada = {
      id: crypto.randomUUID(),
      numero: autoNumero,
      tipoResolucao: duplicateModalTomada.tipoResolucao,
      meioParticipacao: duplicateModalTomada.meioParticipacao,
      title: duplicateModalTomada.title + " (Cópia)",
      objeto: duplicateModalTomada.objeto,
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      subjects: duplicateCopySubjects ? (duplicateModalTomada.subjects || []) : [],
      anexos: (duplicateCopyAnexos && duplicateModalTomada.anexos) ? [...duplicateModalTomada.anexos] : [],
      articles: duplicateArticlesData
    };

    newTomada.articles = newTomada.articles.map((a: any) => ({ ...a, tomadaId: newTomada.id }));"""

pattern_handle = re.compile(r'const handleConfirmDuplicate = async \(\) => \{.*?(?=try \{)', re.DOTALL)
content = pattern_handle.sub(new_handle + "\n    ", content)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch handleConfirmDuplicate executed")
