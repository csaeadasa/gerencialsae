import re

with open("server.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Fix updateParticipationArticlesBatchHandler
old_update = """            `UPDATE re_participation_articles 
             SET original_text = $1, proposed_text = $2, order_index = $3, content_type = $4, subject_ids = $7
             WHERE id = $5 AND participation_id = $6`,
            [art.originalText || null, art.proposedText || null, art.order || 0, art.contentType || 'text', Number(art.id), Number(id), JSON.stringify(art.subjectIds || [])]"""

new_update = """            `UPDATE re_participation_articles 
             SET original_text = $1, proposed_text = $2, order_index = $3, content_type = $4, subject_ids = $7
             WHERE id = $5 AND participation_id = $6`,
            [
              art.originalText !== undefined && art.originalText !== null ? art.originalText : null, 
              art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : null, 
              art.order || 0, 
              art.contentType || 'text', 
              Number(art.id), 
              Number(id), 
              JSON.stringify(art.subjectIds || [])
            ]"""
content = content.replace(old_update, new_update)


old_insert = """            `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [Number(id), art.order || 0, art.contentType || 'text', art.originalText || null, art.proposedText || null, JSON.stringify(art.subjectIds || [])]"""

new_insert = """            `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              Number(id), 
              art.order || 0, 
              art.contentType || 'text', 
              art.originalText !== undefined && art.originalText !== null ? art.originalText : null, 
              art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : null, 
              JSON.stringify(art.subjectIds || [])
            ]"""
content = content.replace(old_insert, new_insert)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch server python script finished")
