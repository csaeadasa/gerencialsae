import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

state_insertion = """
  // Presentation Mode State
  const [presentationConfig, setPresentationConfig] = useState<PresentationConfig>({ isActive: false, intervalSeconds: 30, panels: [] });
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [previousTab, setPreviousTab] = useState("home");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('modo') === 'tv') {
      const tempoStr = searchParams.get('tempo');
      const tempo = tempoStr ? parseInt(tempoStr, 10) : 30;
      const paineisStr = searchParams.get('paineis');
      const panels = paineisStr ? paineisStr.split(',') : ["planning", "reg_painel", "reg_agenda_painel", "reg_subsidios_painel", "analyze", "fisc_operational", "pub_painel"];
      setPresentationConfig({ isActive: true, intervalSeconds: tempo, panels });
      setPresentationIndex(0);
      setActiveTab(panels[0] as any);
      if (panels[0] === 'planning') setActivePlanningSubTab("dashboard");
    }
  }, []);

  const handlePresentationNext = useCallback(() => {
    const nextIdx = (presentationIndex + 1) % presentationConfig.panels.length;
    setPresentationIndex(nextIdx);
    const nextTab = presentationConfig.panels[nextIdx];
    setActiveTab(nextTab as any);
    if (nextTab === 'planning') setActivePlanningSubTab("dashboard");
  }, [presentationIndex, presentationConfig.panels]);

  const handlePresentationPrev = useCallback(() => {
    const prevIdx = (presentationIndex - 1 + presentationConfig.panels.length) % presentationConfig.panels.length;
    setPresentationIndex(prevIdx);
    const prevTab = presentationConfig.panels[prevIdx];
    setActiveTab(prevTab as any);
    if (prevTab === 'planning') setActivePlanningSubTab("dashboard");
  }, [presentationIndex, presentationConfig.panels]);
"""

if "const [presentationConfig" not in content:
    # Let's find "const [activeTab" and insert before it
    pattern = r'(const \[activeTab, setActiveTab\])'
    content = re.sub(pattern, lambda m: state_insertion.lstrip() + "\n  " + m.group(1), content, count=1)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
