with open("server.ts", "r") as f:
    text = f.read()

old_get_participations = """    // Fetch attachments
    const { rows: anexos } = await dbPool.query("SELECT * FROM re_participation_attachments");
    
    const result = participations.map(t => {"""

new_get_participations = """    // Fetch attachments
    const { rows: anexos } = await dbPool.query("SELECT * FROM re_participation_attachments");
    
    // Fetch related resolutions
    const { rows: resParticipations } = await dbPool.query(`
      SELECT rp.participation_id, r.* 
      FROM re_resolution_participations rp
      JOIN re_resolutions r ON rp.resolution_id = r.id
    `);
    
    const result = participations.map(t => {"""

old_result_map = """        meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
        anexos: anexos.filter(a => a.participation_id === t.id)
      };
    });"""

new_result_map = """        meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
        anexos: anexos.filter(a => a.participation_id === t.id),
        resolutions: resParticipations.filter(rp => rp.participation_id === t.id).map(r => ({ ...r }))
      };
    });"""

if old_get_participations in text:
    text = text.replace(old_get_participations, new_get_participations)
    print("Patched GET participations 1")
    
if old_result_map in text:
    text = text.replace(old_result_map, new_result_map)
    print("Patched GET participations 2")
    
with open("server.ts", "w") as f:
    f.write(text)
