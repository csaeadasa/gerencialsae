import re

with open("server.ts", "r", encoding="utf-8") as f:
    content = f.read()

old_insert = """          `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [participationId, art.order || 0, art.contentType || 'text', art.originalText, art.proposedText || null, JSON.stringify(art.subjectIds || [])]"""

new_insert = """          `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [participationId, art.order || 0, art.contentType || 'text', art.originalText, art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : null, JSON.stringify(art.subjectIds || [])]"""

content = content.replace(old_insert, new_insert)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch create script finished")
