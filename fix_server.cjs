const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
// ==========================================
// REGULAÇÃO - TOMADA DE SUBSÍDIOS
// ==========================================

app.get("/api/reg/tomadas", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { rows: tomadas } = await dbPool.query("SELECT * FROM reg_tomadas ORDER BY dataInicio DESC");
    
    // Fetch anexos for each
    const { rows: anexos } = await dbPool.query("SELECT * FROM reg_tomada_anexos");
    
    const result = tomadas.map(t => ({
      ...t,
      anexos: anexos.filter(a => a.tomada_id === t.id)
    }));
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching tomadas:", error);
    res.status(500).json({ error: "Failed to fetch tomadas" });
  }
});

app.post("/api/reg/tomadas", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id, numero, title, objeto, dataInicio, dataFim, createdAt, anexos, articles } = req.body;
    
    await dbPool.query('BEGIN');
    
    await dbPool.query(
      \`INSERT INTO reg_tomadas (id, numero, title, objeto, dataInicio, dataFim, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)\`,
      [id, numero, title, objeto, dataInicio, dataFim, createdAt]
    );
    
    if (anexos && anexos.length > 0) {
      for (const anexo of anexos) {
        await dbPool.query(
          \`INSERT INTO reg_tomada_anexos (id, tomada_id, name, url) VALUES ($1, $2, $3, $4)\`,
          [anexo.id, id, anexo.name, anexo.url]
        );
      }
    }
    
    if (articles && articles.length > 0) {
      for (const art of articles) {
        await dbPool.query(
          \`INSERT INTO reg_tomada_articles (id, tomada_id, order_index, original_text, proposed_text)
           VALUES ($1, $2, $3, $4, $5)\`,
          [art.id, id, art.order, art.originalText, art.proposedText || null]
        );
      }
    }
    
    await dbPool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await dbPool.query('ROLLBACK');
    console.error("Error creating tomada:", error);
    res.status(500).json({ error: "Failed to create tomada" });
  }
});

app.put("/api/reg/tomadas/:id", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { numero, title, objeto, dataInicio, dataFim } = req.body;
    
    await dbPool.query(
      \`UPDATE reg_tomadas 
       SET numero = $1, title = $2, objeto = $3, dataInicio = $4, dataFim = $5
       WHERE id = $6\`,
      [numero, title, objeto, dataInicio, dataFim, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating tomada:", error);
    res.status(500).json({ error: "Failed to update tomada" });
  }
});

app.delete("/api/reg/tomadas/:id", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    await dbPool.query("DELETE FROM reg_tomadas WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting tomada:", error);
    res.status(500).json({ error: "Failed to delete tomada" });
  }
});

app.get("/api/reg/tomadas/:id/articles", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { rows } = await dbPool.query(
      "SELECT id, tomada_id as \\"tomadaId\\", order_index as \\"order\\", original_text as \\"originalText\\", proposed_text as \\"proposedText\\" FROM reg_tomada_articles WHERE tomada_id = $1 ORDER BY order_index",
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

app.get("/api/reg/tomadas/:id/contributions", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { rows } = await dbPool.query(
      \`SELECT c.id, c.article_id as "articleId", c.author_name as "authorName", 
              c.proposed_text as "proposedText", c.justification, c.created_at as "createdAt"
       FROM reg_tomada_contributions c
       JOIN reg_tomada_articles a ON c.article_id = a.id
       WHERE a.tomada_id = $1
       ORDER BY c.created_at DESC\`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching contributions:", error);
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
});

app.post("/api/reg/contributions", async (req, res) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id, articleId, authorName, proposedText, justification, createdAt } = req.body;
    
    await dbPool.query(
      \`INSERT INTO reg_tomada_contributions (id, article_id, author_name, proposed_text, justification, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)\`,
      [id, articleId, authorName, proposedText, justification, createdAt]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating contribution:", error);
    res.status(500).json({ error: "Failed to create contribution" });
  }
});
`;

// Insert the endpoints just before the global error handler
code = code.replace(
  '  // Global API error handler for things like PayloadTooLargeError from body-parser',
  endpoints + '\n  // Global API error handler for things like PayloadTooLargeError from body-parser'
);

fs.writeFileSync('server.ts', code);
console.log("server.ts fixed.");
