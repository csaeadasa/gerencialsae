with open("server.ts", "r") as f:
    text = f.read()

old_res = """    res.json({
      ...t,
      tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
      dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
      dataFim: dFim ? String(dFim).split("T")[0] : "",
      createdAt: cAt,
      meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
      anexos: anexos || []
    });"""

new_res = """    res.json({
      ...t,
      tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
      dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
      dataFim: dFim ? String(dFim).split("T")[0] : "",
      createdAt: cAt,
      meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
      anexos: anexos || [],
      resolutions: resolutions || []
    });"""

if old_res in text:
    text = text.replace(old_res, new_res)
    print("Patched res.json")

with open("server.ts", "w") as f:
    f.write(text)
