import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import cron from "node-cron";
import { hashPassword, PASSWORD_HASH_PREFIX, verifyPassword } from "./server/core/security/password.js";
import { GoogleGenAI, Type } from "@google/genai";

export const app = express();
let dbPool: Pool | null = null;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function parseSafeInt(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : Math.floor(val);
  }
  const str = String(val).trim();
  // Try parsing directly if it is already numeric
  const directParsed = parseInt(str, 10);
  if (!isNaN(directParsed) && /^-?\d+$/.test(str)) {
    return directParsed;
  }
  // Try extracting the first contiguous match of digits from the string (e.g., "wb-2026" -> 2026)
  const match = str.match(/-?\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseSafeFloat(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function parseSafeFloatOrNull(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

function getDbPool(): Pool {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("As variáveis de conexão (DATABASE_URL ou POSTGRES_URL) estão ausentes no ambiente.");
    }
    // Remove o parâmetro "channel_binding=require" se existir, pois o Node.js pg
    // node-postgres pode ter problemas de compatibilidade com ele em algumas versões,
    // embora no Vercel (PgBouncer) e Neon às vezes seja necessário, no Node 
    // com ssl: { rejectUnauthorized: false } já é suficiente.
    const cleanConnectionString = connectionString.replace(/&?channel_binding=require/g, "");
    
    dbPool = new Pool({
      connectionString: cleanConnectionString,
      // O banco de dados Neon exige conexões seguras por SSL
      ssl: { rejectUnauthorized: false },
      max: process.env.VERCEL ? 1 : 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  return dbPool;
}

async function rollUpTask(client: any, parentId: number | null) {
  if (!parentId) return;

  const res = await client.query(
    "SELECT start_date, end_date, progress, weight FROM pl_tasks WHERE parent_id = $1",
    [parentId]
  );
  
  if (res.rows.length === 0) {
    await client.query(
      `UPDATE pl_tasks 
       SET progress = 0, status = 'Não iniciada', start_date = NULL, end_date = NULL
       WHERE id = $1`,
      [parentId]
    );

    const parentRes = await client.query("SELECT parent_id FROM pl_tasks WHERE id = $1", [parentId]);
    if (parentRes.rows.length > 0 && parentRes.rows[0].parent_id) {
      await rollUpTask(client, parentRes.rows[0].parent_id);
    }
    return;
  }

  let minStart: Date | null = null;
  let maxEnd: Date | null = null;
  let totalWeightedProgress = 0;
  let totalWeight = 0;

  for (const row of res.rows) {
    if (row.start_date) {
      const d = new Date(row.start_date);
      if (!minStart || d < minStart) minStart = d;
    }
    if (row.end_date) {
      const d = new Date(row.end_date);
      if (!maxEnd || d > maxEnd) maxEnd = d;
    }
    
    // Fallback to 1 if weight is undefined or zero (if they really want to ignore, they can use 0, but usually we fallback to 1)
    let w = Number(row.weight);
    if (isNaN(w) || w < 0) w = 1.0; 
    
    totalWeightedProgress += (Number(row.progress) || 0) * w;
    totalWeight += w;
  }

  const avgProgress = totalWeight > 0 ? Math.round(totalWeightedProgress / totalWeight) : 0;
  
  let status = "Não iniciada";
  if (avgProgress === 100) {
    status = "Concluída";
  } else if (avgProgress > 0) {
    status = "Em andamento";
  }

  const parentDatesRes = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [parentId]);
  const oldParentEndDate = parentDatesRes.rows.length > 0 && parentDatesRes.rows[0].end_date ? new Date(parentDatesRes.rows[0].end_date).getTime() : 0;

  await client.query(
    `UPDATE pl_tasks 
     SET start_date = $1, end_date = $2, progress = $3, status = $4
     WHERE id = $5`,
    [minStart, maxEnd, avgProgress, status, parentId]
  );

  const newParentEndDate = maxEnd ? new Date(maxEnd).getTime() : 0;
  if (oldParentEndDate !== newParentEndDate && maxEnd) {
      await cascadeDependentTaskDates(client, parentId, new Date(maxEnd));
  }

  const parentRes = await client.query("SELECT parent_id FROM pl_tasks WHERE id = $1", [parentId]);
  if (parentRes.rows.length > 0 && parentRes.rows[0].parent_id) {
    await rollUpTask(client, parentRes.rows[0].parent_id);
  }
}

async function cascadeAreasAndCategories(client: any, parentTaskId: number, areaIds: number[], categoryIds: number[]) {
  const childrenRes = await client.query("SELECT id FROM pl_tasks WHERE parent_id = $1", [parentTaskId]);
  for (const row of childrenRes.rows) {
    const childId = row.id;
    
    // update child areaIds
    await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [childId]);
    if (areaIds && areaIds.length > 0) {
      for (const aid of areaIds) {
        await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, aid]);
      }
    }
    
    // update child categoryIds
    await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [childId]);
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, cid]);
      }
    }

    // recursive call
    await cascadeAreasAndCategories(client, childId, areaIds, categoryIds);
  }
}

async function shiftTaskAndChildrenDates(client: any, taskId: number, offsetMs: number) {
  if (offsetMs === 0) return;
  
  await client.query(
    "UPDATE pl_tasks SET start_date = start_date + interval '1 millisecond' * $1, end_date = end_date + interval '1 millisecond' * $1 WHERE id = $2 AND start_date IS NOT NULL AND end_date IS NOT NULL",
    [offsetMs, taskId]
  );

  const childrenRes = await client.query("SELECT id FROM pl_tasks WHERE parent_id = $1", [taskId]);
  for (const row of childrenRes.rows) {
    await shiftTaskAndChildrenDates(client, row.id, offsetMs);
    const childDates = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [row.id]);
    if (childDates.rows.length > 0 && childDates.rows[0].end_date) {
      await cascadeDependentTaskDates(client, row.id, new Date(childDates.rows[0].end_date));
    }
  }
}

async function cascadeDependentTaskDates(client: any, parentTaskId: number, newParentEndDate: Date) {
  if (!newParentEndDate || isNaN(newParentEndDate.getTime())) return;

  const targetStartDateMs = newParentEndDate.getTime() + 86400000; // + 1 day
  const targetStartDate = new Date(targetStartDateMs);

  const dependentRes = await client.query("SELECT id, start_date, end_date FROM pl_tasks WHERE depends_on_task_id = $1", [parentTaskId]);
  for (const row of dependentRes.rows) {
    const depId = row.id;
    const oldStart = row.start_date ? new Date(row.start_date) : null;
    let newEnd = row.end_date ? new Date(row.end_date) : null;

    if (oldStart) {
      const offsetMs = targetStartDateMs - oldStart.getTime();
      if (offsetMs !== 0) {
        await shiftTaskAndChildrenDates(client, depId, offsetMs);
        if (newEnd) newEnd = new Date(newEnd.getTime() + offsetMs);
      }
    } else {
       await client.query("UPDATE pl_tasks SET start_date = $1, end_date = $1 WHERE id = $2", [targetStartDate, depId]);
       newEnd = targetStartDate;
    }

    if (newEnd) {
      await cascadeDependentTaskDates(client, depId, newEnd);
    }
  }
}

async function runStartupMigration() {
  console.log("Migrating database schema: Creating tables safely if they do not exist...");
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_water_balances (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          responsible VARCHAR(255) NOT NULL,
          delivery_date TIMESTAMP,
          received_by VARCHAR(255),
          receipt_date TIMESTAMP,
          status VARCHAR(50) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_systems (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_regions (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
          description TEXT,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_demands (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          modifiers_population NUMERIC,
          modifiers_coverage NUMERIC,
          modifiers_per_capita NUMERIC,
          modifiers_losses NUMERIC,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_demand_entries (
          id SERIAL PRIMARY KEY,
          demand_id INTEGER REFERENCES wb_demands(id) ON DELETE CASCADE,
          region_id INTEGER REFERENCES wb_regions(id) ON DELETE CASCADE,
          year INTEGER NOT NULL,
          population NUMERIC NOT NULL,
          coverage NUMERIC NOT NULL,
          per_capita_consumption NUMERIC NOT NULL,
          losses NUMERIC NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_supply_sources (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          granted_flow NUMERIC NOT NULL,
          operational_flow NUMERIC NOT NULL,
          unavailable_flow NUMERIC NOT NULL,
          unavailability_reason TEXT,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_operational_adjustments (
          id SERIAL PRIMARY KEY,
          system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          flow_value NUMERIC NOT NULL,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE,
          linked_adjustment_id INTEGER REFERENCES wb_operational_adjustments(id) ON DELETE SET NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_template_files (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          url TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_water_balance_maps (
          id SERIAL PRIMARY KEY,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE UNIQUE,
          geojson_data JSONB
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_risk_references (
          id SERIAL PRIMARY KEY,
          iad VARCHAR(100) NOT NULL,
          risk_classification VARCHAR(255) NOT NULL,
          justification TEXT NOT NULL
        );
      `);

      const riskCountRes = await client.query("SELECT COUNT(*) FROM wb_risk_references");
      if (parseInt(riskCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO wb_risk_references (iad, risk_classification, justification) VALUES
          ('< 120%', 'Risco Alto (Crítico)', '**Inadequação Normativa e Insegurança de Pico.** O critério internacional de estresse severo (WEI+ da Agência Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renovável. Urbanamente, o coeficiente de variação de consumo diário (K1) é fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma relação abaixo de 1,2 indica que o sistema não suportará o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidráulica.'),
          ('120% a 130%', 'Risco Médio (Alerta)', '**Perda da Margem de Contingência Operacional.** Nesta faixa, a oferta atende estritamente à demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" física do sistema cai para menos de 10%. Manuais de operação de saneamento e relatórios de risco hídrico apontam que trabalhar com menos de 10% de folga impede paradas para manutenções emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas físicas por vazamentos na distribuição.'),
          ('> 130%', 'Risco Baixo (Adequado)', '**Resiliência e Segurança Hídrica Plena.** Garante o pleno atendimento das flutuações sazonais urbanas recomendadas pela engenharia civil clássica. A margem mínima acima de 30% absorve os coeficientes de pico de consumo, compensa variações na qualidade da água bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mantém o sistema operando em segurança contínua, em alinhamento com as zonas confortáveis prescritas pela ANA (Agência Nacional de Águas).')
        `);
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          parent_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          progress INTEGER DEFAULT 0,
          priority VARCHAR(50),
          category VARCHAR(100),
          assigned_to VARCHAR(255),
          created_by VARCHAR(255),
          notes TEXT
        );
      `);

      // Add sei_process column
      await client.query("ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS sei_process TEXT;");

      await client.query("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON pl_tasks(parent_id);");

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_areas (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          abbreviation VARCHAR(4)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_category_areas (
          category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          order_index INTEGER DEFAULT 0,
          PRIMARY KEY (category_id, area_id)
        );
      `);

      // Add order_index if it doesn't exist
      try {
        await client.query(`ALTER TABLE pl_category_areas ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`);
      } catch (err) {
        // column likely exists
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_categories (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, category_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          title VARCHAR(255),
          description TEXT
        );
      `);
      
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES pl_plans(id) ON DELETE SET NULL;`);
      
      // Auto-migrate pl_users to au_users if it exists and au_users does not
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pl_users') AND
               NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'au_users') THEN
              ALTER TABLE pl_users RENAME TO au_users;
            END IF;
          END
          $$;
        `);
      } catch (e) {
        console.error("Erro ao migrar tabela pl_users para au_users:", e);
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS au_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role_id VARCHAR(100) DEFAULT 'provider',
          status VARCHAR(50) DEFAULT 'active',
          agency VARCHAR(255)
        );
      `);

      const userCountRes = await client.query("SELECT COUNT(*) FROM au_users");
      if (parseInt(userCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO au_users (name, email, password, role_id, status, agency) VALUES
          ('Admin', 'admin@adasa.gov.br', $1, 'admin', 'active', NULL),
          ('Joao Regulador', 'joao@adasa.gov.br', $2, 'regulator', 'active', NULL),
          ('Maria CAESB', 'maria@caesb.gov.br', $3, 'provider', 'active', 'CAESB')
        `, await Promise.all([hashPassword("1234"), hashPassword("1234"), hashPassword("1234")]));
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_responsibles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(100),
          user_id INTEGER REFERENCES au_users(id) ON DELETE SET NULL
        );
      `);

      try {
        await client.query("ALTER TABLE pl_responsibles ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES au_users(id) ON DELETE SET NULL;");
      } catch (err) {
        // ignore if already exists or schema issue
      }

      // Sync responsibles into users table as requested
      try {
        const respsRes = await client.query("SELECT id, name, user_id FROM pl_responsibles");
        for (const resp of respsRes.rows) {
          let uId = resp.user_id;
          if (!uId) {
            const nameClean = (resp.name || "").trim();
            if (nameClean) {
              let firstPart = nameClean.split(/\s+/)[0];
              let firstNormalized = firstPart.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
              if (!firstNormalized) {
                firstNormalized = "responsavel";
              }
              let emailAddress = `${firstNormalized}@adasa.df.gov.br`;

              // Check if user already exists with the exact name
              const checkByName = await client.query("SELECT id FROM au_users WHERE LOWER(name) = LOWER($1)", [nameClean]);
              if (checkByName.rows.length > 0) {
                uId = checkByName.rows[0].id;
                await client.query("UPDATE pl_responsibles SET user_id = $1 WHERE id = $2", [uId, resp.id]);
                console.log(`[SYNC] Linked existing user for responsible "${nameClean}" via name match`);
              } else {
                // Ensure unique email
                let suffix = 1;
                let uniqueEmail = emailAddress;
                while (true) {
                  const checkExist = await client.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1)", [uniqueEmail]);
                  if (checkExist.rows.length === 0) {
                    break;
                  }
                  suffix++;
                  uniqueEmail = `${firstNormalized}${suffix}@adasa.df.gov.br`;
                }
                emailAddress = uniqueEmail;

                // Register user
                const insertUserRes = await client.query(
                  "INSERT INTO au_users (name, email, password, role_id, status, agency) VALUES ($1, $2, $3, 'regulator', 'active', 'Adasa') RETURNING id",
                  [nameClean, emailAddress, await hashPassword("1234")]
                );
                uId = insertUserRes.rows[0].id;
                await client.query("UPDATE pl_responsibles SET user_id = $1 WHERE id = $2", [uId, resp.id]);
                console.log(`[SYNC] Registered user for responsible: "${nameClean}" -> "${emailAddress}"`);
              }
            }
          }
        }
      } catch (syncErr) {
        console.error("Error syncing responsibles to users:", syncErr);
      }
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_responsible_areas (
          responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          PRIMARY KEY (responsible_id, area_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_areas (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, area_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_responsibles (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, responsible_id)
        );
      `);

      
      // Verify that depends_on_task_id exists
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS depends_on_task_id INTEGER REFERENCES pl_tasks(id) ON DELETE SET NULL;`);
      
      // Add updated_at and updated_by to tables
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP, ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP, ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP, ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;`);
      await client.query(`ALTER TABLE pl_areas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP, ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_areas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP, ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_responsibles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP, ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_responsibles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP, ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP, ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP, ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);`);
      await client.query(`ALTER TABLE pl_areas ALTER COLUMN abbreviation TYPE VARCHAR(4);`);
      await client.query("UPDATE pl_areas SET abbreviation = 'CORA' WHERE abbreviation = 'CO';");

      // Ensure pl_tasks has weight column
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS weight REAL DEFAULT 1.0;`);
      
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'default';`);
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS fiscalizacao_data JSONB;`);
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS ouvidoria_data JSONB;`);
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS recurso_rev_data JSONB;`);
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='pl_tasks' AND column_name='recurso_data'
          ) THEN
            UPDATE pl_tasks SET ouvidoria_data = recurso_data WHERE ouvidoria_data IS NULL AND recurso_data IS NOT NULL;
            ALTER TABLE pl_tasks DROP COLUMN IF EXISTS recurso_data;
          END IF;
        END $$;
      `);
      await client.query(`ALTER TABLE pl_tasks DROP COLUMN IF EXISTS recurso_data;`);
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS checklist JSONB;`);

      // Migrate legacy task type 'recurso' to 'demanda_ouvidoria'
      await client.query(`
        UPDATE pl_tasks 
        SET type = 'demanda_ouvidoria'
        WHERE type = 'recurso';
      `);

      // Set task type to 'demanda_ouvidoria' for all tasks under category DEMANDAS OUVIDORIA or OUVIDORIA
      await client.query(`
        UPDATE pl_tasks 
        SET type = 'demanda_ouvidoria',
            ouvidoria_data = COALESCE(ouvidoria_data, '{"situacao": "Recebido", "tipoManifestacao": "Demanda Ouvidoria"}'::jsonb)
        WHERE id IN (
          SELECT t.id FROM pl_tasks t
          LEFT JOIN pl_task_categories tc ON tc.task_id = t.id
          LEFT JOIN pl_categories c ON c.id = tc.category_id
          WHERE UPPER(TRIM(c.name)) LIKE '%DEMANDAS OUVIDORIA%'
             OR UPPER(TRIM(c.name)) LIKE '%OUVIDORIA%'
             OR UPPER(TRIM(t.category)) LIKE '%DEMANDAS OUVIDORIA%'
             OR UPPER(TRIM(t.category)) LIKE '%OUVIDORIA%'
        ) AND (type IS NULL OR type = 'default' OR type = 'recurso');
      `);

      // Update any existing recurso_data jsonb that still references 'Reclamação'
      await client.query(`
        UPDATE pl_tasks
        SET ouvidoria_data = jsonb_set(ouvidoria_data, '{tipoManifestacao}', '"Demanda Ouvidoria"')
        WHERE ouvidoria_data IS NOT NULL AND ouvidoria_data->>'tipoManifestacao' = 'Reclamação';
      `);

      // Seed progressive random stage dates for Recurso de Revisão, Demanda de Ouvidoria, and Fiscalização if missing
      try {
        const tasksToUpdate = await client.query(`
          SELECT id, type, start_date, end_date, fiscalizacao_data, ouvidoria_data, recurso_rev_data 
          FROM pl_tasks 
          WHERE (type IN ('recurso_revisao', 'demanda_ouvidoria', 'fiscalizacao') 
             OR fiscalizacao_data IS NOT NULL 
             OR ouvidoria_data IS NOT NULL 
             OR recurso_rev_data IS NOT NULL)
        `);

        const recursoRevStages = ['Recebido', 'Em Análise Técnica', 'Encaminhado à Diretoria', 'Notificação do Usuário', 'Finalizado'];
        const ouvidoriaStages = ['Recebido', 'Em Análise Técnica', 'Tramitado para a Ouvidoria', 'Encaminhado à Diretoria', 'Retornado da Diretoria', 'Finalizado'];
        const fiscStages = ['Planejamento', 'Execução', 'Monitoramento', 'Finalizada'];

        for (const row of tasksToUpdate.rows) {
          const tId = Number(row.id);
          let baseYear = 2025;
          if (row.start_date) {
            const y = new Date(row.start_date).getFullYear();
            if (!isNaN(y) && y >= 2017 && y <= 2026) baseYear = y;
          } else if (row.end_date) {
            const y = new Date(row.end_date).getFullYear();
            if (!isNaN(y) && y >= 2017 && y <= 2026) baseYear = y;
          } else {
            baseYear = 2022 + (tId % 4);
          }

          const generateDates = (stagesList: string[]) => {
            const result: Record<string, string> = {};
            const seed = (tId || 1);
            const startMonth = (seed % 7);
            const startDay = ((seed * 7) % 18) + 1;
            const curDate = new Date(baseYear, startMonth, startDay);
            for (let i = 0; i < stagesList.length; i++) {
              const stage = stagesList[i];
              result[stage] = curDate.toISOString().split('T')[0];
              let addDays = 10;
              if (stage === 'Encaminhado à Diretoria' || stage === 'Tramitado para a Ouvidoria') {
                addDays = 20 + ((seed * 3) % 9);
              } else if (stage === 'Em Análise Técnica') {
                addDays = 15 + ((seed * 2) % 8);
              } else if (stage === 'Recebido') {
                addDays = 7 + (seed % 6);
              } else {
                addDays = 8 + (seed % 7);
              }
              curDate.setDate(curDate.getDate() + addDays);
            }
            return result;
          };

          // 1. Recurso de Revisão
          if (row.type === 'recurso_revisao' || row.recurso_rev_data) {
            const rev = row.recurso_rev_data || { situacao: 'Recebido' };
            if (!rev.datasEtapas || Object.keys(rev.datasEtapas).length < 2) {
              rev.datasEtapas = generateDates(recursoRevStages);
              await client.query("UPDATE pl_tasks SET recurso_rev_data = $1 WHERE id = $2", [rev, tId]);
            }
          }

          // 2. Demanda de Ouvidoria
          if (row.type === 'demanda_ouvidoria' || row.ouvidoria_data) {
            const ouv = row.ouvidoria_data || { situacao: 'Recebido' };
            if (!ouv.datasEtapas || Object.keys(ouv.datasEtapas).length < 2) {
              ouv.datasEtapas = generateDates(ouvidoriaStages);
              await client.query("UPDATE pl_tasks SET ouvidoria_data = $1 WHERE id = $2", [ouv, tId]);
            }
          }

          // 3. Fiscalização
          if (row.type === 'fiscalizacao' || row.fiscalizacao_data) {
            const fisc = row.fiscalizacao_data || { etapa: 'Planejamento' };
            if (!fisc.datasEtapas || Object.keys(fisc.datasEtapas).length < 2) {
              fisc.datasEtapas = generateDates(fiscStages);
              await client.query("UPDATE pl_tasks SET fiscalizacao_data = $1 WHERE id = $2", [fisc, tId]);
            }
          }
        }
      } catch (errStage) {
        console.error("Erro ao popular datas das etapas no banco:", errStage);
      }

      // Ensure pl_task_models and pl_model_tasks tables exist for task templates
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_models (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR(255)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_model_tasks (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES pl_task_models(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          duration_days INTEGER DEFAULT 0,
          weight REAL DEFAULT 1.0,
          sequence_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR(255)
        );
      `);

      // Ensure re_resolutions table exists for regulation module (prefix re_)
      await client.query(`
        CREATE TABLE IF NOT EXISTS re_resolutions (
          id SERIAL PRIMARY KEY,
          especie VARCHAR(100),
          numero INTEGER,
          ano INTEGER,
          data VARCHAR(20),
          ementa TEXT,
          situacao VARCHAR(100),
          area VARCHAR(255),
          segmento VARCHAR(255),
          tipo VARCHAR(100),
          link TEXT,
          imagem_capa TEXT
        );
      `);
      
      // Ensure existing tables have the column
      await client.query(`
        ALTER TABLE re_resolutions ADD COLUMN IF NOT EXISTS imagem_capa TEXT;
      `);

      const resCheck = await client.query("SELECT COUNT(*) FROM re_resolutions");
      if (parseInt(resCheck.rows[0].count) === 0) {
        console.log("Seeding re_resolutions table...");
        const seedRows = [
          ["Resolução", 162, 2006, "11/05/2006", "Estabelece os procedimentos para a instalação de hidrômetros individualizados em condomínios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resoluções nº 175, de 19 de dezembro de 2007, e nº 99, de 16 de novembro de 2009.", "Revogada", "Saneamento Básico", "Medição Individualizada", "Acessória", "https://www.sinj.df.gov.br/sinj/Norma/52952/Resolu_o_162_11_05_2006.html"],
          ["Resolução", 188, 2006, "24/05/2006", "Regulamenta os procedimentos para aplicação de penalidades às infrações cometidas contra os Regulamentos e Contrato de Concessão dos Serviços de Abastecimento de Água e Esgotamento Sanitário.", "Vigente com alterações", "Saneamento Básico", "Penalidades Prestador", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2006/Resolucao_188_2006_Consolidada_Resolu%C3%A7%C3%A3o_35_2024.pdf"],
          ["Resolução", 175, 2007, "19/12/2007", "Estabelece os procedimentos para a instalação de hidrômetros individualizados em condomínios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resoluções nº 175, de 19 de dezembro de 2007, e nº 99, de 16 de novembro de 2009.", "Revogada", "Saneamento Básico", "Medição Individualizada", "Acessória", "https://www.sinj.df.gov.br/sinj/Norma/56711/adasa_res_175_2007.html#art14"],
          ["Resolução", 99, 2009, "16/11/2009", "Altera a Resolução nº 175, de 19 de dezembro de 2007, que estabelece os procedimentos para a instalação de hidrômetros individualizados em cada unidade habitacional, nas edificações verticais residenciais e nas de uso misto e nos condomínios residenciais do Distrito Federal.", "Revogada", "Saneamento Básico", "Medição Individualizada", "Acessória", "https://www.sinj.df.gov.br/sinj/Norma/76543/Resolu_o_99_16_11_2009.html"],
          ["Resolução", 14, 2011, "27/10/2011", "Estabelece as condições da prestação e utilização dos serviços públicos de abastecimento de água e de esgotamento sanitário no Distrito Federal.", "Vigente com alterações", "Saneamento Básico", "Condições Gerais", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2011/Versao_Consolidada_Resolucao_n_14_2011.pdf"],
          ["Resolução", 15, 2011, "10/11/2011", "Estabelece os procedimentos para a instalação de hidrômetros individualizados em condomínios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resoluções nº 175, de 19 de dezembro de 2007, e nº 99, de 16 de novembro de 2009.", "Vigente com alterações", "Saneamento Básico", "Medição Individualizada", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/Res_15_compilada.pdf"],
          ["Resolução", 3, 2012, "13/04/2012", "Disciplina os procedimentos a serem observados nos processos administrativos instaurados pelo prestador de serviços públicos de abastecimento de água e de esgotamento sanitário que tenham por objetivo a correção de irregularidades praticadas por usuários ou a aplicação de sanções a estes.", "Vigente com alterações", "Saneamento Básico", "Penalidades Usuários", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2012/RESOLU%C3%87%C3%83O N%C2%BA 03_2012 Consolidada Site Vrs.pdf"],
          ["Resolução", 8, 2016, "04/07/2016", "Anexo II - Informações Periódicas Complementares Manual de avaliação de desempenho da prestação dos serviços de abastecimento de água e esgotamento sanitário do Distrito Federal.", "Revogada", "Saneamento Básico", "Indicadores", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016_Anexo II.pdf"],
          ["Resolução", 8, 2016, "04/07/2016", "Anexo I - Manual de avaliação de desempenho da prestação dos serviços de abastecimento de água e esgotamento sanitário do Distrito Federal.", "Revogada", "Saneamento Básico", "Indicadores", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016_Anexo I.pdf"],
          ["Resolução", 8, 2016, "04/07/2016", "Dispõe sobre a instituição da metodologia de avaliação de desempenho da prestação dos serviços públicos de abastecimento de água e de esgotamento sanitário do Distrito Federal e sobre os procedimento gerais de comunicações oficiais realizadas entre a ADASA e o prestador de serviços públicos de abastecimento de água e esgotamento sanitário, e dá outras providências.", "Revogada", "Saneamento Básico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016.pdf"],
          ["Resolução", 9, 2016, "13/07/2016", "Estabelece as diretrizes para a constituição, organização e funcionamento do Conselho de Consumidores dos Serviços Públicos de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal.", "Vigente com alterações", "Saneamento Básico", "Conselho de Consumidores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 09_2016.pdf"],
          ["Resolução", 20, 2016, "07/11/2016", "Declara o estado de restrição de uso dos recursos hídricos, estabelece o regime de racionamento do serviço de abastecimento de água nas localidades atendidas pelos reservatórios do Descoberto e Santa Maria.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 20_2016.pdf"],
          ["Resolução", 10, 2017, "19/05/2017", "Altera o Art. 1º. da Resolução n° 15, de 10 de novembro de 2011.", "Vigente", "Saneamento Básico", "Medição Individualizada", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2017/Res_17pdf/Resolu%C3%A7%C3%A3o n%C2%BA 10_2017.pdf"],
          ["Resolução", 21, 2017, "08/09/2017", "Declara estado de restrição de uso dos recursos hídricos e o regime de racionamento nas regiões administrativas de São Sebastião, Sobradinho I e II, Fercal, Planaltina e Brazlândia, atendidas pelos sistemas isolados operados pela Companhia de Saneamento Ambiental do Distrito Federal – CAESB. (Revogada pela Resolução nº 13, de 06 de junho de 2018).", "Revogada", "Saneamento Básico", "Crise Hídrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2017/Res_17pdf/Resolu%C3%A7%C3%A3o n%C2%BA 21_2017.pdf"],
          ["Resolução", 11, 2018, "22/05/2018", "Altera o Art. 29 da Resolução nº. 14, de 27 de outubro de 2011.", "Vigente", "Saneamento Básico", "Condições Gerais", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2018/2018pdf/Resolu%C3%A7%C3%A3o n%C2%BA 11_2018.pdf"],
          ["Resolução", 13, 2018, "06/06/2018", "Revoga as Resoluções ADASA nº 20/2016 e 21/2017, e estabelece procedimentos complementares, a serem observados pela Concessionária, para o atendimento das Resoluções ADASA nº 8/2018 e 12/2018 e dá outras providências.", "Vigente", "Saneamento Básico", "Crise Hídrica", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2018/2018pdf/Resolu%C3%A7%C3%A3o n%C2%BA 13_2018.pdf"],
          ["Resolução", 3, 2019, "20/03/2019", "Estabelece diretrizes para implantação e operação de sistemas prediais de água não potável em edificações residenciais.", "Revogada", "Saneamento Básico", "Sistemas Não Potáveis", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 03_2019.pdf"],
          ["Resolução", 9, 2019, "30/09/2019", "Determina que a Companhia de Saneamento Ambiental do Distrito Federal – Caesb apresente plano para implementar medidas de restrição do abastecimento de água em regiões atendidas por sistemas isolados e sob regime de alocação negociada de recursos hídricos no Distrito Federal.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2016/Resolu%C3%A7%C3%A3o n%C2%BA 09_2016 Consolidada.pdf"],
          ["Resolução", 10, 2019, "07/11/2019", "Dispõe sobre a instituição da metodologia de auditoria e certificação das informações provenientes da prestação dos serviços públicos de abastecimento de água e de esgotamento sanitário no Distrito Federal.", "Vigente", "Saneamento Básico", "Auditoria e Certificação", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 10_2019.pdf"],
          ["Resolução", 12, 2019, "29/11/2019", "Altera as Resoluções nº 14, de 27 de outubro de 2011, nº 15, de 10 de novembro de 2011 e nº 6, de 26 de april de 2019 e revoga a Resolução nº 10, de 19 de mais de 2017.", "Vigente", "Saneamento Básico", "Condições Gerais", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 12_2019.pdf"],
          ["Resolução", 15, 2019, "20/12/2019", "Estabelece diretrizes e procedimentos para elaboração e apresentação do Plano de Exploração dos Serviços de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal.", "Vigente com alterações", "Saneamento Básico", "Plano de Exploração", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2019/Resolu%C3%A7%C3%A3o n%C2%BA 15_2019.pdf Site.pdf"],
          ["Resolução", 16, 2019, "23/12/2019", "Altera a Resolução nº 12, de 29 de novembro de 2019.", "Vigente", "Saneamento Básico", "Condições Gerais", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 16_2019.pdf"],
          ["Resolução", 7, 2020, "07/05/2020", "Estabelece condições excepcionais para prestação e utilização dos serviços públicos de abastecimento de água e de esgotamento sanitário no Distrito Federal, durante a situação de emergência em saúde pública, em razão da pandemia de COVID-19.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2020/Res_2020pdf/Resolu%C3%A7%C3%A3o n%C2%BA 07_2020 - Estabelece condi%C3%A7%C3%B5es excepcionais dos servi%C3%A7os p%C3%BAblicos, durante a situa%C3%A7%C3%A3o de emerg%C3%AAncia em sa%C3%BAde p%C3%BAblica, em raz%C3%A3o da p.pdf"],
          ["Resolução", 15, 2020, "02/09/2020", "Altera o art. 6º da Resolução nº 07, de 06 de maio de 2020.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2020/Res_2020pdf/Resolu%C3%A7%C3%A3o n%C2%BA 15_2020 - Altera o art. 6%C2%BA da Resolu%C3%A7%C3%A3o n%C2%BA 07, de 06 de maio de 2020.pdf"],
          ["Resolução", 2, 2021, "26/03/2021", "Altera a Resolução nº 09, de 13 de julho de 2016 que estabelece as diretrizes para a constituição, organização e funcionamento do Conselho de Consumidores dos Serviços Públicos de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal.", "Vigente", "Saneamento Básico", "Conselho de Consumidores", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 02_2021.pdf"],
          ["Resolução", 6, 2021, "06/05/2021", "Revoga o inciso III do art. 4º da Resolução n.º 07, de 06 de maio de 2020, e dá outras providências.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 06_2021.pdf"],
          ["Resolução", 9, 2021, "19/08/2021", "Altera o inciso I do art. 4º da Resolução Adasa nº 7, de 6 de maio de 2020.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 09_2021.pdf"],
          ["Resolução", 13, 2021, "20/12/2021", "Institui o Manual de Elaboração e Avaliação dos Projetos do Programa de Pesquisa, Desenvolvimento e Inovação – Programa PDI para os Serviços de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal e define o limite máximo de investimento autorizado.", "Vigente", "Saneamento Básico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 13_2021 (1).pdf"],
          ["Resolução", 3, 2022, "26/04/2022", "Revoga a Resolução Adasa nº 7, de 6 de maio de 2020, e dá outras providências.", "Revogada", "Saneamento Básico", "Crise Hídrica", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/res2_pdf/RESOLU%C3%87%C3%83O N%C2%BA 03_2022.pdf"],
          ["Resolução", 5, 2022, "09/05/2022", "Estabelece diretrizes para o aproveitamento ou reúso de água não potável em edificações no Distrito Federal.", "Vigente", "Saneamento Básico", "Sistemas Não Potáveis", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/Resolucao05_09052022_.pdf"],
          ["Resolução", 10, 2022, "26/09/2022", "Altera a Resolução nº 14, de 27 de outubro de 2011.", "Vigente", "Saneamento Básico", "Condições Gerais", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/RESOLU%C3%87%C3%83O_N_010_2022.pdf"],
          ["Resolução", 13, 2022, "19/12/2022", "Aprova o Plano de Exploração dos Serviços de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal e dá outras providências.", "Vigente", "Saneamento Básico", "Plano de Exploração", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/res2_pdf/RESOLU%C3%87%C3%83O%20N%C2%BA%2013_2022.pdf"],
          ["Resolução", 17, 2023, "06/03/2023", "Altera a Resolução n.º 188, de 24 de maio de 2006.", "Vigente", "Saneamento Básico", "Penalidades Prestador", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2023/RESOLU%C3%87%C3%83O N%C2%BA 17_2023_Altera%C3%A7%C3%A3o Resolu%C3%A7%C3%A3o 188_2006_Penalidades.pdf"],
          ["Resolução", 23, 2023, "06/07/2023", "Aprova os projetos do Programa de Pesquisa, Desenvolvimento e Inovação – PDI – Adasa/Caesb.", "Vigente", "Saneamento Básico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2023/RESOLU%C3%87%C3%83O N%C2%BA 23.23_ PDI1.pdf"],
          ["Resolução", 21, 2023, "17/07/2023", "Altera a Resolução nº 03, de 13 de abril de 2012.", "Vigente", "Saneamento Básico", "Penalidades Usuários", "Acessória", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2023/RESOLU%C3%87%C3%83O N%C2%BA 21_2023 Vers%C3%A3o Final Republicada.pdf"],
          ["Resolução", 25, 2023, "17/08/2023", "Estabelece procedimentos gerais para execução integrada das atividades de inspeção, identificação e correção dos lançamentos irregulares de esgotos sanitários ou outros efluentes no sistema público de drenagem e manejo de águas pluviais urbanas e de águas pluviais no sistema público de esgotamento sanitário.", "Vigente", "Saneamento Básico", "Interface Esgoto Drenagem", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2023/RESOLU%C3%87%C3%83O N%C2%BA 25-2023.pdf"],
          ["Resolução", 41, 2024, "24/10/2024", "Estabelece, no Distrito Federal, as metas progressivas de universalização de abastecimento de água e de esgotamento sanitário, indicadores de acesso e sistema de avaliação, em adoção à Norma de Referência nº 8/2024, da Agência Nacional de Águas e Saneamento Básico – ANA.", "Vigente", "Saneamento Básico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2024/RESOLU%C3%87%C3%83O_N%C2%BA_41_2024_-_Ado%C3%A7%C3%A3o_da_Norma_de_Refer%C3%AAncia_n%C2%BA_8-2024_ANA_1.pdf"],
          ["Resolução", 48, 2024, "23/12/2024", "Estabelece diretrizes e procedimentos para a execução das atividades realizadas por caminhões limpa-fossa no Distrito Federal e dá outras providências", "Vigente", "Saneamento Básico", "Caminhões Limpa-fossa", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2024/SEI_159268953_Resolucao_48_3.pdf"],
          ["Resolução", 57, 2025, "06/10/2025", "Aprova os projetos do Programa de Pesquisa, Desenvolvimento e Inovação – PDI – Adasa/Caesb, para os Serviços de Abastecimento de Água e de Esgotamento Sanitário do Distrito Federal, apresentados pela Concessionária, nos termos da Resolução nº 13, de 20 de dezembro de 2021.", "Vigente", "Saneamento Básico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_183620524_Resolucao_57.pdf"],
          ["Resolução", 58, 2025, "05/11/2025", "Dispõe sobre as soluções alternativas de abastecimento de água e de esgotamento sanitário, individuais e coletivas, quando configuradas como serviço público ou ações de saneamento de responsabilidade privada, e sua contabilização para fins de cumprimento das metas de universalização no Distrito Federal, e dá outras providências.", "Vigente", "Saneamento Básico", "Soluções Alternativas", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_186418676_Resolucao_58.pdf"],
          ["Resolução", 59, 2025, "12/11/2025", "Dispõe sobre indicadores operacionais da prestação dos serviços públicos de abastecimento de água e esgotamento sanitário no Distrito Federal, em adoção à Norma de Referência nº 9/2024, da Agência Nacional de Águas e Saneamento Básico.", "Vigente", "Saneamento Básico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_187086634_Resolucao_59.pdf"],
          ["Resolução", 65, 2025, "05/12/2025", "Altera as Resoluções nº 03, de 13 de abril de 2012, nº 21, de 17 de julho de 2023 e nº 14, de 27 de outubro de 2011.", "Vigente", "Saneamento Básico", "Penalidades Usuários", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_189034238_Resolucao_65.pdf"]
        ];

        for (const row of seedRows) {
          await client.query(
            "INSERT INTO re_resolutions (especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            row
          );
        }
        console.log("Seeding re_resolutions completed successfully!");
      }

      // Ensure re_agendas and re_agenda_tasks tables exist for regulation module (prefix re_)
      await client.query(`
        CREATE TABLE IF NOT EXISTS re_agendas (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          tema VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`ALTER TABLE re_agendas DROP COLUMN IF EXISTS status CASCADE;`);
      await client.query(`ALTER TABLE re_agendas DROP COLUMN IF EXISTS entrega CASCADE;`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_agenda_tasks (
          id SERIAL PRIMARY KEY,
          agenda_id INTEGER REFERENCES re_agendas(id) ON DELETE CASCADE,
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE
        );
      `);

      // Add columns if they do not exist
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'Não Concluída';");
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS entrega TEXT;");
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS entrega_link TEXT;");

      // Ensure pu_publications table exists for publications module (prefix pu_)
      await client.query(`
        CREATE TABLE IF NOT EXISTS pu_publications (
          id SERIAL PRIMARY KEY,
          titulo_assunto TEXT,
          descricao TEXT,
          tipo_documento VARCHAR(255),
          responsavel_autor VARCHAR(255),
          data_publicacao VARCHAR(50),
          link_acesso TEXT,
          observacoes TEXT,
          imagem_capa TEXT
        );
      `);
      
      // Ensure existing tables have the column
      await client.query(`
        ALTER TABLE pu_publications ADD COLUMN IF NOT EXISTS imagem_capa TEXT;
      `);

      // Recreate tables with 'participation' terminology and SERIAL primary keys (prefix re_)
      await client.query(`
        DO $$
        BEGIN
          -- Check if re_participations exists with VARCHAR id, or drop to recreate with SERIAL PRIMARY KEY
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 're_participations' AND column_name = 'id' AND data_type = 'character varying'
          ) THEN
            DROP TABLE IF EXISTS re_participation_contributions CASCADE;
            DROP TABLE IF EXISTS re_participation_articles CASCADE;
            DROP TABLE IF EXISTS re_participation_attachments CASCADE;
            DROP TABLE IF EXISTS re_participations CASCADE;
          END IF;

          -- Drop old legacy tables
          DROP TABLE IF EXISTS reg_tomada_contributions CASCADE;
          DROP TABLE IF EXISTS reg_tomada_articles CASCADE;
          DROP TABLE IF EXISTS reg_tomada_anexos CASCADE;
          DROP TABLE IF EXISTS reg_tomadas CASCADE;
          DROP TABLE IF EXISTS re_tomada_contributions CASCADE;
          DROP TABLE IF EXISTS re_tomada_articles CASCADE;
          DROP TABLE IF EXISTS re_tomada_anexos CASCADE;
          DROP TABLE IF EXISTS re_tomadas CASCADE;
        END $$;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participations (
          id SERIAL PRIMARY KEY,
          numero VARCHAR(255),
          meio_participacao VARCHAR(100) DEFAULT 'Consulta Pública',
          title TEXT,
          objeto TEXT,
          dataInicio VARCHAR(50),
          dataFim VARCHAR(50),
          createdAt VARCHAR(50)
        );
      `);

      await client.query(`
        ALTER TABLE re_participations ADD COLUMN IF NOT EXISTS meio_participacao VARCHAR(100) DEFAULT 'Consulta Pública';
        ALTER TABLE re_participations ADD COLUMN IF NOT EXISTS tipo_resolucao VARCHAR(50) DEFAULT 'nova';
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participation_attachments (
          id SERIAL PRIMARY KEY,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,
          name TEXT,
          url TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participation_articles (
          id SERIAL PRIMARY KEY,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,
          order_index INTEGER,
          original_text TEXT,
          proposed_text TEXT,
          final_text TEXT,
          final_justification TEXT
        );
      `);

      // Migration: Ensure final_text and final_justification exist on re_participation_articles
      await client.query(`
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS final_text TEXT;
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS final_justification TEXT;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participation_contributions (
          id SERIAL PRIMARY KEY,
          article_id INTEGER NOT NULL REFERENCES re_participation_articles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES au_users(id) ON DELETE CASCADE,
          proposed_text TEXT NOT NULL,
          justification TEXT NOT NULL,
          decision VARCHAR(50) DEFAULT NULL,
          created_at VARCHAR(50),
          CONSTRAINT unique_user_article_contribution UNIQUE (article_id, user_id)
        );
      `);

      // Migration: Ensure decision column exists on re_participation_contributions
      await client.query(`
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS decision VARCHAR(50) DEFAULT NULL;
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS complexity VARCHAR(50) DEFAULT NULL;
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS technical_justification TEXT DEFAULT NULL;
      `);

      // Migration: Ensure user_id column exists, backfill from author_name if present, drop author_name column
      try {
        await client.query(`
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS user_id INTEGER;
        `);

        // Check if author_name column exists to backfill user_id
        const hasAuthorNameCol = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 're_participation_contributions' AND column_name = 'author_name';
        `);

        if (hasAuthorNameCol.rows.length > 0) {
          // Backfill user_id from author_name by matching au_users.name or creating user
          const unlinkedContribs = await client.query(`
            SELECT DISTINCT author_name FROM re_participation_contributions 
            WHERE user_id IS NULL AND author_name IS NOT NULL AND TRIM(author_name) != '';
          `);

          for (const row of unlinkedContribs.rows) {
            const authorName = (row.author_name || "").trim();
            if (!authorName) continue;
            
            let uRes = await client.query("SELECT id FROM au_users WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1", [authorName]);
            let uid = uRes.rows.length > 0 ? uRes.rows[0].id : null;

            if (!uid) {
              const fakeEmail = `${authorName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@adasa.df.gov.br`;
              const checkEmail = await client.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1) LIMIT 1", [fakeEmail]);
              if (checkEmail.rows.length > 0) {
                uid = checkEmail.rows[0].id;
              } else {
                const insUser = await client.query(
                  "INSERT INTO au_users (name, email, password, role_id, status, agency) VALUES ($1, $2, $3, 'provider', 'active', 'Participação Social') RETURNING id",
                  [authorName, fakeEmail, await hashPassword("1234")]
                );
                uid = insUser.rows[0].id;
              }
            }

            if (uid) {
              await client.query("UPDATE re_participation_contributions SET user_id = $1 WHERE user_id IS NULL AND author_name = $2", [uid, row.author_name]);
            }
          }

          // If any user_id is still NULL, associate with the first admin user
          await client.query(`
            UPDATE re_participation_contributions 
            SET user_id = (SELECT id FROM au_users ORDER BY id ASC LIMIT 1) 
            WHERE user_id IS NULL;
          `);

          // Remove duplicate contributions per (article_id, user_id) before adding UNIQUE constraint
          await client.query(`
            DELETE FROM re_participation_contributions c1
            WHERE c1.id NOT IN (
              SELECT MAX(c2.id)
              FROM re_participation_contributions c2
              GROUP BY c2.article_id, c2.user_id
            );
          `);

          // Drop the author_name column now that all records are bound to user_id
          await client.query(`
            ALTER TABLE re_participation_contributions DROP COLUMN IF EXISTS author_name;
          `);
        }

        // Enforce foreign key and NOT NULL on user_id
        await client.query(`
          ALTER TABLE re_participation_contributions ALTER COLUMN user_id SET NOT NULL;
          ALTER TABLE re_participation_contributions DROP CONSTRAINT IF EXISTS fk_participation_contributions_user;
          ALTER TABLE re_participation_contributions ADD CONSTRAINT fk_participation_contributions_user FOREIGN KEY (user_id) REFERENCES au_users(id) ON DELETE CASCADE;
          ALTER TABLE re_participation_contributions DROP CONSTRAINT IF EXISTS unique_user_article_contribution;
          ALTER TABLE re_participation_contributions ADD CONSTRAINT unique_user_article_contribution UNIQUE (article_id, user_id);
        `);
      } catch (migErr) {
        console.error("Erro na migração de re_participation_contributions:", migErr);
      }

      // Performance Indexes (Task & Water Balance Modules)
      await client.query("CREATE INDEX IF NOT EXISTS idx_tasks_plan_id ON pl_tasks(plan_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_tasks_depends_on ON pl_tasks(depends_on_task_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_task_areas_area_id ON pl_task_areas(area_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_task_categories_category_id ON pl_task_categories(category_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_task_responsibles_responsible_id ON pl_task_responsibles(responsible_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_model_tasks_model_id ON pl_model_tasks(model_id);");
      
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_systems_wb_id ON wb_systems(water_balance_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_regions_system_id ON wb_regions(system_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_regions_wb_id ON wb_regions(water_balance_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_demands_wb_id ON wb_demands(water_balance_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_demand_entries_demand_id ON wb_demand_entries(demand_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_demand_entries_region_id ON wb_demand_entries(region_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_supply_sources_system_id ON wb_supply_sources(system_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_supply_sources_wb_id ON wb_supply_sources(water_balance_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_op_adjustments_system_id ON wb_operational_adjustments(system_id);");
      await client.query("CREATE INDEX IF NOT EXISTS idx_wb_op_adjustments_wb_id ON wb_operational_adjustments(water_balance_id);");

      const pubCheck = await client.query("SELECT COUNT(*) FROM pu_publications");
      if (parseInt(pubCheck.rows[0].count) === 0) {
        console.log("Seeding pu_publications table with parsed historical rows...");
        const pubSeedRows = [
          ["Relatório de Atividades de 2019", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2019.", "Relatório de Atividades", "Superintendência", "31/12/2019", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/REL_ATIVIDADES_SAE_2019.pdf", ""],
          ["Relatório de Atividades de 2020", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2020.", "Relatório de Atividades", "Superintendência", "31/12/2020", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/RELATORIO_DE_ATIVIDADES_SAE_2020vf.pdf", ""],
          ["Relatório de Atividades de 2021", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2021", "Relatório de Atividades", "Superintendência", "31/12/2021", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2021_SAE_RELATORIO_DE_ATIVIDADES_SAE.pdf", ""],
          ["Relatório de Atividades de 2022", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2022.", "Relatório de Atividades", "Superintendência", "31/12/2022", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/Relat%C3%B3rio%20Final%20de%20Atividades%202022.pdf", ""],
          ["Relatório de Atividades de 2023", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2023.", "Relatório de Atividades", "Superintendência", "31/12/2023", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2023_SAE_RelatorioAtividades.pdf", ""],
          ["Relatório de Atividades de 2024", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2024.", "Relatório de Atividades", "Superintendência", "31/12/2024", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2024Sae_RelatorioAtividadesSAE_2024.pdf", ""],
          ["Relatório de Atividades de 2025", "Documento institucional que consolida as ações, fiscalizações e resultados regulatórios da SAE/Adasa ao longo do ano de 2025.", "Relatório de Atividades", "Superintendência", "31/12/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/SAE/Relatorio%20de%20atividades/Relat%C3%B3rio_%20SAE_Impress%C3%A3o%20(1)_compressed%20(1).pdf", ""],
          ["Boletim Informativo 04-25 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 4º trimestre de 2025.", "Boletim", "Superintendência", "31/12/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim4Trimestre_2025.pdf", ""],
          ["Boletim Informativo 03-25 (Julho a Setembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 3º trimestre de 2025.", "Boletim", "Superintendência", "30/09/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim_3_Trimestre_2025_compressed.pdf", ""],
          ["Boletim Informativo 02-25 (Abril a Junho)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 2º trimestre de 2025.", "Boletim", "Superintendência", "30/06/2025", "https://www.canva.com/design/DAGsfRNxAq4/510wjGIwRs4e1zSbPNcUrA/view?utm_content=DAGsfRNxAq4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3886a200ef", ""],
          ["Boletim Informativo 01-25 (Janeiro a Março)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 1º trimestre de 2025.", "Boletim", "Superintendência", "31/03/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim_1_Trimestre_2025_compressed.pdf", ""],
          ["Boletim Informativo 04-24 (outubro a dezembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 4º trimestre de 2024.", "Boletim", "Superintendência", "31/12/2024", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/BoletimInformativo_042024.pdf", ""],
          ["Boletim Informativo 03-24 (julho a setembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 3º trimestre de 2024.", "Boletim", "Superintendência", "30/09/2024", "https://sway.cloud.microsoft/hqMgrAW5pNJLSICc", ""],
          ["Boletim informativo 02-24 (abril a junho)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 2º trimestre de 2024.", "Boletim", "Superintendência", "30/06/2024", "https://sway.cloud.microsoft/DjbaBR2OJBB08TAq?ref=Link", ""],
          ["Boletim informativo 01-24 (janeiro a março)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 1º trimestre de 2024.", "Boletim", "Superintendência", "31/03/2024", "https://sway.cloud.microsoft/tFVgNJkXYuODX76t?ref=Link", ""],
          ["Boletim Informativo 04-23 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 4º trimestre de 2023.", "Boletim", "Superintendência", "31/12/2023", "https://sway.cloud.microsoft/982okByINhIRKXBg?ref=Link", ""],
          ["Boletim Informativo 03-23 (Julho a Setembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 3º trimestre de 2023.", "Boletim", "Superintendência", "30/09/2023", "https://sway.office.com/v3lJyMVb2wdZfDDB", ""],
          ["Boletim Informativo 02-23 (Abril a Junho)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 2º trimestre de 2023.", "Boletim", "Superintendência", "30/06/2023", "https://sway.office.com/WXWWGwTMGG8HrqjH?ref=Link", ""],
          ["Boletim Informativo 01-23 (Janeiro a Março)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 1º trimestre de 2023.", "Boletim", "Superintendência", "31/03/2023", "https://sway.office.com/Mp1OOSARmKY3b0wD?ref=Link", ""],
          ["Boletim Informativo 04-22 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 4º trimestre de 2022.", "Boletim", "Superintendência", "31/12/2022", "https://sway.office.com/CNYGM13GpAQBiWrE?ref=Link", ""],
          ["Boletim Informativo 03-22 (Julho a Setembro)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 3º trimestre de 2022.", "Boletim", "Superintendência", "30/09/2022", "https://sway.office.com/Fbk1IoE0wn0UnqCt?ref=Link&loc=play", ""],
          ["Boletim Informativo 02-22 (Abril a Junho)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 2º trimestre de 2022.", "Boletim", "Superintendência", "30/06/2022", "https://sway.office.com/zLQuLewHExlA4O0h?ref=Link", ""],
          ["Boletim Informativo 01-22 (Janeiro a Março)", "Boletim informativo trimestral da Coordenação de Regulação (CORA/SAE), contendo os principais destaques e acompanhamentos do 1º trimestre de 2022.", "Boletim", "Superintendência", "31/03/2022", "https://sway.office.com/Y3Pga8w5dJTowi3g?ref=Link&loc=play", ""],
          ["Informativo - Resolução nº 13/2021", "Documento explicativo contendo os destaques, diretrizes e o impacto regulatório trazido pela Resolução nº 13/2021.", "Informativo", "Regulação", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20Res%20132021%20-%20Pesquisa,%20Desenvolvimento%20e%252520Inovacao_compressed.pdf", "Tema: Pesquisa, Desenvolvimento e Inovação."],
          ["Resolução n. 14/2011: Condições Gerais da Prestação dos Serviços", "Normativo oficial que estabelece as regras, os direitos e os deveres relativos aos serviços de abastecimento de água e esgoto.", "Resolução", "Regulação", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20-%20Resolu%C3%A7%C3%A3o%20n.%2014-2011-Condicoes%20Gerais%2520(2).pdf", "Abastecimento de Água e Esgoto."],
          ["Informativo Resolução 15/2011 - Hidrometração Individualizada", "Material didático voltado a esclarecer as regras e procedimentos para a instalação de hidrômetros individuais em condomínios.", "Informativo", "Regulação", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%2520Resolu%25C3%25A7%25C3%25A3o%252015-2011-Hidrometra%25C3%25A7%25C3%25A3o%2520Individualizada.pdf", "-"],
          ["Informativo – Hábitos de consumo para economia de água", "Cartilha de conscientização com dicas práticas para a população reduzir o desperdício de água no dia a dia.", "Informativo", "Regulação", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%2520-%2520H%25C3%25A1bitos%2520de%25252520consumo%2520para%2520economia%2520de%2520%25C3%25A1gua%2520(1).pdf", "-"],
          ["Guia de Conservação e Gestão da Água em Edificações – Vol. I", "Primeiro volume do manual técnico focado em estratégias de gestão da demanda para otimizar o uso da água em prédios e residências.", "Guia", "Regulação", "01/01/2024", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/guia_conserva%C3%A7%C3%A3o_v2/ADASA_VOL1_GuiaConservacaoGestaoAguaEdificacoes.pdf", "Foco: Gestão da Demanda."],
          ["Guia de Conservação e Gestão da Água em Edificações – Vol. II", "Segundo volume do manual técnico, aprofundando-se na adoção de fontes alternativas de água para edificações.", "Guia", "Regulação", "01/01/2024", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/guia_conserva%C3%A7%C3%A3o_v2/ADASA_VOL2_GuiaConservacaoGestaoAguaEdificacoes.pdf", "Foco: Fontes Alternativas."],
          ["Informativo - Sistemas prediais de água não potável", "Orientações técnicas e de segurança para a instalação e o uso de águas destinadas a fins menos restritivos (como lavagem de pisos e descargas).", "Informativo", "Regulação", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20-%20Sistemas%20prediais%20de%20%C3%A1gua%20n%C3%A3o%20pot%C3%A1vel.pdf", "-"],
          ["Informativo - Prêmio Guardião da Água 2026", "Material de divulgação contendo as regras, os prazos ou os vencedores do prêmio ambiental referente ao ano de 2026.", "Informativo", "Regulação", "01/01/2026", "https://samediasites.blob.core.windows.net/hotsites-wp-media/SAE/Informativo%20-%20Pr%C3%AAmio%20Guardi%C3%A3o%20da%20%C3%81gua%202026.pdf", "-"],
          ["Guia de Orientações – Poupa-DF", "Manual instrutivo vinculado ao programa governamental \"Poupa-DF\", com foco no uso racional de recursos hídricos.", "Guia", "Regulação", "01/01/2019", "https://drive.google.com/file/d/0Bz4P1U7JZbO9MktJX1lra3FCSTEyWWdoWlFuS1NOQnB1V3lz/view", "Hospedado no Google Drive."],
          ["Guia de Orientação ao Usuário - Versão Atualizada", "Cartilha detalhada com os direitos, os deveres e os canais de comunicação disponíveis para os consumidores regulados.", "Guia", "Atendimento", "01/01/2025", "https://drive.google.com/file/d/1Jvy4m-qvxf0169caUXBV7GsjQqrfsFlp/view", "-"],
          ["Folder rápido - Orientações básicas ao usuário", "Material de leitura rápida (panfleto) resumindo as instruções mais essenciais de atendimento ao público.", "Guia", "Atendimento", "01/01/2025", "https://www.canva.com/design/DAGgNFnH9Hc/lQDFuuSl5Oj5Rtb8e5J96A/view?utm_content=DAGgNFnH9Hc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc1ec86d8bd", "Hospedado no Canva."],
          ["Informativo – Entenda sua tarifa", "Documento didático que explica a composição da conta de água, as faixas de consumo e os critérios de cobrança.", "Informativo", "Atendimento", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/26-12-2024/Informativo%20-%20Entenda%20sua%20tarifa%20(1).pdf", "Data inferida pela URL do arquivo."],
          ["Informativo Qualidade da Água", "Relatório ou material de transparência sobre os parâmetros, testes e resultados referentes à potabilidade da água fornecida.", "Informativo", "Fiscalização", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/publicacoes/Informativo_Qualidade_da_%C3%81gua_2_compressed.pdf", "-"],
          ["Informativo Esgotamento Sanitário", "Material educativo e técnico sobre a coleta e o tratamento de esgotos, destacando sua importância sanitária e ambiental.", "Informativo", "Fiscalização", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/publicacoes/Informativo_Esgotamento_Sanit%C3%A1rio_1_compressed.pdf", "-"],
          ["AVALIAÇÃO DA CONTINUIDADE DO FORNECIMENTO DE ÁGUA EM SITUAÇÃO DE ESCASSEZ HÍDRICA", "Estudo técnico que analisa a resiliência e a manutenção do abastecimento durante períodos prolongados de seca.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016684/AVALIA%C3%87%C3%83O_DA_CONTINUIDADE_DO_FORNECIMENTO_DE_%C3%81GUA_EM_SITUA%C3%87%C3%83O_DE_ESCASSEZ_H%C3%8DDRICA", "Congresso Brasileiro de Regulação, ABAR."],
          ["SIMULAÇÃO DE CENÁRIOS DE SEGURANÇA HÍDRICA DO SISTEMA BRAZLÂNDIA-DF", "Artigo prospectivo que modela e prevê diferentes situações de oferta e demanda de recursos hídricos na região de Brazlândia.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016761/SIMULA%C3%87%C3%83O_DE_CEN%C3%81RIOS_DE_SEGURAN%C3%87A_H%C3%8DDRICA_DO_SISTEMA_BRAZL%C3%82NDIA_DF", "Congresso Brasileiro de Regulação, ABAR."],
          ["REVISÃO DA NORMA DE APLICAÇÃO DE PENALIDADES: EXPERIÊNCIA DA ADASA-DF", "Relato técnico-institucional detalhando o processo de atualização e aprimoramento das regras de sanção e multas pela Agência Reguladora.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016987/REVIS%C3%83O_DA_NORMA_DE_APLICA%C3%87%C3%83O_DE_PENALIDADES_EXPERI%C3%8ANCIA_DA_ADASA_DF", "Congresso Brasileiro de Regulação, ABAR."],
          ["O REÚSO DE ÁGUAS E O DESAFIO DA EFETIVIDADE EM SUA REGULAMENTAÇÃO E MONITORAMENTO", "Artigo sobre os entraves técnicos e legais na criação de normas eficientes para o reaproveitamento da água.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109019695/O_RE%C3%9ASO_DE_%C3%81GUAS_E_O_DESAFIO_DA_EFETIVIDADE_EM_SUA_REGULAMENTA%C3%87%C3%83O_E_MONITORAMENTO", "Congresso Brasileiro de Regulação, ABAR."],
          ["METODOLOGIA DE GESTÃO DE RISCO PARA ANÁLISE DA SEGURANÇA HÍDRICA DE ZONAS URBANAS", "Proposta metodológica voltada a identificar, calcular e mitigar riscos de desabastecimento em áreas densamente povoadas.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109019855/METODOLOGIA_DE_GEST%C3%83O_DE_RISCO_PARA_AN%C3%81LISE_DA_SEGURAN%C3%87A_H%C3%8DDRICA_DE_ZONAS_URBANAS", "Congresso Brasileiro de Regulação, ABAR."],
          ["REVISÃO DE NORMA SOBRE PROCEDIMENTOS DE APLICAÇÃO DE PENALIDADES AOS USUÁRIOS...", "Estudo focado na atualização do processo administrativo de multas aplicadas diretamente aos consumidores finais (ex: fraudes).", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109020002/REVIS%C3%83O_DE_NORMA_SOBRE_PROCEDIMENTOS_DE_APLICA%C3%87%C3%83O_DE_PENALIDADES_AOS_USU%C3%81RIOS_DOS_SERVI%C3%87OS_DE_%C3%81GUA_E_ESGOTO", "AESabesp."],
          ["APLICAÇÃO COMPLETA DA METODOLOGIA ACERTAR NO DISTRITO FEDERAL", "Análise da implantação da padronização nacional (Metodologia ACERTAR) para auditoria de dados de saneamento no DF.", "Artigo", "Leandro Oliveira et al.", "01/01/2021", "https://www.academia.edu/109020114/APLICA%C3%87%C3%83O_COMPLETA_DA_METODOLOGIA_ACERTAR_NO_DISTRITO_FEDERAL", "Congresso Brasileiro de Regulação."],
          ["APLICAÇÃO DE METODOLOGIA DE GESTÃO DE RISCO PARA ANÁLISE DA SEGURANÇA HÍDRICA...", "Estudo de caso acadêmico testando na prática um modelo de gestão para evitar ou lidar com a falta d'água.", "Artigo", "Leandro Oliveira et al.", "01/01/2020", "https://www.academia.edu/109016547/APLICA%C3%87%C3%83O_DE_METODOLOGIA_DE_GEST%C3%83O_DE_RISCO_PARA_AN%C3%81LISE_DA_SEGURAN%C3%87A_H%C3%8DDRICA_DE_ZONAS_URBANAS_O_CASO_DE_BRAZL%C3%82NDIA_DF", "Congresso Brasileiro de Regulação."],
          ["PERSPECTIVAS DA IMPLEMENTAÇÃO DA COBRANÇA PELO USO DOS RECURSOS HÍDRICOS NO DF", "Avaliação econômica e regulatória sobre a viabilidade e os impactos de se cobrar pela captação de água bruta no Distrito Federal.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020259/PERSPECTIVAS_DA_IMPLEMENTA%C3%87%C3%83O_DA_COBRAN%C3%87A_PELO_USO_DOS_RECURSOS_H%C3%8DDRICOS_NO_DISTRITO_FEDERAL", "Simpósio Brasileiro de Recursos Hídricos."],
          ["REGULAMENTAÇÃO DO REÚSO DE ÁGUAS CINZAS E APROVEITAMENTO DE ÁGUAS PLUVIAIS...", "Documento técnico/normativo contendo as exigências para captar chuvas e reaproveitar águas de chuveiro/pias de forma segura.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/40255809/REGULAMENTA%C3%87%C3%83O_DO_RE%C3%9ASO_DE_%C3%81GUAS_CINZAS_E_APROVEITAMENTO_DE_%C3%81GUAS_PLUVIAIS_EM_EDIFICA%C3%87%C3%95ES_RESIDENCIAIS_A_EXPERI%C3%8ANCIA_DO_DF", "Regulamentação do Reúso de Águas Cinzas..."],
          ["FISCALIZAÇÃO INDIRETA DA PRESTAÇÃO DOS SERVIÇOS DE ABASTECIMENTO DE ÁGUA E ESGOTO NO DF", "Estudo focado nas metodologias de acompanhamento das concessionárias sem necessidade de vistorias de campo (via indicadores).", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/40255787/FISCALIZA%C3%87%C3%83O_INDIRETA_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_DE_ABASTECIMENTO_DE_%C3%81GUA_E_ESGOTO_NO_DISTRITO_FEDERAL", "Congresso de Regulação, ABAR."],
          ["AUDITORIA E CERTIFICAÇÃO DE INFORMAÇÕES: ESTUDO PILOTO (PROJETO ACERTAR)", "Relatório da fase inicial de testes do Projeto ACERTAR para garantir a confiabilidade das informações reportadas pelas concessionárias.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020410/AUDITORIA_E_CERTIFICA%C3%87%C3%83O_DE_INFORMA%C3%87%C3%95ES_ESTUDO_PILOTO_DE_APLICA%C3%87%C3%83O_DA_METODOLOGIA_DO_PROJETO_ACERTAR", "Congresso Brasileiro de Regulação, ABAR."],
          ["AVALIAÇÃO DA SATISFAÇÃO DOS USUÁRIOS DOS SERVIÇOS DE ÁGUA E ESGOTO NO DF...", "Resultados ou metodologia de pesquisas de percepção aplicadas para medir a qualidade do serviço na visão do consumidor.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020655/AVALIA%C3%87%C3%83O_DA_SATISFA%C3%87%C3%83O_DOS_USU%C3%81RIOS_DOS_SERVI%C3%87OS_DE_%C3%81GUA_E_ESGOTO_NO_DISTRITO_FEDERAL_%C3%80_LUZ_DE_UMA_FISCALIZA%C3%87%C3%83O_ESTRAT%C3%89GICA", "Congresso Brasileiro de Regulação, ABAR."],
          ["MECANISMOS ADOTADOS PELO DISTRITO FEDERAL NO COMBATE À CRISE HÍDRICA", "Retrospectiva analítica das políticas públicas, contingenciamentos e medidas de gestão tomadas historicamente em épocas de estiagem grave.", "Artigo", "Leandro Oliveira et al.", "01/01/2018", "https://www.academia.edu/109020698/MECANISMOS_ADOTADOS_PELO_DISTRITO_FEDERAL_NO_COMBATE_%C3%80_CRISE_%C3%8DDRICA", "XXXVI Congreso Interamericano de Ingeniería Sanitária."],
          ["MONITORAMENTO DA PRESTAÇÃO DOS SERVIÇOS PÚBLICOS DE ÁGUA E ESGOTO", "Material acadêmico que descreve as práticas, os indicadores e os desafios do controle contínuo exercido sobre as prestadoras do serviço.", "Artigo", "Leandro Oliveira et al.", "01/01/2018", "https://www.academia.edu/109021429/MONITORAMENTO_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_P%C3%9ABLICOS_DE_%C3%81GUA_E_ESGOTO", "Livro: Gestão da Crise Hídrica."],
          ["MEDIÇÃO INDIVIDUALIZADA EM EDIFICAÇÕES NO DF: ANÁLISE DO POTENCIAL DE REDUÇÃO...", "Investigação empírica quantificando a economia de água gerada após a instalação de hidrômetros separados por unidade em condomínios.", "Artigo", "Leandro Oliveira et al.", "01/01/2017", "https://www.academia.edu/109021262/MEDI%C3%87%C3%83O_INDIVIDUALIZADA_EM_EDIFICA%C3%87%C3%95ES_NO_DISTRITO_FEDERAL_UMA_AN%C3%81LISE_DO_POTENCIAL_DE_REDU%C3%87%C3%83O_NO_CONSUMO_DE_%C3%81GUA", "SILUBESA."],
          ["MANUAL DE AVALIAÇÃO DE DESEMPENHO DA PRESTAÇÃO DOS SERVIÇOS DE ABASTECIMENTO...", "Guia estruturado de métricas, critérios técnicos e fórmulas operacionais para julgar a eficiência das concessionárias de saneamento.", "Artigo", "Leandro Oliveira et al.", "01/01/2015", "https://www.academia.edu/109020818/MANUAL_DE_AVALIA%C3%87%C3%83O_DE_DESEMPENHO_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_DE_ABASTECIMENTO_DE_%C3%81GUA_E_ESGOTAMENTO_SANIT%C3%81RIO_DO_DISTRITO_FEDERAL", "Congresso Brasileiro de Regulação."]
        ];

        for (const row of pubSeedRows) {
          await client.query(
            "INSERT INTO pu_publications (titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            row
          );
        }
        console.log("Seeding pu_publications completed successfully!");
      }

      // Ensure pl_radar_activities table exists (prefix pl_)
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_radar_activities (
          id SERIAL PRIMARY KEY,
          titulo TEXT NOT NULL,
          descricao TEXT,
          area_tematica VARCHAR(255),
          assunto VARCHAR(255),
          resultado_esperado TEXT,
          prioridade VARCHAR(100),
          justificativa TEXT,
          status VARCHAR(100),
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      const radarCheck = await client.query("SELECT COUNT(*) FROM pl_radar_activities");
      if (parseInt(radarCheck.rows[0].count) === 0) {
        console.log("Seeding pl_radar_activities table with initial 14 items...");
        const radarSeedRows = [
          [
            "Revisão da Resolução n. 14/2011 - Critérios adicionais a norma de referência da ANA",
            "Revisão da norma de condições gerais do serviço levantadas pela prestadora, que não estão relacionadas a norma de referência da ANA e que necessitam de estudos adicionais aos já realizados no momento.",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Melhoria da prestação dos serviços de água e de esgoto aos usuários",
            "Alta (1 a 2 anos)",
            "",
            "Selecionado",
            "OK"
          ],
          [
            "Revisão dos Decretos de Instalações Prediais de Água e de Esgoto",
            "Modernização das Normas de Instalações Prediais de Água e Esgoto (Substituição dos Decretos nº 5.555/1980 e 5.631/1980)",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Modernização do arcabouço regulatório",
            "Alta (1 a 2 anos)",
            "",
            "Selecionado",
            "Ok"
          ],
          [
            "Estudo de Projeção Populacional e Consumo de Água Tratada por Região Administrativa",
            "Estudo de projeção da população do DF por região administrativa e estudo do consumo de água per capita por RA, visando atualizar as projeções do balanço hídrico dos sistemas de abastecimento de água e de esgoto.",
            "Regulação (CORA)",
            "Balanço Hídrico dos Sistemas de Abastecimento de Água e de Esgoto",
            "Atualização das projeções do balanço hídrico dos sistemas",
            "Alta (1 a 2 anos)",
            "Atualmente as projeções populacionais e de consumo de água do balanço hídrico estão desatualizadas o que reflete diretamente na demanda dos sistemas e nas necessidades de investimentos, afetando diretamente a segurança hídrica",
            "Elegível",
            ""
          ],
          [
            "Projeto de Resolução em Adequação a Norma de Referência de Reúso de Efluente de Esgoto Tratado e Reúso Agrícola (junto com SRH)",
            "Normativo para estabelecer diretrizes regulatórias para impulsionar e padronizar a utilização não potável de água proveniente de Estações de Tratamento de Esgoto (ETEs) no DF",
            "Regulação (CORA)",
            "Norma de referência da ANA",
            "Adoção da norma de referência",
            "Alta (1 a 2 anos)",
            "NR Prevista para 2º/2026",
            "Elegível",
            "OK"
          ],
          [
            "Projeto de Resolução em Adequação a Norma de Referência para Redução Progressiva e Controle de Perdas de Água",
            "A Norma de Referência nº 15/2025 estabelece as diretrizes para a gestão, o controle e a redução das perdas de água físicas e não físicas nos sistemas de distribuição de água potável. A norma padroniza a realização de diagnósticos com base no balanço hídrico e obriga os prestadores a elaborarem e executarem Planos de Gestão de Redução e Controle de Perdas.",
            "Regulação (CORA)",
            "Norma de referência da ANA",
            "Adoção da norma de referência",
            "Alta (1 a 2 anos)",
            "NR publicada: Resolução ANA nº 275, de 18 de dezembro de 2025 (Aprova a NR 015/2025)",
            "Elegível",
            "Ok"
          ],
          [
            "Projeto de Resolução para Adoção de Norma de Referência sobre Avaliação de Desempenho dos Serviços de Saneamento Básico",
            "Norma com conjunto harmonizado de indicadores de desempenho operacionais e de cobertura, estabelecendo critérios uniformes para que as ERIs e os titulares monitorem o cumprimento das metas contratuais e do Novo Marco Legal do Saneamento.",
            "Regulação (CORA)",
            "Norma de referência da ANA",
            "Adoção da norma de referência",
            "Média (3 a 4 anos)",
            "NR Prevista para 2º/2028",
            "Elegível",
            "Ok"
          ],
          [
            "Revisão da Resolução n. 13/2021 - Manual do PDI",
            "Revisão do resolução que Institui o Manual de Elaboração e Avaliação dos Projetos do Programa de Pesquisa, Desenvolvimento e Inovação – Programa PDI visando melhorias nos procedimentos e atividades do programa com foco em dar mais participação à Adasa na seleção dos projetos",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Melhoria na gestão dos projetos do programa de PDI Adasa/Caesb",
            "Média (3 a 4 anos)",
            "",
            "Elegível",
            "Ok"
          ],
          [
            "Conjuntura do Abastecimento de Água e do Esgotamento Sanitário no DF",
            "Documento informativo destinado à população do Distrito Federal, elaborado para explicar de forma clara e transparente o percurso da água até as residências e o destino do esgoto tratado. A publicação apresenta as etapas de captação, tratamento e distribuição da água, bem como a coleta e o tratamento do esgoto, incluindo informações sobre a infraestrutura existente, cobertura dos serviços, expansão das redes, redução de perdas e investimentos voltados à segurança hídrica e sanitária do DF.",
            "Regulação (CORA)",
            "Informações sobre os Sistemas de Abastecimento de Água e Esgoto",
            "Informar a população sobre o caminho que a água percorre até as torneiras e o destino final do esgoto tratado",
            "Média (3 a 4 anos)",
            "",
            "Arquivado",
            ""
          ],
          [
            "Estudos de Caso de Sistemas Prediais Não Potáveis com Monitoramento e Balanço Hídrico",
            "Estudo técnico de edificações premiadas pelo Prêmio Guardião da Água para avaliar a eficiência, a viabilidade econômica e os benefícios socioambientais do reuso de água no Distrito Federal. O trabalho inclui o monitoramento do consumo de água potável e não potável, a elaboração de balanços hídricos prediais e a mensuração da redução da demanda por água da rede pública e da economia financeira gerada, produzindo indicadores que apoiarão o aprimoramento da regulação e o incentivo a soluções sustentáveis pela ADASA.",
            "Regulação (CORA)",
            "Sistemas prediais não potáveis",
            "Mensuração da economia de água e a eficiência técnica de sistemas não potáveis premiados no DF para subsidiar o aprimoramento do arcabouço regulatório da ADASA estimular a adoção dessas práticas por outras entidades.",
            "Média (3 a 4 anos)",
            "",
            "Elegível",
            ""
          ],
          [
            "Guia Informativo das Normas Técnicas do Serviço de Abastecimento de Água e de Esgoto",
            "Diagramação e impressão dos informativos elaborados pela CORA e COQA sobre as normas regulatórias dos serviços de água e de esgoto: Informativo sobre a Resolução n. 14/2011 - Condições gerais; Informativo Resolução 15/2011-Hidrometração Individualizada; Informativo sobre Sistemas prediais de água não potável; Informativo sobre o Prêmio Guardião da Água 2026; Informativo sobre a Resolução n. 13/2021 - PDI; Informativo sobre Resolução de Soluções Alternativas; Informativo sobre a Resolução de Indicadores de Desempenho; Informativo sobre a Resolução n. 003/2012 - Recursos de Revisão.",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Informa a população de forma clara e didática sobre o conteúdo das principais normas técnicas elaboradas para os serviços de água e de esgoto.",
            "Baixa (mais de 5 anos)",
            "",
            "Elegível",
            ""
          ],
          [
            "Projeto de Resolução que trata de Grandes Usuários no Distrito Federal, sua definição, a celebração e a fiscalização de Programas Comerciais e de contratos específicos de abastecimento de água e esgotamento sanitário para Grandes Usuários.",
            "O projeto normativo do Distrito Federal visa regulamentar a prestação dos serviços de água e esgotamento sanitário prestados pela Caesb aos clientes de elevado consumo, definindo critérios técnicos para seu enquadramento, diretrizes para a celebração de contratos com condições e tarifas diferenciadas (como garantias de demanda), e mecanismos de fiscalização sobre a qualidade da medição e do efluente lançado na rede pública. Essa categoria de Grandes Usuários abrange empreendimentos de grande porte do DF, como indústrias e polos fabris, shopping centers e grandes centros comerciais, redes hoteleiras, condomínios empresariais e residenciais de grande porte, hospitais e órgãos públicos de alta demanda hídrica.",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Regulamentação das diretrizes e contratos específicos para clientes de grande porte no DF",
            "Baixa (mais de 5 anos)",
            "",
            "Elegível",
            ""
          ],
          [
            "Metodologia de Fiscalização de Riscos em Segurança de Barragens para Abastecimento Humano",
            "Elaborar um estudo técnico regulatório para o estabelecimento de diretrizes de monitoramento preventivo de segurança de barragens de saneamento, com critérios de amostragem de auscultação e protocolos de atuação regulatória conjunta com a Defesa Civil e o prestador de serviço em cenários de secas extremas ou eventos de cheia.",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Diretrizes e protocolos de monitoramento preventivo de segurança de barragens",
            "Baixa (mais de 5 anos)",
            "A fiscalização da segurança de barragens pelo ente regulador é tema recorrente e crítico no setor elétrico e hídrico (como discutido nos anais de 2015, 2019 e 2023). As Agências Reguladoras têm evoluído de uma fiscalização meramente visual/documental para a exigência de delimitação de faixas de atenção/alerta com base na leitura de equipamentos de auscultação (piezômetros, medidores de vazão) e análises de estabilidade hídrica em episódios de extremos climáticos.",
            "Elegível",
            ""
          ],
          [
            "Padrões de Fiscalização com Uso de Tecnologias de Inspeção Não Destrutiva e Mapeamento Georreferenciado para Redução de Perdas Reais",
            "Estudo técnico para estruturação de diretrizes de fiscalização indireta e direta de perdas reais de água utilizando geotecnologias e instrumentação contínua de rede, definindo metas regulatórias auditáveis por Distrito de Medição e Controle (DMC).",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Estruturação de diretrizes e metas de fiscalização de perdas reais com geotecnologia",
            "Baixa (mais de 5 anos)",
            "Contexto dos Anais da ABAR: Nos congressos de 2019, 2021 e 2023, diversos trabalhos (Ares-PCJ, Arsae-MG, Agems) abordaram o uso de inteligência artificial, Business Intelligence (BI), drones e geotecnologias aplicadas ao controle de vazamentos ocultos e fiscalização de redes e extravasamentos de esgoto. Lacuna na Adasa: A fiscalização de perdas físicas/reais da Adasa apoia-se fortemente em indicadores do SNIS/SINISA e vistorias amostraria locais. Falta a padronização regulatória sobre como o prestador deve comprovar o uso sistemático de varredura acústica, hastes de escuta, pitometria contínua e geofones em Zonas de Medição e Controle (ZMC).",
            "Selecionado",
            ""
          ],
          [
            "Padrões de Reúso de Água e Gestão Regulatória dos Lodos de Estações de Tratamento de Esgoto (ETEs) do DF",
            "Proposta de Estudo: Estudo regulatório sobre a caracterização, rotas tecnológicas de higienização e aproveitamento energético/agrícola dos resíduos do tratamento de esgoto (lodo e biogás) no DF, estabelecendo indicadores operacionais de conformidade e rastreabilidade para o prestador do serviço.",
            "Regulação (CORA)",
            "Normas regulatórias de água e de esgoto",
            "Estudo regulatório de higienização e aproveitamento de lodos e subprodutos de ETEs",
            "Baixa (mais de 5 anos)",
            "Contexto dos Anais da ABAR: O aproveitamento de subprodutos do saneamento (biogás, biometano e aplicação agrícola/energética do lodo de ETEs) foi um dos tópicos de destaque nos anais de 2019, 2021 e 2023. Lacuna na Adasa: A regulamentação técnica e a fiscalização sobre a qualidade, estabilização, transporte, disposição final e higienização do lodo produzido nas grandes ETEs do Distrito Federal (como ETE Brasília Sul e ETE Brasília Norte) necessitam de acompanhamento sistemático sob o aspecto regulatório-operacional.",
            "Selecionado",
            ""
          ]
        ];

        for (const row of radarSeedRows) {
          await client.query(
            "INSERT INTO pl_radar_activities (titulo, descricao, area_tematica, assunto, resultado_esperado, prioridade, justificativa, status, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            row
          );
        }
        console.log("Seeding pl_radar_activities completed successfully!");
      }

      await client.query("COMMIT");
      console.log("Database tables verified successfully on server start!");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erro detalhado na migração:", err);
    console.warn("Aviso: Não foi possível verificar/migrar o esquema de banco de dados na inicialização (Verifique a configuração da variável DATABASE_URL). Continuando em modo offline/local.");
  }
}

export async function startServer(isVercel = false) {
  try {
    await runStartupMigration();
  } catch (err) {
    console.error("Erro na migração no Vercel:", err);
  }

  const PORT = 3000;

  // For parsing application/json. Increase limit for large GeoJSONs
  app.use(express.json({ limit: "50mb" }));

  const publicPath = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicPath)) {
    try {
      fs.mkdirSync(publicPath);
    } catch (e) {
      console.error(e);
    }
  }

  // Serve static assets from public folder directly (including /brand and /uploads)
  app.use(express.static(publicPath));
  const brandDir = path.join(publicPath, "brand");
  if (fs.existsSync(brandDir)) {
    app.use("/brand", express.static(brandDir));
  }

  // Setup multer for image uploads
  const uploadsDir = path.join(publicPath, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
      console.error(e);
    }
  }
  app.use("/uploads", express.static(uploadsDir));
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + '-' + file.originalname)
    }
  });
  const upload = multer({ storage: storage });

  app.post("/api/upload", upload.array("images", 10), (req, res) => {
    try {
      if (!req.files || (req.files as any[]).length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });
      }
      const files = req.files as Express.Multer.File[];
      const urls = files.map(f => "/uploads/" + f.filename);
      res.json({ success: true, urls });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: "Erro no upload" });
    }
  });

  // API to save GeoJSON
  app.post("/api/save-geojson", async (req, res) => {
    try {
      const waterBalanceId = parseSafeInt(req.query.waterBalanceId as string);
      if (waterBalanceId === null) {
        return res.status(400).json({ error: "waterBalanceId is required and must be convertible to a number" });
      }
      
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query(
          "INSERT INTO wb_water_balance_maps (water_balance_id, geojson_data) VALUES ($1, $2) ON CONFLICT (water_balance_id) DO UPDATE SET geojson_data = EXCLUDED.geojson_data",
          [waterBalanceId, JSON.stringify(req.body)]
        );
        res.json({ success: true });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save geojson" });
    }
  });

  // API to save template files
  app.post("/api/save-templates", async (req, res) => {
    try {
      const { templateFiles } = req.body;
      if (!Array.isArray(templateFiles)) {
         return res.status(400).json({ success: false, error: "templateFiles must be an array" });
      }
      
      const pool = getDbPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        
        await client.query("TRUNCATE TABLE wb_template_files CASCADE");

        // Sanitize the IDs dynamically so that anything that is not an integer is converted/reassimilated to not crash Postgres serial constraint (<= 2147483647)
        let currentMaxId = 0;
        const sanitizedFiles = templateFiles.map((tf: any) => {
          let parsedId = parseInt(String(tf.id), 10);
          if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
            const digitsOnly = String(tf.id).replace(/\D/g, "");
            parsedId = parseInt(digitsOnly, 10);
            if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
              parsedId = 0; // will be resolved sequentially
            }
          }
          return { ...tf, id: parsedId };
        });

        for (const tf of sanitizedFiles) {
          if (tf.id > currentMaxId) {
            currentMaxId = tf.id;
          }
        }
        for (const tf of sanitizedFiles) {
          if (tf.id === 0) {
            currentMaxId = currentMaxId + 1;
            tf.id = currentMaxId;
          }
        }

        for (const tf of sanitizedFiles) {
          await client.query(
            "INSERT INTO wb_template_files (id, name, description, url) VALUES ($1, $2, $3, $4)",
            [tf.id, tf.name, tf.description, tf.url]
          );
        }

        // Adjust the Postgres sequences for the template_files table to ensure any next INSERT works seamlessly
        await client.query(
          "SELECT setval(pg_get_serial_sequence('wb_template_files', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_template_files"
        );

        await client.query("COMMIT");
        res.json({ success: true, message: "Modelos salvos com sucesso!" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao salvar arquivos modelo:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API to load GeoJSON
  app.get("/api/load-geojson", async (req, res) => {
    try {
      const waterBalanceId = parseSafeInt(req.query.waterBalanceId as string);
      if (waterBalanceId === null) {
        return res.status(400).json({ error: "waterBalanceId is required and must be convertible to a number" });
      }

      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT geojson_data FROM wb_water_balance_maps WHERE water_balance_id = $1",
          [waterBalanceId]
        );
        if (result.rows.length > 0 && result.rows[0].geojson_data) {
          res.json(result.rows[0].geojson_data);
        } else {
          res.status(404).json({ error: "No saved geojson found for this water balance" });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to load geojson" });
    }
  });

  // API to test Database connection
  app.get("/api/db-status", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT NOW() as current_time, current_database() as database, version() as version");
        res.json({ success: true, message: "Conectado com sucesso ao PostgreSQL!", data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao conectar no banco:", error);
      res.status(500).json({ success: false, error: error.message || "Falha na conexão com o banco de dados." });
    }
  });

  app.get("/api/load-data", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const dbWaterBalances = await client.query("SELECT * FROM wb_water_balances");
        const dbSystems = await client.query("SELECT * FROM wb_systems");
        const dbRegions = await client.query("SELECT * FROM wb_regions");
        const dbDemands = await client.query("SELECT * FROM wb_demands");
        const dbDemandEntries = await client.query("SELECT * FROM wb_demand_entries");
        const dbSupplySources = await client.query("SELECT * FROM wb_supply_sources");
        const dbOperationalAdjustments = await client.query("SELECT * FROM wb_operational_adjustments");
        const dbTemplateFiles = await client.query("SELECT * FROM wb_template_files");
        const dbRiskReferences = await client.query("SELECT * FROM wb_risk_references ORDER BY id ASC");
        const dbTasks = await client.query("SELECT * FROM pl_tasks ORDER BY id ASC");
        const dbPlans = await client.query("SELECT * FROM pl_plans ORDER BY id ASC");
        const dbAreas = await client.query("SELECT * FROM pl_areas ORDER BY id ASC");
        const dbResponsibles = await client.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
        const dbResponsibleAreas = await client.query("SELECT * FROM pl_responsible_areas");
        const dbTaskAreas = await client.query("SELECT * FROM pl_task_areas");
        const dbTaskResponsibles = await client.query("SELECT * FROM pl_task_responsibles");
        const dbTaskCategories = await client.query("SELECT * FROM pl_task_categories");
        const dbCategories = await client.query("SELECT * FROM pl_categories ORDER BY id ASC");
        const dbCategoryAreas = await client.query("SELECT * FROM pl_category_areas ORDER BY order_index ASC, category_id ASC");

        const categoryAreasMap: Record<number, number[]> = {};
        const areaCategoriesMap: Record<number, number[]> = {};
        dbCategoryAreas.rows.forEach(r => {
          const cid = Number(r.category_id);
          const aid = Number(r.area_id);
          if (!categoryAreasMap[cid]) categoryAreasMap[cid] = [];
          categoryAreasMap[cid].push(aid);
          if (!areaCategoriesMap[aid]) areaCategoriesMap[aid] = [];
          areaCategoriesMap[aid].push(cid);
        });

        const responsibleAreasMap: Record<number, number[]> = {};
        dbResponsibleAreas.rows.forEach(r => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });

        const taskAreasMap: Record<number, number[]> = {};
        dbTaskAreas.rows.forEach(r => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });

        const taskResponsiblesMap: Record<number, number[]> = {};
        dbTaskResponsibles.rows.forEach(r => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });

        const taskCategoriesMap: Record<number, number[]> = {};
        dbTaskCategories.rows.forEach(r => {
          const tid = Number(r.task_id);
          const cid = Number(r.category_id);
          if (!taskCategoriesMap[tid]) taskCategoriesMap[tid] = [];
          taskCategoriesMap[tid].push(cid);
        });

        const mapEntriesToDemand = (demandId: number) => 
          dbDemandEntries.rows
            .filter(e => Number(e.demand_id) === demandId)
            .map(e => ({
              regionId: Number(e.region_id),
              year: e.year,
              population: Number(e.population),
              coverage: Number(e.coverage),
              perCapitaConsumption: Number(e.per_capita_consumption),
              losses: Number(e.losses)
            }));

        const demands = dbDemands.rows.map(s => ({
          id: Number(s.id),
          name: s.name,
          description: s.description,
          waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null,
          modifiers: {
            population: Number(s.modifiers_population),
            coverage: s.modifiers_coverage !== null && s.modifiers_coverage !== undefined ? Number(s.modifiers_coverage) : null,
            perCapitaConsumption: Number(s.modifiers_per_capita),
            losses: s.modifiers_losses !== null && s.modifiers_losses !== undefined ? Number(s.modifiers_losses) : null
          },
          entries: mapEntriesToDemand(Number(s.id))
        }));

        const payload = {
          waterBalances: dbWaterBalances.rows.map(wb => ({
            id: Number(wb.id),
            description: wb.description,
            responsible: wb.responsible,
            deliveryDate: wb.delivery_date,
            receivedBy: wb.received_by,
            receiptDate: wb.receipt_date,
            status: wb.status
          })),
          systems: dbSystems.rows.map(s => ({
            id: Number(s.id),
            code: s.code,
            name: s.name,
            waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null
          })),
          regions: dbRegions.rows.map(r => ({
            id: Number(r.id),
            code: r.code,
            name: r.name,
            systemId: Number(r.system_id),
            description: r.description,
            waterBalanceId: r.water_balance_id ? Number(r.water_balance_id) : null
          })),
          demands: demands,
          supplySources: dbSupplySources.rows.map(s => ({
            id: Number(s.id),
            code: s.code,
            systemId: Number(s.system_id),
            name: s.name,
            type: s.type,
            grantedFlow: Number(s.granted_flow),
            operationalFlow: Number(s.operational_flow),
            unavailableFlow: Number(s.unavailable_flow),
            unavailabilityReason: s.unavailability_reason,
            waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null
          })),
          operationalAdjustments: dbOperationalAdjustments.rows.map(o => ({
            id: Number(o.id),
            systemId: Number(o.system_id),
            type: o.type,
            description: o.description,
            startYear: o.start_year,
            endYear: o.end_year,
            flowValue: Number(o.flow_value),
            waterBalanceId: o.water_balance_id ? Number(o.water_balance_id) : null,
            linkedAdjustmentId: o.linked_adjustment_id ? Number(o.linked_adjustment_id) : null
          })),
          templateFiles: dbTemplateFiles.rows.map(t => ({
            id: Number(t.id),
            name: t.name,
            description: t.description,
            url: t.url
          })),
          riskReferences: dbRiskReferences.rows.map(r => ({
            id: Number(r.id),
            iad: r.iad,
            riskClassification: r.risk_classification,
            justification: r.justification
          })),
          plans: dbPlans.rows.map(p => ({
            id: Number(p.id),
            name: p.name || p.title || "Plano Sem Nome",
            title: p.title || p.name || "Plano Sem Nome",
            description: p.description,
            isActive: p.is_active || false,
            createdAt: p.created_at,
            createdBy: p.created_by,
            updatedAt: p.updated_at,
            updatedBy: p.updated_by
          })),
          areas: dbAreas.rows.map(a => ({
            id: Number(a.id),
            name: a.name,
            abbreviation: a.abbreviation,
            categoryIds: areaCategoriesMap[Number(a.id)] || [],
            planId: null
          })),
          responsibles: dbResponsibles.rows.map(r => ({
            id: Number(r.id),
            name: r.name,
            email: r.email,
            role: r.role,
            areaIds: responsibleAreasMap[Number(r.id)] || [],
            userId: r.user_id ? Number(r.user_id) : null
          })),
          categories: dbCategories.rows.map(c => ({
            id: Number(c.id),
            name: c.name,
            areaIds: categoryAreasMap[Number(c.id)] || [],
            createdAt: c.created_at,
            createdBy: c.created_by,
            updatedAt: c.updated_at,
            updatedBy: c.updated_by
          })),
          tasks: dbTasks.rows.map(t => ({
            id: Number(t.id),
            title: t.title,
            description: t.description,
            startDate: t.start_date,
            endDate: t.end_date,
            status: t.status,
            parentId: t.parent_id ? Number(t.parent_id) : null,
            progress: Number(t.progress) || 0,
            priority: t.priority,
            category: t.category,
            assignedTo: t.assigned_to,
            createdBy: t.created_by,
            notes: t.notes,
            checklist: t.checklist,
            planId: t.plan_id ? Number(t.plan_id) : null,
            dependsOnTaskId: t.depends_on_task_id ? Number(t.depends_on_task_id) : null,
            updatedAt: t.updated_at,
            updatedBy: t.updated_by,
            weight: t.weight !== undefined && t.weight !== null ? Number(t.weight) : 1,
            type: t.type === 'recurso' ? 'demanda_ouvidoria' : t.type,
            fiscalizacaoData: t.fiscalizacao_data, ouvidoriaData: t.ouvidoria_data, recursoData: t.ouvidoria_data, recursoRevData: t.recurso_rev_data,
            areaIds: taskAreasMap[Number(t.id)] || [],
            responsibleIds: taskResponsiblesMap[Number(t.id)] || [],
            categoryIds: taskCategoriesMap[Number(t.id)] || []
          }))
        };

        res.json({ success: true, data: payload });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.warn("Aviso ao carregar dados do banco:", error?.message || error);
      res.status(200).json({
        success: true,
        data: {
          waterBalances: [],
          systems: [],
          regions: [],
          demands: [],
          supplySources: [],
          operationalAdjustments: [],
          templateFiles: [],
          riskReferences: [],
          plans: [],
          areas: [],
          responsibles: [],
          categories: [],
          tasks: []
        },
        warning: error?.message || "Modo offline"
      });
    }
  });

  app.post("/api/save-data", async (req, res) => {
    try {
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ success: false, error: "Empty payload. Aborting save to prevent data loss." });
      }
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        await client.query("TRUNCATE TABLE wb_demand_entries, wb_operational_adjustments, wb_supply_sources, wb_demands, wb_regions, wb_systems, wb_water_balances CASCADE");

        const { waterBalances, systems, regions, demands, supplySources, operationalAdjustments } = data;

        if (waterBalances && waterBalances.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const wb of waterBalances) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6})`);
            values.push(
              parseSafeInt(wb.id),
              wb.description,
              wb.responsible,
              wb.deliveryDate ? new Date(wb.deliveryDate) : null,
              wb.receivedBy,
              wb.receiptDate ? new Date(wb.receiptDate) : null,
              wb.status
            );
            paramIndex += 7;
          }
          await client.query(
            `INSERT INTO wb_water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               description = EXCLUDED.description,
               responsible = EXCLUDED.responsible,
               delivery_date = EXCLUDED.delivery_date,
               received_by = EXCLUDED.received_by,
               receipt_date = EXCLUDED.receipt_date,
               status = EXCLUDED.status`,
            values
          );
        }

        if (systems && systems.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const sys of systems) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3})`);
            values.push(
              parseSafeInt(sys.id),
              sys.code || null,
              sys.name,
              parseSafeInt(sys.waterBalanceId)
            );
            paramIndex += 4;
          }
          await client.query(
            `INSERT INTO wb_systems (id, code, name, water_balance_id)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               code = EXCLUDED.code,
               name = EXCLUDED.name,
               water_balance_id = EXCLUDED.water_balance_id`,
            values
          );
        }

        if (regions && regions.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const reg of regions) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5})`);
            values.push(
              parseSafeInt(reg.id),
              reg.code || null,
              reg.name,
              parseSafeInt(reg.systemId),
              reg.description || null,
              parseSafeInt(reg.waterBalanceId)
            );
            paramIndex += 6;
          }
          await client.query(
            `INSERT INTO wb_regions (id, code, name, system_id, description, water_balance_id)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               code = EXCLUDED.code,
               name = EXCLUDED.name,
               system_id = EXCLUDED.system_id,
               description = EXCLUDED.description,
               water_balance_id = EXCLUDED.water_balance_id`,
            values
          );
        }

        if (demands && demands.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const sc of demands) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
            values.push(
              parseSafeInt(sc.id),
              sc.name,
              sc.description || null,
              parseSafeFloat(sc.modifiers?.population),
              parseSafeFloatOrNull(sc.modifiers?.coverage),
              parseSafeFloat(sc.modifiers?.perCapitaConsumption),
              parseSafeFloatOrNull(sc.modifiers?.losses),
              parseSafeInt(sc.waterBalanceId)
            );
            paramIndex += 8;
          }
          await client.query(
            `INSERT INTO wb_demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               modifiers_population = EXCLUDED.modifiers_population,
               modifiers_coverage = EXCLUDED.modifiers_coverage,
               modifiers_per_capita = EXCLUDED.modifiers_per_capita,
               modifiers_losses = EXCLUDED.modifiers_losses,
               water_balance_id = EXCLUDED.water_balance_id`,
            values
          );
        }

        const allEntries: any[] = [];
        if (demands) {
          for (const sc of demands) {
            if (sc.entries) {
              for (const entry of sc.entries) {
                allEntries.push({
                  scId: parseSafeInt(sc.id),
                  regionId: parseSafeInt(entry.regionId),
                  year: parseSafeInt(entry.year) || 2026,
                  population: parseSafeFloat(entry.population),
                  coverage: parseSafeFloat(entry.coverage),
                  perCapitaConsumption: parseSafeFloat(entry.perCapitaConsumption),
                  losses: parseSafeFloat(entry.losses)
                });
              }
            }
          }
        }
        if (allEntries.length > 0) {
          const chunkSize = 2000;
          for (let i = 0; i < allEntries.length; i += chunkSize) {
            const chunk = allEntries.slice(i, i + chunkSize);
            const chunkValues: any[] = [];
            const chunkParts: string[] = [];
            let deParamIndex = 1;
            for (const row of chunk) {
              chunkParts.push(`($${deParamIndex}::integer, $${deParamIndex+1}::integer, $${deParamIndex+2}::integer, $${deParamIndex+3}::numeric, $${deParamIndex+4}::numeric, $${deParamIndex+5}::numeric, $${deParamIndex+6}::numeric)`);
              chunkValues.push(row.scId, row.regionId, row.year, row.population, row.coverage, row.perCapitaConsumption, row.losses);
              deParamIndex += 7;
            }
            const query = `
              INSERT INTO wb_demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
              VALUES ${chunkParts.join(", ")}
              ON CONFLICT DO NOTHING
            `;
            await client.query(query, chunkValues);
          }
        }

        if (supplySources && supplySources.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const src of supplySources) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9})`);
            values.push(
              parseSafeInt(src.id),
              src.code || null,
              parseSafeInt(src.systemId),
              src.name,
              src.type,
              parseSafeFloat(src.grantedFlow),
              parseSafeFloat(src.operationalFlow),
              parseSafeFloat(src.unavailableFlow),
              src.unavailabilityReason || null,
              parseSafeInt(src.waterBalanceId)
            );
            paramIndex += 10;
          }
          await client.query(
            `INSERT INTO wb_supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               code = EXCLUDED.code,
               system_id = EXCLUDED.system_id,
               name = EXCLUDED.name,
               type = EXCLUDED.type,
               granted_flow = EXCLUDED.granted_flow,
               operational_flow = EXCLUDED.operational_flow,
               unavailable_flow = EXCLUDED.unavailable_flow,
               unavailability_reason = EXCLUDED.unavailability_reason,
               water_balance_id = EXCLUDED.water_balance_id`,
            values
          );
        }

        if (operationalAdjustments && Array.isArray(operationalAdjustments) && operationalAdjustments.length > 0) {
          const values: any[] = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const adj of operationalAdjustments) {
            queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, NULL)`);
            values.push(
              parseSafeInt(adj.id),
              parseSafeInt(adj.systemId),
              adj.type,
              adj.description,
              parseSafeInt(adj.startYear) || 2026,
              parseSafeInt(adj.endYear) || 2026,
              parseSafeFloat(adj.flowValue),
              parseSafeInt(adj.waterBalanceId)
            );
            paramIndex += 8;
          }
          await client.query(
            `INSERT INTO wb_operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               system_id = EXCLUDED.system_id,
               type = EXCLUDED.type,
               description = EXCLUDED.description,
               start_year = EXCLUDED.start_year,
               end_year = EXCLUDED.end_year,
               flow_value = EXCLUDED.flow_value,
               water_balance_id = EXCLUDED.water_balance_id`,
            values
          );

          for (const adj of operationalAdjustments) {
            if (adj.linkedAdjustmentId) {
              await client.query(
                `UPDATE wb_operational_adjustments SET linked_adjustment_id = $1 WHERE id = $2`,
                [parseSafeInt(adj.linkedAdjustmentId), parseSafeInt(adj.id)]
              );
            }
          }
        }

        // Synchronize sequences so Postgres automatic serialization works flawlessly
        await client.query("SELECT setval(pg_get_serial_sequence('wb_water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_water_balances");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_systems");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_regions");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_demands");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_supply_sources");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_operational_adjustments");

        await client.query("COMMIT");
        res.json({ success: true, message: "Dados salvos no PostgreSQL com sucesso!" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error && error.message === "A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING" });
      }
      console.error("Erro ao salvar dados:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/save-module", async (req, res) => {
    try {
      const { module, data } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        if (module === "water-balances") {
          const { waterBalances } = data;
          const keepIds = [];
          const wbValues: any[] = [];
          const wbParts = [];
          let wbParamIndex = 1;
          for (const wb of waterBalances) {
            const wbId = parseSafeInt(wb.id);
            if (wbId !== null) {
              keepIds.push(wbId);
              wbParts.push(`($${wbParamIndex}, $${wbParamIndex+1}, $${wbParamIndex+2}, $${wbParamIndex+3}, $${wbParamIndex+4}, $${wbParamIndex+5}, $${wbParamIndex+6})`);
              wbValues.push(
                wbId,
                wb.description,
                wb.responsible,
                wb.deliveryDate ? new Date(wb.deliveryDate) : null,
                wb.receivedBy,
                wb.receiptDate ? new Date(wb.receiptDate) : null,
                wb.status
              );
              wbParamIndex += 7;
            }
          }
          if (wbParts.length > 0) {
            await client.query(`
              INSERT INTO wb_water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
              VALUES ${wbParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                responsible = EXCLUDED.responsible,
                delivery_date = EXCLUDED.delivery_date,
                received_by = EXCLUDED.received_by,
                receipt_date = EXCLUDED.receipt_date,
                status = EXCLUDED.status
            `, wbValues);
          }
          if (keepIds.length > 0) {
            await client.query(`DELETE FROM wb_water_balances WHERE id NOT IN (${keepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, keepIds);
          } else {
            await client.query(`DELETE FROM wb_water_balances`);
          }
        }

        if (module === "systems") {
          const { systems = [], regions = [] } = data;
          
          const sysKeepIds = [];
          const sysValues: any[] = [];
          const sysParts = [];
          let sysParamIndex = 1;
          for (const sys of systems) {
            const sysId = parseSafeInt(sys.id);
            if (sysId !== null) {
              sysKeepIds.push(sysId);
              sysParts.push(`($${sysParamIndex}, $${sysParamIndex+1}, $${sysParamIndex+2}, $${sysParamIndex+3})`);
              sysValues.push(
                sysId,
                sys.code || null,
                sys.name,
                parseSafeInt(sys.waterBalanceId)
              );
              sysParamIndex += 4;
            }
          }
          if (sysParts.length > 0) {
            await client.query(`
              INSERT INTO wb_systems (id, code, name, water_balance_id)
              VALUES ${sysParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                water_balance_id = EXCLUDED.water_balance_id
            `, sysValues);
          }

          const regKeepIds = [];
          const regValues: any[] = [];
          const regParts = [];
          let regParamIndex = 1;
          for (const reg of regions) {
            const regId = parseSafeInt(reg.id);
            if (regId !== null) {
              regKeepIds.push(regId);
              regParts.push(`($${regParamIndex}, $${regParamIndex+1}, $${regParamIndex+2}, $${regParamIndex+3}, $${regParamIndex+4}, $${regParamIndex+5})`);
              regValues.push(
                regId,
                reg.code || null,
                reg.name,
                parseSafeInt(reg.systemId),
                reg.description || null,
                parseSafeInt(reg.waterBalanceId)
              );
              regParamIndex += 6;
            }
          }
          if (regParts.length > 0) {
            await client.query(`
              INSERT INTO wb_regions (id, code, name, system_id, description, water_balance_id)
              VALUES ${regParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                system_id = EXCLUDED.system_id,
                description = EXCLUDED.description,
                water_balance_id = EXCLUDED.water_balance_id
            `, regValues);
          }

          if (regKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_regions WHERE id NOT IN (${regKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, regKeepIds);
          } else {
            await client.query(`DELETE FROM wb_regions`);
          }
          
          if (sysKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_systems WHERE id NOT IN (${sysKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, sysKeepIds);
          } else {
            await client.query(`DELETE FROM wb_systems`);
          }
        }

        if (module === "demands") {
          const { demands = [] } = data;
          const scKeepIds: number[] = [];
          const demandValues: any[] = [];
          const demandParts: string[] = [];
          let dParamIndex = 1;
          
          for (const sc of demands) {
            const scId = parseSafeInt(sc.id);
            if (scId !== null) {
              scKeepIds.push(scId);
              demandParts.push(`($${dParamIndex}::integer, $${dParamIndex+1}::varchar, $${dParamIndex+2}::text, $${dParamIndex+3}::numeric, $${dParamIndex+4}::numeric, $${dParamIndex+5}::numeric, $${dParamIndex+6}::numeric, $${dParamIndex+7}::integer)`);
              demandValues.push(
                scId,
                sc.name,
                sc.description || null,
                parseSafeFloat(sc.modifiers?.population),
                parseSafeFloatOrNull(sc.modifiers?.coverage),
                parseSafeFloat(sc.modifiers?.perCapitaConsumption),
                parseSafeFloatOrNull(sc.modifiers?.losses),
                parseSafeInt(sc.waterBalanceId)
              );
              dParamIndex += 8;
            }
          }
          
          if (demandParts.length > 0) {
            await client.query(`
              INSERT INTO wb_demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
              VALUES ${demandParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                modifiers_population = EXCLUDED.modifiers_population,
                modifiers_coverage = EXCLUDED.modifiers_coverage,
                modifiers_per_capita = EXCLUDED.modifiers_per_capita,
                modifiers_losses = EXCLUDED.modifiers_losses,
                water_balance_id = EXCLUDED.water_balance_id
            `, demandValues);
          }

          if (scKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_demand_entries WHERE demand_id IN (${scKeepIds.join(", ")})`);
          }

          const allEntries: any[] = [];
          for (const sc of demands) {
            const scId = parseSafeInt(sc.id);
            if (scId !== null && sc.entries) {
              for (const entry of sc.entries) {
                allEntries.push({
                  scId,
                  regionId: parseSafeInt(entry.regionId),
                  year: parseSafeInt(entry.year) || 2026,
                  population: parseSafeFloat(entry.population),
                  coverage: parseSafeFloat(entry.coverage),
                  perCapitaConsumption: parseSafeFloat(entry.perCapitaConsumption),
                  losses: parseSafeFloat(entry.losses)
                });
              }
            }
          }

          if (allEntries.length > 0) {
            const chunkSize = 2000;
            for (let i = 0; i < allEntries.length; i += chunkSize) {
              const chunk = allEntries.slice(i, i + chunkSize);
              const chunkValues: any[] = [];
              const chunkParts: string[] = [];
              let eParamIndex = 1;
              for (const row of chunk) {
                chunkParts.push(`($${eParamIndex}::integer, $${eParamIndex+1}::integer, $${eParamIndex+2}::integer, $${eParamIndex+3}::numeric, $${eParamIndex+4}::numeric, $${eParamIndex+5}::numeric, $${eParamIndex+6}::numeric)`);
                chunkValues.push(row.scId, row.regionId, row.year, row.population, row.coverage, row.perCapitaConsumption, row.losses);
                eParamIndex += 7;
              }
              await client.query(`
                INSERT INTO wb_demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
                VALUES ${chunkParts.join(", ")}
                ON CONFLICT DO NOTHING
              `, chunkValues);
            }
          }

          if (scKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_demands WHERE id NOT IN (${scKeepIds.join(", ")})`);
          } else {
            await client.query(`DELETE FROM wb_demands`);
          }
        }

        if (module === "supply-sources") {
          const { supplySources = [], operationalAdjustments = [] } = data;
          
          const supKeepIds = [];
          const supValues: any[] = [];
          const supParts = [];
          let supParamIndex = 1;
          for (const src of supplySources) {
            const srcId = parseSafeInt(src.id);
            if (srcId !== null) {
              supKeepIds.push(srcId);
              supParts.push(`($${supParamIndex}, $${supParamIndex+1}, $${supParamIndex+2}, $${supParamIndex+3}, $${supParamIndex+4}, $${supParamIndex+5}, $${supParamIndex+6}, $${supParamIndex+7}, $${supParamIndex+8}, $${supParamIndex+9})`);
              supValues.push(
                srcId,
                src.code || null,
                parseSafeInt(src.systemId),
                src.name,
                src.type,
                parseSafeFloat(src.grantedFlow),
                parseSafeFloat(src.operationalFlow),
                parseSafeFloat(src.unavailableFlow),
                src.unavailabilityReason || null,
                parseSafeInt(src.waterBalanceId)
              );
              supParamIndex += 10;
            }
          }
          if (supParts.length > 0) {
            await client.query(`
              INSERT INTO wb_supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
              VALUES ${supParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                system_id = EXCLUDED.system_id,
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                granted_flow = EXCLUDED.granted_flow,
                operational_flow = EXCLUDED.operational_flow,
                unavailable_flow = EXCLUDED.unavailable_flow,
                unavailability_reason = EXCLUDED.unavailability_reason,
                water_balance_id = EXCLUDED.water_balance_id
            `, supValues);
          }
          if (supKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_supply_sources WHERE id NOT IN (${supKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, supKeepIds);
          } else {
            await client.query(`DELETE FROM wb_supply_sources`);
          }

          const adjKeepIds = [];
          const adjValues: any[] = [];
          const adjParts = [];
          let adjParamIndex = 1;
          for (const adj of operationalAdjustments) {
            const adjId = parseSafeInt(adj.id);
            if (adjId !== null) {
              adjKeepIds.push(adjId);
              adjParts.push(`($${adjParamIndex}, $${adjParamIndex+1}, $${adjParamIndex+2}, $${adjParamIndex+3}, $${adjParamIndex+4}, $${adjParamIndex+5}, $${adjParamIndex+6}, $${adjParamIndex+7}, NULL)`);
              adjValues.push(
                adjId,
                parseSafeInt(adj.systemId),
                adj.type,
                adj.description,
                parseSafeInt(adj.startYear) || 2026,
                parseSafeInt(adj.endYear) || 2026,
                parseSafeFloat(adj.flowValue),
                parseSafeInt(adj.waterBalanceId)
              );
              adjParamIndex += 8;
            }
          }

          if (adjParts.length > 0) {
            await client.query(`
              INSERT INTO wb_operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
              VALUES ${adjParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                system_id = EXCLUDED.system_id,
                type = EXCLUDED.type,
                description = EXCLUDED.description,
                start_year = EXCLUDED.start_year,
                end_year = EXCLUDED.end_year,
                flow_value = EXCLUDED.flow_value,
                water_balance_id = EXCLUDED.water_balance_id
            `, adjValues);
          }

          const linkUpdates = operationalAdjustments.filter((adj: any) => parseSafeInt(adj.id) !== null && adj.linkedAdjustmentId);
          if (linkUpdates.length > 0) {
            const linkParts = [];
            const linkValues: any[] = [];
            let linkIndex = 1;
            for (const adj of linkUpdates) {
              linkParts.push(`($${linkIndex}::integer, $${linkIndex+1}::integer)`);
              linkValues.push(parseSafeInt(adj.id), parseSafeInt(adj.linkedAdjustmentId));
              linkIndex += 2;
            }
            await client.query(`
              UPDATE wb_operational_adjustments as o 
              SET linked_adjustment_id = v.linked_id 
              FROM (VALUES ${linkParts.join(", ")}) as v(id, linked_id) 
              WHERE o.id = v.id
            `, linkValues);
          }

          if (adjKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_operational_adjustments WHERE id NOT IN (${adjKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, adjKeepIds);
          } else {
            await client.query(`DELETE FROM wb_operational_adjustments`);
          }
        }

        // Synchronize sequences so Postgres automatic serialization works flawlessly
        await client.query("SELECT setval(pg_get_serial_sequence('wb_water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_water_balances");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_systems");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_regions");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_demands");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_supply_sources");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_operational_adjustments");

        await client.query("COMMIT");
        res.json({ success: true, message: `Módulo ${module} salvo com sucesso.` });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao salvar módulo:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Diagnostic endpoint for plans
  app.get("/api/diagnostic/save-planos", async (req, res) => {
    try {
      console.log("[LOG] GET /api/diagnostic/save-planos diagnostics requested");
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const dbInfoRes = await client.query("SELECT version() as version, current_database() as database");
        const columnsRes = await client.query(`
          SELECT table_name, column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name IN ('pl_plans', 'pl_areas', 'pl_task_areas', 'pl_tasks')
          ORDER BY table_name, column_name;
        `);
        const fksRes = await client.query(`
          SELECT
              tc.table_name, 
              kcu.column_name, 
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name 
          FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
          AND tc.table_name IN ('pl_plans', 'pl_areas', 'pl_task_areas', 'pl_tasks');
        `);
        const plansCount = await client.query("SELECT COUNT(*) FROM pl_plans");
        const areasCount = await client.query("SELECT COUNT(*) FROM pl_areas");
        const taskAreasCount = await client.query("SELECT COUNT(*) FROM pl_task_areas");

        res.json({
          success: true,
          message: "Diagnostic analysis performed successfully for Plans module",
          dialect: "PostgreSQL (direct pool connections: pg)",
          database: dbInfoRes.rows[0],
          counts: {
            plans: parseInt(plansCount.rows[0].count, 10),
            areas: parseInt(areasCount.rows[0].count, 10),
            task_areas: parseInt(taskAreasCount.rows[0].count, 10)
          },
          schemaColumns: columnsRes.rows,
          foreignKeys: fksRes.rows
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("[DIAGNOSTIC ERROR]:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Bulk / individual plan saving handler
  app.post("/api/save-planos", async (req, res) => {
    try {
      console.log("[LOG] POST /api/save-planos received request:", req.body);
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, error: "O corpo da requisição é obrigatório." });
      }

      const { id, planId, name, title, description } = req.body;
      const targetId = id || planId;
      const planName = (name && typeof name === "string") ? name.trim() : (title && typeof title === "string") ? title.trim() : "Plano Sem Nome";
      const planTitle = (title && typeof title === "string") ? title.trim() : (name && typeof name === "string") ? name.trim() : "Plano Sem Nome";
      const planDesc = (description && typeof description === "string") ? description.trim() : "";

      const pool = getDbPool();

      if (targetId) {
        const parsedId = parseInt(targetId, 10);
        const result = await pool.query(
          "UPDATE pl_plans SET name = $1, title = $2, description = $3 WHERE id = $4 RETURNING *",
          [planName, planTitle, planDesc, parsedId]
        );
        if (result.rows.length === 0) {
          const insertRes = await pool.query(
            "INSERT INTO pl_plans (id, name, title, description, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, $3, $4, NOW(), 'SGI Pro', NOW(), 'SGI Pro') RETURNING *",
            [parsedId, planName, planTitle, planDesc]
          );
          return res.json({
            success: true,
            data: {
              id: Number(insertRes.rows[0].id),
              name: insertRes.rows[0].name || insertRes.rows[0].title || "Plano Sem Nome",
              title: insertRes.rows[0].title || insertRes.rows[0].name || "Plano Sem Nome",
              description: insertRes.rows[0].description,
              createdAt: insertRes.rows[0].created_at,
              createdBy: insertRes.rows[0].created_by,
              updatedAt: insertRes.rows[0].updated_at,
              updatedBy: insertRes.rows[0].updated_by
            }
          });
        }
        return res.json({
          success: true,
          data: {
            id: Number(result.rows[0].id),
            name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome",
            title: result.rows[0].title || result.rows[0].name || "Plano Sem Nome",
            description: result.rows[0].description,
            createdAt: result.rows[0].created_at,
            createdBy: result.rows[0].created_by,
            updatedAt: result.rows[0].updated_at,
            updatedBy: result.rows[0].updated_by
          }
        });
      } else {
        const result = await pool.query(
          "INSERT INTO pl_plans (name, title, description, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, $3, NOW(), 'SGI Pro', NOW(), 'SGI Pro') RETURNING *",
          [planName, planTitle, planDesc]
        );
        return res.json({
          success: true,
          data: {
            id: Number(result.rows[0].id),
            name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome",
            title: result.rows[0].title || result.rows[0].name || "Plano Sem Nome",
            description: result.rows[0].description,
            createdAt: result.rows[0].created_at,
            createdBy: result.rows[0].created_by,
            updatedAt: result.rows[0].updated_at,
            updatedBy: result.rows[0].updated_by
          }
        });
      }
    } catch (error: any) {
      console.error("[API ERROR] Erro crítico ao salvar plano via /api/save-planos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for plans
  app.post("/api/plans", async (req, res) => {
    try {
      const { name, description, updatedBy, createdBy, isActive } = req.body;
      const pool = getDbPool();
      if (isActive) {
        await pool.query("UPDATE pl_plans SET is_active = FALSE");
      }
      const result = await pool.query(
        "INSERT INTO pl_plans (name, title, description, is_active, created_at, created_by, updated_at, updated_by) VALUES ($1, $1, $2, $3, NOW(), $4, NOW(), $5) RETURNING *",
        [name || "Plano Sem Nome", description || "", !!isActive, createdBy || "SGI Pro", updatedBy || "SGI Pro"]
      );
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome", description: result.rows[0].description, isActive: result.rows[0].is_active, createdAt: result.rows[0].created_at, createdBy: result.rows[0].created_by, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error: any) {
      console.error("Erro ao criar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/plans/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const { name, description, updatedBy, isActive } = req.body;
      const pool = getDbPool();
      if (isActive) {
        await pool.query("UPDATE pl_plans SET is_active = FALSE");
      }
      const result = await pool.query(
        "UPDATE pl_plans SET name = $1, title = $1, description = $2, is_active = $3, updated_at = NOW(), updated_by = $4 WHERE id = $5 RETURNING *",
        [name || "Plano Sem Nome", description || "", !!isActive, updatedBy || "SGI Pro", planId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Plano não encontrado" });
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome", description: result.rows[0].description, isActive: result.rows[0].is_active, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error: any) {
      console.error("Erro ao atualizar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/plans/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_plans WHERE id = $1", [planId]);
      res.json({ success: true, deletedId: planId });
    } catch (error: any) {
      console.error("Erro ao deletar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for areas
  app.post("/api/areas", async (req, res) => {
    try {
      const { name, abbreviation, categoryIds, updatedBy, createdBy } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "INSERT INTO pl_areas (name, abbreviation, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, NOW(), $3, NOW(), $4) RETURNING *",
          [name || "Área Sem Nome", abbreviation || "", createdBy || "SGI Pro", updatedBy || "SGI Pro"]
        );
        const areaId = result.rows[0].id;
        if (Array.isArray(categoryIds)) {
          for (let i = 0; i < categoryIds.length; i++) {
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id, order_index) VALUES ($1, $2, $3) ON CONFLICT (category_id, area_id) DO UPDATE SET order_index = $3", [categoryIds[i], areaId, i]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, abbreviation: result.rows[0].abbreviation, categoryIds: categoryIds || [], planId: null, createdAt: result.rows[0].created_at, createdBy: result.rows[0].created_by, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error: any) {
      console.error("Erro ao criar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const { name, abbreviation, categoryIds, updatedBy } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "UPDATE pl_areas SET name = $1, abbreviation = $2, updated_at = NOW(), updated_by = $3 WHERE id = $4 RETURNING *",
          [name, abbreviation || "", updatedBy || "SGI Pro", areaId]
        );
        if (result.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Área não encontrada" });
        }
        if (Array.isArray(categoryIds)) {
          await pool.query("DELETE FROM pl_category_areas WHERE area_id = $1", [areaId]);
          for (let i = 0; i < categoryIds.length; i++) {
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id, order_index) VALUES ($1, $2, $3)", [categoryIds[i], areaId, i]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, abbreviation: result.rows[0].abbreviation, categoryIds: categoryIds || [], planId: null, createdAt: result.rows[0].created_at, createdBy: result.rows[0].created_by, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error: any) {
      console.error("Erro ao atualizar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_areas WHERE id = $1", [areaId]);
      res.json({ success: true, deletedId: areaId });
    } catch (error: any) {
      console.error("Erro ao deletar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for responsibles
  app.get("/api/responsibles", async (req, res) => {
    try {
      const pool = getDbPool();
      const dbResponsibles = await pool.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
      const dbRespAreas = await pool.query("SELECT * FROM pl_responsible_areas");
      const responsibleAreasMap: Record<number, number[]> = {};
      dbRespAreas.rows.forEach(r => {
        const rid = Number(r.responsible_id);
        const aid = Number(r.area_id);
        if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
        responsibleAreasMap[rid].push(aid);
      });
      const data = dbResponsibles.rows.map(r => ({
        id: Number(r.id),
        name: r.name,
        email: r.email,
        role: r.role,
        userId: r.user_id,
        areaIds: responsibleAreasMap[Number(r.id)] || [],
        createdAt: r.created_at,
        createdBy: r.created_by,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by
      }));
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Erro ao buscar responsáveis:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/areas", async (req, res) => {
    try {
      const pool = getDbPool();
      const dbAreas = await pool.query("SELECT * FROM pl_areas ORDER BY id ASC");
      res.json({ success: true, data: dbAreas.rows.map(a => ({ id: Number(a.id), name: a.name, description: a.description })) });
    } catch (error: any) {
      console.error("Erro ao buscar áreas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/responsibles", async (req, res) => {
    try {
      const { name, email, role, areaIds, updatedBy, createdBy } = req.body;
      const pool = getDbPool();
      let createdId;
      let finalResult;
      let generatedPass: string | null = null;
      try {
        await pool.query("BEGIN");

        // Check if user exists for this email
        let userId: number | null = null;
        const normalizedEmail = (email || "").trim().toLowerCase();
        
        if (normalizedEmail) {
          const uRes = await pool.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1)", [normalizedEmail]);
          if (uRes.rows.length > 0) {
            userId = uRes.rows[0].id;
          } else {
            // Generate standard 4-digit random password
            generatedPass = Math.floor(1000 + Math.random() * 9000).toString();
            const insertUserRes = await pool.query(
               "INSERT INTO au_users (name, email, password, role_id, status) VALUES ($1, $2, $3, 'provider', 'active') RETURNING id",
              [name || "Responsável Sem Nome", normalizedEmail, await hashPassword(generatedPass)]
            );
            userId = insertUserRes.rows[0].id;
          }
        }

        const result = await pool.query(
          "INSERT INTO pl_responsibles (name, email, role, user_id, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), $6) RETURNING *",
          [name || "Responsável Sem Nome", email || "", role || "", userId, createdBy || "SGI Pro", updatedBy || "SGI Pro"]
        );
        createdId = result.rows[0].id;
        finalResult = result;
        
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_responsible_areas (responsible_id, area_id) VALUES ($1, $2)", [createdId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ 
        success: true, 
        generatedPassword: generatedPass,
        data: { 
          id: Number(createdId), 
          name: finalResult.rows[0].name, 
          email: finalResult.rows[0].email, 
          role: finalResult.rows[0].role, 
          userId: finalResult.rows[0].user_id,
          areaIds: areaIds || [], 
          createdAt: finalResult.rows[0].created_at, 
          createdBy: finalResult.rows[0].created_by, 
          updatedAt: finalResult.rows[0].updated_at, 
          updatedBy: finalResult.rows[0].updated_by 
        } 
      });
    } catch (error: any) {
      console.error("Erro ao criar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/responsibles/:id", async (req, res) => {
    try {
      const respId = parseInt(req.params.id);
      const { name, email, role, areaIds, updatedBy } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "UPDATE pl_responsibles SET name = $1, email = $2, role = $3, updated_at = NOW(), updated_by = $4 WHERE id = $5 RETURNING *",
          [name, email, role, updatedBy || "SGI Pro", respId]
        );
        if (result.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Responsável não encontrado" });
        }
        
        await pool.query("DELETE FROM pl_responsible_areas WHERE responsible_id = $1", [respId]);
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_responsible_areas (responsible_id, area_id) VALUES ($1, $2)", [respId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, email: result.rows[0].email, role: result.rows[0].role, areaIds: areaIds || [], createdAt: result.rows[0].created_at, createdBy: result.rows[0].created_by, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error: any) {
      console.error("Erro ao atualizar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/responsibles/:id", async (req, res) => {
    try {
      const respId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_responsibles WHERE id = $1", [respId]);
      res.json({ success: true, deletedId: respId });
    } catch (error: any) {
      console.error("Erro ao deletar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Identificador e senha são necessários" });
      }
      const pool = getDbPool();
      const result = await pool.query(
        "SELECT id, name, email, password, role_id, status, agency FROM au_users WHERE LOWER(email) = LOWER($1)",
        [email.trim()]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: "Usuário não encontrado" });
      }
      const user = result.rows[0];
      if (user.status !== "active") {
        return res.status(403).json({ success: false, error: "Este usuário está inativo" });
      }
      if (!(await verifyPassword(password, user.password))) {
        return res.status(401).json({ success: false, error: "Senha inválida" });
      }
      if (!user.password.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
        await pool.query("UPDATE au_users SET password = $1 WHERE id = $2", [await hashPassword(password), user.id]);
      }
      res.json({
        success: true,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          agency: user.agency
        }
      });
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, name, email, role_id, status, agency FROM au_users ORDER BY id ASC");
      res.json({
        success: true,
        data: result.rows.map(user => ({
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          agency: user.agency
        }))
      });
    } catch (error: any) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, roleId, status, agency } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO au_users (name, email, password, role_id, status, agency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [name, email, await hashPassword(password || "1234"), roleId || "provider", status || "active", agency || null]
      );
      const user = result.rows[0];
      res.json({
        success: true,
        data: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          agency: user.agency
        }
      });
    } catch (error: any) {
      console.error("Erro ao cadastrar usuário:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, password, roleId, status, agency } = req.body;
      const pool = getDbPool();
      let query;
      let params;
      if (password) {
        query = "UPDATE au_users SET name = $1, email = $2, password = $3, role_id = $4, status = $5, agency = $6 WHERE id = $7 RETURNING *";
        params = [name, email, await hashPassword(password), roleId || "provider", status || "active", agency || null, userId];
      } else {
        query = "UPDATE au_users SET name = $1, email = $2, role_id = $3, status = $4, agency = $5 WHERE id = $6 RETURNING *";
        params = [name, email, roleId || "provider", status || "active", agency || null, userId];
      }
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Usuário não encontrado" });
      }
      const user = result.rows[0] as any;
      res.json({
        success: true,
        data: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          agency: user.agency
        }
      });
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM au_users WHERE id = $1", [userId]);
      res.json({ success: true, deletedId: userId });
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for categories
  app.get("/api/categories", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, name, created_at, created_by, updated_at, updated_by FROM pl_categories ORDER BY id ASC");
      const mapping = await pool.query("SELECT category_id, area_id FROM pl_category_areas");
      
      const areaMap: Record<number, number[]> = {};
      mapping.rows.forEach(r => {
        const catId = Number(r.category_id);
        if (!areaMap[catId]) areaMap[catId] = [];
        areaMap[catId].push(Number(r.area_id));
      });

      res.json({
        success: true,
        data: result.rows.map(c => ({
          id: Number(c.id),
          name: c.name,
          createdAt: c.created_at,
          createdBy: c.created_by,
          updatedAt: c.updated_at,
          updatedBy: c.updated_by,
          areaIds: areaMap[Number(c.id)] || []
        }))
      });
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, areaIds, updatedBy, createdBy } = req.body;
      const pool = getDbPool();
      let createdId;
      let finalResult;
      try {
        await pool.query("BEGIN");
        const result = await pool.query(
          "INSERT INTO pl_categories (name, created_at, created_by, updated_at, updated_by) VALUES ($1, NOW(), $2, NOW(), $3) RETURNING *",
          [name || "Categoria Sem Nome", createdBy || "SGI Pro", updatedBy || "SGI Pro"]
        );
        createdId = result.rows[0].id;
        finalResult = result;
        
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            const maxOrderRes = await pool.query("SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM pl_category_areas WHERE area_id = $1", [aId]);
            const nextOrder = maxOrderRes.rows[0].next_order;
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id, order_index) VALUES ($1, $2, $3)", [createdId, aId, nextOrder]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }

      res.json({
        success: true,
        data: {
          id: Number(createdId),
          name: finalResult.rows[0].name,
          areaIds: areaIds || [],
          createdAt: finalResult.rows[0].created_at,
          createdBy: finalResult.rows[0].created_by,
          updatedAt: finalResult.rows[0].updated_at,
          updatedBy: finalResult.rows[0].updated_by
        }
      });
    } catch (error: any) {
      console.error("Erro ao criar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const catId = parseInt(req.params.id);
      const { name, areaIds, updatedBy } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "UPDATE pl_categories SET name = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3 RETURNING *",
          [name, updatedBy || "SGI Pro", catId]
        );
        if (result.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Categoria não encontrada" });
        }
        
        // Keep existing order index
        const existingOrderRes = await pool.query("SELECT area_id, order_index FROM pl_category_areas WHERE category_id = $1", [catId]);
        const existingOrders = new Map<number, number>();
        existingOrderRes.rows.forEach(r => existingOrders.set(Number(r.area_id), Number(r.order_index)));
        
        await pool.query("DELETE FROM pl_category_areas WHERE category_id = $1", [catId]);
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            let orderIdx = existingOrders.get(aId);
            if (orderIdx === undefined) {
              const maxOrderRes = await pool.query("SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM pl_category_areas WHERE area_id = $1", [aId]);
              orderIdx = maxOrderRes.rows[0].next_order;
            }
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id, order_index) VALUES ($1, $2, $3)", [catId, aId, orderIdx]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      
      res.json({
        success: true,
        data: {
          id: Number(result.rows[0].id),
          name: result.rows[0].name,
          areaIds: areaIds || [],
          createdAt: result.rows[0].created_at,
          createdBy: result.rows[0].created_by,
          updatedAt: result.rows[0].updated_at,
          updatedBy: result.rows[0].updated_by
        }
      });
    } catch (error: any) {
      console.error("Erro ao atualizar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const catId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_categories WHERE id = $1", [catId]);
      res.json({ success: true, deletedId: catId });
    } catch (error: any) {
      console.error("Erro ao deletar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for resolutions (prefix re_)
  app.get("/api/resolutions", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM re_resolutions ORDER BY numero DESC, ano DESC");
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error("Erro ao obter resoluções:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/resolutions", async (req, res) => {
    try {
      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO re_resolutions (especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
        [especie || "Resolução", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || ""]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao criar resolução:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/resolutions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE re_resolutions SET especie = $1, numero = $2, ano = $3, data = $4, ementa = $5, situacao = $6, area = $7, segmento = $8, tipo = $9, link = $10, imagem_capa = $11 WHERE id = $12 RETURNING *",
        [especie || "Resolução", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || "", id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Resolução não encontrada" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao atualizar resolução:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/resolutions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM re_resolutions WHERE id = $1", [id]);
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error("Erro ao deletar resolução:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- AGENDA REGULATÓRIA ENDPOINTS ---
  app.get("/api/agendas", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query(`
        SELECT a.id, a.nome, a.tema,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'task_id', at.task_id,
                    'status', COALESCE(pt.status, at.status, 'Não iniciada'),
                    'entrega', at.entrega,
                    'entrega_link', at.entrega_link
                  )) 
                  FROM re_agenda_tasks at 
                  LEFT JOIN pl_tasks pt ON pt.id = at.task_id
                  WHERE at.agenda_id = a.id AND at.task_id IS NOT NULL), 
                 '[]'::json
               ) as agenda_tasks,
               COALESCE(
                 (SELECT json_agg(at.task_id) 
                  FROM re_agenda_tasks at 
                  WHERE at.agenda_id = a.id AND at.task_id IS NOT NULL), 
                 '[]'::json
               ) as task_ids
        FROM re_agendas a
        ORDER BY a.id DESC
      `);
      const data = result.rows.map(row => ({
        ...row,
        agenda_tasks: Array.isArray(row.agenda_tasks) ? row.agenda_tasks : [],
        task_ids: Array.isArray(row.task_ids) ? row.task_ids.map(Number) : []
      }));
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Erro ao obter agendas regulatórias:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/agendas", async (req, res) => {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { nome, tema, task_ids, agenda_tasks } = req.body;
      
      const insertAgendaResult = await client.query(
        "INSERT INTO re_agendas (nome, tema) VALUES ($1, $2) RETURNING *",
        [nome || "", tema || ""]
      );
      const newAgenda = insertAgendaResult.rows[0];
      
      const associatedIds: number[] = [];
      const savedTasks: any[] = [];
      
      if (Array.isArray(agenda_tasks)) {
        for (const item of agenda_tasks) {
          const tId = parseInt(item.task_id);
          if (isNaN(tId)) continue;
          const tStatus = item.status || "Não Concluída";
          const tEntrega = item.entrega || "";
          const tEntregaLink = item.entrega_link || "";
          await client.query(
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, $3, $4, $5)",
            [newAgenda.id, tId, tStatus, tEntrega, tEntregaLink]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: tStatus, entrega: tEntrega, entrega_link: tEntregaLink });
        }
      } else if (Array.isArray(task_ids) && task_ids.length > 0) {
        for (const taskId of task_ids) {
          const tId = parseInt(taskId);
          if (isNaN(tId)) continue;
          await client.query(
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, 'Não Concluída', '', '')",
            [newAgenda.id, tId]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: "Não Concluída", entrega: "", entrega_link: "" });
        }
      }
      
      await client.query("COMMIT");
      newAgenda.task_ids = associatedIds;
      newAgenda.agenda_tasks = savedTasks;
      res.json({ success: true, data: newAgenda });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar agenda regulatória:", error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  });

  app.put("/api/agendas/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { nome, tema, task_ids, agenda_tasks } = req.body;
      
      const updateAgendaResult = await client.query(
        "UPDATE re_agendas SET nome = $1, tema = $2 WHERE id = $3 RETURNING *",
        [nome || "", tema || "", id]
      );
      
      if (updateAgendaResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Agenda regulatória não encontrada" });
      }
      
      const updatedAgenda = updateAgendaResult.rows[0];
      
      await client.query("DELETE FROM re_agenda_tasks WHERE agenda_id = $1", [id]);
      
      const associatedIds: number[] = [];
      const savedTasks: any[] = [];
      
      if (Array.isArray(agenda_tasks)) {
        for (const item of agenda_tasks) {
          const tId = parseInt(item.task_id);
          if (isNaN(tId)) continue;
          const tStatus = item.status || "Não Concluída";
          const tEntrega = item.entrega || "";
          const tEntregaLink = item.entrega_link || "";
          await client.query(
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, $3, $4, $5)",
            [id, tId, tStatus, tEntrega, tEntregaLink]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: tStatus, entrega: tEntrega, entrega_link: tEntregaLink });
        }
      } else if (Array.isArray(task_ids) && task_ids.length > 0) {
        for (const taskId of task_ids) {
          const tId = parseInt(taskId);
          if (isNaN(tId)) continue;
          await client.query(
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, 'Não Concluída', '', '')",
            [id, tId]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: "Não Concluída", entrega: "", entrega_link: "" });
        }
      }
      
      await client.query("COMMIT");
      updatedAgenda.task_ids = associatedIds;
      updatedAgenda.agenda_tasks = savedTasks;
      res.json({ success: true, data: updatedAgenda });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Erro ao atualizar agenda regulatória:", error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  });

  app.delete("/api/agendas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM re_agendas WHERE id = $1", [id]);
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error("Erro ao deletar agenda regulatória:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/resolutions/import", async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ success: false, error: "Nenhum dado CSV fornecido." });
      }
      
      const pool = getDbPool();
      const records = parse(csvData, {
        delimiter: ";",
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      });

      console.log(`Importing ${records.length} records...`);
      let count = 0;
      for (const r of records) {
        const row = r as any;
        const especie = (row.especie || "").trim();
        const numero = parseInt(row.Numero || row.numero) || 0;
        const ano = parseInt(row.ano) || 1900;
        const dataStr = (row.data || "").trim();
        const ementa = (row.ementa || "").trim();
        const situacao = (row.situacao || "").trim();
        const area = (row.area || "").trim();
        const segmento = (row.segmento || "").trim();
        const tipo = (row.tipo || "").trim();
        const link = (row.link || "").trim();

        if (especie || numero) {
          await pool.query(
            "INSERT INTO re_resolutions (especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [especie || "Resolução", numero, ano, dataStr, ementa, situacao || "Vigente", area, segmento, tipo, link]
          );
          count++;
        }
      }

      res.json({ success: true, count });
    } catch (error: any) {
      console.error("Erro ao importar CSV:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for publications (prefix pu_)
  app.get("/api/publications", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM pu_publications ORDER BY id DESC");
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error("Erro ao obter publicações:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/publications", async (req, res) => {
    try {
      const { titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO pu_publications (titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [titulo_assunto || "", descricao || "", tipo_documento || "", responsavel_autor || "", data_publicacao || "", link_acesso || "", observacoes || "", imagem_capa || ""]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao criar publicação:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/publications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE pu_publications SET titulo_assunto = $1, descricao = $2, tipo_documento = $3, responsavel_autor = $4, data_publicacao = $5, link_acesso = $6, observacoes = $7, imagem_capa = $8 WHERE id = $9 RETURNING *",
        [titulo_assunto || "", descricao || "", tipo_documento || "", responsavel_autor || "", data_publicacao || "", link_acesso || "", observacoes || "", imagem_capa || "", id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Publicação não encontrada" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao atualizar publicação:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/publications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      const result = await pool.query("DELETE FROM pu_publications WHERE id = $1 RETURNING id", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Publicação não encontrada" });
      }
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error("Erro ao deletar publicação:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/publications/import", async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ success: false, error: "Nenhum dado CSV fornecido." });
      }

      const pool = getDbPool();
      const lines = csvData.split(/\r?\n/);
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Skip header if it is present
        if (i === 0 && line.toLowerCase().includes("titulo_assunto") && line.toLowerCase().includes("descricao")) {
          continue;
        }

        // Split by semicolon
        const parts = line.split(";");
        if (parts.length >= 2) {
          // If ID is specified in first column, handle it
          let offset = 0;
          if (parts.length >= 8 && !isNaN(parseInt(parts[0]))) {
            offset = 1;
          }

          const titulo = (parts[0 + offset] || "").trim();
          const desc = (parts[1 + offset] || "").trim();
          const docType = (parts[2 + offset] || "").trim();
          const author = (parts[3 + offset] || "").trim();
          const pubDate = (parts[4 + offset] || "").trim();
          const link = (parts[5 + offset] || "").trim();
          const obs = (parts[6 + offset] || "").trim();

          if (titulo && desc) {
            await pool.query(
              "INSERT INTO pu_publications (titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [titulo, desc, docType, author, pubDate, link, obs]
            );
            count++;
          }
        }
      }

      res.json({ success: true, count });
    } catch (error: any) {
      console.error("Erro ao importar CSV de publicações:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for Radar de Atividades (prefix pl_)
  app.get("/api/radar-activities", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM pl_radar_activities ORDER BY id ASC");
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      console.error("Erro ao obter atividades do radar:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/radar-activities", async (req, res) => {
    try {
      const {
        titulo,
        descricao,
        area_tematica,
        assunto,
        resultado_esperado,
        prioridade,
        justificativa,
        status,
        observacoes
      } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        `INSERT INTO pl_radar_activities 
          (titulo, descricao, area_tematica, assunto, resultado_esperado, prioridade, justificativa, status, observacoes, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
         RETURNING *`,
        [
          titulo || "",
          descricao || "",
          area_tematica || "Regulação (CORA)",
          assunto || "",
          resultado_esperado || "",
          prioridade || "Alta (1 a 2 anos)",
          justificativa || "",
          status || "Elegível",
          observacoes || ""
        ]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao criar atividade no radar:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/radar-activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const {
        titulo,
        descricao,
        area_tematica,
        assunto,
        resultado_esperado,
        prioridade,
        justificativa,
        status,
        observacoes
      } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        `UPDATE pl_radar_activities 
         SET titulo = $1, descricao = $2, area_tematica = $3, assunto = $4, resultado_esperado = $5, 
             prioridade = $6, justificativa = $7, status = $8, observacoes = $9, updated_at = NOW() 
         WHERE id = $10 
         RETURNING *`,
        [
          titulo || "",
          descricao || "",
          area_tematica || "Regulação (CORA)",
          assunto || "",
          resultado_esperado || "",
          prioridade || "Alta (1 a 2 anos)",
          justificativa || "",
          status || "Elegível",
          observacoes || "",
          id
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Atividade não encontrada no radar" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      console.error("Erro ao atualizar atividade do radar:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/radar-activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      const result = await pool.query("DELETE FROM pl_radar_activities WHERE id = $1 RETURNING id", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Atividade não encontrada" });
      }
      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error("Erro ao deletar atividade do radar:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/radar-activities/import", async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ success: false, error: "Nenhum dado CSV fornecido." });
      }

      const pool = getDbPool();
      const delimiter = csvData.includes(";") ? ";" : ",";
      const records = parse(csvData, {
        delimiter,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
      });

      console.log(`Importing ${records.length} radar activities...`);
      let count = 0;
      for (const r of records) {
        const row = r as any;
        const titulo = (row.titulo || row.Titulo || row.atividade || row.Atividade || row["Título"] || "").trim();
        const descricao = (row.descricao || row.Descricao || row["Descrição"] || "").trim();
        const area_tematica = (row.area_tematica || row["Área Temática"] || row.area || row["Área"] || "Regulação (CORA)").trim();
        const assunto = (row.assunto || row.Assunto || "").trim();
        const resultado_esperado = (row.resultado_esperado || row["Resultado Esperado"] || "").trim();
        const prioridade = (row.prioridade || row.Prioridade || "Alta (1 a 2 anos)").trim();
        const justificativa = (row.justificativa || row.Justificativa || "").trim();
        const status = (row.status || row.Status || "Elegível").trim();
        const observacoes = (row.observacoes || row["Observações"] || row.obs || "").trim();

        if (titulo) {
          await pool.query(
            `INSERT INTO pl_radar_activities 
              (titulo, descricao, area_tematica, assunto, resultado_esperado, prioridade, justificativa, status, observacoes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [titulo, descricao, area_tematica, assunto, resultado_esperado, prioridade, justificativa, status, observacoes]
          );
          count++;
        }
      }

      res.json({ success: true, count });
    } catch (error: any) {
      console.error("Erro ao importar CSV de radar de atividades:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const result = await client.query(`
          WITH RECURSIVE task_tree AS (
            SELECT id, title, description, start_date, end_date, status, parent_id, progress, priority, category, assigned_to, created_by, notes, plan_id, depends_on_task_id, updated_at, updated_by, sei_process, weight, type, fiscalizacao_data, ouvidoria_data, recurso_rev_data, checklist, 1 AS depth
            FROM pl_tasks
            WHERE parent_id IS NULL
            UNION ALL
            SELECT t.id, t.title, t.description, t.start_date, t.end_date, t.status, t.parent_id, t.progress, t.priority, t.category, t.assigned_to, t.created_by, t.notes, t.plan_id, t.depends_on_task_id, t.updated_at, t.updated_by, t.sei_process, t.weight, t.type, t.fiscalizacao_data, t.ouvidoria_data, t.recurso_rev_data, t.checklist, tt.depth + 1
            FROM pl_tasks t
            INNER JOIN task_tree tt ON t.parent_id = tt.id
          )
          SELECT * FROM task_tree ORDER BY depth, id;
        `);
        const dbPlans = await client.query("SELECT * FROM pl_plans ORDER BY id ASC");
        const dbAreas = await client.query("SELECT * FROM pl_areas ORDER BY id ASC");
        const dbResponsibles = await client.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
        const dbTaskAreas = await client.query("SELECT * FROM pl_task_areas");
        const dbTaskResponsibles = await client.query("SELECT * FROM pl_task_responsibles");
        const dbTaskCategories = await client.query("SELECT * FROM pl_task_categories");
        const dbCategories = await client.query("SELECT * FROM pl_categories ORDER BY id ASC");
        const dbCategoryAreas = await client.query("SELECT * FROM pl_category_areas ORDER BY order_index ASC, category_id ASC");
        const dbResponsibleAreas = await client.query("SELECT * FROM pl_responsible_areas");

        const categoryAreasMap: Record<number, number[]> = {};
        const areaCategoriesMap: Record<number, number[]> = {};
        dbCategoryAreas.rows.forEach(r => {
          const cid = Number(r.category_id);
          const aid = Number(r.area_id);
          if (!categoryAreasMap[cid]) categoryAreasMap[cid] = [];
          categoryAreasMap[cid].push(aid);
          if (!areaCategoriesMap[aid]) areaCategoriesMap[aid] = [];
          areaCategoriesMap[aid].push(cid);
        });

        const responsibleAreasMap: Record<number, number[]> = {};
        dbResponsibleAreas.rows.forEach(r => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });

        const taskAreasMap: Record<number, number[]> = {};
        dbTaskAreas.rows.forEach(r => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });

        const taskResponsiblesMap: Record<number, number[]> = {};
        dbTaskResponsibles.rows.forEach(r => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });

        const taskCategoriesMap: Record<number, number[]> = {};
        dbTaskCategories.rows.forEach(r => {
          const tid = Number(r.task_id);
          const cid = Number(r.category_id);
          if (!taskCategoriesMap[tid]) taskCategoriesMap[tid] = [];
          taskCategoriesMap[tid].push(cid);
        });
        
        const tasks = result.rows.map(t => ({
          id: Number(t.id),
          title: t.title,
          description: t.description,
          startDate: t.start_date,
          endDate: t.end_date,
          status: t.status,
          parentId: t.parent_id ? Number(t.parent_id) : null,
          progress: Number(t.progress) || 0,
          seiProcess: t.sei_process,
          priority: t.priority,
          category: t.category,
          assignedTo: t.assigned_to,
          createdBy: t.created_by,
          notes: t.notes,
          checklist: t.checklist,
          planId: t.plan_id ? Number(t.plan_id) : null,
          dependsOnTaskId: t.depends_on_task_id ? Number(t.depends_on_task_id) : null,
          updatedAt: t.updated_at,
          updatedBy: t.updated_by,
          weight: t.weight !== undefined && t.weight !== null ? Number(t.weight) : 1,
          type: t.type === 'recurso' ? 'demanda_ouvidoria' : t.type,
          fiscalizacaoData: t.fiscalizacao_data, ouvidoriaData: t.ouvidoria_data, recursoData: t.ouvidoria_data, recursoRevData: t.recurso_rev_data,
          areaIds: taskAreasMap[Number(t.id)] || [],
          responsibleIds: taskResponsiblesMap[Number(t.id)] || [],
          categoryIds: taskCategoriesMap[Number(t.id)] || []
        }));
        
        res.json({ 
          success: true, 
          data: tasks,
          plans: dbPlans.rows.map(p => ({
            id: Number(p.id),
            name: p.name || p.title || "Plano Sem Nome",
            title: p.title || p.name || "Plano Sem Nome",
            description: p.description,
            isActive: p.is_active || false,
            createdAt: p.created_at,
            createdBy: p.created_by,
            updatedAt: p.updated_at,
            updatedBy: p.updated_by
          })),
          areas: dbAreas.rows.map(a => ({
            id: Number(a.id),
            name: a.name,
            abbreviation: a.abbreviation,
            categoryIds: areaCategoriesMap[Number(a.id)] || [],
            planId: null,
            createdAt: a.created_at,
            createdBy: a.created_by,
            updatedAt: a.updated_at,
            updatedBy: a.updated_by
          })),
          responsibles: dbResponsibles.rows.map(r => ({
            id: Number(r.id),
            name: r.name,
            email: r.email,
            role: r.role,
            areaIds: responsibleAreasMap[Number(r.id)] || [],
            createdAt: r.created_at,
            createdBy: r.created_by,
            updatedAt: r.updated_at,
            updatedBy: r.updated_by,
            userId: r.user_id ? Number(r.user_id) : null
          })),
          categories: dbCategories.rows.map(c => ({
            id: Number(c.id),
            name: c.name,
            areaIds: categoryAreasMap[Number(c.id)] || [],
            createdAt: c.created_at,
            createdBy: c.created_by,
            updatedAt: c.updated_at,
            updatedBy: c.updated_by
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error && error.message === "A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING", data: [] });
      }
      console.error("Erro ao carregar tarefas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/tasks/import", async (req, res) => {
    try {
      const { areaId, csvText } = req.body;
      if (!areaId || !csvText) {
        return res.status(400).json({ success: false, error: "Área e CSV são obrigatórios." });
      }

      // Parse CSV
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        trim: true
      }) as any[];

      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // 1. Create missing plans from 2019 to 2026
        const plansToCreate = [
          "Plano de Atividades 2019", "Plano de Atividades 2020", "Plano de Atividades 2021",
          "Plano de Atividades 2022", "Plano de Atividades 2023", "Plano de Atividades 2024",
          "Plano de Atividades 2025", "Plano de Atividades 2026"
        ];
        
        const planNameToId: Record<string, number> = {};
        for (const planName of plansToCreate) {
           const planRes = await client.query("SELECT id FROM pl_plans WHERE name = $1", [planName]);
           if (planRes.rows.length > 0) {
              planNameToId[planName] = Number(planRes.rows[0].id);
           } else {
              const insertRes = await client.query("INSERT INTO pl_plans (name, updated_at, updated_by) VALUES ($1, NOW(), 'Importação') RETURNING id", [planName]);
              planNameToId[planName] = Number(insertRes.rows[0].id);
           }
        }
        
        // Caches for categories and responsibles
        const catNameToId: Record<string, number> = {};
        const respNameToId: Record<string, number> = {};
        
        for (const record of records) {
            let catId = null;
            const catName = record.category?.trim();
            if (catName) {
                if (!catNameToId[catName]) {
                    const catRes = await client.query("SELECT id FROM pl_categories WHERE name = $1", [catName]);
                    if (catRes.rows.length > 0) {
                        catNameToId[catName] = Number(catRes.rows[0].id);
                    } else {
                        const insRes = await client.query("INSERT INTO pl_categories (name, updated_at, updated_by) VALUES ($1, NOW(), 'Importação') RETURNING id", [catName]);
                        catNameToId[catName] = Number(insRes.rows[0].id);
                        
                        // link category to area
                        await client.query("INSERT INTO pl_category_areas (category_id, area_id) VALUES ($1, $2)", [catNameToId[catName], areaId]);
                    }
                }
                catId = catNameToId[catName];
            }
            
            const respNamesStr = record.assigned_to || "";
            const respNames = respNamesStr.split(/[,;]/).map((n: string) => n.trim()).filter(Boolean);
            const taskRespIds: number[] = [];
            for (const rName of respNames) {
                if (!respNameToId[rName]) {
                    const rRes = await client.query("SELECT id FROM pl_responsibles WHERE name = $1", [rName]);
                    if (rRes.rows.length > 0) {
                        respNameToId[rName] = Number(rRes.rows[0].id);
                    } else {
                        const insR = await client.query("INSERT INTO pl_responsibles (name, email, role, updated_at, updated_by) VALUES ($1, '', '', NOW(), 'Importação') RETURNING id", [rName]);
                        respNameToId[rName] = Number(insR.rows[0].id);
                    }
                }
                taskRespIds.push(respNameToId[rName]);
            }
            
            let prio = record.priority || "Média";
            if (prio === "Importante" || prio === "Urgente") prio = "Alta";
            
            let isProg = false;
            // The file might contain 'Rotulo', 'PROGRAMADA;Alta prioridade', etc.
            if (record.is_programmed) {
                const progValue = record.is_programmed.trim();
                if (progValue.includes("Rotulo") || progValue.includes("PROGRAMADA")) {
                    isProg = true;
                }
            }
            
            let progress = 0;
            let planYear = "2026";
            const compAt = record.completed_at?.trim();
            if (compAt) {
                progress = 100;
                let y = compAt.substring(0, 4);
                if (y.match(/^\d{4}$/)) {
                   planYear = y;
                } else {
                   const yMatch = compAt.match(/\d{4}/);
                   if (yMatch) planYear = yMatch[0];
                }
            }
            
            const planKey = `Plano de Atividades ${planYear}`;
            let planId = planNameToId[planKey] || planNameToId["Plano de Atividades 2026"];
            
            let status = record.status || "Não iniciada";
            if (progress === 100) status = "Concluída";
            
            let startDate = record.start_date?.trim() ? new Date(record.start_date) : null;
            if (startDate && isNaN(startDate.getTime())) startDate = null;
            let endDate = record.end_date?.trim() ? new Date(record.end_date) : null;
            if (endDate && isNaN(endDate.getTime())) endDate = null;
            let completedAtDate = compAt ? new Date(compAt) : null;
            if (completedAtDate && isNaN(completedAtDate.getTime())) completedAtDate = null;
            
            let weightStr = record.weight?.replace(',', '.');
            let weight = parseFloat(weightStr);
            if (isNaN(weight) || weight <= 0) weight = 1;

            const insTask = await client.query(`
               INSERT INTO pl_tasks (
                 title, description, start_date, end_date, status, progress, weight, priority, 
                 category, assigned_to, notes, plan_id, sei_process, 
                 created_by, completed_at, completed_by, is_programmed, updated_at, updated_by
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), 'Importação')
               RETURNING id
            `, [
               record.title || "Sem título", "", startDate, endDate, status, progress, weight, prio,
               catName || "", "", record.notes || "", planId, record.sei_process || null,
               record.created_by || "Importação", completedAtDate, record.completed_by || null, isProg
            ]);
            
            const newTaskId = Number(insTask.rows[0].id);
            
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2)", [newTaskId, areaId]);
            
            if (catId) {
                await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2)", [newTaskId, catId]);
            }
            
            for (const rId of taskRespIds) {
                await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [newTaskId, rId]);
            }
        }
        
        await client.query("COMMIT");
        res.json({ success: true, count: records.length });
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Erro importação:", err);
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro no import-tasks:", error);
      res.status(500).json({ success: false, error: error.message || "Erro desconhecido na importação" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { title, description, startDate, endDate, status, parentId, progress, priority, category, assignedTo, notes, checklist, planId, areaIds, responsibleIds, categoryIds, dependsOnTaskId, type, fiscalizacaoData, recursoData, ouvidoriaData, recursoRevData } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const finalProgress = progress !== undefined ? parseInt(progress) : 0;
        const finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";
        
        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
            const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId)]);
            if (parentAreasRes.rows.length > 0) {
               finalAreaIds = parentAreasRes.rows.map(r => r.area_id);
            }
            const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId)]);
            if (parentCatsRes.rows.length > 0) {
               finalCategoryIds = parentCatsRes.rows.map(r => r.category_id);
            }
        }
        
        const reqWeight = parseInt(req.body.weight as any, 10);
        const finalWeight = isNaN(reqWeight) ? 1 : reqWeight;
        const result = await client.query(
          `INSERT INTO pl_tasks (title, description, start_date, end_date, status, parent_id, progress, priority, category, assigned_to, notes, plan_id, depends_on_task_id, updated_at, updated_by, sei_process, weight, type, fiscalizacao_data, ouvidoria_data, recurso_rev_data, checklist)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING *`,
          [
            title || "Sem título",
            description || "",
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null,
            finalStatus,
            parentId ? parseInt(parentId) : null,
            finalProgress,
            priority || "Média",
            category || "PONTUAIS",
            "", // assigned_to will be updated below
            notes || "",
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null,
            req.body.updatedBy || "SGI Pro",
            req.body.seiProcess || null,
            isNaN(finalWeight) ? 1.0 : finalWeight,
            type || "default",
            fiscalizacaoData ? JSON.stringify(fiscalizacaoData) : null,
            (ouvidoriaData || recursoData) ? JSON.stringify(ouvidoriaData || recursoData) : null,
            recursoRevData ? JSON.stringify(recursoRevData) : null,
            checklist ? JSON.stringify(checklist) : null
          ]
        );
        
        const createdTask = result.rows[0];
        const createdTaskId = Number(createdTask.id);

        // Save task_areas
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, aid]);
          }
        }

        // Save task_responsibles
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, rid]);
          }
        }

        // Save task_categories
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, cid]);
          }
        }

        // Format and update assignedTo string based on actual responsible names
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map(r => r.name).join(", ");
          }
          await client.query("UPDATE pl_tasks SET assigned_to = $1 WHERE id = $2", [finalAssignedTo, createdTaskId]);
        }
        
        if (dependsOnTaskId) {
            const existingDepsRes = await client.query("SELECT id FROM pl_tasks WHERE depends_on_task_id = $1 AND id != $2", [dependsOnTaskId, createdTaskId]);

            const depRes = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [dependsOnTaskId]);
            if (depRes.rows.length > 0 && depRes.rows[0].end_date) {
               const parentEnd = new Date(depRes.rows[0].end_date);
               const oldStart = createdTask.start_date ? new Date(createdTask.start_date) : null;
               const oldEnd = createdTask.end_date ? new Date(createdTask.end_date) : null;
               
               let nStart = new Date(parentEnd.getTime() + 86400000);
               let nEnd = new Date(parentEnd.getTime() + 86400000);
               if (oldStart && oldEnd) {
                   const diffMs = oldEnd.getTime() - oldStart.getTime();
                   nEnd = new Date(nStart.getTime() + diffMs);
               }
               await client.query("UPDATE pl_tasks SET start_date = $1, end_date = $2 WHERE id = $3", [nStart, nEnd, createdTaskId]);
               createdTask.start_date = nStart;
               createdTask.end_date = nEnd;
            }

            if (existingDepsRes.rows.length > 0) {
                await client.query("UPDATE pl_tasks SET depends_on_task_id = $1 WHERE depends_on_task_id = $2 AND id != $1", [createdTaskId, dependsOnTaskId]);
                if (createdTask.end_date) {
                    await cascadeDependentTaskDates(client, createdTaskId, new Date(createdTask.end_date));
                }
            }
        }
        
        if (createdTask.parent_id) {
          await rollUpTask(client, createdTask.parent_id);
        }
        
        await client.query("COMMIT");
        
        res.json({
          success: true,
          data: {
            id: Number(createdTask.id),
            title: createdTask.title,
            description: createdTask.description,
            startDate: createdTask.start_date,
            endDate: createdTask.end_date,
            status: createdTask.status,
            parentId: createdTask.parent_id ? Number(createdTask.parent_id) : null,
            progress: Number(createdTask.progress) || 0,
            priority: createdTask.priority,
            category: createdTask.category,
            assignedTo: finalAssignedTo,
            createdBy: createdTask.created_by,
            notes: createdTask.notes,
            planId: createdTask.plan_id ? Number(createdTask.plan_id) : null,
            type: createdTask.type,
            fiscalizacaoData: createdTask.fiscalizacao_data, ouvidoriaData: createdTask.ouvidoria_data, recursoData: createdTask.ouvidoria_data, recursoRevData: createdTask.recurso_rev_data,
            areaIds: areaIds || [],
            responsibleIds: responsibleIds || [],
            categoryIds: categoryIds || []
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { title, description, startDate, endDate, status, progress, priority, category, assignedTo, notes, checklist, parentId, planId, areaIds, responsibleIds, categoryIds, dependsOnTaskId, seiProcess, type, fiscalizacaoData, recursoData, ouvidoriaData, recursoRevData } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        const currentTaskRes = await client.query("SELECT parent_id, start_date, end_date, progress, status, depends_on_task_id FROM pl_tasks WHERE id = $1", [taskId]);
        if (currentTaskRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Tarefa não encontrada." });
        }
        const oldParentId = currentTaskRes.rows[0].parent_id;

        const childrenCheck = await client.query("SELECT COUNT(*) FROM pl_tasks WHERE parent_id = $1", [taskId]);
        const hasChildren = parseInt(childrenCheck.rows[0].count, 10) > 0;

        let finalStartDate = startDate ? new Date(startDate) : null;
        let finalEndDate = endDate ? new Date(endDate) : null;
        let finalProgress = progress !== undefined ? parseInt(progress) : 0;
        let finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";

        if (hasChildren) {
          finalStartDate = currentTaskRes.rows[0].start_date;
          finalEndDate = currentTaskRes.rows[0].end_date;
          finalProgress = currentTaskRes.rows[0].progress || 0;
          finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";
        }

        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
            const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId, 10)]);
            if (parentAreasRes.rows.length > 0) {
               finalAreaIds = parentAreasRes.rows.map(r => r.area_id);
            }
            const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId, 10)]);
            if (parentCatsRes.rows.length > 0) {
               finalCategoryIds = parentCatsRes.rows.map(r => r.category_id);
            }
        }

        const reqWeight = parseInt(req.body.weight as any, 10);
        const finalWeight = isNaN(reqWeight) ? 1 : reqWeight;
        const result = await client.query(
          `UPDATE pl_tasks 
           SET title = $1, description = $2, start_date = $3, end_date = $4, status = $5, progress = $6, priority = $7, category = $8, assigned_to = $9, notes = $10, parent_id = $11, plan_id = $12, depends_on_task_id = $13, updated_at = NOW(), updated_by = $14, sei_process = $16, weight = $17, type = $18, fiscalizacao_data = $19, ouvidoria_data = $20, recurso_rev_data = $21, checklist = $22
           WHERE id = $15
           RETURNING *`,
          [
            title || "Sem título",
            description || "",
            finalStartDate,
            finalEndDate,
            finalStatus,
            finalProgress,
            priority || "Média",
            category || "PONTUAIS",
            "", // assigned_to will be updated below
            notes || "",
            parentId ? parseInt(parentId) : null,
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null,
            req.body.updatedBy || "SGI Pro",
            taskId,
            seiProcess || null,
            isNaN(finalWeight) ? 1.0 : finalWeight,
            type || "default",
            fiscalizacaoData ? JSON.stringify(fiscalizacaoData) : null,
            (ouvidoriaData || recursoData) ? JSON.stringify(ouvidoriaData || recursoData) : null,
            recursoRevData ? JSON.stringify(recursoRevData) : null,
            checklist ? JSON.stringify(checklist) : null
          ]
        );

        const updatedTask = result.rows[0];

        // Reset and save task_areas
        await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, aid]);
          }
        }

        // Reset and save task_responsibles
        await client.query("DELETE FROM pl_task_responsibles WHERE task_id = $1", [taskId]);
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, rid]);
          }
        }

        // Reset and save task_categories
        await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, cid]);
          }
        }

        // Format and update assignedTo string based on actual responsible names
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map(r => r.name).join(", ");
          }
          await client.query("UPDATE pl_tasks SET assigned_to = $1 WHERE id = $2", [finalAssignedTo, taskId]);
        }

        // Trigger cascade to override children
        await cascadeAreasAndCategories(client, taskId, finalAreaIds, finalCategoryIds);

        // Se a tarefa mudou sua dependência, atualiza as datas DESSA tarefa para seguir a nova dependência
        const oldDependsOn = currentTaskRes.rows[0].depends_on_task_id;
        const newDependsOn = updatedTask.depends_on_task_id;
        let finalUpdatedEndDate = updatedTask.end_date;

        if (newDependsOn && oldDependsOn !== newDependsOn) {
            const depRes = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [newDependsOn]);
            if (depRes.rows.length > 0 && depRes.rows[0].end_date) {
               const parentEnd = new Date(depRes.rows[0].end_date);
               const oldStart = currentTaskRes.rows[0].start_date ? new Date(currentTaskRes.rows[0].start_date) : null;
               const oldEnd = currentTaskRes.rows[0].end_date ? new Date(currentTaskRes.rows[0].end_date) : null;
               
               let nStart = new Date(parentEnd.getTime() + 86400000);
               let nEnd = new Date(parentEnd.getTime() + 86400000);
               if (oldStart && oldEnd) {
                   const diffMs = oldEnd.getTime() - oldStart.getTime();
                   nEnd = new Date(nStart.getTime() + diffMs);
               }
               await client.query("UPDATE pl_tasks SET start_date = $1, end_date = $2 WHERE id = $3", [nStart, nEnd, taskId]);
               finalUpdatedEndDate = nEnd;
            }
        }

        // Reorganizar datas de tarefas dependentes caso a data de fim tenha mudado
        const oldEndDateMs = currentTaskRes.rows[0].end_date ? new Date(currentTaskRes.rows[0].end_date).getTime() : 0;
        const newEndDateMs = finalUpdatedEndDate ? new Date(finalUpdatedEndDate).getTime() : 0;
        if (oldEndDateMs !== newEndDateMs && finalUpdatedEndDate) {
          await cascadeDependentTaskDates(client, taskId, new Date(finalUpdatedEndDate));
        }

        if (hasChildren) {
          await rollUpTask(client, taskId);
        }

        if (updatedTask.parent_id) {
          await rollUpTask(client, updatedTask.parent_id);
        }
        if (oldParentId && oldParentId !== updatedTask.parent_id) {
          await rollUpTask(client, oldParentId);
        }

        await client.query("COMMIT");
        
        res.json({
          success: true,
          data: {
            id: Number(updatedTask.id),
            title: updatedTask.title,
            description: updatedTask.description,
            startDate: updatedTask.start_date,
            endDate: updatedTask.end_date,
            status: updatedTask.status,
            parentId: updatedTask.parent_id ? Number(updatedTask.parent_id) : null,
            progress: Number(updatedTask.progress) || 0,
            priority: updatedTask.priority,
            category: updatedTask.category,
            assignedTo: finalAssignedTo,
            createdBy: updatedTask.created_by,
            notes: updatedTask.notes,
            planId: updatedTask.plan_id ? Number(updatedTask.plan_id) : null,
            type: updatedTask.type,
            fiscalizacaoData: updatedTask.fiscalizacao_data, ouvidoriaData: updatedTask.ouvidoria_data, recursoData: updatedTask.ouvidoria_data, recursoRevData: updatedTask.recurso_rev_data,
            areaIds: areaIds || [],
            responsibleIds: responsibleIds || [],
            categoryIds: categoryIds || []
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao atualizar tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        const taskRes = await client.query("SELECT parent_id, depends_on_task_id FROM pl_tasks WHERE id = $1", [taskId]);
        if (taskRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Tarefa não encontrada." });
        }
        const parentId = taskRes.rows[0].parent_id;
        const dependsOnTaskId = taskRes.rows[0].depends_on_task_id;

        // Bridge dependencies: Se a tarefa B a ser deletada tinha uma dependência A,
        // as tarefas C que dependiam de B passarão a depender de A.
        const depsRes = await client.query("SELECT id FROM pl_tasks WHERE depends_on_task_id = $1", [taskId]);
        if (depsRes.rows.length > 0) {
          if (dependsOnTaskId) {
            await client.query("UPDATE pl_tasks SET depends_on_task_id = $1 WHERE depends_on_task_id = $2", [dependsOnTaskId, taskId]);
            const aRes = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [dependsOnTaskId]);
            if (aRes.rows.length > 0 && aRes.rows[0].end_date) {
              await cascadeDependentTaskDates(client, dependsOnTaskId, new Date(aRes.rows[0].end_date));
            }
          }
        }

        await client.query("DELETE FROM pl_tasks WHERE id = $1", [taskId]);

        if (parentId) {
          await rollUpTask(client, parentId);
        }

        await client.query("COMMIT");
        res.json({ success: true, deletedId: taskId });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao demover tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/tasks", async (req, res) => {
    try {
      console.log("[LOG] DELETE /api/tasks: Deletando todas as tarefas...");
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query("DELETE FROM pl_tasks");
        
        const markerPath = process.env.VERCEL ? "/tmp/tasks_cleared_marker.txt" : path.join("/tmp", "tasks_cleared_marker.txt");
        fs.writeFileSync(markerPath, "tasks_cleared_" + Date.now(), "utf8");
        
        await client.query("COMMIT");
        console.log(`[LOG] DELETE /api/tasks: Sucesso! Deletadas ${result.rowCount} tarefas.`);
        res.json({ success: true, message: "Todos os registros da tabela 'pl_tasks' foram excluídos com sucesso!", deletedCount: result.rowCount });
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao excluir todas as tarefas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for task templates (models)
  app.get("/api/task-models", async (req, res) => {
    console.log("[API] GET /api/task-models accessed by frontend");
    try {
      const pool = getDbPool();
      const modelsRes = await pool.query("SELECT id, name, created_at, created_by FROM pl_task_models ORDER BY id ASC");
      const itemsRes = await pool.query("SELECT id, model_id, name, duration_days, weight, sequence_order FROM pl_model_tasks ORDER BY model_id ASC, sequence_order ASC, id ASC");
      
      const itemsMap: Record<number, any[]> = {};
      itemsRes.rows.forEach(item => {
        const mId = Number(item.model_id);
        if (!itemsMap[mId]) itemsMap[mId] = [];
        itemsMap[mId].push({
          id: Number(item.id),
          modelId: mId,
          name: item.name,
          durationDays: Number(item.duration_days) || 0,
          weight: Number(item.weight) || 1
        });
      });

      res.json({
        success: true,
        data: modelsRes.rows.map(m => ({
          id: Number(m.id),
          name: m.name,
          createdAt: m.created_at,
          createdBy: m.created_by,
          items: itemsMap[Number(m.id)] || []
        }))
      });
    } catch (err: any) {
      console.error("Erro ao carregar modelos:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/task-models", async (req, res) => {
    try {
      const { name, createdBy, items } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
         await client.query("BEGIN");
         const modelRes = await client.query(
           "INSERT INTO pl_task_models (name, created_at, created_by) VALUES ($1, NOW(), $2) RETURNING id, name, created_at, created_by",
           [name || "Modelo Sem Nome", createdBy || "SGI Pro"]
         );
         const modelId = modelRes.rows[0].id;

         const createdItems: any[] = [];
         if (Array.isArray(items)) {
           for (let i = 0; i < items.length; i++) {
             const it = items[i];
             const itemRes = await client.query(
               "INSERT INTO pl_model_tasks (model_id, name, duration_days, weight, sequence_order, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, duration_days, weight",
               [modelId, it.name || "Tarefa Modelo", Number(it.durationDays) || 0, Number(it.weight) || 1, i, createdBy || "SGI Pro"]
             );
             createdItems.push({
               id: Number(itemRes.rows[0].id),
               modelId,
               name: itemRes.rows[0].name,
               durationDays: Number(itemRes.rows[0].duration_days) || 0,
               weight: Number(itemRes.rows[0].weight) || 1
             });
           }
         }

         await client.query("COMMIT");
         res.json({
           success: true,
           data: {
             id: Number(modelId),
             name: modelRes.rows[0].name,
             createdAt: modelRes.rows[0].created_at,
             createdBy: modelRes.rows[0].created_by,
             items: createdItems
           }
         });
      } catch (err) {
         await client.query("ROLLBACK");
         throw err;
      } finally {
         client.release();
      }
    } catch (err: any) {
      console.error("Erro ao criar modelo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/task-models/:id", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { name, items, updatedBy } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
         await client.query("BEGIN");
         const modelRes = await client.query(
           "UPDATE pl_task_models SET name = $1 WHERE id = $2 RETURNING id, name, created_at, created_by",
           [name, modelId]
         );
         if (modelRes.rows.length === 0) {
           await client.query("ROLLBACK");
           return res.status(404).json({ success: false, error: "Modelo não encontrado" });
         }

         // Re-sync items:
         await client.query("DELETE FROM pl_model_tasks WHERE model_id = $1", [modelId]);
         const createdItems: any[] = [];
         if (Array.isArray(items)) {
           for (let i = 0; i < items.length; i++) {
             const it = items[i];
             const itemRes = await client.query(
               "INSERT INTO pl_model_tasks (model_id, name, duration_days, weight, sequence_order, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, duration_days, weight",
               [modelId, it.name || "Tarefa Modelo", Number(it.durationDays) || 0, Number(it.weight) || 1, i, updatedBy || "SGI Pro"]
             );
             createdItems.push({
               id: Number(itemRes.rows[0].id),
               modelId,
               name: itemRes.rows[0].name,
               durationDays: Number(itemRes.rows[0].duration_days) || 0,
               weight: Number(itemRes.rows[0].weight) || 1
             });
           }
         }

         await client.query("COMMIT");
         res.json({
           success: true,
           data: {
             id: Number(modelId),
             name: modelRes.rows[0].name,
             createdAt: modelRes.rows[0].created_at,
             createdBy: modelRes.rows[0].created_by,
             items: createdItems
           }
         });
      } catch (err) {
         await client.query("ROLLBACK");
         throw err;
      } finally {
         client.release();
      }
    } catch (err: any) {
      console.error("Erro ao atualizar modelo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/task-models/:id", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_task_models WHERE id = $1", [modelId]);
      res.json({ success: true, deletedId: modelId });
    } catch (err: any) {
      console.error("Erro ao deletar modelo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/task-models/generate", async (req, res) => {
    try {
      const {
        modelId,
        planId,
        startDate,
        parentId,
        sequential,
        priority,
        isProgrammed,
        areaIds,
        categoryIds,
        responsibleIds,
        createdBy
      } = req.body;

      if (!modelId || !startDate) {
        return res.status(400).json({ success: false, error: "Modelo e Data de Início são obrigatórios." });
      }

      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Get model tasks sorted by order/id
        const itemsRes = await client.query(
          "SELECT name, duration_days, weight FROM pl_model_tasks WHERE model_id = $1 ORDER BY sequence_order ASC, id ASC",
          [parseInt(modelId)]
        );

        if (itemsRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Este modelo não possui nenhuma tarefa cadastrada." });
        }

        let pivotDate = new Date(startDate);
        let previousTaskId: number | null = null;
        const createdTaskIds: number[] = [];

        let parentTaskType: string = "default";
        let parentOuvidoriaData: any = null;
        let parentFiscalizacaoData: any = null;
        let parentRecursoRevData: any = null;
        let finalPlanId = planId ? parseInt(planId) : null;
        let finalAreaIds = Array.isArray(areaIds) ? [...areaIds] : [];
        let finalCategoryIds = Array.isArray(categoryIds) ? [...categoryIds] : [];
        let finalResponsibleIds = Array.isArray(responsibleIds) ? [...responsibleIds] : [];

        if (parentId) {
          const pRes = await client.query(
            "SELECT plan_id, type, ouvidoria_data, fiscalizacao_data, recurso_rev_data FROM pl_tasks WHERE id = $1",
            [parseInt(parentId)]
          );
          if (pRes.rows.length > 0) {
            const pRow = pRes.rows[0];
            if (pRow.type) parentTaskType = pRow.type;
            if (pRow.ouvidoria_data) parentOuvidoriaData = pRow.ouvidoria_data;
            if (pRow.fiscalizacao_data) parentFiscalizacaoData = pRow.fiscalizacao_data;
            if (pRow.recurso_rev_data) parentRecursoRevData = pRow.recurso_rev_data;
            if (!finalPlanId && pRow.plan_id) finalPlanId = pRow.plan_id;

            if (finalAreaIds.length === 0) {
              const paRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId)]);
              finalAreaIds = paRes.rows.map(r => r.area_id);
            }
            if (finalCategoryIds.length === 0) {
              const pcRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId)]);
              finalCategoryIds = pcRes.rows.map(r => r.category_id);
            }
            if (finalResponsibleIds.length === 0) {
              const prRes = await client.query("SELECT responsible_id FROM pl_task_responsibles WHERE task_id = $1", [parseInt(parentId)]);
              finalResponsibleIds = prRes.rows.map(r => r.responsible_id);
            }
          }
        }

        for (const item of itemsRes.rows) {
          const duration = Number(item.duration_days) || 0;
          const taskWeight = Number(item.weight) || 1;

          let tStart: Date;
          let tEnd: Date;

          if (sequential && previousTaskId !== null) {
            // Sequential: starts 1 day after previous task ends to prevent starting on same day
            tStart = new Date(pivotDate.getTime() + 24 * 60 * 60 * 1000);
            tEnd = new Date(tStart.getTime() + duration * 24 * 60 * 60 * 1000);
            pivotDate = new Date(tEnd);
          } else {
            // Independent, or first item in sequence
            tStart = new Date(startDate);
            tEnd = new Date(tStart.getTime() + duration * 24 * 60 * 60 * 1000);
            if (sequential) {
              pivotDate = new Date(tEnd);
            }
          }

          // Insert task
          const taskInsertRes = await client.query(
            `INSERT INTO pl_tasks (
               title, description, start_date, end_date, status, parent_id, progress,
               priority, notes, plan_id, depends_on_task_id, created_at, created_by,
               is_programmed, weight, updated_at, updated_by, type, ouvidoria_data, fiscalizacao_data, recurso_rev_data
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, NOW(), $12, $15, $16, $17, $18)
             RETURNING id`,
            [
              item.name,
              "", // description
              tStart,
              tEnd,
              "Não iniciada",
              parentId ? parseInt(parentId) : null,
              0, // progress
              priority || "Média",
              `Gerada a partir do Modelo ID: ${modelId}`,
              finalPlanId,
              (sequential && previousTaskId) ? previousTaskId : null,
              createdBy || "SGI Pro",
              isProgrammed !== false,
              taskWeight,
              parentTaskType,
              parentOuvidoriaData ? (typeof parentOuvidoriaData === 'object' ? JSON.stringify(parentOuvidoriaData) : parentOuvidoriaData) : null,
              parentFiscalizacaoData ? (typeof parentFiscalizacaoData === 'object' ? JSON.stringify(parentFiscalizacaoData) : parentFiscalizacaoData) : null,
              parentRecursoRevData ? (typeof parentRecursoRevData === 'object' ? JSON.stringify(parentRecursoRevData) : parentRecursoRevData) : null
            ]
          );

          const newTaskId = Number(taskInsertRes.rows[0].id);
          createdTaskIds.push(newTaskId);
          previousTaskId = newTaskId;

          // Insert areas
          if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
            for (const aId of finalAreaIds) {
              await client.query(
                "INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [newTaskId, Number(aId)]
              );
            }
          }

          // Insert categories
          if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
            for (const cId of finalCategoryIds) {
              await client.query(
                "INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [newTaskId, Number(cId)]
              );
            }
          }

          // Insert responsibles
          if (Array.isArray(finalResponsibleIds) && finalResponsibleIds.length > 0) {
            for (const rId of finalResponsibleIds) {
              await client.query(
                "INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [newTaskId, Number(rId)]
              );
            }
          }
        }

        if (parentId) {
          await rollUpTask(client, parseInt(parentId));
        }

        await client.query("COMMIT");
        res.json({ success: true, count: createdTaskIds.length, taskIds: createdTaskIds });
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("Erro ao gerar tarefas do modelo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


// ==========================================
// REGULAÇÃO - PARTICIPAÇÃO SOCIAL (CONSULTA PÚBLICA / TOMADA DE SUBSÍDIOS)
// ==========================================

const getParticipationsHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { rows: participations } = await dbPool.query(
      `SELECT 
        id, 
        numero, 
        COALESCE(tipo_resolucao, 'nova') as "tipoResolucao",
        COALESCE(meio_participacao, 'Consulta Pública') as "meioParticipacao", 
        title, 
        objeto, 
        COALESCE(datainicio, '') as "dataInicio", 
        COALESCE(datafim, '') as "dataFim", 
        COALESCE(createdat, '') as "createdAt"
       FROM re_participations 
       ORDER BY id DESC`
    );
    
    // Fetch attachments
    const { rows: anexos } = await dbPool.query("SELECT * FROM re_participation_attachments");
    
    const result = participations.map(t => {
      const dInicio = t.dataInicio || (t as any).datainicio || (t as any).data_inicio || "";
      const dFim = t.dataFim || (t as any).datafim || (t as any).data_fim || "";
      const cAt = t.createdAt || (t as any).createdat || (t as any).created_at || "";
      return {
        ...t,
        tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
        dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
        dataFim: dFim ? String(dFim).split("T")[0] : "",
        createdAt: cAt,
        meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
        anexos: anexos.filter(a => a.participation_id === t.id)
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching participations:", error);
    res.status(500).json({ error: "Failed to fetch participations" });
  }
};

const getSingleParticipationHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { rows: participations } = await dbPool.query(
      `SELECT 
        id, 
        numero, 
        COALESCE(tipo_resolucao, 'nova') as "tipoResolucao",
        COALESCE(meio_participacao, 'Consulta Pública') as "meioParticipacao", 
        title, 
        objeto, 
        COALESCE(datainicio, '') as "dataInicio", 
        COALESCE(datafim, '') as "dataFim", 
        COALESCE(createdat, '') as "createdAt"
       FROM re_participations 
       WHERE id = $1`,
      [Number(id)]
    );

    if (participations.length === 0) {
      return res.status(404).json({ error: "Participation not found" });
    }

    const { rows: anexos } = await dbPool.query(
      "SELECT * FROM re_participation_attachments WHERE participation_id = $1",
      [Number(id)]
    );

    const t = participations[0];
    const dInicio = t.dataInicio || (t as any).datainicio || (t as any).data_inicio || "";
    const dFim = t.dataFim || (t as any).datafim || (t as any).data_fim || "";
    const cAt = t.createdAt || (t as any).createdat || (t as any).created_at || "";

    res.json({
      ...t,
      tipoResolucao: t.tipoResolucao || (t as any).tipo_resolucao || "nova",
      dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
      dataFim: dFim ? String(dFim).split("T")[0] : "",
      createdAt: cAt,
      meioParticipacao: t.meioParticipacao || (t as any).meio_participacao || "Consulta Pública",
      anexos: anexos || []
    });
  } catch (error) {
    console.error("Error fetching single participation:", error);
    res.status(500).json({ error: "Failed to fetch participation" });
  }
};

const createParticipationHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  const client = await dbPool.connect();
  try {
    const { numero, tipoResolucao, meioParticipacao, title, objeto, dataInicio, dataFim, createdAt, anexos, articles } = req.body;
    const finalTipoResolucao = (tipoResolucao === 'alteracao' || req.body.tipo_resolucao === 'alteracao') ? 'alteracao' : 'nova';
    const finalDataInicio = (dataInicio || req.body.data_inicio || req.body.datainicio || '').split("T")[0];
    const finalDataFim = (dataFim || req.body.data_fim || req.body.datafim || '').split("T")[0];
    
    let finalNumero = numero;
    if (!finalNumero) {
      const currentYear = new Date().getFullYear();
      const isTS = meioParticipacao === 'Tomada de Subsídios' || meioParticipacao === 'TS';
      const prefix = isTS ? 'TS' : 'CP';
      const { rows: existing } = await client.query(
        "SELECT numero, meio_participacao FROM re_participations"
      );
      let maxNum = 0;
      for (const row of existing) {
        const rowMeio = row.meio_participacao || 'Consulta Pública';
        const isSameType = isTS
          ? (rowMeio === 'Tomada de Subsídios' || (row.numero && row.numero.trim().toUpperCase().startsWith('TS')))
          : (rowMeio === 'Consulta Pública' || (row.numero && row.numero.trim().toUpperCase().startsWith('CP')));

        if (isSameType && row.numero) {
          const match = row.numero.match(/(?:CP|TS)?\s*(\d+)\s*\/\s*(\d{4})/i);
          if (match) {
            const num = parseInt(match[1], 10);
            const year = parseInt(match[2], 10);
            if (year === currentYear && !isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
      finalNumero = `${prefix} ${maxNum + 1}/${currentYear}`;
    }

    await client.query('BEGIN');
    
    const insertRes = await client.query(
      `INSERT INTO re_participations (numero, tipo_resolucao, meio_participacao, title, objeto, datainicio, datafim, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [finalNumero, finalTipoResolucao, meioParticipacao || 'Consulta Pública', title, objeto, finalDataInicio, finalDataFim, createdAt || new Date().toISOString()]
    );
    
    const participationId = insertRes.rows[0].id;
    
    if (anexos && anexos.length > 0) {
      for (const anexo of anexos) {
        await client.query(
          `INSERT INTO re_participation_attachments (participation_id, name, url) VALUES ($1, $2, $3)`,
          [participationId, anexo.name, anexo.url]
        );
      }
    }
    
    if (articles && articles.length > 0) {
      for (const art of articles) {
        await client.query(
          `INSERT INTO re_participation_articles (participation_id, order_index, original_text, proposed_text)
           VALUES ($1, $2, $3, $4)`,
          [participationId, art.order || 0, art.originalText, art.proposedText || null]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, id: participationId });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error("Error creating participation:", error);
    res.status(500).json({ error: "Failed to create participation" });
  } finally {
    client.release();
  }
};

const updateParticipationHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  const client = await dbPool.connect();
  try {
    const { id } = req.params;
    const { numero, tipoResolucao, meioParticipacao, title, objeto, dataInicio, dataFim, anexos } = req.body;
    const finalTipoResolucao = (tipoResolucao || req.body.tipo_resolucao) === 'alteracao' ? 'alteracao' : 'nova';
    const finalDataInicio = (dataInicio || req.body.data_inicio || req.body.datainicio || '').split("T")[0];
    const finalDataFim = (dataFim || req.body.data_fim || req.body.datafim || '').split("T")[0];
    
    await client.query('BEGIN');

    await client.query(
      `UPDATE re_participations 
       SET numero = $1, tipo_resolucao = $2, meio_participacao = $3, title = $4, objeto = $5, datainicio = $6, datafim = $7
       WHERE id = $8`,
      [numero, finalTipoResolucao, meioParticipacao || 'Consulta Pública', title, objeto, finalDataInicio, finalDataFim, Number(id)]
    );
    
    // If anexos is provided as an array, replace or update the attachments for this participation
    if (Array.isArray(anexos)) {
      // Remove old attachments
      await client.query("DELETE FROM re_participation_attachments WHERE participation_id = $1", [Number(id)]);
      // Insert new/kept attachments
      for (const anexo of anexos) {
        if (anexo && anexo.name) {
          await client.query(
            `INSERT INTO re_participation_attachments (participation_id, name, url) VALUES ($1, $2, $3)`,
            [Number(id), anexo.name, anexo.url || '']
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error("Error updating participation:", error);
    res.status(500).json({ error: "Failed to update participation" });
  } finally {
    client.release();
  }
};

const deleteParticipationHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    await dbPool.query("DELETE FROM re_participations WHERE id = $1", [Number(id)]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting participation:", error);
    res.status(500).json({ error: "Failed to delete participation" });
  }
};

const getArticlesHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { rows } = await dbPool.query(
      `SELECT id, participation_id as "tomadaId", participation_id as "participationId", 
              order_index as "order", original_text as "originalText", 
              proposed_text as "proposedText", final_text as "finalText", 
              final_justification as "finalJustification" 
       FROM re_participation_articles 
       WHERE participation_id = $1 
       ORDER BY order_index`,
      [Number(id)]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
};

const getContributionsHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { rows } = await dbPool.query(
      `SELECT c.id, c.article_id as "articleId", c.user_id as "userId",
              COALESCE(u.name, 'Participante') as "authorName", 
              COALESCE(u.email, '') as "authorEmail",
              c.proposed_text as "proposedText", c.justification, 
              c.decision, c.complexity, c.technical_justification as "technicalJustification",
              c.created_at as "createdAt"
       FROM re_participation_contributions c
       JOIN re_participation_articles a ON c.article_id = a.id
       LEFT JOIN au_users u ON c.user_id = u.id
       WHERE a.participation_id = $1
       ORDER BY c.id DESC`,
      [Number(id)]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching contributions:", error);
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
};

const createContributionHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { articleId, userId, authorName, authorEmail, proposedText, justification, createdAt } = req.body;
    let resolvedUserId = userId !== undefined && userId !== null && !isNaN(Number(userId)) ? Number(userId) : null;
    
    // If userId not provided directly as integer, resolve from au_users by email or name
    if (!resolvedUserId) {
      if (authorEmail) {
        const uRes = await dbPool.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1)", [authorEmail.trim()]);
        if (uRes.rows.length > 0) resolvedUserId = uRes.rows[0].id;
      }
      if (!resolvedUserId && authorName) {
        const uRes = await dbPool.query("SELECT id FROM au_users WHERE LOWER(name) = LOWER($1)", [authorName.trim()]);
        if (uRes.rows.length > 0) resolvedUserId = uRes.rows[0].id;
      }
      // If user still doesn't exist, create an active registered user record in au_users
      if (!resolvedUserId && (authorName || authorEmail)) {
        const safeName = (authorName || "Usuário").trim();
        const safeEmail = (authorEmail || `${safeName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@adasa.df.gov.br`).trim();
        const insUser = await dbPool.query(
          "INSERT INTO au_users (name, email, password, role_id, status, agency) VALUES ($1, $2, $3, 'provider', 'active', 'Participação Social') RETURNING id",
          [safeName, safeEmail, await hashPassword("1234")]
        );
        resolvedUserId = insUser.rows[0].id;
      }
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: "Usuário autenticado obrigatório para enviar contribuição." });
    }

    // Upsert contribution: enforce 1 proposal per user per article
    const upsertRes = await dbPool.query(
      `INSERT INTO re_participation_contributions (article_id, user_id, proposed_text, justification, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (article_id, user_id) 
       DO UPDATE SET proposed_text = EXCLUDED.proposed_text,
                     justification = EXCLUDED.justification,
                     created_at = EXCLUDED.created_at
       RETURNING id`,
      [Number(articleId), resolvedUserId, proposedText, justification, createdAt || new Date().toISOString()]
    );
    
    res.json({ success: true, id: upsertRes.rows[0].id });
  } catch (error) {
    console.error("Error creating contribution:", error);
    res.status(500).json({ error: "Failed to create contribution" });
  }
};

const updateContributionHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { proposedText, justification, userId, decision } = req.body;
    const parsedUserId = userId !== undefined && userId !== null && !isNaN(Number(userId)) ? Number(userId) : null;
    
    await dbPool.query(
      `UPDATE re_participation_contributions
       SET proposed_text = COALESCE($1, proposed_text),
           justification = COALESCE($2, justification),
           user_id = COALESCE($3, user_id),
           decision = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE decision END,
           created_at = $5
       WHERE id = $6`,
      [
        proposedText !== undefined ? proposedText : null,
        justification !== undefined ? justification : null,
        parsedUserId,
        decision !== undefined ? decision : null,
        new Date().toISOString(),
        Number(id)
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating contribution:", error);
    res.status(500).json({ error: "Failed to update contribution" });
  }
};

const updateContributionAnalysisHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { decision, complexity, technicalJustification } = req.body;
    
    await dbPool.query(
      `UPDATE re_participation_contributions
       SET decision = $1,
           complexity = $2,
           technical_justification = $3
       WHERE id = $4`,
      [
        decision !== undefined ? decision : null, 
        complexity !== undefined ? complexity : null,
        technicalJustification !== undefined ? technicalJustification : null,
        Number(id)
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating contribution analysis:", error);
    res.status(500).json({ error: "Failed to update contribution analysis" });
  }
};

const deleteContributionHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    await dbPool.query("DELETE FROM re_participation_contributions WHERE id = $1", [Number(id)]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting contribution:", error);
    res.status(500).json({ error: "Failed to delete contribution" });
  }
};

const updateArticleHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { originalText, proposedText, order, finalText, finalJustification } = req.body;
    
    await dbPool.query(
      `UPDATE re_participation_articles 
       SET original_text = COALESCE($1, original_text),
           proposed_text = COALESCE($2, proposed_text),
           order_index = COALESCE($3, order_index),
           final_text = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE final_text END,
           final_justification = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE final_justification END
       WHERE id = $6`,
      [
        originalText !== undefined ? originalText : null, 
        proposedText !== undefined ? proposedText : null, 
        order !== undefined ? order : null,
        finalText !== undefined ? finalText : null,
        finalJustification !== undefined ? finalJustification : null,
        Number(id)
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Failed to update article" });
  }
};

const updateArticleFinalAnalysisHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { finalText, finalJustification } = req.body;
    
    await dbPool.query(
      `UPDATE re_participation_articles 
       SET final_text = $1,
           final_justification = $2
       WHERE id = $3`,
      [finalText !== undefined ? finalText : null, finalJustification !== undefined ? finalJustification : null, Number(id)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating article final analysis:", error);
    res.status(500).json({ error: "Failed to update article final analysis" });
  }
};

const updateParticipationArticlesBatchHandler = async (req: express.Request, res: express.Response) => {
  if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
  try {
    const { id } = req.params;
    const { articles } = req.body;
    if (Array.isArray(articles)) {
      for (const art of articles) {
        if (art.id && !String(art.id).startsWith('temp-')) {
          await dbPool.query(
            `UPDATE re_participation_articles 
             SET original_text = $1, proposed_text = $2, order_index = $3
             WHERE id = $4 AND participation_id = $5`,
            [art.originalText || null, art.proposedText || null, art.order || 0, Number(art.id), Number(id)]
          );
        } else {
          await dbPool.query(
            `INSERT INTO re_participation_articles (participation_id, order_index, original_text, proposed_text)
             VALUES ($1, $2, $3, $4)`,
            [Number(id), art.order || 0, art.originalText || null, art.proposedText || null]
          );
        }
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error batch updating articles:", error);
    res.status(500).json({ error: "Failed to update articles" });
  }
};

// Route bindings for participations & legacy aliases
app.get("/api/reg/participations", getParticipationsHandler);
app.get("/api/reg/tomadas", getParticipationsHandler);

app.get("/api/reg/participations/:id", getSingleParticipationHandler);
app.get("/api/reg/tomadas/:id", getSingleParticipationHandler);

app.post("/api/reg/participations", createParticipationHandler);
app.post("/api/reg/tomadas", createParticipationHandler);

app.put("/api/reg/participations/:id", updateParticipationHandler);
app.put("/api/reg/tomadas/:id", updateParticipationHandler);

app.delete("/api/reg/participations/:id", deleteParticipationHandler);
app.delete("/api/reg/tomadas/:id", deleteParticipationHandler);

app.get("/api/reg/participations/:id/articles", getArticlesHandler);
app.get("/api/reg/tomadas/:id/articles", getArticlesHandler);

app.put("/api/reg/participations/:id/articles", updateParticipationArticlesBatchHandler);
app.put("/api/reg/tomadas/:id/articles", updateParticipationArticlesBatchHandler);

app.put("/api/reg/articles/:id", updateArticleHandler);
app.put("/api/reg/articles/:id/final-analysis", updateArticleFinalAnalysisHandler);

app.get("/api/reg/participations/:id/contributions", getContributionsHandler);
app.get("/api/reg/tomadas/:id/contributions", getContributionsHandler);

app.post("/api/reg/contributions", createContributionHandler);
app.put("/api/reg/contributions/:id", updateContributionHandler);
app.put("/api/reg/contributions/:id/analysis", updateContributionAnalysisHandler);
app.delete("/api/reg/contributions/:id", deleteContributionHandler);

app.post("/api/reg/ai/analyze-contribution", async (req, res) => {
  try {
    const { originalText, proposedText, userJustification } = req.body;
    
    if (!originalText || !proposedText || !userJustification) {
      return res.status(400).json({ error: "Missing required fields for AI analysis." });
    }

    const prompt = `Você é um analista técnico de regulação da ADASA (Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal).
Você precisa analisar uma contribuição da sociedade para uma minuta de norma.
O texto original do dispositivo é:
"${originalText}"

O texto sugerido pelo participante é:
"${proposedText}"

A justificativa fornecida pelo participante é:
"${userJustification}"

Avalie a contribuição com base no rigor técnico regulatório, clareza e impacto na prestação dos serviços. 
Forneça a resposta em formato JSON estrito com os seguintes campos:
- "decision": "Acatada", "Acatada Parcialmente", "Não Acatada", "Prejudicada" ou "Retida para Estudos Adicionais"
- "complexity": "Alta", "Média" ou "Baixa"
- "technicalJustification": Um texto técnico, impessoal e claro, com a justificativa técnica para a decisão tomada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING },
            complexity: { type: Type.STRING },
            technicalJustification: { type: Type.STRING }
          },
          required: ["decision", "complexity", "technicalJustification"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate AI analysis" });
  }
});

app.post("/api/reg/ai/analyze-article", async (req, res) => {
  try {
    const { originalText, contributions } = req.body;
    
    if (!originalText || !contributions || !Array.isArray(contributions)) {
      return res.status(400).json({ error: "Missing required fields for AI article analysis." });
    }

    const contributionsText = contributions.map((c: any, i: number) => `
Contribuição ${i+1}:
Parecer Técnico Dado: ${c.decision || "Não informado"}
Surgestão do Participante: "${c.proposedText}"
Justificativa: "${c.justification}"
Resposta Técnica Dada: "${c.technicalJustification || "Não informada"}"
`).join("\\n");

    const prompt = `Você é um revisor técnico de regulação da ADASA.
Abaixo está o texto original de um dispositivo normativo e uma lista de contribuições da sociedade com seus respectivos pareceres.

Texto Original:
"${originalText}"

Contribuições:
${contributionsText}

Com base no texto original e nas contribuições que foram acatadas total ou parcialmente, escreva a Redação Final sugerida para este dispositivo e uma Justificativa Técnica Final consolidando a visão geral do que foi alterado e por quê.
Se nenhuma contribuição foi acatada, a redação final deve ser igual à original e a justificativa deve apontar brevemente que não houve alterações.

Forneça a resposta em formato JSON estrito com os seguintes campos:
- "finalText": O texto consolidado do dispositivo.
- "finalJustification": Um texto técnico, impessoal e claro, justificando como as contribuições moldaram a redação final.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            finalText: { type: Type.STRING },
            finalJustification: { type: Type.STRING }
          },
          required: ["finalText", "finalJustification"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("AI Article Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate AI article analysis" });
  }
});

  // Global API error handler for things like PayloadTooLargeError from body-parser
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express API error:", err);
    res.status(err.status || 500).json({ success: false, error: err.message || "Internal Server Error" });
  });

  if (!isVercel) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.all('*', (req, res) => {
         if (req.path.startsWith('/api')) {
           return res.status(404).json({ success: false, error: "Endpoint da API não encontrado." });
         }
         res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!isVercel) {
    app.listen(PORT as number, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}
