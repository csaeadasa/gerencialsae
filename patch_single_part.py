with open("server.ts", "r") as f:
    text = f.read()

old_single = """    const { rows: anexos } = await dbPool.query(
      "SELECT * FROM re_participation_attachments WHERE participation_id = $1",
      [Number(id)]
    );

    const t = participations[0];"""

new_single = """    const { rows: anexos } = await dbPool.query(
      "SELECT * FROM re_participation_attachments WHERE participation_id = $1",
      [Number(id)]
    );

    const { rows: resolutions } = await dbPool.query(`
      SELECT r.* 
      FROM re_resolution_participations rp
      JOIN re_resolutions r ON rp.resolution_id = r.id
      WHERE rp.participation_id = $1
    `, [Number(id)]);

    const t = participations[0];"""

old_single_map = """    const result = {
      ...t,
      tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
      dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
      dataFim: dFim ? String(dFim).split("T")[0] : "",
      createdAt: cAt,
      meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
      anexos
    };"""

new_single_map = """    const result = {
      ...t,
      tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
      dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
      dataFim: dFim ? String(dFim).split("T")[0] : "",
      createdAt: cAt,
      meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
      anexos,
      resolutions
    };"""


if old_single in text:
    text = text.replace(old_single, new_single)
    print("Patched single 1")
    
if old_single_map in text:
    text = text.replace(old_single_map, new_single_map)
    print("Patched single 2")

with open("server.ts", "w") as f:
    f.write(text)

