with open("server.ts", "r") as f:
    text = f.read()

db_block_old = """        CREATE TABLE IF NOT EXISTS re_participation_articles (
          id SERIAL PRIMARY KEY,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,"""

db_block_new = """        CREATE TABLE IF NOT EXISTS re_resolution_participations (
          resolution_id INTEGER REFERENCES re_resolutions(id) ON DELETE CASCADE,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,
          PRIMARY KEY (resolution_id, participation_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participation_articles (
          id SERIAL PRIMARY KEY,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,"""

if db_block_old in text:
    text = text.replace(db_block_old, db_block_new)
    with open("server.ts", "w") as f:
        f.write(text)
    print("Patched DB")
else:
    print("DB patch failed")
