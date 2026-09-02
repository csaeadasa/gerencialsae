with open("server.ts", "r") as f:
    text = f.read()

get_resolutions_old = """  app.get("/api/resolutions", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM re_resolutions ORDER BY numero DESC, ano DESC");
      res.json({ success: true, data: result.rows });
    } catch (error: any) {"""

get_resolutions_new = """  app.get("/api/resolutions", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM re_resolutions ORDER BY numero DESC, ano DESC");
      
      const participationsRes = await pool.query(`
        SELECT rp.resolution_id, p.* 
        FROM re_resolution_participations rp
        JOIN re_participations p ON rp.participation_id = p.id
      `);
      
      const articlesRes = await pool.query("SELECT participation_id, COUNT(*) as cnt FROM re_participation_articles GROUP BY participation_id");
      const contribsRes = await pool.query("SELECT participation_id, COUNT(*) as cnt FROM re_participation_contributions GROUP BY participation_id");
      const attachRes = await pool.query("SELECT * FROM re_participation_attachments");

      const articlesCount = {};
      articlesRes.rows.forEach(r => articlesCount[r.participation_id] = parseInt(r.cnt));
      
      const contribsCount = {};
      contribsRes.rows.forEach(r => contribsCount[r.participation_id] = parseInt(r.cnt));

      const participations = participationsRes.rows.map(p => ({
        ...p,
        totalArticles: articlesCount[p.id] || 0,
        totalContributions: contribsCount[p.id] || 0,
        anexos: attachRes.rows.filter(a => a.participation_id === p.id)
      }));

      const resolutions = result.rows.map(r => ({
        ...r,
        participations: participations.filter(p => p.resolution_id === r.id)
      }));

      res.json({ success: true, data: resolutions });
    } catch (error: any) {"""

if get_resolutions_old in text:
    text = text.replace(get_resolutions_old, get_resolutions_new)
    print("Patched GET /api/resolutions")
else:
    print("Failed to patch GET")


put_resolutions_old = """      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE re_resolutions SET especie = $1, numero = $2, ano = $3, data = $4, ementa = $5, situacao = $6, area = $7, segmento = $8, tipo = $9, link = $10, imagem_capa = $11 WHERE id = $12 RETURNING *",
        [especie || "Resolução", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || "", id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Resolução não encontrada" });
      }
      res.json({ success: true, data: result.rows[0] });"""

put_resolutions_new = """      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa, participation_ids } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE re_resolutions SET especie = $1, numero = $2, ano = $3, data = $4, ementa = $5, situacao = $6, area = $7, segmento = $8, tipo = $9, link = $10, imagem_capa = $11 WHERE id = $12 RETURNING *",
        [especie || "Resolução", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || "", id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Resolução não encontrada" });
      }
      
      if (participation_ids && Array.isArray(participation_ids)) {
        await pool.query("DELETE FROM re_resolution_participations WHERE resolution_id = $1", [id]);
        for (const pid of participation_ids) {
          await pool.query("INSERT INTO re_resolution_participations (resolution_id, participation_id) VALUES ($1, $2)", [id, pid]);
        }
      }

      res.json({ success: true, data: result.rows[0] });"""

if put_resolutions_old in text:
    text = text.replace(put_resolutions_old, put_resolutions_new)
    print("Patched PUT /api/resolutions/:id")
else:
    print("Failed to patch PUT")


with open("server.ts", "w") as f:
    f.write(text)

