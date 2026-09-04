var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  startServer: () => startServer
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_pg = require("pg");
var import_sync = require("csv-parse/sync");

// server/core/security/password.ts
var import_node_crypto = require("node:crypto");
var import_node_util = require("node:util");
var scrypt = (0, import_node_util.promisify)(import_node_crypto.scrypt);
var PASSWORD_HASH_PREFIX = "scrypt";
async function hashPassword(password) {
  const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}
async function verifyPassword(password, storedPassword) {
  if (!storedPassword.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const supplied = Buffer.from(password);
    const stored = Buffer.from(storedPassword);
    return supplied.length === stored.length && (0, import_node_crypto.timingSafeEqual)(supplied, stored);
  }
  const [, salt, storedKeyHex] = storedPassword.split("$");
  if (!salt || !storedKeyHex || storedKeyHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(storedKeyHex)) return false;
  const storedKey = Buffer.from(storedKeyHex, "hex");
  const derivedKey = await scrypt(password, salt, storedKey.length);
  return storedKey.length === derivedKey.length && (0, import_node_crypto.timingSafeEqual)(storedKey, derivedKey);
}

// server.ts
var import_genai = require("@google/genai");
var import_child_process = require("child_process");
var import_util = require("util");
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
var app = (0, import_express.default)();
var dbPool = null;
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function parseSafeInt(val) {
  if (val === void 0 || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : Math.floor(val);
  }
  const str = String(val).trim();
  const directParsed = parseInt(str, 10);
  if (!isNaN(directParsed) && /^-?\d+$/.test(str)) {
    return directParsed;
  }
  const match = str.match(/-?\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
function parseSafeFloat(val) {
  if (val === void 0 || val === null || val === "") return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}
function parseSafeFloatOrNull(val) {
  if (val === void 0 || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}
function getDbPool() {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("As vari\xE1veis de conex\xE3o (DATABASE_URL ou POSTGRES_URL) est\xE3o ausentes no ambiente.");
    }
    const cleanConnectionString = connectionString.replace(/&?channel_binding=require/g, "");
    dbPool = new import_pg.Pool({
      connectionString: cleanConnectionString,
      // O banco de dados Neon exige conexões seguras por SSL
      ssl: { rejectUnauthorized: false },
      max: process.env.VERCEL ? 1 : 10,
      connectionTimeoutMillis: 5e3,
      idleTimeoutMillis: 3e4
    });
  }
  return dbPool;
}
async function rollUpTask(client, parentId) {
  if (!parentId) return;
  const res = await client.query(
    "SELECT start_date, end_date, progress, weight FROM pl_tasks WHERE parent_id = $1",
    [parentId]
  );
  if (res.rows.length === 0) {
    await client.query(
      `UPDATE pl_tasks 
       SET progress = 0, status = 'N\xE3o iniciada', start_date = NULL, end_date = NULL
       WHERE id = $1`,
      [parentId]
    );
    const parentRes2 = await client.query("SELECT parent_id FROM pl_tasks WHERE id = $1", [parentId]);
    if (parentRes2.rows.length > 0 && parentRes2.rows[0].parent_id) {
      await rollUpTask(client, parentRes2.rows[0].parent_id);
    }
    return;
  }
  let minStart = null;
  let maxEnd = null;
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
    let w = Number(row.weight);
    if (isNaN(w) || w < 0) w = 1;
    totalWeightedProgress += (Number(row.progress) || 0) * w;
    totalWeight += w;
  }
  const avgProgress = totalWeight > 0 ? Math.round(totalWeightedProgress / totalWeight) : 0;
  let status = "N\xE3o iniciada";
  if (avgProgress === 100) {
    status = "Conclu\xEDda";
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
async function cascadeAreasAndCategories(client, parentTaskId, areaIds, categoryIds) {
  const childrenRes = await client.query("SELECT id FROM pl_tasks WHERE parent_id = $1", [parentTaskId]);
  for (const row of childrenRes.rows) {
    const childId = row.id;
    await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [childId]);
    if (areaIds && areaIds.length > 0) {
      for (const aid of areaIds) {
        await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, aid]);
      }
    }
    await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [childId]);
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, cid]);
      }
    }
    await cascadeAreasAndCategories(client, childId, areaIds, categoryIds);
  }
}
async function shiftTaskAndChildrenDates(client, taskId, offsetMs) {
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
async function cascadeDependentTaskDates(client, parentTaskId, newParentEndDate) {
  if (!newParentEndDate || isNaN(newParentEndDate.getTime())) return;
  const targetStartDateMs = newParentEndDate.getTime() + 864e5;
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
          category TEXT,
          responsible VARCHAR(255) NOT NULL,
          delivery_date TIMESTAMP,
          received_by VARCHAR(255),
          receipt_date TIMESTAMP,
          status VARCHAR(50) NOT NULL
        );
        ALTER TABLE wb_water_balances ADD COLUMN IF NOT EXISTS category TEXT;
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
          url TEXT,
          category VARCHAR(100)
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
          ('< 120%', 'Risco Alto (Cr\xEDtico)', '**Inadequa\xE7\xE3o Normativa e Inseguran\xE7a de Pico.** O crit\xE9rio internacional de estresse severo (WEI+ da Ag\xEAncia Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renov\xE1vel. Urbanamente, o coeficiente de varia\xE7\xE3o de consumo di\xE1rio (K1) \xE9 fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma rela\xE7\xE3o abaixo de 1,2 indica que o sistema n\xE3o suportar\xE1 o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidr\xE1ulica.'),
          ('120% a 130%', 'Risco M\xE9dio (Alerta)', '**Perda da Margem de Conting\xEAncia Operacional.** Nesta faixa, a oferta atende estritamente \xE0 demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" f\xEDsica do sistema cai para menos de 10%. Manuais de opera\xE7\xE3o de saneamento e relat\xF3rios de risco h\xEDdrico apontam que trabalhar com menos de 10% de folga impede paradas para manuten\xE7\xF5es emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas f\xEDsicas por vazamentos na distribui\xE7\xE3o.'),
          ('> 130%', 'Risco Baixo (Adequado)', '**Resili\xEAncia e Seguran\xE7a H\xEDdrica Plena.** Garante o pleno atendimento das flutua\xE7\xF5es sazonais urbanas recomendadas pela engenharia civil cl\xE1ssica. A margem m\xEDnima acima de 30% absorve os coeficientes de pico de consumo, compensa varia\xE7\xF5es na qualidade da \xE1gua bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mant\xE9m o sistema operando em seguran\xE7a cont\xEDnua, em alinhamento com as zonas confort\xE1veis prescritas pela ANA (Ag\xEAncia Nacional de \xC1guas).')
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS fisc_map_obras (id BIGSERIAL PRIMARY KEY, external_id TEXT, data JSONB NOT NULL DEFAULT '{}'::jsonb, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE INDEX IF NOT EXISTS idx_fisc_map_obras_external_id ON fisc_map_obras(external_id);
        CREATE TABLE IF NOT EXISTS fisc_map_acoes_importadas (id BIGSERIAL PRIMARY KEY, external_id TEXT, data JSONB NOT NULL DEFAULT '{}'::jsonb, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS fisc_map_locais_importados (id BIGSERIAL PRIMARY KEY, external_id TEXT, data JSONB NOT NULL DEFAULT '{}'::jsonb, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS fisc_map_rvf_relatorios (id BIGSERIAL PRIMARY KEY, titulo TEXT NOT NULL, ano INTEGER, mes INTEGER, url_original TEXT NOT NULL, url_final TEXT, dominio TEXT, status TEXT NOT NULL DEFAULT 'pendente', erro_verificacao TEXT, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (ano, titulo, url_original));
        CREATE TABLE IF NOT EXISTS fisc_map_camadas (id BIGSERIAL PRIMARY KEY, nome TEXT NOT NULL UNIQUE, geojson JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS fisc_map_auditoria (id BIGSERIAL PRIMARY KEY, acao TEXT NOT NULL, entidade TEXT NOT NULL, entidade_id TEXT, origem TEXT NOT NULL DEFAULT 'mapas', antes JSONB, depois JSONB, autor TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE INDEX IF NOT EXISTS idx_fisc_map_auditoria_created_at ON fisc_map_auditoria(created_at DESC);
      `);
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
      try {
        await client.query(`ALTER TABLE pl_category_areas ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`);
      } catch (err) {
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
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pl_users') AND
               NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'au_users') THEN
              ALTER TABLE pl_users RENAME TO au_users;
            END IF;
          END $$;
        `);
      } catch (e) {
        console.error("Erro ao migrar tabela pl_users para au_users:", e);
      }
      await client.query(`
        CREATE TABLE IF NOT EXISTS au_departments (
          id SERIAL PRIMARY KEY,
          sigla VARCHAR(50) NOT NULL,
          nome VARCHAR(255) NOT NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS au_roles (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        const rolesCount = await client.query("SELECT COUNT(*) FROM au_roles");
        if (parseInt(rolesCount.rows[0].count) === 0) {
          const defaultRolesSeed = [
            {
              id: "admin",
              name: "Administrador",
              description: "Acesso total ao sistema, todas as a\xE7\xF5es permitidas",
              permissions: [
                { moduleId: "planning_my_tasks", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_dashboard", actions: ["view"] },
                { moduleId: "planning_tasks", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_plans", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_areas", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_categories", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_responsibles", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_import", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_models", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "planning_radar", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "water_balances", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "systems", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "supply_sources", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "demands", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "explore", actions: ["view"] },
                { moduleId: "analyze", actions: ["view"] },
                { moduleId: "compare", actions: ["view"] },
                { moduleId: "templates", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_cadastro", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_painel", actions: ["view"] },
                { moduleId: "reg_agenda", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_agenda_painel", actions: ["view"] },
                { moduleId: "reg_subsidios", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_subsidios_painel", actions: ["view"] },
                { moduleId: "reg_subsidios_portal", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_subsidios_oral", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_subsidios_analise", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "reg_subsidios_minuta", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "pub_cadastro", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "pub_painel", actions: ["view"] },
                { moduleId: "dashboard", actions: ["view"] },
                { moduleId: "public_hub", actions: ["view"] },
                { moduleId: "geo", actions: ["view"] },
                { moduleId: "users", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "fisc_operational", actions: ["view", "create", "edit", "delete"] },
                { moduleId: "recurso_painel", actions: ["view", "create", "edit", "delete"] }
              ]
            },
            {
              id: "regulator",
              name: "Regulador",
              description: "Acesso de auditoria, edi\xE7\xE3o e altera\xE7\xE3o t\xE9cnica, com restri\xE7\xF5es de exclus\xE3o.",
              permissions: [
                { moduleId: "planning_my_tasks", actions: ["view", "create", "edit"] },
                { moduleId: "planning_dashboard", actions: ["view"] },
                { moduleId: "planning_tasks", actions: ["view", "create", "edit"] },
                { moduleId: "planning_plans", actions: ["view", "create", "edit"] },
                { moduleId: "planning_areas", actions: ["view", "create", "edit"] },
                { moduleId: "planning_categories", actions: ["view", "create", "edit"] },
                { moduleId: "planning_responsibles", actions: ["view", "create", "edit"] },
                { moduleId: "planning_import", actions: ["view", "create", "edit"] },
                { moduleId: "planning_models", actions: ["view", "create", "edit"] },
                { moduleId: "planning_radar", actions: ["view", "create", "edit"] },
                { moduleId: "water_balances", actions: ["view", "create", "edit"] },
                { moduleId: "systems", actions: ["view", "create", "edit"] },
                { moduleId: "supply_sources", actions: ["view", "create", "edit"] },
                { moduleId: "demands", actions: ["view", "create", "edit"] },
                { moduleId: "explore", actions: ["view"] },
                { moduleId: "analyze", actions: ["view"] },
                { moduleId: "compare", actions: ["view"] },
                { moduleId: "templates", actions: ["view", "create", "edit"] },
                { moduleId: "reg_cadastro", actions: ["view", "create", "edit"] },
                { moduleId: "reg_painel", actions: ["view"] },
                { moduleId: "reg_agenda", actions: ["view", "create", "edit"] },
                { moduleId: "reg_agenda_painel", actions: ["view"] },
                { moduleId: "reg_subsidios", actions: ["view", "create", "edit"] },
                { moduleId: "reg_subsidios_painel", actions: ["view"] },
                { moduleId: "reg_subsidios_portal", actions: ["view", "create", "edit"] },
                { moduleId: "reg_subsidios_oral", actions: ["view", "create", "edit"] },
                { moduleId: "reg_subsidios_analise", actions: ["view", "create", "edit"] },
                { moduleId: "reg_subsidios_minuta", actions: ["view", "create", "edit"] },
                { moduleId: "pub_cadastro", actions: ["view", "create", "edit"] },
                { moduleId: "pub_painel", actions: ["view"] },
                { moduleId: "dashboard", actions: ["view"] },
                { moduleId: "public_hub", actions: ["view"] },
                { moduleId: "geo", actions: ["view"] },
                { moduleId: "users", actions: ["view"] },
                { moduleId: "fisc_operational", actions: ["view", "create", "edit"] },
                { moduleId: "recurso_painel", actions: ["view", "create", "edit"] }
              ]
            },
            {
              id: "provider",
              name: "Prestador",
              description: "Acesso restrito \xE0s suas pr\xF3prias funcionalidades e envio de dados.",
              permissions: [
                { moduleId: "water_balances", actions: ["view", "create", "edit"] },
                { moduleId: "systems", actions: ["view"] },
                { moduleId: "supply_sources", actions: ["view"] },
                { moduleId: "demands", actions: ["view"] },
                { moduleId: "explore", actions: ["view"] },
                { moduleId: "compare", actions: ["view"] },
                { moduleId: "dashboard", actions: ["view"] },
                { moduleId: "public_hub", actions: ["view"] }
              ]
            }
          ];
          for (const r of defaultRolesSeed) {
            await client.query(
              "INSERT INTO au_roles (id, name, description, permissions) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
              [r.id, r.name, r.description, JSON.stringify(r.permissions)]
            );
          }
        } else {
          const existingRoles = await client.query("SELECT id, permissions FROM au_roles WHERE id IN ('admin', 'regulator')");
          for (const row of existingRoles.rows) {
            let perms = typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions;
            if (Array.isArray(perms) && !perms.some((p) => p.moduleId === "reg_subsidios_oral")) {
              const actions = row.id === "admin" ? ["view", "create", "edit", "delete"] : ["view", "create", "edit"];
              perms.push({ moduleId: "reg_subsidios_oral", actions });
              await client.query("UPDATE au_roles SET permissions = $1 WHERE id = $2", [JSON.stringify(perms), row.id]);
            }
          }
        }
      } catch (e) {
        console.error("Erro ao inicializar pap\xE9is padr\xE3o na au_roles:", e);
      }
      await client.query(`
        CREATE TABLE IF NOT EXISTS au_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role_id VARCHAR(100) DEFAULT 'provider',
          status VARCHAR(50) DEFAULT 'active',
          
          department_id INTEGER REFERENCES au_departments(id) ON DELETE SET NULL
        );
      `);
      try {
        await client.query("ALTER TABLE au_users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES au_departments(id) ON DELETE SET NULL;");
      } catch (err) {
      }
      try {
        await client.query(`
          DELETE FROM au_users 
          WHERE LOWER(email) IN ('admin@adasa.gov.br', 'joao@adasa.gov.br', 'maria@caesb.gov.br')
             OR name IN ('Admin', 'Joao Regulador', 'Maria CAESB');
        `);
      } catch (err) {
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
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS depends_on_task_id INTEGER REFERENCES pl_tasks(id) ON DELETE SET NULL;`);
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
      await client.query(`
        UPDATE pl_tasks 
        SET type = 'demanda_ouvidoria'
        WHERE type = 'recurso';
      `);
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
      await client.query(`
        UPDATE pl_tasks
        SET ouvidoria_data = jsonb_set(ouvidoria_data, '{tipoManifestacao}', '"Demanda Ouvidoria"')
        WHERE ouvidoria_data IS NOT NULL AND ouvidoria_data->>'tipoManifestacao' = 'Reclama\xE7\xE3o';
      `);
      try {
        const tasksToUpdate = await client.query(`
          SELECT id, type, start_date, end_date, fiscalizacao_data, ouvidoria_data, recurso_rev_data 
          FROM pl_tasks 
          WHERE (type IN ('recurso_revisao', 'demanda_ouvidoria', 'fiscalizacao') 
             OR fiscalizacao_data IS NOT NULL 
             OR ouvidoria_data IS NOT NULL 
             OR recurso_rev_data IS NOT NULL)
        `);
        const recursoRevStages = ["Recebido", "Em An\xE1lise T\xE9cnica", "Encaminhado \xE0 Diretoria", "Notifica\xE7\xE3o do Usu\xE1rio", "Finalizado"];
        const ouvidoriaStages = ["Recebido", "Em An\xE1lise T\xE9cnica", "Tramitado para a Ouvidoria", "Encaminhado \xE0 Diretoria", "Retornado da Diretoria", "Finalizado"];
        const fiscStages = ["Planejamento", "Execu\xE7\xE3o", "Monitoramento", "Finalizada"];
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
            baseYear = 2022 + tId % 4;
          }
          const generateDates = (stagesList) => {
            const result = {};
            const seed = tId || 1;
            const startMonth = seed % 7;
            const startDay = seed * 7 % 18 + 1;
            const curDate = new Date(baseYear, startMonth, startDay);
            for (let i = 0; i < stagesList.length; i++) {
              const stage = stagesList[i];
              result[stage] = curDate.toISOString().split("T")[0];
              let addDays = 10;
              if (stage === "Encaminhado \xE0 Diretoria" || stage === "Tramitado para a Ouvidoria") {
                addDays = 20 + seed * 3 % 9;
              } else if (stage === "Em An\xE1lise T\xE9cnica") {
                addDays = 15 + seed * 2 % 8;
              } else if (stage === "Recebido") {
                addDays = 7 + seed % 6;
              } else {
                addDays = 8 + seed % 7;
              }
              curDate.setDate(curDate.getDate() + addDays);
            }
            return result;
          };
          if (row.type === "recurso_revisao" || row.recurso_rev_data) {
            const rev = row.recurso_rev_data || { situacao: "Recebido" };
            if (!rev.datasEtapas || Object.keys(rev.datasEtapas).length < 2) {
              rev.datasEtapas = generateDates(recursoRevStages);
              await client.query("UPDATE pl_tasks SET recurso_rev_data = $1 WHERE id = $2", [rev, tId]);
            }
          }
          if (row.type === "demanda_ouvidoria" || row.ouvidoria_data) {
            const ouv = row.ouvidoria_data || { situacao: "Recebido" };
            if (!ouv.datasEtapas || Object.keys(ouv.datasEtapas).length < 2) {
              ouv.datasEtapas = generateDates(ouvidoriaStages);
              await client.query("UPDATE pl_tasks SET ouvidoria_data = $1 WHERE id = $2", [ouv, tId]);
            }
          }
          if (row.type === "fiscalizacao" || row.fiscalizacao_data) {
            const fisc = row.fiscalizacao_data || { etapa: "Planejamento" };
            if (!fisc.datasEtapas || Object.keys(fisc.datasEtapas).length < 2) {
              fisc.datasEtapas = generateDates(fiscStages);
              await client.query("UPDATE pl_tasks SET fiscalizacao_data = $1 WHERE id = $2", [fisc, tId]);
            }
          }
        }
      } catch (errStage) {
        console.error("Erro ao popular datas das etapas no banco:", errStage);
      }
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
      await client.query(`
        ALTER TABLE re_resolutions ADD COLUMN IF NOT EXISTS imagem_capa TEXT;
      `);
      const resCheck = await client.query("SELECT COUNT(*) FROM re_resolutions");
      if (parseInt(resCheck.rows[0].count) === 0) {
        console.log("Seeding re_resolutions table...");
        const seedRows = [
          ["Resolu\xE7\xE3o", 162, 2006, "11/05/2006", "Estabelece os procedimentos para a instala\xE7\xE3o de hidr\xF4metros individualizados em condom\xEDnios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resolu\xE7\xF5es n\xBA 175, de 19 de dezembro de 2007, e n\xBA 99, de 16 de novembro de 2009.", "Revogada", "Saneamento B\xE1sico", "Medi\xE7\xE3o Individualizada", "Acess\xF3ria", "https://www.sinj.df.gov.br/sinj/Norma/52952/Resolu_o_162_11_05_2006.html"],
          ["Resolu\xE7\xE3o", 188, 2006, "24/05/2006", "Regulamenta os procedimentos para aplica\xE7\xE3o de penalidades \xE0s infra\xE7\xF5es cometidas contra os Regulamentos e Contrato de Concess\xE3o dos Servi\xE7os de Abastecimento de \xC1gua e Esgotamento Sanit\xE1rio.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Penalidades Prestador", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2006/Resolucao_188_2006_Consolidada_Resolu%C3%A7%C3%A3o_35_2024.pdf"],
          ["Resolu\xE7\xE3o", 175, 2007, "19/12/2007", "Estabelece os procedimentos para a instala\xE7\xE3o de hidr\xF4metros individualizados em condom\xEDnios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resolu\xE7\xF5es n\xBA 175, de 19 de dezembro de 2007, e n\xBA 99, de 16 de novembro de 2009.", "Revogada", "Saneamento B\xE1sico", "Medi\xE7\xE3o Individualizada", "Acess\xF3ria", "https://www.sinj.df.gov.br/sinj/Norma/56711/adasa_res_175_2007.html#art14"],
          ["Resolu\xE7\xE3o", 99, 2009, "16/11/2009", "Altera a Resolu\xE7\xE3o n\xBA 175, de 19 de dezembro de 2007, que estabelece os procedimentos para a instala\xE7\xE3o de hidr\xF4metros individualizados em cada unidade habitacional, nas edifica\xE7\xF5es verticais residenciais e nas de uso misto e nos condom\xEDnios residenciais do Distrito Federal.", "Revogada", "Saneamento B\xE1sico", "Medi\xE7\xE3o Individualizada", "Acess\xF3ria", "https://www.sinj.df.gov.br/sinj/Norma/76543/Resolu_o_99_16_11_2009.html"],
          ["Resolu\xE7\xE3o", 14, 2011, "27/10/2011", "Estabelece as condi\xE7\xF5es da presta\xE7\xE3o e utiliza\xE7\xE3o dos servi\xE7os p\xFAblicos de abastecimento de \xE1gua e de esgotamento sanit\xE1rio no Distrito Federal.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Condi\xE7\xF5es Gerais", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2011/Versao_Consolidada_Resolucao_n_14_2011.pdf"],
          ["Resolu\xE7\xE3o", 15, 2011, "10/11/2011", "Estabelece os procedimentos para a instala\xE7\xE3o de hidr\xF4metros individualizados em condom\xEDnios verticais residenciais e de uso misto no Distrito Federal. Revoga as Resolu\xE7\xF5es n\xBA 175, de 19 de dezembro de 2007, e n\xBA 99, de 16 de novembro de 2009.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Medi\xE7\xE3o Individualizada", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/Res_15_compilada.pdf"],
          ["Resolu\xE7\xE3o", 3, 2012, "13/04/2012", "Disciplina os procedimentos a serem observados nos processos administrativos instaurados pelo prestador de servi\xE7os p\xFAblicos de abastecimento de \xE1gua e de esgotamento sanit\xE1rio que tenham por objetivo a corre\xE7\xE3o de irregularidades praticadas por usu\xE1rios ou a aplica\xE7\xE3o de san\xE7\xF5es a estes.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Penalidades Usu\xE1rios", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2012/RESOLU%C3%87%C3%83O N%C2%BA 03_2012 Consolidada Site Vrs.pdf"],
          ["Resolu\xE7\xE3o", 8, 2016, "04/07/2016", "Anexo II - Informa\xE7\xF5es Peri\xF3dicas Complementares Manual de avalia\xE7\xE3o de desempenho da presta\xE7\xE3o dos servi\xE7os de abastecimento de \xE1gua e esgotamento sanit\xE1rio do Distrito Federal.", "Revogada", "Saneamento B\xE1sico", "Indicadores", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016_Anexo II.pdf"],
          ["Resolu\xE7\xE3o", 8, 2016, "04/07/2016", "Anexo I - Manual de avalia\xE7\xE3o de desempenho da presta\xE7\xE3o dos servi\xE7os de abastecimento de \xE1gua e esgotamento sanit\xE1rio do Distrito Federal.", "Revogada", "Saneamento B\xE1sico", "Indicadores", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016_Anexo I.pdf"],
          ["Resolu\xE7\xE3o", 8, 2016, "04/07/2016", "Disp\xF5e sobre a institui\xE7\xE3o da metodologia de avalia\xE7\xE3o de desempenho da presta\xE7\xE3o dos servi\xE7os p\xFAblicos de abastecimento de \xE1gua e de esgotamento sanit\xE1rio do Distrito Federal e sobre os procedimento gerais de comunica\xE7\xF5es oficiais realizadas entre a ADASA e o prestador de servi\xE7os p\xFAblicos de abastecimento de \xE1gua e esgotamento sanit\xE1rio, e d\xE1 outras provid\xEAncias.", "Revogada", "Saneamento B\xE1sico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 08_2016.pdf"],
          ["Resolu\xE7\xE3o", 9, 2016, "13/07/2016", "Estabelece as diretrizes para a constitui\xE7\xE3o, organiza\xE7\xE3o e funcionamento do Conselho de Consumidores dos Servi\xE7os P\xFAblicos de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Conselho de Consumidores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 09_2016.pdf"],
          ["Resolu\xE7\xE3o", 20, 2016, "07/11/2016", "Declara o estado de restri\xE7\xE3o de uso dos recursos h\xEDdricos, estabelece o regime de racionamento do servi\xE7o de abastecimento de \xE1gua nas localidades atendidas pelos reservat\xF3rios do Descoberto e Santa Maria.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2016/pdf_01_03_2023/Resolu%C3%A7%C3%A3o n%C2%BA 20_2016.pdf"],
          ["Resolu\xE7\xE3o", 10, 2017, "19/05/2017", "Altera o Art. 1\xBA. da Resolu\xE7\xE3o n\xB0 15, de 10 de novembro de 2011.", "Vigente", "Saneamento B\xE1sico", "Medi\xE7\xE3o Individualizada", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2017/Res_17pdf/Resolu%C3%A7%C3%A3o n%C2%BA 10_2017.pdf"],
          ["Resolu\xE7\xE3o", 21, 2017, "08/09/2017", "Declara estado de restri\xE7\xE3o de uso dos recursos h\xEDdricos e o regime de racionamento nas regi\xF5es administrativas de S\xE3o Sebasti\xE3o, Sobradinho I e II, Fercal, Planaltina e Brazl\xE2ndia, atendidas pelos sistemas isolados operados pela Companhia de Saneamento Ambiental do Distrito Federal \u2013 CAESB. (Revogada pela Resolu\xE7\xE3o n\xBA 13, de 06 de junho de 2018).", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2017/Res_17pdf/Resolu%C3%A7%C3%A3o n%C2%BA 21_2017.pdf"],
          ["Resolu\xE7\xE3o", 11, 2018, "22/05/2018", "Altera o Art. 29 da Resolu\xE7\xE3o n\xBA. 14, de 27 de outubro de 2011.", "Vigente", "Saneamento B\xE1sico", "Condi\xE7\xF5es Gerais", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2018/2018pdf/Resolu%C3%A7%C3%A3o n%C2%BA 11_2018.pdf"],
          ["Resolu\xE7\xE3o", 13, 2018, "06/06/2018", "Revoga as Resolu\xE7\xF5es ADASA n\xBA 20/2016 e 21/2017, e estabelece procedimentos complementares, a serem observados pela Concession\xE1ria, para o atendimento das Resolu\xE7\xF5es ADASA n\xBA 8/2018 e 12/2018 e d\xE1 outras provid\xEAncias.", "Vigente", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2018/2018pdf/Resolu%C3%A7%C3%A3o n%C2%BA 13_2018.pdf"],
          ["Resolu\xE7\xE3o", 3, 2019, "20/03/2019", "Estabelece diretrizes para implanta\xE7\xE3o e opera\xE7\xE3o de sistemas prediais de \xE1gua n\xE3o pot\xE1vel em edifica\xE7\xF5es residenciais.", "Revogada", "Saneamento B\xE1sico", "Sistemas N\xE3o Pot\xE1veis", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 03_2019.pdf"],
          ["Resolu\xE7\xE3o", 9, 2019, "30/09/2019", "Determina que a Companhia de Saneamento Ambiental do Distrito Federal \u2013 Caesb apresente plano para implementar medidas de restri\xE7\xE3o do abastecimento de \xE1gua em regi\xF5es atendidas por sistemas isolados e sob regime de aloca\xE7\xE3o negociada de recursos h\xEDdricos no Distrito Federal.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2016/Resolu%C3%A7%C3%A3o n%C2%BA 09_2016 Consolidada.pdf"],
          ["Resolu\xE7\xE3o", 10, 2019, "07/11/2019", "Disp\xF5e sobre a institui\xE7\xE3o da metodologia de auditoria e certifica\xE7\xE3o das informa\xE7\xF5es provenientes da presta\xE7\xE3o dos servi\xE7os p\xFAblicos de abastecimento de \xE1gua e de esgotamento sanit\xE1rio no Distrito Federal.", "Vigente", "Saneamento B\xE1sico", "Auditoria e Certifica\xE7\xE3o", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 10_2019.pdf"],
          ["Resolu\xE7\xE3o", 12, 2019, "29/11/2019", "Altera as Resolu\xE7\xF5es n\xBA 14, de 27 de outubro de 2011, n\xBA 15, de 10 de novembro de 2011 e n\xBA 6, de 26 de april de 2019 e revoga a Resolu\xE7\xE3o n\xBA 10, de 19 de mais de 2017.", "Vigente", "Saneamento B\xE1sico", "Condi\xE7\xF5es Gerais", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 12_2019.pdf"],
          ["Resolu\xE7\xE3o", 15, 2019, "20/12/2019", "Estabelece diretrizes e procedimentos para elabora\xE7\xE3o e apresenta\xE7\xE3o do Plano de Explora\xE7\xE3o dos Servi\xE7os de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal.", "Vigente com altera\xE7\xF5es", "Saneamento B\xE1sico", "Plano de Explora\xE7\xE3o", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2019/Resolu%C3%A7%C3%A3o n%C2%BA 15_2019.pdf Site.pdf"],
          ["Resolu\xE7\xE3o", 16, 2019, "23/12/2019", "Altera a Resolu\xE7\xE3o n\xBA 12, de 29 de novembro de 2019.", "Vigente", "Saneamento B\xE1sico", "Condi\xE7\xF5es Gerais", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2019/2019pdf/Resolu%C3%A7%C3%A3o n%C2%BA 16_2019.pdf"],
          ["Resolu\xE7\xE3o", 7, 2020, "07/05/2020", "Estabelece condi\xE7\xF5es excepcionais para presta\xE7\xE3o e utiliza\xE7\xE3o dos servi\xE7os p\xFAblicos de abastecimento de \xE1gua e de esgotamento sanit\xE1rio no Distrito Federal, durante a situa\xE7\xE3o de emerg\xEAncia em sa\xFAde p\xFAblica, em raz\xE3o da pandemia de COVID-19.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2020/Res_2020pdf/Resolu%C3%A7%C3%A3o n%C2%BA 07_2020 - Estabelece condi%C3%A7%C3%B5es excepcionais dos servi%C3%A7os p%C3%BAblicos, durante a situa%C3%A7%C3%A3o de emerg%C3%AAncia em sa%C3%BAde p%C3%BAblica, em raz%C3%A3o da p.pdf"],
          ["Resolu\xE7\xE3o", 15, 2020, "02/09/2020", "Altera o art. 6\xBA da Resolu\xE7\xE3o n\xBA 07, de 06 de maio de 2020.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2020/Res_2020pdf/Resolu%C3%A7%C3%A3o n%C2%BA 15_2020 - Altera o art. 6%C2%BA da Resolu%C3%A7%C3%A3o n%C2%BA 07, de 06 de maio de 2020.pdf"],
          ["Resolu\xE7\xE3o", 2, 2021, "26/03/2021", "Altera a Resolu\xE7\xE3o n\xBA 09, de 13 de julho de 2016 que estabelece as diretrizes para a constitui\xE7\xE3o, organiza\xE7\xE3o e funcionamento do Conselho de Consumidores dos Servi\xE7os P\xFAblicos de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal.", "Vigente", "Saneamento B\xE1sico", "Conselho de Consumidores", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 02_2021.pdf"],
          ["Resolu\xE7\xE3o", 6, 2021, "06/05/2021", "Revoga o inciso III do art. 4\xBA da Resolu\xE7\xE3o n.\xBA 07, de 06 de maio de 2020, e d\xE1 outras provid\xEAncias.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 06_2021.pdf"],
          ["Resolu\xE7\xE3o", 9, 2021, "19/08/2021", "Altera o inciso I do art. 4\xBA da Resolu\xE7\xE3o Adasa n\xBA 7, de 6 de maio de 2020.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 09_2021.pdf"],
          ["Resolu\xE7\xE3o", 13, 2021, "20/12/2021", "Institui o Manual de Elabora\xE7\xE3o e Avalia\xE7\xE3o dos Projetos do Programa de Pesquisa, Desenvolvimento e Inova\xE7\xE3o \u2013 Programa PDI para os Servi\xE7os de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal e define o limite m\xE1ximo de investimento autorizado.", "Vigente", "Saneamento B\xE1sico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2021/Res_pdf/Resolu%C3%A7%C3%A3o n%C2%BA 13_2021 (1).pdf"],
          ["Resolu\xE7\xE3o", 3, 2022, "26/04/2022", "Revoga a Resolu\xE7\xE3o Adasa n\xBA 7, de 6 de maio de 2020, e d\xE1 outras provid\xEAncias.", "Revogada", "Saneamento B\xE1sico", "Crise H\xEDdrica", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/res2_pdf/RESOLU%C3%87%C3%83O N%C2%BA 03_2022.pdf"],
          ["Resolu\xE7\xE3o", 5, 2022, "09/05/2022", "Estabelece diretrizes para o aproveitamento ou re\xFAso de \xE1gua n\xE3o pot\xE1vel em edifica\xE7\xF5es no Distrito Federal.", "Vigente", "Saneamento B\xE1sico", "Sistemas N\xE3o Pot\xE1veis", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/Resolucao05_09052022_.pdf"],
          ["Resolu\xE7\xE3o", 10, 2022, "26/09/2022", "Altera a Resolu\xE7\xE3o n\xBA 14, de 27 de outubro de 2011.", "Vigente", "Saneamento B\xE1sico", "Condi\xE7\xF5es Gerais", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/RESOLU%C3%87%C3%83O_N_010_2022.pdf"],
          ["Resolu\xE7\xE3o", 13, 2022, "19/12/2022", "Aprova o Plano de Explora\xE7\xE3o dos Servi\xE7os de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal e d\xE1 outras provid\xEAncias.", "Vigente", "Saneamento B\xE1sico", "Plano de Explora\xE7\xE3o", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2022/res2_pdf/RESOLU%C3%87%C3%83O%20N%C2%BA%2013_2022.pdf"],
          ["Resolu\xE7\xE3o", 17, 2023, "06/03/2023", "Altera a Resolu\xE7\xE3o n.\xBA 188, de 24 de maio de 2006.", "Vigente", "Saneamento B\xE1sico", "Penalidades Prestador", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2023/RESOLU%C3%87%C3%83O N%C2%BA 17_2023_Altera%C3%A7%C3%A3o Resolu%C3%A7%C3%A3o 188_2006_Penalidades.pdf"],
          ["Resolu\xE7\xE3o", 23, 2023, "06/07/2023", "Aprova os projetos do Programa de Pesquisa, Desenvolvimento e Inova\xE7\xE3o \u2013 PDI \u2013 Adasa/Caesb.", "Vigente", "Saneamento B\xE1sico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2023/RESOLU%C3%87%C3%83O N%C2%BA 23.23_ PDI1.pdf"],
          ["Resolu\xE7\xE3o", 21, 2023, "17/07/2023", "Altera a Resolu\xE7\xE3o n\xBA 03, de 13 de abril de 2012.", "Vigente", "Saneamento B\xE1sico", "Penalidades Usu\xE1rios", "Acess\xF3ria", "https://www.adasa.df.gov.br/images/storage/legislacao/Res_ADASA/2023/RESOLU%C3%87%C3%83O N%C2%BA 21_2023 Vers%C3%A3o Final Republicada.pdf"],
          ["Resolu\xE7\xE3o", 25, 2023, "17/08/2023", "Estabelece procedimentos gerais para execu\xE7\xE3o integrada das atividades de inspe\xE7\xE3o, identifica\xE7\xE3o e corre\xE7\xE3o dos lan\xE7amentos irregulares de esgotos sanit\xE1rios ou outros efluentes no sistema p\xFAblico de drenagem e manejo de \xE1guas pluviais urbanas e de \xE1guas pluviais no sistema p\xFAblico de esgotamento sanit\xE1rio.", "Vigente", "Saneamento B\xE1sico", "Interface Esgoto Drenagem", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2023/RESOLU%C3%87%C3%83O N%C2%BA 25-2023.pdf"],
          ["Resolu\xE7\xE3o", 41, 2024, "24/10/2024", "Estabelece, no Distrito Federal, as metas progressivas de universaliza\xE7\xE3o de abastecimento de \xE1gua e de esgotamento sanit\xE1rio, indicadores de acesso e sistema de avalia\xE7\xE3o, em ado\xE7\xE3o \xE0 Norma de Refer\xEAncia n\xBA 8/2024, da Ag\xEAncia Nacional de \xC1guas e Saneamento B\xE1sico \u2013 ANA.", "Vigente", "Saneamento B\xE1sico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2024/RESOLU%C3%87%C3%83O_N%C2%BA_41_2024_-_Ado%C3%A7%C3%A3o_da_Norma_de_Refer%C3%AAncia_n%C2%BA_8-2024_ANA_1.pdf"],
          ["Resolu\xE7\xE3o", 48, 2024, "23/12/2024", "Estabelece diretrizes e procedimentos para a execu\xE7\xE3o das atividades realizadas por caminh\xF5es limpa-fossa no Distrito Federal e d\xE1 outras provid\xEAncias", "Vigente", "Saneamento B\xE1sico", "Caminh\xF5es Limpa-fossa", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2024/SEI_159268953_Resolucao_48_3.pdf"],
          ["Resolu\xE7\xE3o", 57, 2025, "06/10/2025", "Aprova os projetos do Programa de Pesquisa, Desenvolvimento e Inova\xE7\xE3o \u2013 PDI \u2013 Adasa/Caesb, para os Servi\xE7os de Abastecimento de \xC1gua e de Esgotamento Sanit\xE1rio do Distrito Federal, apresentados pela Concession\xE1ria, nos termos da Resolu\xE7\xE3o n\xBA 13, de 20 de dezembro de 2021.", "Vigente", "Saneamento B\xE1sico", "PDI", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_183620524_Resolucao_57.pdf"],
          ["Resolu\xE7\xE3o", 58, 2025, "05/11/2025", "Disp\xF5e sobre as solu\xE7\xF5es alternativas de abastecimento de \xE1gua e de esgotamento sanit\xE1rio, individuais e coletivas, quando configuradas como servi\xE7o p\xFAblico ou a\xE7\xF5es de saneamento de responsabilidade privada, e sua contabiliza\xE7\xE3o para fins de cumprimento das metas de universaliza\xE7\xE3o no Distrito Federal, e d\xE1 outras provid\xEAncias.", "Vigente", "Saneamento B\xE1sico", "Solu\xE7\xF5es Alternativas", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_186418676_Resolucao_58.pdf"],
          ["Resolu\xE7\xE3o", 59, 2025, "12/11/2025", "Disp\xF5e sobre indicadores operacionais da presta\xE7\xE3o dos servi\xE7os p\xFAblicos de abastecimento de \xE1gua e esgotamento sanit\xE1rio no Distrito Federal, em ado\xE7\xE3o \xE0 Norma de Refer\xEAncia n\xBA 9/2024, da Ag\xEAncia Nacional de \xC1guas e Saneamento B\xE1sico.", "Vigente", "Saneamento B\xE1sico", "Indicadores", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_187086634_Resolucao_59.pdf"],
          ["Resolu\xE7\xE3o", 65, 2025, "05/12/2025", "Altera as Resolu\xE7\xF5es n\xBA 03, de 13 de abril de 2012, n\xBA 21, de 17 de julho de 2023 e n\xBA 14, de 27 de outubro de 2011.", "Vigente", "Saneamento B\xE1sico", "Penalidades Usu\xE1rios", "Principal", "https://www.adasa.df.gov.br/images/storage/legislacao/resolucoes_adasa/2025/SEI_189034238_Resolucao_65.pdf"]
        ];
        for (const row of seedRows) {
          await client.query(
            "INSERT INTO re_resolutions (especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            row
          );
        }
        console.log("Seeding re_resolutions completed successfully!");
      }
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
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'N\xE3o Conclu\xEDda';");
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS entrega TEXT;");
      await client.query("ALTER TABLE re_agenda_tasks ADD COLUMN IF NOT EXISTS entrega_link TEXT;");
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
          imagem_capa TEXT,
          formato_capa VARCHAR(20) DEFAULT 'retrato'
        );
      `);
      await client.query(`
        ALTER TABLE pu_publications ADD COLUMN IF NOT EXISTS imagem_capa TEXT;
        ALTER TABLE pu_publications ADD COLUMN IF NOT EXISTS formato_capa VARCHAR(20) DEFAULT 'retrato';
      `);
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
          meio_participacao VARCHAR(100) DEFAULT 'Consulta P\xFAblica',
          title TEXT,
          objeto TEXT,
          dataInicio VARCHAR(50),
          dataFim VARCHAR(50),
          createdAt VARCHAR(50)
        );
      `);
      await client.query(`
        ALTER TABLE re_participations ADD COLUMN IF NOT EXISTS meio_participacao VARCHAR(100) DEFAULT 'Consulta P\xFAblica';
        ALTER TABLE re_participations ADD COLUMN IF NOT EXISTS tipo_resolucao VARCHAR(50) DEFAULT 'nova';
        ALTER TABLE re_participations ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb;
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS re_participation_attachments (
          id SERIAL PRIMARY KEY,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,
          name TEXT,
          url TEXT,
          category VARCHAR(100)
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS re_resolution_participations (
          resolution_id INTEGER REFERENCES re_resolutions(id) ON DELETE CASCADE,
          participation_id INTEGER REFERENCES re_participations(id) ON DELETE CASCADE,
          PRIMARY KEY (resolution_id, participation_id)
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
      await client.query(`
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS final_text TEXT;
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS final_justification TEXT;
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text';
        ALTER TABLE re_participation_articles ADD COLUMN IF NOT EXISTS subject_ids JSONB DEFAULT '[]'::jsonb;
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
      await client.query(`
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS decision VARCHAR(50) DEFAULT NULL;
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS complexity VARCHAR(50) DEFAULT NULL;
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS technical_justification TEXT DEFAULT NULL;
        ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
      `);
      try {
        await client.query(`
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS user_id INTEGER;
        `);
        const hasAuthorNameCol = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 're_participation_contributions' AND column_name = 'author_name';
        `);
        if (hasAuthorNameCol.rows.length > 0) {
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
              const fakeEmail = `${authorName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@adasa.df.gov.br`;
              const checkEmail = await client.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1) LIMIT 1", [fakeEmail]);
              if (checkEmail.rows.length > 0) {
                uid = checkEmail.rows[0].id;
              } else {
                const insUser = await client.query(
                  "INSERT INTO au_users (name, email, password, role_id, status) VALUES ($1, $2, $3, 'provider', 'active') RETURNING id",
                  [authorName, fakeEmail, await hashPassword("1234")]
                );
                uid = insUser.rows[0].id;
              }
            }
            if (uid) {
              await client.query("UPDATE re_participation_contributions SET user_id = $1 WHERE user_id IS NULL AND author_name = $2", [uid, row.author_name]);
            }
          }
          await client.query(`
            UPDATE re_participation_contributions 
            SET user_id = (SELECT id FROM au_users ORDER BY id ASC LIMIT 1) 
            WHERE user_id IS NULL;
          `);
          await client.query(`
            DELETE FROM re_participation_contributions c1
            WHERE c1.id NOT IN (
              SELECT MAX(c2.id)
              FROM re_participation_contributions c2
              GROUP BY c2.article_id, c2.user_id
            );
          `);
        }
        await client.query(`
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS author_name TEXT;
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS author_email TEXT;
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS author_institution TEXT;
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS origin_type VARCHAR(50) DEFAULT 'online';
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS protocol_number TEXT;
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS registered_by_id INTEGER;
          ALTER TABLE re_participation_contributions ADD COLUMN IF NOT EXISTS registered_by_name TEXT;
          ALTER TABLE re_participation_contributions DROP CONSTRAINT IF EXISTS unique_user_article_contribution;
        `);
      } catch (migErr) {
        console.error("Erro na migra\xE7\xE3o de re_participation_contributions:", migErr);
      }
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
          ["Relat\xF3rio de Atividades de 2019", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2019.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2019", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/REL_ATIVIDADES_SAE_2019.pdf", ""],
          ["Relat\xF3rio de Atividades de 2020", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2020.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2020", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/RELATORIO_DE_ATIVIDADES_SAE_2020vf.pdf", ""],
          ["Relat\xF3rio de Atividades de 2021", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2021", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2021", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2021_SAE_RELATORIO_DE_ATIVIDADES_SAE.pdf", ""],
          ["Relat\xF3rio de Atividades de 2022", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2022.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2022", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/Relat%C3%B3rio%20Final%20de%20Atividades%202022.pdf", ""],
          ["Relat\xF3rio de Atividades de 2023", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2023.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2023", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2023_SAE_RelatorioAtividades.pdf", ""],
          ["Relat\xF3rio de Atividades de 2024", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2024.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2024", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/INFORMATIVOS/2024Sae_RelatorioAtividadesSAE_2024.pdf", ""],
          ["Relat\xF3rio de Atividades de 2025", "Documento institucional que consolida as a\xE7\xF5es, fiscaliza\xE7\xF5es e resultados regulat\xF3rios da SAE/Adasa ao longo do ano de 2025.", "Relat\xF3rio de Atividades", "Superintend\xEAncia", "31/12/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/SAE/Relatorio%20de%20atividades/Relat%C3%B3rio_%20SAE_Impress%C3%A3o%20(1)_compressed%20(1).pdf", ""],
          ["Boletim Informativo 04-25 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 4\xBA trimestre de 2025.", "Boletim", "Superintend\xEAncia", "31/12/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim4Trimestre_2025.pdf", ""],
          ["Boletim Informativo 03-25 (Julho a Setembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 3\xBA trimestre de 2025.", "Boletim", "Superintend\xEAncia", "30/09/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim_3_Trimestre_2025_compressed.pdf", ""],
          ["Boletim Informativo 02-25 (Abril a Junho)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 2\xBA trimestre de 2025.", "Boletim", "Superintend\xEAncia", "30/06/2025", "https://www.canva.com/design/DAGsfRNxAq4/510wjGIwRs4e1zSbPNcUrA/view?utm_content=DAGsfRNxAq4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3886a200ef", ""],
          ["Boletim Informativo 01-25 (Janeiro a Mar\xE7o)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 1\xBA trimestre de 2025.", "Boletim", "Superintend\xEAncia", "31/03/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/Boletim_1_Trimestre_2025_compressed.pdf", ""],
          ["Boletim Informativo 04-24 (outubro a dezembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 4\xBA trimestre de 2024.", "Boletim", "Superintend\xEAncia", "31/12/2024", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/Boletim_Informativo/BoletimInformativo_042024.pdf", ""],
          ["Boletim Informativo 03-24 (julho a setembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 3\xBA trimestre de 2024.", "Boletim", "Superintend\xEAncia", "30/09/2024", "https://sway.cloud.microsoft/hqMgrAW5pNJLSICc", ""],
          ["Boletim informativo 02-24 (abril a junho)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 2\xBA trimestre de 2024.", "Boletim", "Superintend\xEAncia", "30/06/2024", "https://sway.cloud.microsoft/DjbaBR2OJBB08TAq?ref=Link", ""],
          ["Boletim informativo 01-24 (janeiro a mar\xE7o)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 1\xBA trimestre de 2024.", "Boletim", "Superintend\xEAncia", "31/03/2024", "https://sway.cloud.microsoft/tFVgNJkXYuODX76t?ref=Link", ""],
          ["Boletim Informativo 04-23 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 4\xBA trimestre de 2023.", "Boletim", "Superintend\xEAncia", "31/12/2023", "https://sway.cloud.microsoft/982okByINhIRKXBg?ref=Link", ""],
          ["Boletim Informativo 03-23 (Julho a Setembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 3\xBA trimestre de 2023.", "Boletim", "Superintend\xEAncia", "30/09/2023", "https://sway.office.com/v3lJyMVb2wdZfDDB", ""],
          ["Boletim Informativo 02-23 (Abril a Junho)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 2\xBA trimestre de 2023.", "Boletim", "Superintend\xEAncia", "30/06/2023", "https://sway.office.com/WXWWGwTMGG8HrqjH?ref=Link", ""],
          ["Boletim Informativo 01-23 (Janeiro a Mar\xE7o)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 1\xBA trimestre de 2023.", "Boletim", "Superintend\xEAncia", "31/03/2023", "https://sway.office.com/Mp1OOSARmKY3b0wD?ref=Link", ""],
          ["Boletim Informativo 04-22 (Outubro a Dezembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 4\xBA trimestre de 2022.", "Boletim", "Superintend\xEAncia", "31/12/2022", "https://sway.office.com/CNYGM13GpAQBiWrE?ref=Link", ""],
          ["Boletim Informativo 03-22 (Julho a Setembro)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 3\xBA trimestre de 2022.", "Boletim", "Superintend\xEAncia", "30/09/2022", "https://sway.office.com/Fbk1IoE0wn0UnqCt?ref=Link&loc=play", ""],
          ["Boletim Informativo 02-22 (Abril a Junho)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 2\xBA trimestre de 2022.", "Boletim", "Superintend\xEAncia", "30/06/2022", "https://sway.office.com/zLQuLewHExlA4O0h?ref=Link", ""],
          ["Boletim Informativo 01-22 (Janeiro a Mar\xE7o)", "Boletim informativo trimestral da Coordena\xE7\xE3o de Regula\xE7\xE3o (CORA/SAE), contendo os principais destaques e acompanhamentos do 1\xBA trimestre de 2022.", "Boletim", "Superintend\xEAncia", "31/03/2022", "https://sway.office.com/Y3Pga8w5dJTowi3g?ref=Link&loc=play", ""],
          ["Informativo - Resolu\xE7\xE3o n\xBA 13/2021", "Documento explicativo contendo os destaques, diretrizes e o impacto regulat\xF3rio trazido pela Resolu\xE7\xE3o n\xBA 13/2021.", "Informativo", "Regula\xE7\xE3o", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20Res%20132021%20-%20Pesquisa,%20Desenvolvimento%20e%252520Inovacao_compressed.pdf", "Tema: Pesquisa, Desenvolvimento e Inova\xE7\xE3o."],
          ["Resolu\xE7\xE3o n. 14/2011: Condi\xE7\xF5es Gerais da Presta\xE7\xE3o dos Servi\xE7os", "Normativo oficial que estabelece as regras, os direitos e os deveres relativos aos servi\xE7os de abastecimento de \xE1gua e esgoto.", "Resolu\xE7\xE3o", "Regula\xE7\xE3o", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20-%20Resolu%C3%A7%C3%A3o%20n.%2014-2011-Condicoes%20Gerais%2520(2).pdf", "Abastecimento de \xC1gua e Esgoto."],
          ["Informativo Resolu\xE7\xE3o 15/2011 - Hidrometra\xE7\xE3o Individualizada", "Material did\xE1tico voltado a esclarecer as regras e procedimentos para a instala\xE7\xE3o de hidr\xF4metros individuais em condom\xEDnios.", "Informativo", "Regula\xE7\xE3o", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%2520Resolu%25C3%25A7%25C3%25A3o%252015-2011-Hidrometra%25C3%25A7%25C3%25A3o%2520Individualizada.pdf", "-"],
          ["Informativo \u2013 H\xE1bitos de consumo para economia de \xE1gua", "Cartilha de conscientiza\xE7\xE3o com dicas pr\xE1ticas para a popula\xE7\xE3o reduzir o desperd\xEDcio de \xE1gua no dia a dia.", "Informativo", "Regula\xE7\xE3o", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%2520-%2520H%25C3%25A1bitos%2520de%25252520consumo%2520para%2520economia%2520de%2520%25C3%25A1gua%2520(1).pdf", "-"],
          ["Guia de Conserva\xE7\xE3o e Gest\xE3o da \xC1gua em Edifica\xE7\xF5es \u2013 Vol. I", "Primeiro volume do manual t\xE9cnico focado em estrat\xE9gias de gest\xE3o da demanda para otimizar o uso da \xE1gua em pr\xE9dios e resid\xEAncias.", "Guia", "Regula\xE7\xE3o", "01/01/2024", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/guia_conserva%C3%A7%C3%A3o_v2/ADASA_VOL1_GuiaConservacaoGestaoAguaEdificacoes.pdf", "Foco: Gest\xE3o da Demanda."],
          ["Guia de Conserva\xE7\xE3o e Gest\xE3o da \xC1gua em Edifica\xE7\xF5es \u2013 Vol. II", "Segundo volume do manual t\xE9cnico, aprofundando-se na ado\xE7\xE3o de fontes alternativas de \xE1gua para edifica\xE7\xF5es.", "Guia", "Regula\xE7\xE3o", "01/01/2024", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/guia_conserva%C3%A7%C3%A3o_v2/ADASA_VOL2_GuiaConservacaoGestaoAguaEdificacoes.pdf", "Foco: Fontes Alternativas."],
          ["Informativo - Sistemas prediais de \xE1gua n\xE3o pot\xE1vel", "Orienta\xE7\xF5es t\xE9cnicas e de seguran\xE7a para a instala\xE7\xE3o e o uso de \xE1guas destinadas a fins menos restritivos (como lavagem de pisos e descargas).", "Informativo", "Regula\xE7\xE3o", "01/01/2025", "https://samediasites.blob.core.windows.net/hotsites-wp-media/Publicacoes/Informativo%20-%20Sistemas%20prediais%20de%20%C3%A1gua%20n%C3%A3o%20pot%C3%A1vel.pdf", "-"],
          ["Informativo - Pr\xEAmio Guardi\xE3o da \xC1gua 2026", "Material de divulga\xE7\xE3o contendo as regras, os prazos ou os vencedores do pr\xEAmio ambiental referente ao ano de 2026.", "Informativo", "Regula\xE7\xE3o", "01/01/2026", "https://samediasites.blob.core.windows.net/hotsites-wp-media/SAE/Informativo%20-%20Pr%C3%AAmio%20Guardi%C3%A3o%20da%20%C3%81gua%202026.pdf", "-"],
          ["Guia de Orienta\xE7\xF5es \u2013 Poupa-DF", 'Manual instrutivo vinculado ao programa governamental "Poupa-DF", com foco no uso racional de recursos h\xEDdricos.', "Guia", "Regula\xE7\xE3o", "01/01/2019", "https://drive.google.com/file/d/0Bz4P1U7JZbO9MktJX1lra3FCSTEyWWdoWlFuS1NOQnB1V3lz/view", "Hospedado no Google Drive."],
          ["Guia de Orienta\xE7\xE3o ao Usu\xE1rio - Vers\xE3o Atualizada", "Cartilha detalhada com os direitos, os deveres e os canais de comunica\xE7\xE3o dispon\xEDveis para os consumidores regulados.", "Guia", "Atendimento", "01/01/2025", "https://drive.google.com/file/d/1Jvy4m-qvxf0169caUXBV7GsjQqrfsFlp/view", "-"],
          ["Folder r\xE1pido - Orienta\xE7\xF5es b\xE1sicas ao usu\xE1rio", "Material de leitura r\xE1pida (panfleto) resumindo as instru\xE7\xF5es mais essenciais de atendimento ao p\xFAblico.", "Guia", "Atendimento", "01/01/2025", "https://www.canva.com/design/DAGgNFnH9Hc/lQDFuuSl5Oj5Rtb8e5J96A/view?utm_content=DAGgNFnH9Hc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc1ec86d8bd", "Hospedado no Canva."],
          ["Informativo \u2013 Entenda sua tarifa", "Documento did\xE1tico que explica a composi\xE7\xE3o da conta de \xE1gua, as faixas de consumo e os crit\xE9rios de cobran\xE7a.", "Informativo", "Atendimento", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/publicacoes_adasa/26-12-2024/Informativo%20-%20Entenda%20sua%20tarifa%20(1).pdf", "Data inferida pela URL do arquivo."],
          ["Informativo Qualidade da \xC1gua", "Relat\xF3rio ou material de transpar\xEAncia sobre os par\xE2metros, testes e resultados referentes \xE0 potabilidade da \xE1gua fornecida.", "Informativo", "Fiscaliza\xE7\xE3o", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/publicacoes/Informativo_Qualidade_da_%C3%81gua_2_compressed.pdf", "-"],
          ["Informativo Esgotamento Sanit\xE1rio", "Material educativo e t\xE9cnico sobre a coleta e o tratamento de esgotos, destacando sua import\xE2ncia sanit\xE1ria e ambiental.", "Informativo", "Fiscaliza\xE7\xE3o", "01/01/2025", "https://www.adasa.df.gov.br/images/storage/area_de_atuacao/abastecimento_agua_esgotamento_sanitario/publicacoes/Informativo_Esgotamento_Sanit%C3%A1rio_1_compressed.pdf", "-"],
          ["AVALIA\xC7\xC3O DA CONTINUIDADE DO FORNECIMENTO DE \xC1GUA EM SITUA\xC7\xC3O DE ESCASSEZ H\xCDDRICA", "Estudo t\xE9cnico que analisa a resili\xEAncia e a manuten\xE7\xE3o do abastecimento durante per\xEDodos prolongados de seca.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016684/AVALIA%C3%87%C3%83O_DA_CONTINUIDADE_DO_FORNECIMENTO_DE_%C3%81GUA_EM_SITUA%C3%87%C3%83O_DE_ESCASSEZ_H%C3%8DDRICA", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["SIMULA\xC7\xC3O DE CEN\xC1RIOS DE SEGURAN\xC7A H\xCDDRICA DO SISTEMA BRAZL\xC2NDIA-DF", "Artigo prospectivo que modela e prev\xEA diferentes situa\xE7\xF5es de oferta e demanda de recursos h\xEDdricos na regi\xE3o de Brazl\xE2ndia.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016761/SIMULA%C3%87%C3%83O_DE_CEN%C3%81RIOS_DE_SEGURAN%C3%87A_H%C3%8DDRICA_DO_SISTEMA_BRAZL%C3%82NDIA_DF", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["REVIS\xC3O DA NORMA DE APLICA\xC7\xC3O DE PENALIDADES: EXPERI\xCANCIA DA ADASA-DF", "Relato t\xE9cnico-institucional detalhando o processo de atualiza\xE7\xE3o e aprimoramento das regras de san\xE7\xE3o e multas pela Ag\xEAncia Reguladora.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109016987/REVIS%C3%83O_DA_NORMA_DE_APLICA%C3%87%C3%83O_DE_PENALIDADES_EXPERI%C3%8ANCIA_DA_ADASA_DF", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["O RE\xDASO DE \xC1GUAS E O DESAFIO DA EFETIVIDADE EM SUA REGULAMENTA\xC7\xC3O E MONITORAMENTO", "Artigo sobre os entraves t\xE9cnicos e legais na cria\xE7\xE3o de normas eficientes para o reaproveitamento da \xE1gua.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109019695/O_RE%C3%9ASO_DE_%C3%81GUAS_E_O_DESAFIO_DA_EFETIVIDADE_EM_SUA_REGULAMENTA%C3%87%C3%83O_E_MONITORAMENTO", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["METODOLOGIA DE GEST\xC3O DE RISCO PARA AN\xC1LISE DA SEGURAN\xC7A H\xCDDRICA DE ZONAS URBANAS", "Proposta metodol\xF3gica voltada a identificar, calcular e mitigar riscos de desabastecimento em \xE1reas densamente povoadas.", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109019855/METODOLOGIA_DE_GEST%C3%83O_DE_RISCO_PARA_AN%C3%81LISE_DA_SEGURAN%C3%87A_H%C3%8DDRICA_DE_ZONAS_URBANAS", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["REVIS\xC3O DE NORMA SOBRE PROCEDIMENTOS DE APLICA\xC7\xC3O DE PENALIDADES AOS USU\xC1RIOS...", "Estudo focado na atualiza\xE7\xE3o do processo administrativo de multas aplicadas diretamente aos consumidores finais (ex: fraudes).", "Artigo", "Leandro Oliveira et al.", "01/01/2023", "https://www.academia.edu/109020002/REVIS%C3%83O_DE_NORMA_SOBRE_PROCEDIMENTOS_DE_APLICA%C3%87%C3%83O_DE_PENALIDADES_AOS_USU%C3%81RIOS_DOS_SERVI%C3%87OS_DE_%C3%81GUA_E_ESGOTO", "AESabesp."],
          ["APLICA\xC7\xC3O COMPLETA DA METODOLOGIA ACERTAR NO DISTRITO FEDERAL", "An\xE1lise da implanta\xE7\xE3o da padroniza\xE7\xE3o nacional (Metodologia ACERTAR) para auditoria de dados de saneamento no DF.", "Artigo", "Leandro Oliveira et al.", "01/01/2021", "https://www.academia.edu/109020114/APLICA%C3%87%C3%83O_COMPLETA_DA_METODOLOGIA_ACERTAR_NO_DISTRITO_FEDERAL", "Congresso Brasileiro de Regula\xE7\xE3o."],
          ["APLICA\xC7\xC3O DE METODOLOGIA DE GEST\xC3O DE RISCO PARA AN\xC1LISE DA SEGURAN\xC7A H\xCDDRICA...", "Estudo de caso acad\xEAmico testando na pr\xE1tica um modelo de gest\xE3o para evitar ou lidar com a falta d'\xE1gua.", "Artigo", "Leandro Oliveira et al.", "01/01/2020", "https://www.academia.edu/109016547/APLICA%C3%87%C3%83O_DE_METODOLOGIA_DE_GEST%C3%83O_DE_RISCO_PARA_AN%C3%81LISE_DA_SEGURAN%C3%87A_H%C3%8DDRICA_DE_ZONAS_URBANAS_O_CASO_DE_BRAZL%C3%82NDIA_DF", "Congresso Brasileiro de Regula\xE7\xE3o."],
          ["PERSPECTIVAS DA IMPLEMENTA\xC7\xC3O DA COBRAN\xC7A PELO USO DOS RECURSOS H\xCDDRICOS NO DF", "Avalia\xE7\xE3o econ\xF4mica e regulat\xF3ria sobre a viabilidade e os impactos de se cobrar pela capta\xE7\xE3o de \xE1gua bruta no Distrito Federal.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020259/PERSPECTIVAS_DA_IMPLEMENTA%C3%87%C3%83O_DA_COBRAN%C3%87A_PELO_USO_DOS_RECURSOS_H%C3%8DDRICOS_NO_DISTRITO_FEDERAL", "Simp\xF3sio Brasileiro de Recursos H\xEDdricos."],
          ["REGULAMENTA\xC7\xC3O DO RE\xDASO DE \xC1GUAS CINZAS E APROVEITAMENTO DE \xC1GUAS PLUVIAIS...", "Documento t\xE9cnico/normativo contendo as exig\xEAncias para captar chuvas e reaproveitar \xE1guas de chuveiro/pias de forma segura.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/40255809/REGULAMENTA%C3%87%C3%83O_DO_RE%C3%9ASO_DE_%C3%81GUAS_CINZAS_E_APROVEITAMENTO_DE_%C3%81GUAS_PLUVIAIS_EM_EDIFICA%C3%87%C3%95ES_RESIDENCIAIS_A_EXPERI%C3%8ANCIA_DO_DF", "Regulamenta\xE7\xE3o do Re\xFAso de \xC1guas Cinzas..."],
          ["FISCALIZA\xC7\xC3O INDIRETA DA PRESTA\xC7\xC3O DOS SERVI\xC7OS DE ABASTECIMENTO DE \xC1GUA E ESGOTO NO DF", "Estudo focado nas metodologias de acompanhamento das concession\xE1rias sem necessidade de vistorias de campo (via indicadores).", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/40255787/FISCALIZA%C3%87%C3%83O_INDIRETA_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_DE_ABASTECIMENTO_DE_%C3%81GUA_E_ESGOTO_NO_DISTRITO_FEDERAL", "Congresso de Regula\xE7\xE3o, ABAR."],
          ["AUDITORIA E CERTIFICA\xC7\xC3O DE INFORMA\xC7\xD5ES: ESTUDO PILOTO (PROJETO ACERTAR)", "Relat\xF3rio da fase inicial de testes do Projeto ACERTAR para garantir a confiabilidade das informa\xE7\xF5es reportadas pelas concession\xE1rias.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020410/AUDITORIA_E_CERTIFICA%C3%87%C3%83O_DE_INFORMA%C3%87%C3%95ES_ESTUDO_PILOTO_DE_APLICA%C3%87%C3%83O_DA_METODOLOGIA_DO_PROJETO_ACERTAR", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["AVALIA\xC7\xC3O DA SATISFA\xC7\xC3O DOS USU\xC1RIOS DOS SERVI\xC7OS DE \xC1GUA E ESGOTO NO DF...", "Resultados ou metodologia de pesquisas de percep\xE7\xE3o aplicadas para medir a qualidade do servi\xE7o na vis\xE3o do consumidor.", "Artigo", "Leandro Oliveira et al.", "01/01/2019", "https://www.academia.edu/109020655/AVALIA%C3%87%C3%83O_DA_SATISFA%C3%87%C3%83O_DOS_USU%C3%81RIOS_DOS_SERVI%C3%87OS_DE_%C3%81GUA_E_ESGOTO_NO_DISTRITO_FEDERAL_%C3%80_LUZ_DE_UMA_FISCALIZA%C3%87%C3%83O_ESTRAT%C3%89GICA", "Congresso Brasileiro de Regula\xE7\xE3o, ABAR."],
          ["MECANISMOS ADOTADOS PELO DISTRITO FEDERAL NO COMBATE \xC0 CRISE H\xCDDRICA", "Retrospectiva anal\xEDtica das pol\xEDticas p\xFAblicas, contingenciamentos e medidas de gest\xE3o tomadas historicamente em \xE9pocas de estiagem grave.", "Artigo", "Leandro Oliveira et al.", "01/01/2018", "https://www.academia.edu/109020698/MECANISMOS_ADOTADOS_PELO_DISTRITO_FEDERAL_NO_COMBATE_%C3%80_CRISE_%C3%8DDRICA", "XXXVI Congreso Interamericano de Ingenier\xEDa Sanit\xE1ria."],
          ["MONITORAMENTO DA PRESTA\xC7\xC3O DOS SERVI\xC7OS P\xDABLICOS DE \xC1GUA E ESGOTO", "Material acad\xEAmico que descreve as pr\xE1ticas, os indicadores e os desafios do controle cont\xEDnuo exercido sobre as prestadoras do servi\xE7o.", "Artigo", "Leandro Oliveira et al.", "01/01/2018", "https://www.academia.edu/109021429/MONITORAMENTO_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_P%C3%9ABLICOS_DE_%C3%81GUA_E_ESGOTO", "Livro: Gest\xE3o da Crise H\xEDdrica."],
          ["MEDI\xC7\xC3O INDIVIDUALIZADA EM EDIFICA\xC7\xD5ES NO DF: AN\xC1LISE DO POTENCIAL DE REDU\xC7\xC3O...", "Investiga\xE7\xE3o emp\xEDrica quantificando a economia de \xE1gua gerada ap\xF3s a instala\xE7\xE3o de hidr\xF4metros separados por unidade em condom\xEDnios.", "Artigo", "Leandro Oliveira et al.", "01/01/2017", "https://www.academia.edu/109021262/MEDI%C3%87%C3%83O_INDIVIDUALIZADA_EM_EDIFICA%C3%87%C3%95ES_NO_DISTRITO_FEDERAL_UMA_AN%C3%81LISE_DO_POTENCIAL_DE_REDU%C3%87%C3%83O_NO_CONSUMO_DE_%C3%81GUA", "SILUBESA."],
          ["MANUAL DE AVALIA\xC7\xC3O DE DESEMPENHO DA PRESTA\xC7\xC3O DOS SERVI\xC7OS DE ABASTECIMENTO...", "Guia estruturado de m\xE9tricas, crit\xE9rios t\xE9cnicos e f\xF3rmulas operacionais para julgar a efici\xEAncia das concession\xE1rias de saneamento.", "Artigo", "Leandro Oliveira et al.", "01/01/2015", "https://www.academia.edu/109020818/MANUAL_DE_AVALIA%C3%87%C3%83O_DE_DESEMPENHO_DA_PRESTA%C3%87%C3%83O_DOS_SERVI%C3%87OS_DE_ABASTECIMENTO_DE_%C3%81GUA_E_ESGOTAMENTO_SANIT%C3%81RIO_DO_DISTRITO_FEDERAL", "Congresso Brasileiro de Regula\xE7\xE3o."]
        ];
        for (const row of pubSeedRows) {
          await client.query(
            "INSERT INTO pu_publications (titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            row
          );
        }
        console.log("Seeding pu_publications completed successfully!");
      }
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
            "Revis\xE3o da Resolu\xE7\xE3o n. 14/2011 - Crit\xE9rios adicionais a norma de refer\xEAncia da ANA",
            "Revis\xE3o da norma de condi\xE7\xF5es gerais do servi\xE7o levantadas pela prestadora, que n\xE3o est\xE3o relacionadas a norma de refer\xEAncia da ANA e que necessitam de estudos adicionais aos j\xE1 realizados no momento.",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Melhoria da presta\xE7\xE3o dos servi\xE7os de \xE1gua e de esgoto aos usu\xE1rios",
            "Alta (1 a 2 anos)",
            "",
            "Selecionado",
            "OK"
          ],
          [
            "Revis\xE3o dos Decretos de Instala\xE7\xF5es Prediais de \xC1gua e de Esgoto",
            "Moderniza\xE7\xE3o das Normas de Instala\xE7\xF5es Prediais de \xC1gua e Esgoto (Substitui\xE7\xE3o dos Decretos n\xBA 5.555/1980 e 5.631/1980)",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Moderniza\xE7\xE3o do arcabou\xE7o regulat\xF3rio",
            "Alta (1 a 2 anos)",
            "",
            "Selecionado",
            "Ok"
          ],
          [
            "Estudo de Proje\xE7\xE3o Populacional e Consumo de \xC1gua Tratada por Regi\xE3o Administrativa",
            "Estudo de proje\xE7\xE3o da popula\xE7\xE3o do DF por regi\xE3o administrativa e estudo do consumo de \xE1gua per capita por RA, visando atualizar as proje\xE7\xF5es do balan\xE7o h\xEDdrico dos sistemas de abastecimento de \xE1gua e de esgoto.",
            "Regula\xE7\xE3o (CORA)",
            "Balan\xE7o H\xEDdrico dos Sistemas de Abastecimento de \xC1gua e de Esgoto",
            "Atualiza\xE7\xE3o das proje\xE7\xF5es do balan\xE7o h\xEDdrico dos sistemas",
            "Alta (1 a 2 anos)",
            "Atualmente as proje\xE7\xF5es populacionais e de consumo de \xE1gua do balan\xE7o h\xEDdrico est\xE3o desatualizadas o que reflete diretamente na demanda dos sistemas e nas necessidades de investimentos, afetando diretamente a seguran\xE7a h\xEDdrica",
            "Eleg\xEDvel",
            ""
          ],
          [
            "Projeto de Resolu\xE7\xE3o em Adequa\xE7\xE3o a Norma de Refer\xEAncia de Re\xFAso de Efluente de Esgoto Tratado e Re\xFAso Agr\xEDcola (junto com SRH)",
            "Normativo para estabelecer diretrizes regulat\xF3rias para impulsionar e padronizar a utiliza\xE7\xE3o n\xE3o pot\xE1vel de \xE1gua proveniente de Esta\xE7\xF5es de Tratamento de Esgoto (ETEs) no DF",
            "Regula\xE7\xE3o (CORA)",
            "Norma de refer\xEAncia da ANA",
            "Ado\xE7\xE3o da norma de refer\xEAncia",
            "Alta (1 a 2 anos)",
            "NR Prevista para 2\xBA/2026",
            "Eleg\xEDvel",
            "OK"
          ],
          [
            "Projeto de Resolu\xE7\xE3o em Adequa\xE7\xE3o a Norma de Refer\xEAncia para Redu\xE7\xE3o Progressiva e Controle de Perdas de \xC1gua",
            "A Norma de Refer\xEAncia n\xBA 15/2025 estabelece as diretrizes para a gest\xE3o, o controle e a redu\xE7\xE3o das perdas de \xE1gua f\xEDsicas e n\xE3o f\xEDsicas nos sistemas de distribui\xE7\xE3o de \xE1gua pot\xE1vel. A norma padroniza a realiza\xE7\xE3o de diagn\xF3sticos com base no balan\xE7o h\xEDdrico e obriga os prestadores a elaborarem e executarem Planos de Gest\xE3o de Redu\xE7\xE3o e Controle de Perdas.",
            "Regula\xE7\xE3o (CORA)",
            "Norma de refer\xEAncia da ANA",
            "Ado\xE7\xE3o da norma de refer\xEAncia",
            "Alta (1 a 2 anos)",
            "NR publicada: Resolu\xE7\xE3o ANA n\xBA 275, de 18 de dezembro de 2025 (Aprova a NR 015/2025)",
            "Eleg\xEDvel",
            "Ok"
          ],
          [
            "Projeto de Resolu\xE7\xE3o para Ado\xE7\xE3o de Norma de Refer\xEAncia sobre Avalia\xE7\xE3o de Desempenho dos Servi\xE7os de Saneamento B\xE1sico",
            "Norma com conjunto harmonizado de indicadores de desempenho operacionais e de cobertura, estabelecendo crit\xE9rios uniformes para que as ERIs e os titulares monitorem o cumprimento das metas contratuais e do Novo Marco Legal do Saneamento.",
            "Regula\xE7\xE3o (CORA)",
            "Norma de refer\xEAncia da ANA",
            "Ado\xE7\xE3o da norma de refer\xEAncia",
            "M\xE9dia (3 a 4 anos)",
            "NR Prevista para 2\xBA/2028",
            "Eleg\xEDvel",
            "Ok"
          ],
          [
            "Revis\xE3o da Resolu\xE7\xE3o n. 13/2021 - Manual do PDI",
            "Revis\xE3o do resolu\xE7\xE3o que Institui o Manual de Elabora\xE7\xE3o e Avalia\xE7\xE3o dos Projetos do Programa de Pesquisa, Desenvolvimento e Inova\xE7\xE3o \u2013 Programa PDI visando melhorias nos procedimentos e atividades do programa com foco em dar mais participa\xE7\xE3o \xE0 Adasa na sele\xE7\xE3o dos projetos",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Melhoria na gest\xE3o dos projetos do programa de PDI Adasa/Caesb",
            "M\xE9dia (3 a 4 anos)",
            "",
            "Eleg\xEDvel",
            "Ok"
          ],
          [
            "Conjuntura do Abastecimento de \xC1gua e do Esgotamento Sanit\xE1rio no DF",
            "Documento informativo destinado \xE0 popula\xE7\xE3o do Distrito Federal, elaborado para explicar de forma clara e transparente o percurso da \xE1gua at\xE9 as resid\xEAncias e o destino do esgoto tratado. A publica\xE7\xE3o apresenta as etapas de capta\xE7\xE3o, tratamento e distribui\xE7\xE3o da \xE1gua, bem como a coleta e o tratamento do esgoto, incluindo informa\xE7\xF5es sobre a infraestrutura existente, cobertura dos servi\xE7os, expans\xE3o das redes, redu\xE7\xE3o de perdas e investimentos voltados \xE0 seguran\xE7a h\xEDdrica e sanit\xE1ria do DF.",
            "Regula\xE7\xE3o (CORA)",
            "Informa\xE7\xF5es sobre os Sistemas de Abastecimento de \xC1gua e Esgoto",
            "Informar a popula\xE7\xE3o sobre o caminho que a \xE1gua percorre at\xE9 as torneiras e o destino final do esgoto tratado",
            "M\xE9dia (3 a 4 anos)",
            "",
            "Arquivado",
            ""
          ],
          [
            "Estudos de Caso de Sistemas Prediais N\xE3o Pot\xE1veis com Monitoramento e Balan\xE7o H\xEDdrico",
            "Estudo t\xE9cnico de edifica\xE7\xF5es premiadas pelo Pr\xEAmio Guardi\xE3o da \xC1gua para avaliar a efici\xEAncia, a viabilidade econ\xF4mica e os benef\xEDcios socioambientais do reuso de \xE1gua no Distrito Federal. O trabalho inclui o monitoramento do consumo de \xE1gua pot\xE1vel e n\xE3o pot\xE1vel, a elabora\xE7\xE3o de balan\xE7os h\xEDdricos prediais e a mensura\xE7\xE3o da redu\xE7\xE3o da demanda por \xE1gua da rede p\xFAblica e da economia financeira gerada, produzindo indicadores que apoiar\xE3o o aprimoramento da regula\xE7\xE3o e o incentivo a solu\xE7\xF5es sustent\xE1veis pela ADASA.",
            "Regula\xE7\xE3o (CORA)",
            "Sistemas prediais n\xE3o pot\xE1veis",
            "Mensura\xE7\xE3o da economia de \xE1gua e a efici\xEAncia t\xE9cnica de sistemas n\xE3o pot\xE1veis premiados no DF para subsidiar o aprimoramento do arcabou\xE7o regulat\xF3rio da ADASA estimular a ado\xE7\xE3o dessas pr\xE1ticas por outras entidades.",
            "M\xE9dia (3 a 4 anos)",
            "",
            "Eleg\xEDvel",
            ""
          ],
          [
            "Guia Informativo das Normas T\xE9cnicas do Servi\xE7o de Abastecimento de \xC1gua e de Esgoto",
            "Diagrama\xE7\xE3o e impress\xE3o dos informativos elaborados pela CORA e COQA sobre as normas regulat\xF3rias dos servi\xE7os de \xE1gua e de esgoto: Informativo sobre a Resolu\xE7\xE3o n. 14/2011 - Condi\xE7\xF5es gerais; Informativo Resolu\xE7\xE3o 15/2011-Hidrometra\xE7\xE3o Individualizada; Informativo sobre Sistemas prediais de \xE1gua n\xE3o pot\xE1vel; Informativo sobre o Pr\xEAmio Guardi\xE3o da \xC1gua 2026; Informativo sobre a Resolu\xE7\xE3o n. 13/2021 - PDI; Informativo sobre Resolu\xE7\xE3o de Solu\xE7\xF5es Alternativas; Informativo sobre a Resolu\xE7\xE3o de Indicadores de Desempenho; Informativo sobre a Resolu\xE7\xE3o n. 003/2012 - Recursos de Revis\xE3o.",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Informa a popula\xE7\xE3o de forma clara e did\xE1tica sobre o conte\xFAdo das principais normas t\xE9cnicas elaboradas para os servi\xE7os de \xE1gua e de esgoto.",
            "Baixa (mais de 5 anos)",
            "",
            "Eleg\xEDvel",
            ""
          ],
          [
            "Projeto de Resolu\xE7\xE3o que trata de Grandes Usu\xE1rios no Distrito Federal, sua defini\xE7\xE3o, a celebra\xE7\xE3o e a fiscaliza\xE7\xE3o de Programas Comerciais e de contratos espec\xEDficos de abastecimento de \xE1gua e esgotamento sanit\xE1rio para Grandes Usu\xE1rios.",
            "O projeto normativo do Distrito Federal visa regulamentar a presta\xE7\xE3o dos servi\xE7os de \xE1gua e esgotamento sanit\xE1rio prestados pela Caesb aos clientes de elevado consumo, definindo crit\xE9rios t\xE9cnicos para seu enquadramento, diretrizes para a celebra\xE7\xE3o de contratos com condi\xE7\xF5es e tarifas diferenciadas (como garantias de demanda), e mecanismos de fiscaliza\xE7\xE3o sobre a qualidade da medi\xE7\xE3o e do efluente lan\xE7ado na rede p\xFAblica. Essa categoria de Grandes Usu\xE1rios abrange empreendimentos de grande porte do DF, como ind\xFAstrias e polos fabris, shopping centers e grandes centros comerciais, redes hoteleiras, condom\xEDnios empresariais e residenciais de grande porte, hospitais e \xF3rg\xE3os p\xFAblicos de alta demanda h\xEDdrica.",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Regulamenta\xE7\xE3o das diretrizes e contratos espec\xEDficos para clientes de grande porte no DF",
            "Baixa (mais de 5 anos)",
            "",
            "Eleg\xEDvel",
            ""
          ],
          [
            "Metodologia de Fiscaliza\xE7\xE3o de Riscos em Seguran\xE7a de Barragens para Abastecimento Humano",
            "Elaborar um estudo t\xE9cnico regulat\xF3rio para o estabelecimento de diretrizes de monitoramento preventivo de seguran\xE7a de barragens de saneamento, com crit\xE9rios de amostragem de ausculta\xE7\xE3o e protocolos de atua\xE7\xE3o regulat\xF3ria conjunta com a Defesa Civil e o prestador de servi\xE7o em cen\xE1rios de secas extremas ou eventos de cheia.",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Diretrizes e protocolos de monitoramento preventivo de seguran\xE7a de barragens",
            "Baixa (mais de 5 anos)",
            "A fiscaliza\xE7\xE3o da seguran\xE7a de barragens pelo ente regulador \xE9 tema recorrente e cr\xEDtico no setor el\xE9trico e h\xEDdrico (como discutido nos anais de 2015, 2019 e 2023). As Ag\xEAncias Reguladoras t\xEAm evolu\xEDdo de uma fiscaliza\xE7\xE3o meramente visual/documental para a exig\xEAncia de delimita\xE7\xE3o de faixas de aten\xE7\xE3o/alerta com base na leitura de equipamentos de ausculta\xE7\xE3o (piez\xF4metros, medidores de vaz\xE3o) e an\xE1lises de estabilidade h\xEDdrica em epis\xF3dios de extremos clim\xE1ticos.",
            "Eleg\xEDvel",
            ""
          ],
          [
            "Padr\xF5es de Fiscaliza\xE7\xE3o com Uso de Tecnologias de Inspe\xE7\xE3o N\xE3o Destrutiva e Mapeamento Georreferenciado para Redu\xE7\xE3o de Perdas Reais",
            "Estudo t\xE9cnico para estrutura\xE7\xE3o de diretrizes de fiscaliza\xE7\xE3o indireta e direta de perdas reais de \xE1gua utilizando geotecnologias e instrumenta\xE7\xE3o cont\xEDnua de rede, definindo metas regulat\xF3rias audit\xE1veis por Distrito de Medi\xE7\xE3o e Controle (DMC).",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Estrutura\xE7\xE3o de diretrizes e metas de fiscaliza\xE7\xE3o de perdas reais com geotecnologia",
            "Baixa (mais de 5 anos)",
            "Contexto dos Anais da ABAR: Nos congressos de 2019, 2021 e 2023, diversos trabalhos (Ares-PCJ, Arsae-MG, Agems) abordaram o uso de intelig\xEAncia artificial, Business Intelligence (BI), drones e geotecnologias aplicadas ao controle de vazamentos ocultos e fiscaliza\xE7\xE3o de redes e extravasamentos de esgoto. Lacuna na Adasa: A fiscaliza\xE7\xE3o de perdas f\xEDsicas/reais da Adasa apoia-se fortemente em indicadores do SNIS/SINISA e vistorias amostraria locais. Falta a padroniza\xE7\xE3o regulat\xF3ria sobre como o prestador deve comprovar o uso sistem\xE1tico de varredura ac\xFAstica, hastes de escuta, pitometria cont\xEDnua e geofones em Zonas de Medi\xE7\xE3o e Controle (ZMC).",
            "Selecionado",
            ""
          ],
          [
            "Padr\xF5es de Re\xFAso de \xC1gua e Gest\xE3o Regulat\xF3ria dos Lodos de Esta\xE7\xF5es de Tratamento de Esgoto (ETEs) do DF",
            "Proposta de Estudo: Estudo regulat\xF3rio sobre a caracteriza\xE7\xE3o, rotas tecnol\xF3gicas de higieniza\xE7\xE3o e aproveitamento energ\xE9tico/agr\xEDcola dos res\xEDduos do tratamento de esgoto (lodo e biog\xE1s) no DF, estabelecendo indicadores operacionais de conformidade e rastreabilidade para o prestador do servi\xE7o.",
            "Regula\xE7\xE3o (CORA)",
            "Normas regulat\xF3rias de \xE1gua e de esgoto",
            "Estudo regulat\xF3rio de higieniza\xE7\xE3o e aproveitamento de lodos e subprodutos de ETEs",
            "Baixa (mais de 5 anos)",
            "Contexto dos Anais da ABAR: O aproveitamento de subprodutos do saneamento (biog\xE1s, biometano e aplica\xE7\xE3o agr\xEDcola/energ\xE9tica do lodo de ETEs) foi um dos t\xF3picos de destaque nos anais de 2019, 2021 e 2023. Lacuna na Adasa: A regulamenta\xE7\xE3o t\xE9cnica e a fiscaliza\xE7\xE3o sobre a qualidade, estabiliza\xE7\xE3o, transporte, disposi\xE7\xE3o final e higieniza\xE7\xE3o do lodo produzido nas grandes ETEs do Distrito Federal (como ETE Bras\xEDlia Sul e ETE Bras\xEDlia Norte) necessitam de acompanhamento sistem\xE1tico sob o aspecto regulat\xF3rio-operacional.",
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
    console.error("Erro detalhado na migra\xE7\xE3o:", err);
    console.warn("Aviso: N\xE3o foi poss\xEDvel verificar/migrar o esquema de banco de dados na inicializa\xE7\xE3o (Verifique a configura\xE7\xE3o da vari\xE1vel DATABASE_URL). Continuando em modo offline/local.");
  }
}
async function startServer(isVercel = false) {
  try {
    await runStartupMigration();
  } catch (err) {
    console.error("Erro na migra\xE7\xE3o no Vercel:", err);
  }
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  const publicPath = import_path.default.join(process.cwd(), "public");
  if (!import_fs.default.existsSync(publicPath)) {
    try {
      import_fs.default.mkdirSync(publicPath);
    } catch (e) {
      console.error(e);
    }
  }
  app.use(import_express.default.static(publicPath));
  const brandDir = import_path.default.join(publicPath, "brand");
  if (import_fs.default.existsSync(brandDir)) {
    app.use("/brand", import_express.default.static(brandDir));
  }
  const uploadsDir = import_path.default.join(publicPath, "uploads");
  if (!import_fs.default.existsSync(uploadsDir)) {
    try {
      import_fs.default.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
      console.error(e);
    }
  }
  app.use("/uploads", import_express.default.static(uploadsDir));
  const storage = import_multer.default.diskStorage({
    destination: function(req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    }
  });
  const upload = (0, import_multer.default)({ storage });
  app.post("/api/upload", upload.array("images", 10), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });
      }
      const files = req.files;
      const urls = files.map((f) => "/uploads/" + f.filename);
      res.json({ success: true, urls });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: "Erro no upload" });
    }
  });
  const mapCollections = {
    obras: { table: "fisc_map_obras", limit: 5e3 },
    acoes: { table: "fisc_map_acoes_importadas", limit: 1e4 }
  };
  app.get("/api/fiscalizacao-mapas/:collection", async (req, res, next) => {
    const config = mapCollections[req.params.collection];
    if (!config) return next();
    try {
      const result = await getDbPool().query(`SELECT id, external_id AS "externalId", data, imported_at AS "importedAt" FROM ${config.table} ORDER BY id`);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error(`Erro ao consultar ${req.params.collection}:`, error);
      res.status(500).json({ success: false, error: "Banco de dados indispon\xEDvel para esta consulta." });
    }
  });
  app.put("/api/fiscalizacao-mapas/:collection", async (req, res, next) => {
    const config = mapCollections[req.params.collection];
    if (!config) return next();
    const records = req.params.collection === "acoes" ? req.body?.acoes : req.body?.records;
    const locais = req.params.collection === "acoes" ? req.body?.locais : [];
    if (!Array.isArray(records) || records.length > config.limit || !Array.isArray(locais) || locais.length > 1e4) return res.status(400).json({ success: false, error: "Carga inv\xE1lida ou acima do limite permitido." });
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM ${config.table}`);
      for (const [index, data] of records.entries()) await client.query(`INSERT INTO ${config.table}(external_id, data) VALUES ($1, $2::jsonb)`, [String(data?.id ?? data?.ID ?? index + 1), JSON.stringify(data)]);
      if (req.params.collection === "acoes") {
        await client.query("DELETE FROM fisc_map_locais_importados");
        for (const [index, data] of locais.entries()) await client.query("INSERT INTO fisc_map_locais_importados(external_id, data) VALUES ($1, $2::jsonb)", [String(data?.id ?? data?.ID ?? index + 1), JSON.stringify(data)]);
      }
      await client.query("INSERT INTO fisc_map_auditoria(acao, entidade, depois) VALUES ('substituir', $1, $2::jsonb)", [req.params.collection, JSON.stringify({ quantidade: records.length, locais: locais.length })]);
      await client.query("COMMIT");
      res.json({ success: true, data: { imported: records.length, locais: locais.length } });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Erro ao importar ${req.params.collection}:`, error);
      res.status(500).json({ success: false, error: "A importa\xE7\xE3o falhou; a base anterior foi preservada." });
    } finally {
      client.release();
    }
  });
  app.delete("/api/fiscalizacao-mapas/:collection", async (req, res, next) => {
    const config = mapCollections[req.params.collection];
    if (!config) return next();
    if (req.query.confirm !== "true") return res.status(400).json({ success: false, error: "Confirma\xE7\xE3o expl\xEDcita obrigat\xF3ria." });
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`DELETE FROM ${config.table}`);
      if (req.params.collection === "acoes") await client.query("DELETE FROM fisc_map_locais_importados");
      await client.query("INSERT INTO fisc_map_auditoria(acao, entidade, antes) VALUES ('limpar', $1, $2::jsonb)", [req.params.collection, JSON.stringify({ quantidade: result.rowCount })]);
      await client.query("COMMIT");
      res.json({ success: true, data: { deleted: result.rowCount || 0 } });
    } catch (error) {
      await client.query("ROLLBACK");
      res.status(500).json({ success: false, error: "A limpeza falhou; a base anterior foi preservada." });
    } finally {
      client.release();
    }
  });
  app.get("/api/fiscalizacao-mapas/rvf/catalogo", async (_req, res) => {
    try {
      const result = await getDbPool().query('SELECT id, titulo, ano, mes, url_original AS "urlOriginal", url_final AS "urlFinal", dominio, status, erro_verificacao AS "erroVerificacao", updated_at AS "updatedAt" FROM fisc_map_rvf_relatorios ORDER BY ano DESC NULLS LAST, mes DESC NULLS LAST, titulo');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: "N\xE3o foi poss\xEDvel consultar o cat\xE1logo RF/RVF." });
    }
  });
  app.get("/api/fiscalizacao-mapas/auditoria", async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    try {
      const result = await getDbPool().query("SELECT * FROM fisc_map_auditoria ORDER BY created_at DESC LIMIT $1", [limit]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: "N\xE3o foi poss\xEDvel consultar a auditoria." });
    }
  });
  app.post("/api/extract-text", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });
      }
      const file = req.file;
      const ext = import_path.default.extname(file.originalname).toLowerCase();
      let extractedText = "";
      if (ext === ".pdf") {
        const cmd = process.execPath;
        const args = [import_path.default.resolve(process.cwd(), "parse-pdf.cjs"), file.path];
        console.log("Executing:", cmd, args.join(" "));
        const { stdout, stderr } = await execFileAsync(cmd, args, { maxBuffer: 1024 * 1024 * 50 });
        console.log("parse-pdf.cjs stdout:", stdout);
        if (stderr) console.error("parse-pdf.cjs stderr:", stderr);
        const data = JSON.parse(stdout);
        if (!data.success) throw new Error(data.error);
        extractedText = data.text;
      } else if (ext === ".docx") {
        let toRoman = function(num) {
          const lookup = { M: 1e3, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
          let roman = "";
          for (let i in lookup) {
            while (num >= lookup[i]) {
              roman += i;
              num -= lookup[i];
            }
          }
          return roman;
        };
        const mammothModule = await import("mammoth");
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.convertToHtml({ path: file.path });
        let html = result.value;
        html = html.replace(/<br\s*\/?>/gi, "\n");
        html = html.replace(/<\/p>/gi, "\n\n");
        html = html.replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, inner) => {
          let i = 1;
          return inner.replace(/<li>([\s\S]*?)<\/li>/gi, (m, liText) => {
            const num = toRoman(i++);
            let cleanText = liText.replace(/<\/?p>/gi, "").trim();
            return `${num} - ${cleanText}

`;
          }) + "\n";
        });
        html = html.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, inner) => {
          let letters = "abcdefghijklmnopqrstuvwxyz";
          let i = 0;
          return inner.replace(/<li>([\s\S]*?)<\/li>/gi, (m, liText) => {
            const letter = letters[i++] || "-";
            let cleanText = liText.replace(/<\/?p>/gi, "").trim();
            return `${letter}) ${cleanText}

`;
          }) + "\n";
        });
        html = html.replace(/<[^>]+>/g, "");
        html = html.replace(/\n{3,}/g, "\n\n").trim();
        extractedText = html;
      } else if (ext === ".txt") {
        extractedText = import_fs.default.readFileSync(file.path, "utf8");
      } else {
        return res.status(400).json({ success: false, error: "Formato de arquivo n\xE3o suportado. Use PDF ou DOCX." });
      }
      try {
        import_fs.default.unlinkSync(file.path);
      } catch (err) {
        console.error("Erro ao deletar arquivo tempor\xE1rio", err);
      }
      res.json({ success: true, text: extractedText });
    } catch (e) {
      console.error("Erro na extra\xE7\xE3o de texto", e);
      res.status(500).json({ success: false, error: "Erro na extra\xE7\xE3o de texto: " + e.message, stack: e.stack });
    }
  });
  app.post("/api/save-geojson", async (req, res) => {
    try {
      const waterBalanceId = parseSafeInt(req.query.waterBalanceId);
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
        let currentMaxId = 0;
        const sanitizedFiles = templateFiles.map((tf) => {
          let parsedId = parseInt(String(tf.id), 10);
          if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
            const digitsOnly = String(tf.id).replace(/\D/g, "");
            parsedId = parseInt(digitsOnly, 10);
            if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
              parsedId = 0;
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
    } catch (error) {
      console.error("Erro ao salvar arquivos modelo:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/load-geojson", async (req, res) => {
    try {
      const waterBalanceId = parseSafeInt(req.query.waterBalanceId);
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
    } catch (error) {
      console.error("Erro ao conectar no banco:", error);
      res.status(500).json({ success: false, error: error.message || "Falha na conex\xE3o com o banco de dados." });
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
        const categoryAreasMap = {};
        const areaCategoriesMap = {};
        dbCategoryAreas.rows.forEach((r) => {
          const cid = Number(r.category_id);
          const aid = Number(r.area_id);
          if (!categoryAreasMap[cid]) categoryAreasMap[cid] = [];
          categoryAreasMap[cid].push(aid);
          if (!areaCategoriesMap[aid]) areaCategoriesMap[aid] = [];
          areaCategoriesMap[aid].push(cid);
        });
        const responsibleAreasMap = {};
        dbResponsibleAreas.rows.forEach((r) => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });
        const taskAreasMap = {};
        dbTaskAreas.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });
        const taskResponsiblesMap = {};
        dbTaskResponsibles.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });
        const taskCategoriesMap = {};
        dbTaskCategories.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const cid = Number(r.category_id);
          if (!taskCategoriesMap[tid]) taskCategoriesMap[tid] = [];
          taskCategoriesMap[tid].push(cid);
        });
        const mapEntriesToDemand = (demandId) => dbDemandEntries.rows.filter((e) => Number(e.demand_id) === demandId).map((e) => ({
          regionId: Number(e.region_id),
          year: e.year,
          population: Number(e.population),
          coverage: Number(e.coverage),
          perCapitaConsumption: Number(e.per_capita_consumption),
          losses: Number(e.losses)
        }));
        const demands = dbDemands.rows.map((s) => ({
          id: Number(s.id),
          name: s.name,
          description: s.description,
          waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null,
          modifiers: {
            population: Number(s.modifiers_population),
            coverage: s.modifiers_coverage !== null && s.modifiers_coverage !== void 0 ? Number(s.modifiers_coverage) : null,
            perCapitaConsumption: Number(s.modifiers_per_capita),
            losses: s.modifiers_losses !== null && s.modifiers_losses !== void 0 ? Number(s.modifiers_losses) : null
          },
          entries: mapEntriesToDemand(Number(s.id))
        }));
        const payload = {
          waterBalances: dbWaterBalances.rows.map((wb) => ({
            id: Number(wb.id),
            description: wb.description,
            category: wb.category || null,
            responsible: wb.responsible,
            deliveryDate: wb.delivery_date,
            receivedBy: wb.received_by,
            receiptDate: wb.receipt_date,
            status: wb.status
          })),
          systems: dbSystems.rows.map((s) => ({
            id: Number(s.id),
            code: s.code,
            name: s.name,
            waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null
          })),
          regions: dbRegions.rows.map((r) => ({
            id: Number(r.id),
            code: r.code,
            name: r.name,
            systemId: Number(r.system_id),
            description: r.description,
            waterBalanceId: r.water_balance_id ? Number(r.water_balance_id) : null
          })),
          demands,
          supplySources: dbSupplySources.rows.map((s) => ({
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
          operationalAdjustments: dbOperationalAdjustments.rows.map((o) => ({
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
          templateFiles: dbTemplateFiles.rows.map((t) => ({
            id: Number(t.id),
            name: t.name,
            description: t.description,
            url: t.url
          })),
          riskReferences: dbRiskReferences.rows.map((r) => ({
            id: Number(r.id),
            iad: r.iad,
            riskClassification: r.risk_classification,
            justification: r.justification
          })),
          plans: dbPlans.rows.map((p) => ({
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
          areas: dbAreas.rows.map((a) => ({
            id: Number(a.id),
            name: a.name,
            abbreviation: a.abbreviation,
            categoryIds: areaCategoriesMap[Number(a.id)] || [],
            planId: null
          })),
          responsibles: dbResponsibles.rows.map((r) => ({
            id: Number(r.id),
            name: r.name,
            email: r.email,
            role: r.role,
            areaIds: responsibleAreasMap[Number(r.id)] || [],
            userId: r.user_id ? Number(r.user_id) : null
          })),
          categories: dbCategories.rows.map((c) => ({
            id: Number(c.id),
            name: c.name,
            areaIds: categoryAreasMap[Number(c.id)] || [],
            createdAt: c.created_at,
            createdBy: c.created_by,
            updatedAt: c.updated_at,
            updatedBy: c.updated_by
          })),
          tasks: dbTasks.rows.map((t) => ({
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
            weight: t.weight !== void 0 && t.weight !== null ? Number(t.weight) : 1,
            type: t.type === "recurso" ? "demanda_ouvidoria" : t.type,
            fiscalizacaoData: t.fiscalizacao_data,
            ouvidoriaData: t.ouvidoria_data,
            recursoData: t.ouvidoria_data,
            recursoRevData: t.recurso_rev_data,
            areaIds: taskAreasMap[Number(t.id)] || [],
            responsibleIds: taskResponsiblesMap[Number(t.id)] || [],
            categoryIds: taskCategoriesMap[Number(t.id)] || []
          }))
        };
        res.json({ success: true, data: payload });
      } finally {
        client.release();
      }
    } catch (error) {
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
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const wb of waterBalances) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
            values.push(
              parseSafeInt(wb.id),
              wb.description,
              wb.category || null,
              wb.responsible || "N\xE3o atribu\xEDdo",
              wb.deliveryDate ? new Date(wb.deliveryDate) : null,
              wb.receivedBy,
              wb.receiptDate ? new Date(wb.receiptDate) : null,
              wb.status || "Pendente"
            );
            paramIndex += 8;
          }
          await client.query(
            `INSERT INTO wb_water_balances (id, description, category, responsible, delivery_date, received_by, receipt_date, status)
             VALUES ${queryParts.join(", ")}
             ON CONFLICT (id) DO UPDATE SET
               description = EXCLUDED.description,
               category = EXCLUDED.category,
               responsible = EXCLUDED.responsible,
               delivery_date = EXCLUDED.delivery_date,
               received_by = EXCLUDED.received_by,
               receipt_date = EXCLUDED.receipt_date,
               status = EXCLUDED.status`,
            values
          );
        }
        if (systems && systems.length > 0) {
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const sys of systems) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
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
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const reg of regions) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`);
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
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const sc of demands) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
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
        const allEntries = [];
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
          const chunkSize = 2e3;
          for (let i = 0; i < allEntries.length; i += chunkSize) {
            const chunk = allEntries.slice(i, i + chunkSize);
            const chunkValues = [];
            const chunkParts = [];
            let deParamIndex = 1;
            for (const row of chunk) {
              chunkParts.push(`($${deParamIndex}::integer, $${deParamIndex + 1}::integer, $${deParamIndex + 2}::integer, $${deParamIndex + 3}::numeric, $${deParamIndex + 4}::numeric, $${deParamIndex + 5}::numeric, $${deParamIndex + 6}::numeric)`);
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
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const src of supplySources) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`);
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
          const values = [];
          const queryParts = [];
          let paramIndex = 1;
          for (const adj of operationalAdjustments) {
            queryParts.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, NULL)`);
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
    } catch (error) {
      if (error && error.message === "A vari\xE1vel DATABASE_URL (Neon PostgreSQL) est\xE1 ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING" });
      }
      console.error("Erro ao salvar dados:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/save-module", async (req, res) => {
    try {
      const { module: module2, data } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (module2 === "water-balances") {
          const { waterBalances } = data;
          const keepIds = [];
          const wbValues = [];
          const wbParts = [];
          let wbParamIndex = 1;
          for (const wb of waterBalances) {
            const wbId = parseSafeInt(wb.id);
            if (wbId !== null) {
              keepIds.push(wbId);
              wbParts.push(`($${wbParamIndex}, $${wbParamIndex + 1}, $${wbParamIndex + 2}, $${wbParamIndex + 3}, $${wbParamIndex + 4}, $${wbParamIndex + 5}, $${wbParamIndex + 6}, $${wbParamIndex + 7})`);
              wbValues.push(
                wbId,
                wb.description,
                wb.category || null,
                wb.responsible || "N\xE3o atribu\xEDdo",
                wb.deliveryDate ? new Date(wb.deliveryDate) : null,
                wb.receivedBy,
                wb.receiptDate ? new Date(wb.receiptDate) : null,
                wb.status || "Pendente"
              );
              wbParamIndex += 8;
            }
          }
          if (wbParts.length > 0) {
            await client.query(`
              INSERT INTO wb_water_balances (id, description, category, responsible, delivery_date, received_by, receipt_date, status)
              VALUES ${wbParts.join(", ")}
              ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                responsible = EXCLUDED.responsible,
                delivery_date = EXCLUDED.delivery_date,
                received_by = EXCLUDED.received_by,
                receipt_date = EXCLUDED.receipt_date,
                status = EXCLUDED.status
            `, wbValues);
          }
          if (keepIds.length > 0) {
            await client.query(`DELETE FROM wb_water_balances WHERE id NOT IN (${keepIds.map((_, idx) => "$" + (idx + 1) + "::integer").join(", ")})`, keepIds);
          } else {
            await client.query(`DELETE FROM wb_water_balances`);
          }
        }
        if (module2 === "systems") {
          const { systems = [], regions = [] } = data;
          const sysKeepIds = [];
          const sysValues = [];
          const sysParts = [];
          let sysParamIndex = 1;
          for (const sys of systems) {
            const sysId = parseSafeInt(sys.id);
            if (sysId !== null) {
              sysKeepIds.push(sysId);
              sysParts.push(`($${sysParamIndex}, $${sysParamIndex + 1}, $${sysParamIndex + 2}, $${sysParamIndex + 3})`);
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
          const regValues = [];
          const regParts = [];
          let regParamIndex = 1;
          for (const reg of regions) {
            const regId = parseSafeInt(reg.id);
            if (regId !== null) {
              regKeepIds.push(regId);
              regParts.push(`($${regParamIndex}, $${regParamIndex + 1}, $${regParamIndex + 2}, $${regParamIndex + 3}, $${regParamIndex + 4}, $${regParamIndex + 5})`);
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
            await client.query(`DELETE FROM wb_regions WHERE id NOT IN (${regKeepIds.map((_, idx) => "$" + (idx + 1) + "::integer").join(", ")})`, regKeepIds);
          } else {
            await client.query(`DELETE FROM wb_regions`);
          }
          if (sysKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_systems WHERE id NOT IN (${sysKeepIds.map((_, idx) => "$" + (idx + 1) + "::integer").join(", ")})`, sysKeepIds);
          } else {
            await client.query(`DELETE FROM wb_systems`);
          }
        }
        if (module2 === "demands") {
          const { demands = [] } = data;
          const scKeepIds = [];
          const demandValues = [];
          const demandParts = [];
          let dParamIndex = 1;
          for (const sc of demands) {
            const scId = parseSafeInt(sc.id);
            if (scId !== null) {
              scKeepIds.push(scId);
              demandParts.push(`($${dParamIndex}::integer, $${dParamIndex + 1}::varchar, $${dParamIndex + 2}::text, $${dParamIndex + 3}::numeric, $${dParamIndex + 4}::numeric, $${dParamIndex + 5}::numeric, $${dParamIndex + 6}::numeric, $${dParamIndex + 7}::integer)`);
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
          const allEntries = [];
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
            const chunkSize = 2e3;
            for (let i = 0; i < allEntries.length; i += chunkSize) {
              const chunk = allEntries.slice(i, i + chunkSize);
              const chunkValues = [];
              const chunkParts = [];
              let eParamIndex = 1;
              for (const row of chunk) {
                chunkParts.push(`($${eParamIndex}::integer, $${eParamIndex + 1}::integer, $${eParamIndex + 2}::integer, $${eParamIndex + 3}::numeric, $${eParamIndex + 4}::numeric, $${eParamIndex + 5}::numeric, $${eParamIndex + 6}::numeric)`);
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
        if (module2 === "supply-sources") {
          const { supplySources = [], operationalAdjustments = [] } = data;
          const supKeepIds = [];
          const supValues = [];
          const supParts = [];
          let supParamIndex = 1;
          for (const src of supplySources) {
            const srcId = parseSafeInt(src.id);
            if (srcId !== null) {
              supKeepIds.push(srcId);
              supParts.push(`($${supParamIndex}, $${supParamIndex + 1}, $${supParamIndex + 2}, $${supParamIndex + 3}, $${supParamIndex + 4}, $${supParamIndex + 5}, $${supParamIndex + 6}, $${supParamIndex + 7}, $${supParamIndex + 8}, $${supParamIndex + 9})`);
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
            await client.query(`DELETE FROM wb_supply_sources WHERE id NOT IN (${supKeepIds.map((_, idx) => "$" + (idx + 1) + "::integer").join(", ")})`, supKeepIds);
          } else {
            await client.query(`DELETE FROM wb_supply_sources`);
          }
          const adjKeepIds = [];
          const adjValues = [];
          const adjParts = [];
          let adjParamIndex = 1;
          for (const adj of operationalAdjustments) {
            const adjId = parseSafeInt(adj.id);
            if (adjId !== null) {
              adjKeepIds.push(adjId);
              adjParts.push(`($${adjParamIndex}, $${adjParamIndex + 1}, $${adjParamIndex + 2}, $${adjParamIndex + 3}, $${adjParamIndex + 4}, $${adjParamIndex + 5}, $${adjParamIndex + 6}, $${adjParamIndex + 7}, NULL)`);
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
          const linkUpdates = operationalAdjustments.filter((adj) => parseSafeInt(adj.id) !== null && adj.linkedAdjustmentId);
          if (linkUpdates.length > 0) {
            const linkParts = [];
            const linkValues = [];
            let linkIndex = 1;
            for (const adj of linkUpdates) {
              linkParts.push(`($${linkIndex}::integer, $${linkIndex + 1}::integer)`);
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
            await client.query(`DELETE FROM wb_operational_adjustments WHERE id NOT IN (${adjKeepIds.map((_, idx) => "$" + (idx + 1) + "::integer").join(", ")})`, adjKeepIds);
          } else {
            await client.query(`DELETE FROM wb_operational_adjustments`);
          }
        }
        await client.query("SELECT setval(pg_get_serial_sequence('wb_water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_water_balances");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_systems");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_regions");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_demands");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_supply_sources");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_operational_adjustments");
        await client.query("COMMIT");
        res.json({ success: true, message: `M\xF3dulo ${module2} salvo com sucesso.` });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Erro ao salvar m\xF3dulo:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
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
    } catch (error) {
      console.error("[DIAGNOSTIC ERROR]:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/save-planos", async (req, res) => {
    try {
      console.log("[LOG] POST /api/save-planos received request:", req.body);
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, error: "O corpo da requisi\xE7\xE3o \xE9 obrigat\xF3rio." });
      }
      const { id, planId, name, title, description } = req.body;
      const targetId = id || planId;
      const planName = name && typeof name === "string" ? name.trim() : title && typeof title === "string" ? title.trim() : "Plano Sem Nome";
      const planTitle = title && typeof title === "string" ? title.trim() : name && typeof name === "string" ? name.trim() : "Plano Sem Nome";
      const planDesc = description && typeof description === "string" ? description.trim() : "";
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
    } catch (error) {
      console.error("[API ERROR] Erro cr\xEDtico ao salvar plano via /api/save-planos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
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
    } catch (error) {
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
        return res.status(404).json({ success: false, error: "Plano n\xE3o encontrado" });
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome", description: result.rows[0].description, isActive: result.rows[0].is_active, updatedAt: result.rows[0].updated_at, updatedBy: result.rows[0].updated_by } });
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao deletar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/areas", async (req, res) => {
    try {
      const { name, abbreviation, categoryIds, updatedBy, createdBy } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "INSERT INTO pl_areas (name, abbreviation, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, NOW(), $3, NOW(), $4) RETURNING *",
          [name || "\xC1rea Sem Nome", abbreviation || "", createdBy || "SGI Pro", updatedBy || "SGI Pro"]
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
    } catch (error) {
      console.error("Erro ao criar \xE1rea:", error);
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
          return res.status(404).json({ success: false, error: "\xC1rea n\xE3o encontrada" });
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
    } catch (error) {
      console.error("Erro ao atualizar \xE1rea:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_areas WHERE id = $1", [areaId]);
      res.json({ success: true, deletedId: areaId });
    } catch (error) {
      console.error("Erro ao deletar \xE1rea:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/responsibles", async (req, res) => {
    try {
      const pool = getDbPool();
      const dbResponsibles = await pool.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
      const dbRespAreas = await pool.query("SELECT * FROM pl_responsible_areas");
      const responsibleAreasMap = {};
      dbRespAreas.rows.forEach((r) => {
        const rid = Number(r.responsible_id);
        const aid = Number(r.area_id);
        if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
        responsibleAreasMap[rid].push(aid);
      });
      const data = dbResponsibles.rows.map((r) => ({
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
    } catch (error) {
      console.error("Erro ao buscar respons\xE1veis:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/areas", async (req, res) => {
    try {
      const pool = getDbPool();
      const dbAreas = await pool.query("SELECT * FROM pl_areas ORDER BY id ASC");
      res.json({ success: true, data: dbAreas.rows.map((a) => ({ id: Number(a.id), name: a.name, description: a.description })) });
    } catch (error) {
      console.error("Erro ao buscar \xE1reas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/responsibles", async (req, res) => {
    try {
      const { name, email, role, areaIds, updatedBy, createdBy } = req.body;
      const pool = getDbPool();
      let createdId;
      let finalResult;
      try {
        await pool.query("BEGIN");
        let userId = null;
        const normalizedEmail = (email || "").trim().toLowerCase();
        if (normalizedEmail) {
          const uRes = await pool.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1)", [normalizedEmail]);
          if (uRes.rows.length > 0) {
            userId = uRes.rows[0].id;
          }
        }
        const result = await pool.query(
          "INSERT INTO pl_responsibles (name, email, role, user_id, created_at, created_by, updated_at, updated_by) VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), $6) RETURNING *",
          [name || "Respons\xE1vel Sem Nome", email || "", role || "", userId, createdBy || "SGI Pro", updatedBy || "SGI Pro"]
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
    } catch (error) {
      console.error("Erro ao criar respons\xE1vel:", error);
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
          return res.status(404).json({ success: false, error: "Respons\xE1vel n\xE3o encontrado" });
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
    } catch (error) {
      console.error("Erro ao atualizar respons\xE1vel:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/responsibles/:id", async (req, res) => {
    try {
      const respId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_responsibles WHERE id = $1", [respId]);
      res.json({ success: true, deletedId: respId });
    } catch (error) {
      console.error("Erro ao deletar respons\xE1vel:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  const handleGetDepartments = async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, sigla, nome FROM au_departments ORDER BY sigla ASC");
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Erro ao listar departamentos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  const handleCreateDepartment = async (req, res) => {
    try {
      const { sigla, nome } = req.body;
      if (!sigla || !nome) {
        return res.status(400).json({ success: false, error: "Sigla e nome do departamento s\xE3o obrigat\xF3rios" });
      }
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO au_departments (sigla, nome) VALUES ($1, $2) RETURNING id, sigla, nome",
        [sigla.trim().toUpperCase(), nome.trim()]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao criar departamento:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  const handleUpdateDepartment = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sigla, nome } = req.body;
      if (!sigla || !nome) {
        return res.status(400).json({ success: false, error: "Sigla e nome do departamento s\xE3o obrigat\xF3rios" });
      }
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE au_departments SET sigla = $1, nome = $2 WHERE id = $3 RETURNING id, sigla, nome",
        [sigla.trim().toUpperCase(), nome.trim(), id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Departamento n\xE3o encontrado" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao atualizar departamento:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  const handleDeleteDepartment = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: "ID de departamento inv\xE1lido" });
      }
      const pool = getDbPool();
      await pool.query("UPDATE au_users SET department_id = NULL WHERE department_id = $1", [id]);
      const result = await pool.query("DELETE FROM au_departments WHERE id = $1 RETURNING id, sigla, nome", [id]);
      if (result.rowCount === 0) {
        return res.json({ success: true, deletedId: id, message: "Departamento j\xE1 havia sido exclu\xEDdo ou n\xE3o encontrado" });
      }
      res.json({ success: true, deletedId: id, deleted: result.rows[0] });
    } catch (error) {
      console.error("Erro ao deletar departamento:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  app.get("/api/departments", handleGetDepartments);
  app.get("/api/au/departments", handleGetDepartments);
  app.post("/api/departments", handleCreateDepartment);
  app.post("/api/au/departments", handleCreateDepartment);
  app.put("/api/departments/:id", handleUpdateDepartment);
  app.put("/api/au/departments/:id", handleUpdateDepartment);
  app.delete("/api/departments/:id", handleDeleteDepartment);
  app.delete("/api/au/departments/:id", handleDeleteDepartment);
  app.get("/api/roles", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, name, description, permissions FROM au_roles ORDER BY CASE WHEN id = 'admin' THEN 1 WHEN id = 'regulator' THEN 2 WHEN id = 'provider' THEN 3 ELSE 4 END");
      res.json({
        success: true,
        data: result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description || "",
          permissions: typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions || []
        }))
      });
    } catch (error) {
      console.error("Erro ao listar pap\xE9is:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/roles", async (req, res) => {
    try {
      const { id, name, description, permissions } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: "Nome do papel \xE9 obrigat\xF3rio" });
      }
      const pool = getDbPool();
      const roleId = id && id.trim() ? id.trim().toLowerCase().replace(/\s+/g, "_") : "role_" + Date.now();
      const roleName = name.trim();
      const roleDesc = description ? description.trim() : "";
      const rolePerms = permissions ? JSON.stringify(permissions) : "[]";
      const result = await pool.query(
        "INSERT INTO au_roles (id, name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING id, name, description, permissions",
        [roleId, roleName, roleDesc, rolePerms]
      );
      const row = result.rows[0];
      res.json({
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description || "",
          permissions: typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions || []
        }
      });
    } catch (error) {
      console.error("Erro ao criar papel:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.put("/api/roles/:id", async (req, res) => {
    try {
      const roleId = req.params.id;
      const { name, description, permissions } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: "Nome do papel \xE9 obrigat\xF3rio" });
      }
      const pool = getDbPool();
      const roleName = name.trim();
      const roleDesc = description ? description.trim() : "";
      const rolePerms = permissions ? JSON.stringify(permissions) : "[]";
      const result = await pool.query(
        "UPDATE au_roles SET name = $1, description = $2, permissions = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, description, permissions",
        [roleName, roleDesc, rolePerms, roleId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Papel n\xE3o encontrado" });
      }
      const row = result.rows[0];
      res.json({
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description || "",
          permissions: typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions || []
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar papel:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const roleId = req.params.id;
      if (roleId === "admin") {
        return res.status(400).json({ success: false, error: "O papel Administrador \xE9 do sistema e n\xE3o pode ser exclu\xEDdo." });
      }
      const pool = getDbPool();
      const usersUsingRole = await pool.query("SELECT COUNT(*) FROM au_users WHERE role_id = $1", [roleId]);
      if (parseInt(usersUsingRole.rows[0].count) > 0) {
        return res.status(400).json({ success: false, error: "N\xE3o \xE9 poss\xEDvel excluir este papel pois existem usu\xE1rios vinculados a ele." });
      }
      const result = await pool.query("DELETE FROM au_roles WHERE id = $1 RETURNING id, name", [roleId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: "Papel n\xE3o encontrado" });
      }
      res.json({ success: true, deletedId: roleId, deleted: result.rows[0] });
    } catch (error) {
      console.error("Erro ao excluir papel:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Identificador e senha s\xE3o necess\xE1rios" });
      }
      const pool = getDbPool();
      let result = await pool.query(
        `SELECT u.id, u.name, u.email, u.password, u.role_id, u.status, u.department_id,
                d.sigla AS department_sigla, d.nome AS department_nome
         FROM au_users u
         LEFT JOIN au_departments d ON u.department_id = d.id
         WHERE LOWER(u.email) = LOWER($1)`,
        [email.trim()]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: "Usu\xE1rio n\xE3o encontrado" });
      }
      const user = result.rows[0];
      if (user.status !== "active") {
        return res.status(403).json({ success: false, error: "Este usu\xE1rio est\xE1 inativo" });
      }
      if (!await verifyPassword(password, user.password)) {
        return res.status(401).json({ success: false, error: "Senha inv\xE1lida" });
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
          departmentId: user.department_id || null,
          department: user.department_id ? {
            id: user.department_id,
            sigla: user.department_sigla,
            nome: user.department_nome
          } : void 0
        }
      });
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/users", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query(`
        SELECT u.id, u.name, u.email, u.role_id, u.status, u.department_id,
               d.sigla AS department_sigla, d.nome AS department_nome
        FROM au_users u
        LEFT JOIN au_departments d ON u.department_id = d.id
        ORDER BY u.id ASC
      `);
      res.json({
        success: true,
        data: result.rows.map((user) => ({
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          departmentId: user.department_id || null,
          department: user.department_id ? {
            id: user.department_id,
            sigla: user.department_sigla,
            nome: user.department_nome
          } : void 0
        }))
      });
    } catch (error) {
      console.error("Erro ao listar usu\xE1rios:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, roleId, status, departmentId } = req.body;
      const pool = getDbPool();
      let finalDeptId = departmentId ? parseInt(departmentId) : null;
      const result = await pool.query(
        "INSERT INTO au_users (name, email, password, role_id, status, department_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [name, email, await hashPassword(password || "1234"), roleId || "provider", status || "active", finalDeptId]
      );
      const user = result.rows[0];
      if (email) {
        try {
          await pool.query("UPDATE pl_responsibles SET user_id = $1 WHERE LOWER(email) = LOWER($2) AND user_id IS NULL", [user.id, email.trim()]);
        } catch (e) {
        }
      }
      let department = void 0;
      if (user.department_id) {
        const deptQ = await pool.query("SELECT id, sigla, nome FROM au_departments WHERE id = $1", [user.department_id]);
        if (deptQ.rows.length > 0) {
          department = deptQ.rows[0];
        }
      }
      res.json({
        success: true,
        data: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          departmentId: user.department_id || null,
          department
        }
      });
    } catch (error) {
      console.error("Erro ao cadastrar usu\xE1rio:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, password, roleId, status, departmentId } = req.body;
      const pool = getDbPool();
      let finalDeptId = departmentId !== void 0 ? departmentId ? parseInt(departmentId) : null : null;
      let query;
      let params;
      if (password) {
        query = "UPDATE au_users SET name = $1, email = $2, password = $3, role_id = $4, status = $5, department_id = $6 WHERE id = $7 RETURNING *";
        params = [name, email, await hashPassword(password), roleId || "provider", status || "active", finalDeptId, userId];
      } else {
        query = "UPDATE au_users SET name = $1, email = $2, role_id = $3, status = $4, department_id = $5 WHERE id = $6 RETURNING *";
        params = [name, email, roleId || "provider", status || "active", finalDeptId, userId];
      }
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Usu\xE1rio n\xE3o encontrado" });
      }
      const user = result.rows[0];
      let department = void 0;
      if (user.department_id) {
        const deptQ = await pool.query("SELECT id, sigla, nome FROM au_departments WHERE id = $1", [user.department_id]);
        if (deptQ.rows.length > 0) {
          department = deptQ.rows[0];
        }
      }
      res.json({
        success: true,
        data: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.role_id,
          status: user.status,
          departmentId: user.department_id || null,
          department
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar usu\xE1rio:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM au_users WHERE id = $1", [userId]);
      res.json({ success: true, deletedId: userId });
    } catch (error) {
      console.error("Erro ao deletar usu\xE1rio:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/categories", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, name, created_at, created_by, updated_at, updated_by FROM pl_categories ORDER BY id ASC");
      const mapping = await pool.query("SELECT category_id, area_id FROM pl_category_areas");
      const areaMap = {};
      mapping.rows.forEach((r) => {
        const catId = Number(r.category_id);
        if (!areaMap[catId]) areaMap[catId] = [];
        areaMap[catId].push(Number(r.area_id));
      });
      res.json({
        success: true,
        data: result.rows.map((c) => ({
          id: Number(c.id),
          name: c.name,
          createdAt: c.created_at,
          createdBy: c.created_by,
          updatedAt: c.updated_at,
          updatedBy: c.updated_by,
          areaIds: areaMap[Number(c.id)] || []
        }))
      });
    } catch (error) {
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
    } catch (error) {
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
          return res.status(404).json({ success: false, error: "Categoria n\xE3o encontrada" });
        }
        const existingOrderRes = await pool.query("SELECT area_id, order_index FROM pl_category_areas WHERE category_id = $1", [catId]);
        const existingOrders = /* @__PURE__ */ new Map();
        existingOrderRes.rows.forEach((r) => existingOrders.set(Number(r.area_id), Number(r.order_index)));
        await pool.query("DELETE FROM pl_category_areas WHERE category_id = $1", [catId]);
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            let orderIdx = existingOrders.get(aId);
            if (orderIdx === void 0) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao deletar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/resolutions", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM re_resolutions ORDER BY numero DESC, ano DESC");
      const participationsRes = await pool.query(`
        SELECT rp.resolution_id, p.* 
        FROM re_resolution_participations rp
        JOIN re_participations p ON rp.participation_id = p.id
      `);
      const articlesRes = await pool.query("SELECT participation_id, COUNT(*) as cnt FROM re_participation_articles GROUP BY participation_id");
      const contribsRes = await pool.query("SELECT a.participation_id, COUNT(*) as cnt FROM re_participation_contributions c JOIN re_participation_articles a ON c.article_id = a.id GROUP BY a.participation_id");
      const attachRes = await pool.query("SELECT * FROM re_participation_attachments");
      const articlesCount = {};
      articlesRes.rows.forEach((r) => articlesCount[r.participation_id] = parseInt(r.cnt));
      const contribsCount = {};
      contribsRes.rows.forEach((r) => contribsCount[r.participation_id] = parseInt(r.cnt));
      const participations = participationsRes.rows.map((p) => ({
        ...p,
        totalArticles: articlesCount[p.id] || 0,
        totalContributions: contribsCount[p.id] || 0,
        anexos: attachRes.rows.filter((a) => a.participation_id === p.id)
      }));
      const resolutions = result.rows.map((r) => ({
        ...r,
        participations: participations.filter((p) => p.resolution_id === r.id)
      }));
      res.json({ success: true, data: resolutions });
    } catch (error) {
      console.error("Erro ao obter resolu\xE7\xF5es:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/resolutions", async (req, res) => {
    try {
      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa, participation_ids } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO re_resolutions (especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
        [especie || "Resolu\xE7\xE3o", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || ""]
      );
      const newId = result.rows[0].id;
      if (participation_ids && Array.isArray(participation_ids)) {
        for (const pid of participation_ids) {
          await pool.query("INSERT INTO re_resolution_participations (resolution_id, participation_id) VALUES ($1, $2)", [newId, pid]);
        }
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao criar resolu\xE7\xE3o:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.put("/api/resolutions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { especie, numero, ano, data, ementa, situacao, area, segmento, tipo, link, imagem_capa, participation_ids } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE re_resolutions SET especie = $1, numero = $2, ano = $3, data = $4, ementa = $5, situacao = $6, area = $7, segmento = $8, tipo = $9, link = $10, imagem_capa = $11 WHERE id = $12 RETURNING *",
        [especie || "Resolu\xE7\xE3o", parseInt(numero) || 0, parseInt(ano) || 0, data || "", ementa || "", situacao || "Vigente", area || "", segmento || "", tipo || "Principal", link || "", imagem_capa || "", id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Resolu\xE7\xE3o n\xE3o encontrada" });
      }
      if (participation_ids && Array.isArray(participation_ids)) {
        await pool.query("DELETE FROM re_resolution_participations WHERE resolution_id = $1", [id]);
        for (const pid of participation_ids) {
          await pool.query("INSERT INTO re_resolution_participations (resolution_id, participation_id) VALUES ($1, $2)", [id, pid]);
        }
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao atualizar resolu\xE7\xE3o:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/resolutions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM re_resolutions WHERE id = $1", [id]);
      res.json({ success: true, deletedId: id });
    } catch (error) {
      console.error("Erro ao deletar resolu\xE7\xE3o:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/agendas", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query(`
        SELECT a.id, a.nome, a.tema,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'task_id', at.task_id,
                    'status', COALESCE(pt.status, at.status, 'N\xE3o iniciada'),
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
      const data = result.rows.map((row) => ({
        ...row,
        agenda_tasks: Array.isArray(row.agenda_tasks) ? row.agenda_tasks : [],
        task_ids: Array.isArray(row.task_ids) ? row.task_ids.map(Number) : []
      }));
      res.json({ success: true, data });
    } catch (error) {
      console.error("Erro ao obter agendas regulat\xF3rias:", error);
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
      const associatedIds = [];
      const savedTasks = [];
      if (Array.isArray(agenda_tasks)) {
        for (const item of agenda_tasks) {
          const tId = parseInt(item.task_id);
          if (isNaN(tId)) continue;
          const tStatus = item.status || "N\xE3o Conclu\xEDda";
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
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, 'N\xE3o Conclu\xEDda', '', '')",
            [newAgenda.id, tId]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: "N\xE3o Conclu\xEDda", entrega: "", entrega_link: "" });
        }
      }
      await client.query("COMMIT");
      newAgenda.task_ids = associatedIds;
      newAgenda.agenda_tasks = savedTasks;
      res.json({ success: true, data: newAgenda });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar agenda regulat\xF3ria:", error);
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
        return res.status(404).json({ success: false, error: "Agenda regulat\xF3ria n\xE3o encontrada" });
      }
      const updatedAgenda = updateAgendaResult.rows[0];
      await client.query("DELETE FROM re_agenda_tasks WHERE agenda_id = $1", [id]);
      const associatedIds = [];
      const savedTasks = [];
      if (Array.isArray(agenda_tasks)) {
        for (const item of agenda_tasks) {
          const tId = parseInt(item.task_id);
          if (isNaN(tId)) continue;
          const tStatus = item.status || "N\xE3o Conclu\xEDda";
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
            "INSERT INTO re_agenda_tasks (agenda_id, task_id, status, entrega, entrega_link) VALUES ($1, $2, 'N\xE3o Conclu\xEDda', '', '')",
            [id, tId]
          );
          associatedIds.push(tId);
          savedTasks.push({ task_id: tId, status: "N\xE3o Conclu\xEDda", entrega: "", entrega_link: "" });
        }
      }
      await client.query("COMMIT");
      updatedAgenda.task_ids = associatedIds;
      updatedAgenda.agenda_tasks = savedTasks;
      res.json({ success: true, data: updatedAgenda });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao atualizar agenda regulat\xF3ria:", error);
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
    } catch (error) {
      console.error("Erro ao deletar agenda regulat\xF3ria:", error);
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
      const records = (0, import_sync.parse)(csvData, {
        delimiter: ";",
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      });
      console.log(`Importing ${records.length} records...`);
      let count = 0;
      for (const r of records) {
        const row = r;
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
            [especie || "Resolu\xE7\xE3o", numero, ano, dataStr, ementa, situacao || "Vigente", area, segmento, tipo, link]
          );
          count++;
        }
      }
      res.json({ success: true, count });
    } catch (error) {
      console.error("Erro ao importar CSV:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/publications", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM pu_publications ORDER BY id DESC");
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Erro ao obter publica\xE7\xF5es:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/publications", async (req, res) => {
    try {
      const { titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa, formato_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO pu_publications (titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa, formato_capa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
        [titulo_assunto || "", descricao || "", tipo_documento || "", responsavel_autor || "", data_publicacao || "", link_acesso || "", observacoes || "", imagem_capa || "", formato_capa || "retrato"]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao criar publica\xE7\xE3o:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.put("/api/publications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { titulo_assunto, descricao, tipo_documento, responsavel_autor, data_publicacao, link_acesso, observacoes, imagem_capa, formato_capa } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE pu_publications SET titulo_assunto = $1, descricao = $2, tipo_documento = $3, responsavel_autor = $4, data_publicacao = $5, link_acesso = $6, observacoes = $7, imagem_capa = $8, formato_capa = $9 WHERE id = $10 RETURNING *",
        [titulo_assunto || "", descricao || "", tipo_documento || "", responsavel_autor || "", data_publicacao || "", link_acesso || "", observacoes || "", imagem_capa || "", formato_capa || "retrato", id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Publica\xE7\xE3o n\xE3o encontrada" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Erro ao atualizar publica\xE7\xE3o:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.delete("/api/publications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pool = getDbPool();
      const result = await pool.query("DELETE FROM pu_publications WHERE id = $1 RETURNING id", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Publica\xE7\xE3o n\xE3o encontrada" });
      }
      res.json({ success: true, deletedId: id });
    } catch (error) {
      console.error("Erro ao deletar publica\xE7\xE3o:", error);
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
        if (i === 0 && line.toLowerCase().includes("titulo_assunto") && line.toLowerCase().includes("descricao")) {
          continue;
        }
        const parts = line.split(";");
        if (parts.length >= 2) {
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
    } catch (error) {
      console.error("Erro ao importar CSV de publica\xE7\xF5es:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/radar-activities", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT * FROM pl_radar_activities ORDER BY id ASC");
      res.json({ success: true, data: result.rows });
    } catch (error) {
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
          area_tematica || "Regula\xE7\xE3o (CORA)",
          assunto || "",
          resultado_esperado || "",
          prioridade || "Alta (1 a 2 anos)",
          justificativa || "",
          status || "Eleg\xEDvel",
          observacoes || ""
        ]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
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
          area_tematica || "Regula\xE7\xE3o (CORA)",
          assunto || "",
          resultado_esperado || "",
          prioridade || "Alta (1 a 2 anos)",
          justificativa || "",
          status || "Eleg\xEDvel",
          observacoes || "",
          id
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Atividade n\xE3o encontrada no radar" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
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
        return res.status(404).json({ success: false, error: "Atividade n\xE3o encontrada" });
      }
      res.json({ success: true, deletedId: id });
    } catch (error) {
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
      const records = (0, import_sync.parse)(csvData, {
        delimiter,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
      });
      console.log(`Importing ${records.length} radar activities...`);
      let count = 0;
      for (const r of records) {
        const row = r;
        const titulo = (row.titulo || row.Titulo || row.atividade || row.Atividade || row["T\xEDtulo"] || "").trim();
        const descricao = (row.descricao || row.Descricao || row["Descri\xE7\xE3o"] || "").trim();
        const area_tematica = (row.area_tematica || row["\xC1rea Tem\xE1tica"] || row.area || row["\xC1rea"] || "Regula\xE7\xE3o (CORA)").trim();
        const assunto = (row.assunto || row.Assunto || "").trim();
        const resultado_esperado = (row.resultado_esperado || row["Resultado Esperado"] || "").trim();
        const prioridade = (row.prioridade || row.Prioridade || "Alta (1 a 2 anos)").trim();
        const justificativa = (row.justificativa || row.Justificativa || "").trim();
        const status = (row.status || row.Status || "Eleg\xEDvel").trim();
        const observacoes = (row.observacoes || row["Observa\xE7\xF5es"] || row.obs || "").trim();
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
    } catch (error) {
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
        const categoryAreasMap = {};
        const areaCategoriesMap = {};
        dbCategoryAreas.rows.forEach((r) => {
          const cid = Number(r.category_id);
          const aid = Number(r.area_id);
          if (!categoryAreasMap[cid]) categoryAreasMap[cid] = [];
          categoryAreasMap[cid].push(aid);
          if (!areaCategoriesMap[aid]) areaCategoriesMap[aid] = [];
          areaCategoriesMap[aid].push(cid);
        });
        const responsibleAreasMap = {};
        dbResponsibleAreas.rows.forEach((r) => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });
        const taskAreasMap = {};
        dbTaskAreas.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });
        const taskResponsiblesMap = {};
        dbTaskResponsibles.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });
        const taskCategoriesMap = {};
        dbTaskCategories.rows.forEach((r) => {
          const tid = Number(r.task_id);
          const cid = Number(r.category_id);
          if (!taskCategoriesMap[tid]) taskCategoriesMap[tid] = [];
          taskCategoriesMap[tid].push(cid);
        });
        const tasks = result.rows.map((t) => ({
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
          weight: t.weight !== void 0 && t.weight !== null ? Number(t.weight) : 1,
          type: t.type === "recurso" ? "demanda_ouvidoria" : t.type,
          fiscalizacaoData: t.fiscalizacao_data,
          ouvidoriaData: t.ouvidoria_data,
          recursoData: t.ouvidoria_data,
          recursoRevData: t.recurso_rev_data,
          areaIds: taskAreasMap[Number(t.id)] || [],
          responsibleIds: taskResponsiblesMap[Number(t.id)] || [],
          categoryIds: taskCategoriesMap[Number(t.id)] || []
        }));
        res.json({
          success: true,
          data: tasks,
          plans: dbPlans.rows.map((p) => ({
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
          areas: dbAreas.rows.map((a) => ({
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
          responsibles: dbResponsibles.rows.map((r) => ({
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
          categories: dbCategories.rows.map((c) => ({
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
    } catch (error) {
      if (error && error.message === "A vari\xE1vel DATABASE_URL (Neon PostgreSQL) est\xE1 ausente no ambiente.") {
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
        return res.status(400).json({ success: false, error: "\xC1rea e CSV s\xE3o obrigat\xF3rios." });
      }
      const records = (0, import_sync.parse)(csvText, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ";",
        trim: true
      });
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const plansToCreate = [
          "Plano de Atividades 2019",
          "Plano de Atividades 2020",
          "Plano de Atividades 2021",
          "Plano de Atividades 2022",
          "Plano de Atividades 2023",
          "Plano de Atividades 2024",
          "Plano de Atividades 2025",
          "Plano de Atividades 2026"
        ];
        const planNameToId = {};
        for (const planName of plansToCreate) {
          const planRes = await client.query("SELECT id FROM pl_plans WHERE name = $1", [planName]);
          if (planRes.rows.length > 0) {
            planNameToId[planName] = Number(planRes.rows[0].id);
          } else {
            const insertRes = await client.query("INSERT INTO pl_plans (name, updated_at, updated_by) VALUES ($1, NOW(), 'Importa\xE7\xE3o') RETURNING id", [planName]);
            planNameToId[planName] = Number(insertRes.rows[0].id);
          }
        }
        const catNameToId = {};
        const respNameToId = {};
        for (const record of records) {
          let catId = null;
          const catName = record.category?.trim();
          if (catName) {
            if (!catNameToId[catName]) {
              const catRes = await client.query("SELECT id FROM pl_categories WHERE name = $1", [catName]);
              if (catRes.rows.length > 0) {
                catNameToId[catName] = Number(catRes.rows[0].id);
              } else {
                const insRes = await client.query("INSERT INTO pl_categories (name, updated_at, updated_by) VALUES ($1, NOW(), 'Importa\xE7\xE3o') RETURNING id", [catName]);
                catNameToId[catName] = Number(insRes.rows[0].id);
                await client.query("INSERT INTO pl_category_areas (category_id, area_id) VALUES ($1, $2)", [catNameToId[catName], areaId]);
              }
            }
            catId = catNameToId[catName];
          }
          const respNamesStr = record.assigned_to || "";
          const respNames = respNamesStr.split(/[,;]/).map((n) => n.trim()).filter(Boolean);
          const taskRespIds = [];
          for (const rName of respNames) {
            if (!respNameToId[rName]) {
              const rRes = await client.query("SELECT id FROM pl_responsibles WHERE name = $1", [rName]);
              if (rRes.rows.length > 0) {
                respNameToId[rName] = Number(rRes.rows[0].id);
              } else {
                const insR = await client.query("INSERT INTO pl_responsibles (name, email, role, updated_at, updated_by) VALUES ($1, '', '', NOW(), 'Importa\xE7\xE3o') RETURNING id", [rName]);
                respNameToId[rName] = Number(insR.rows[0].id);
              }
            }
            taskRespIds.push(respNameToId[rName]);
          }
          let prio = record.priority || "M\xE9dia";
          if (prio === "Importante" || prio === "Urgente") prio = "Alta";
          let isProg = false;
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
          let status = record.status || "N\xE3o iniciada";
          if (progress === 100) status = "Conclu\xEDda";
          let startDate = record.start_date?.trim() ? new Date(record.start_date) : null;
          if (startDate && isNaN(startDate.getTime())) startDate = null;
          let endDate = record.end_date?.trim() ? new Date(record.end_date) : null;
          if (endDate && isNaN(endDate.getTime())) endDate = null;
          let completedAtDate = compAt ? new Date(compAt) : null;
          if (completedAtDate && isNaN(completedAtDate.getTime())) completedAtDate = null;
          let weightStr = record.weight?.replace(",", ".");
          let weight = parseFloat(weightStr);
          if (isNaN(weight) || weight <= 0) weight = 1;
          const insTask = await client.query(`
               INSERT INTO pl_tasks (
                 title, description, start_date, end_date, status, progress, weight, priority, 
                 category, assigned_to, notes, plan_id, sei_process, 
                 created_by, completed_at, completed_by, is_programmed, updated_at, updated_by
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), 'Importa\xE7\xE3o')
               RETURNING id
            `, [
            record.title || "Sem t\xEDtulo",
            "",
            startDate,
            endDate,
            status,
            progress,
            weight,
            prio,
            catName || "",
            "",
            record.notes || "",
            planId,
            record.sei_process || null,
            record.created_by || "Importa\xE7\xE3o",
            completedAtDate,
            record.completed_by || null,
            isProg
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
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Erro importa\xE7\xE3o:", err);
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Erro no import-tasks:", error);
      res.status(500).json({ success: false, error: error.message || "Erro desconhecido na importa\xE7\xE3o" });
    }
  });
  app.post("/api/tasks", async (req, res) => {
    try {
      const { title, description, startDate, endDate, status, parentId, progress, priority, category, assignedTo, notes, checklist, planId, areaIds, responsibleIds, categoryIds, dependsOnTaskId, type, fiscalizacaoData, recursoData, ouvidoriaData, recursoRevData } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const finalProgress = progress !== void 0 ? parseInt(progress) : 0;
        const finalStatus = finalProgress === 100 ? "Conclu\xEDda" : finalProgress > 0 ? "Em andamento" : "N\xE3o iniciada";
        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
          const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId)]);
          if (parentAreasRes.rows.length > 0) {
            finalAreaIds = parentAreasRes.rows.map((r) => r.area_id);
          }
          const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId)]);
          if (parentCatsRes.rows.length > 0) {
            finalCategoryIds = parentCatsRes.rows.map((r) => r.category_id);
          }
        }
        const reqWeight = parseInt(req.body.weight, 10);
        const finalWeight = isNaN(reqWeight) ? 1 : reqWeight;
        const result = await client.query(
          `INSERT INTO pl_tasks (title, description, start_date, end_date, status, parent_id, progress, priority, category, assigned_to, notes, plan_id, depends_on_task_id, updated_at, updated_by, sei_process, weight, type, fiscalizacao_data, ouvidoria_data, recurso_rev_data, checklist)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING *`,
          [
            title || "Sem t\xEDtulo",
            description || "",
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null,
            finalStatus,
            parentId ? parseInt(parentId) : null,
            finalProgress,
            priority || "M\xE9dia",
            category || "PONTUAIS",
            "",
            // assigned_to will be updated below
            notes || "",
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null,
            req.body.updatedBy || "SGI Pro",
            req.body.seiProcess || null,
            isNaN(finalWeight) ? 1 : finalWeight,
            type || "default",
            fiscalizacaoData ? JSON.stringify(fiscalizacaoData) : null,
            ouvidoriaData || recursoData ? JSON.stringify(ouvidoriaData || recursoData) : null,
            recursoRevData ? JSON.stringify(recursoRevData) : null,
            checklist ? JSON.stringify(checklist) : null
          ]
        );
        const createdTask = result.rows[0];
        const createdTaskId = Number(createdTask.id);
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, aid]);
          }
        }
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, rid]);
          }
        }
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, cid]);
          }
        }
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map((r) => r.name).join(", ");
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
            let nStart = new Date(parentEnd.getTime() + 864e5);
            let nEnd = new Date(parentEnd.getTime() + 864e5);
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
            fiscalizacaoData: createdTask.fiscalizacao_data,
            ouvidoriaData: createdTask.ouvidoria_data,
            recursoData: createdTask.ouvidoria_data,
            recursoRevData: createdTask.recurso_rev_data,
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
    } catch (error) {
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
          return res.status(404).json({ success: false, error: "Tarefa n\xE3o encontrada." });
        }
        const oldParentId = currentTaskRes.rows[0].parent_id;
        const childrenCheck = await client.query("SELECT COUNT(*) FROM pl_tasks WHERE parent_id = $1", [taskId]);
        const hasChildren = parseInt(childrenCheck.rows[0].count, 10) > 0;
        let finalStartDate = startDate ? new Date(startDate) : null;
        let finalEndDate = endDate ? new Date(endDate) : null;
        let finalProgress = progress !== void 0 ? parseInt(progress) : 0;
        let finalStatus = finalProgress === 100 ? "Conclu\xEDda" : finalProgress > 0 ? "Em andamento" : "N\xE3o iniciada";
        if (hasChildren) {
          finalStartDate = currentTaskRes.rows[0].start_date;
          finalEndDate = currentTaskRes.rows[0].end_date;
          finalProgress = currentTaskRes.rows[0].progress || 0;
          finalStatus = finalProgress === 100 ? "Conclu\xEDda" : finalProgress > 0 ? "Em andamento" : "N\xE3o iniciada";
        }
        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
          const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId, 10)]);
          if (parentAreasRes.rows.length > 0) {
            finalAreaIds = parentAreasRes.rows.map((r) => r.area_id);
          }
          const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId, 10)]);
          if (parentCatsRes.rows.length > 0) {
            finalCategoryIds = parentCatsRes.rows.map((r) => r.category_id);
          }
        }
        const reqWeight = parseInt(req.body.weight, 10);
        const finalWeight = isNaN(reqWeight) ? 1 : reqWeight;
        const result = await client.query(
          `UPDATE pl_tasks 
           SET title = $1, description = $2, start_date = $3, end_date = $4, status = $5, progress = $6, priority = $7, category = $8, assigned_to = $9, notes = $10, parent_id = $11, plan_id = $12, depends_on_task_id = $13, updated_at = NOW(), updated_by = $14, sei_process = $16, weight = $17, type = $18, fiscalizacao_data = $19, ouvidoria_data = $20, recurso_rev_data = $21, checklist = $22
           WHERE id = $15
           RETURNING *`,
          [
            title || "Sem t\xEDtulo",
            description || "",
            finalStartDate,
            finalEndDate,
            finalStatus,
            finalProgress,
            priority || "M\xE9dia",
            category || "PONTUAIS",
            "",
            // assigned_to will be updated below
            notes || "",
            parentId ? parseInt(parentId) : null,
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null,
            req.body.updatedBy || "SGI Pro",
            taskId,
            seiProcess || null,
            isNaN(finalWeight) ? 1 : finalWeight,
            type || "default",
            fiscalizacaoData ? JSON.stringify(fiscalizacaoData) : null,
            ouvidoriaData || recursoData ? JSON.stringify(ouvidoriaData || recursoData) : null,
            recursoRevData ? JSON.stringify(recursoRevData) : null,
            checklist ? JSON.stringify(checklist) : null
          ]
        );
        const updatedTask = result.rows[0];
        await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, aid]);
          }
        }
        await client.query("DELETE FROM pl_task_responsibles WHERE task_id = $1", [taskId]);
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, rid]);
          }
        }
        await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, cid]);
          }
        }
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map((r) => r.name).join(", ");
          }
          await client.query("UPDATE pl_tasks SET assigned_to = $1 WHERE id = $2", [finalAssignedTo, taskId]);
        }
        await cascadeAreasAndCategories(client, taskId, finalAreaIds, finalCategoryIds);
        const oldDependsOn = currentTaskRes.rows[0].depends_on_task_id;
        const newDependsOn = updatedTask.depends_on_task_id;
        let finalUpdatedEndDate = updatedTask.end_date;
        if (newDependsOn && oldDependsOn !== newDependsOn) {
          const depRes = await client.query("SELECT end_date FROM pl_tasks WHERE id = $1", [newDependsOn]);
          if (depRes.rows.length > 0 && depRes.rows[0].end_date) {
            const parentEnd = new Date(depRes.rows[0].end_date);
            const oldStart = currentTaskRes.rows[0].start_date ? new Date(currentTaskRes.rows[0].start_date) : null;
            const oldEnd = currentTaskRes.rows[0].end_date ? new Date(currentTaskRes.rows[0].end_date) : null;
            let nStart = new Date(parentEnd.getTime() + 864e5);
            let nEnd = new Date(parentEnd.getTime() + 864e5);
            if (oldStart && oldEnd) {
              const diffMs = oldEnd.getTime() - oldStart.getTime();
              nEnd = new Date(nStart.getTime() + diffMs);
            }
            await client.query("UPDATE pl_tasks SET start_date = $1, end_date = $2 WHERE id = $3", [nStart, nEnd, taskId]);
            finalUpdatedEndDate = nEnd;
          }
        }
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
            fiscalizacaoData: updatedTask.fiscalizacao_data,
            ouvidoriaData: updatedTask.ouvidoria_data,
            recursoData: updatedTask.ouvidoria_data,
            recursoRevData: updatedTask.recurso_rev_data,
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
    } catch (error) {
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
          return res.status(404).json({ success: false, error: "Tarefa n\xE3o encontrada." });
        }
        const parentId = taskRes.rows[0].parent_id;
        const dependsOnTaskId = taskRes.rows[0].depends_on_task_id;
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
    } catch (error) {
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
        const markerPath = process.env.VERCEL ? "/tmp/tasks_cleared_marker.txt" : import_path.default.join("/tmp", "tasks_cleared_marker.txt");
        import_fs.default.writeFileSync(markerPath, "tasks_cleared_" + Date.now(), "utf8");
        await client.query("COMMIT");
        console.log(`[LOG] DELETE /api/tasks: Sucesso! Deletadas ${result.rowCount} tarefas.`);
        res.json({ success: true, message: "Todos os registros da tabela 'pl_tasks' foram exclu\xEDdos com sucesso!", deletedCount: result.rowCount });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Erro ao excluir todas as tarefas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/task-models", async (req, res) => {
    console.log("[API] GET /api/task-models accessed by frontend");
    try {
      const pool = getDbPool();
      const modelsRes = await pool.query("SELECT id, name, created_at, created_by FROM pl_task_models ORDER BY id ASC");
      const itemsRes = await pool.query("SELECT id, model_id, name, duration_days, weight, sequence_order FROM pl_model_tasks ORDER BY model_id ASC, sequence_order ASC, id ASC");
      const itemsMap = {};
      itemsRes.rows.forEach((item) => {
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
        data: modelsRes.rows.map((m) => ({
          id: Number(m.id),
          name: m.name,
          createdAt: m.created_at,
          createdBy: m.created_by,
          items: itemsMap[Number(m.id)] || []
        }))
      });
    } catch (err) {
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
        const createdItems = [];
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
    } catch (err) {
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
          return res.status(404).json({ success: false, error: "Modelo n\xE3o encontrado" });
        }
        await client.query("DELETE FROM pl_model_tasks WHERE model_id = $1", [modelId]);
        const createdItems = [];
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
    } catch (err) {
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
    } catch (err) {
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
        return res.status(400).json({ success: false, error: "Modelo e Data de In\xEDcio s\xE3o obrigat\xF3rios." });
      }
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const itemsRes = await client.query(
          "SELECT name, duration_days, weight FROM pl_model_tasks WHERE model_id = $1 ORDER BY sequence_order ASC, id ASC",
          [parseInt(modelId)]
        );
        if (itemsRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Este modelo n\xE3o possui nenhuma tarefa cadastrada." });
        }
        let pivotDate = new Date(startDate);
        let previousTaskId = null;
        const createdTaskIds = [];
        let parentTaskType = "default";
        let parentOuvidoriaData = null;
        let parentFiscalizacaoData = null;
        let parentRecursoRevData = null;
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
              finalAreaIds = paRes.rows.map((r) => r.area_id);
            }
            if (finalCategoryIds.length === 0) {
              const pcRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId)]);
              finalCategoryIds = pcRes.rows.map((r) => r.category_id);
            }
            if (finalResponsibleIds.length === 0) {
              const prRes = await client.query("SELECT responsible_id FROM pl_task_responsibles WHERE task_id = $1", [parseInt(parentId)]);
              finalResponsibleIds = prRes.rows.map((r) => r.responsible_id);
            }
          }
        }
        for (const item of itemsRes.rows) {
          const duration = Number(item.duration_days) || 0;
          const taskWeight = Number(item.weight) || 1;
          let tStart;
          let tEnd;
          if (sequential && previousTaskId !== null) {
            tStart = new Date(pivotDate.getTime() + 24 * 60 * 60 * 1e3);
            tEnd = new Date(tStart.getTime() + duration * 24 * 60 * 60 * 1e3);
            pivotDate = new Date(tEnd);
          } else {
            tStart = new Date(startDate);
            tEnd = new Date(tStart.getTime() + duration * 24 * 60 * 60 * 1e3);
            if (sequential) {
              pivotDate = new Date(tEnd);
            }
          }
          const taskInsertRes = await client.query(
            `INSERT INTO pl_tasks (
               title, description, start_date, end_date, status, parent_id, progress,
               priority, notes, plan_id, depends_on_task_id, created_at, created_by,
               is_programmed, weight, updated_at, updated_by, type, ouvidoria_data, fiscalizacao_data, recurso_rev_data
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, NOW(), $12, $15, $16, $17, $18)
             RETURNING id`,
            [
              item.name,
              "",
              // description
              tStart,
              tEnd,
              "N\xE3o iniciada",
              parentId ? parseInt(parentId) : null,
              0,
              // progress
              priority || "M\xE9dia",
              `Gerada a partir do Modelo ID: ${modelId}`,
              finalPlanId,
              sequential && previousTaskId ? previousTaskId : null,
              createdBy || "SGI Pro",
              isProgrammed !== false,
              taskWeight,
              parentTaskType,
              parentOuvidoriaData ? typeof parentOuvidoriaData === "object" ? JSON.stringify(parentOuvidoriaData) : parentOuvidoriaData : null,
              parentFiscalizacaoData ? typeof parentFiscalizacaoData === "object" ? JSON.stringify(parentFiscalizacaoData) : parentFiscalizacaoData : null,
              parentRecursoRevData ? typeof parentRecursoRevData === "object" ? JSON.stringify(parentRecursoRevData) : parentRecursoRevData : null
            ]
          );
          const newTaskId = Number(taskInsertRes.rows[0].id);
          createdTaskIds.push(newTaskId);
          previousTaskId = newTaskId;
          if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
            for (const aId of finalAreaIds) {
              await client.query(
                "INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [newTaskId, Number(aId)]
              );
            }
          }
          if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
            for (const cId of finalCategoryIds) {
              await client.query(
                "INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [newTaskId, Number(cId)]
              );
            }
          }
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
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Erro ao gerar tarefas do modelo:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const getParticipationsHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { rows: participations } = await dbPool.query(
        `SELECT 
        id, 
        numero, 
        COALESCE(tipo_resolucao, 'nova') as "tipoResolucao",
        COALESCE(meio_participacao, 'Consulta P\xFAblica') as "meioParticipacao", 
        title, 
        objeto, 
        COALESCE(datainicio, '') as "dataInicio",
        subjects, 
        COALESCE(datafim, '') as "dataFim", 
        COALESCE(createdat, '') as "createdAt",
        subjects
       FROM re_participations 
       ORDER BY id DESC`
      );
      const { rows: anexos } = await dbPool.query("SELECT * FROM re_participation_attachments");
      const { rows: resParticipations } = await dbPool.query(`
      SELECT rp.participation_id, r.* 
      FROM re_resolution_participations rp
      JOIN re_resolutions r ON rp.resolution_id = r.id
    `);
      const result = participations.map((t) => {
        const dInicio = t.dataInicio || t.datainicio || t.data_inicio || "";
        const dFim = t.dataFim || t.datafim || t.data_fim || "";
        const cAt = t.createdAt || t.createdat || t.created_at || "";
        return {
          ...t,
          tipoResolucao: t.tipoResolucao || t.tipo_resolucao || "nova",
          dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
          dataFim: dFim ? String(dFim).split("T")[0] : "",
          createdAt: cAt,
          meioParticipacao: t.meioParticipacao || t.meio_participacao || "Consulta P\xFAblica",
          anexos: anexos.filter((a) => a.participation_id === t.id),
          resolutions: resParticipations.filter((rp) => rp.participation_id === t.id).map((r) => ({ ...r }))
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching participations:", error);
      res.status(500).json({ error: "Failed to fetch participations" });
    }
  };
  const getSingleParticipationHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { rows: participations } = await dbPool.query(
        `SELECT 
        id, 
        numero, 
        COALESCE(tipo_resolucao, 'nova') as "tipoResolucao",
        COALESCE(meio_participacao, 'Consulta P\xFAblica') as "meioParticipacao", 
        title, 
        objeto, 
        COALESCE(datainicio, '') as "dataInicio",
        subjects, 
        COALESCE(datafim, '') as "dataFim", 
        COALESCE(createdat, '') as "createdAt",
        subjects
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
      const { rows: resolutions } = await dbPool.query(`
      SELECT r.* 
      FROM re_resolution_participations rp
      JOIN re_resolutions r ON rp.resolution_id = r.id
      WHERE rp.participation_id = $1
    `, [Number(id)]);
      const t = participations[0];
      const dInicio = t.dataInicio || t.datainicio || t.data_inicio || "";
      const dFim = t.dataFim || t.datafim || t.data_fim || "";
      const cAt = t.createdAt || t.createdat || t.created_at || "";
      res.json({
        ...t,
        tipoResolucao: t.tipoResolucao || t.tipo_resolucao || "nova",
        dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
        dataFim: dFim ? String(dFim).split("T")[0] : "",
        createdAt: cAt,
        meioParticipacao: t.meioParticipacao || t.meio_participacao || "Consulta P\xFAblica",
        anexos: anexos || [],
        resolutions: resolutions || []
      });
    } catch (error) {
      console.error("Error fetching single participation:", error);
      res.status(500).json({ error: "Failed to fetch participation" });
    }
  };
  const createParticipationHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    const client = await dbPool.connect();
    try {
      const { numero, tipoResolucao, meioParticipacao, title, objeto, dataInicio, dataFim, createdAt, anexos, articles, subjects } = req.body;
      const finalTipoResolucao = tipoResolucao === "alteracao" || req.body.tipo_resolucao === "alteracao" ? "alteracao" : "nova";
      const finalDataInicio = (dataInicio || req.body.data_inicio || req.body.datainicio || "").split("T")[0];
      const finalDataFim = (dataFim || req.body.data_fim || req.body.datafim || "").split("T")[0];
      let finalNumero = numero;
      if (!finalNumero) {
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const isTS = meioParticipacao === "Tomada de Subs\xEDdios" || meioParticipacao === "TS";
        const prefix = isTS ? "TS" : "CP";
        const { rows: existing } = await client.query(
          "SELECT numero, meio_participacao FROM re_participations"
        );
        let maxNum = 0;
        for (const row of existing) {
          const rowMeio = row.meio_participacao || "Consulta P\xFAblica";
          const isSameType = isTS ? rowMeio === "Tomada de Subs\xEDdios" || row.numero && row.numero.trim().toUpperCase().startsWith("TS") : rowMeio === "Consulta P\xFAblica" || row.numero && row.numero.trim().toUpperCase().startsWith("CP");
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
      await client.query("BEGIN");
      const insertRes = await client.query(
        `INSERT INTO re_participations (numero, tipo_resolucao, meio_participacao, title, objeto, datainicio, datafim, createdat, subjects)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
        [finalNumero, finalTipoResolucao, meioParticipacao || "Consulta P\xFAblica", title, objeto, finalDataInicio, finalDataFim, createdAt || (/* @__PURE__ */ new Date()).toISOString(), JSON.stringify(req.body.subjects || [])]
      );
      const participationId = insertRes.rows[0].id;
      if (anexos && anexos.length > 0) {
        for (const anexo of anexos) {
          await client.query(
            `INSERT INTO re_participation_attachments (participation_id, name, url, category) VALUES ($1, $2, $3, $4)`,
            [participationId, anexo.name, anexo.url, anexo.category || "Documentos preliminares"]
          );
        }
      }
      if (articles && articles.length > 0) {
        for (const art of articles) {
          await client.query(
            `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
           VALUES ($1, $2, $3, $4, $5, $6)`,
            [participationId, art.order || 0, art.contentType || "text", art.originalText, art.proposedText || null, JSON.stringify(art.subjectIds || [])]
          );
        }
      }
      await client.query("COMMIT");
      res.json({ success: true, id: participationId });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
      }
      console.error("Error creating participation:", error);
      res.status(500).json({ error: "Failed to create participation" });
    } finally {
      client.release();
    }
  };
  const updateParticipationHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    const client = await dbPool.connect();
    try {
      const { id } = req.params;
      const { numero, tipoResolucao, meioParticipacao, title, objeto, dataInicio, dataFim, anexos, subjects } = req.body;
      const finalTipoResolucao = (tipoResolucao || req.body.tipo_resolucao) === "alteracao" ? "alteracao" : "nova";
      const finalDataInicio = (dataInicio || req.body.data_inicio || req.body.datainicio || "").split("T")[0];
      const finalDataFim = (dataFim || req.body.data_fim || req.body.datafim || "").split("T")[0];
      await client.query("BEGIN");
      await client.query(
        `UPDATE re_participations 
       SET numero = $1, tipo_resolucao = $2, meio_participacao = $3, title = $4, objeto = $5, datainicio = $6, datafim = $7, subjects = $9
       WHERE id = $8`,
        [numero, finalTipoResolucao, meioParticipacao || "Consulta P\xFAblica", title, objeto, finalDataInicio, finalDataFim, Number(id), JSON.stringify(req.body.subjects || [])]
      );
      if (Array.isArray(anexos)) {
        await client.query("DELETE FROM re_participation_attachments WHERE participation_id = $1", [Number(id)]);
        for (const anexo of anexos) {
          if (anexo && anexo.name) {
            await client.query(
              `INSERT INTO re_participation_attachments (participation_id, name, url, category) VALUES ($1, $2, $3, $4)`,
              [Number(id), anexo.name, anexo.url || "", anexo.category || "Documentos preliminares"]
            );
          }
        }
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
      }
      console.error("Error updating participation:", error);
      res.status(500).json({ error: "Failed to update participation" });
    } finally {
      client.release();
    }
  };
  const deleteParticipationHandler = async (req, res) => {
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
  const getArticlesHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { rows } = await dbPool.query(
        `SELECT id, participation_id as "tomadaId", participation_id as "participationId", 
              order_index as "order", COALESCE(content_type, 'text') as "contentType",
              original_text as "originalText", 
              proposed_text as "proposedText", final_text as "finalText", 
              final_justification as "finalJustification", subject_ids as "subjectIds" 
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
  const getContributionsHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { rows } = await dbPool.query(
        `SELECT c.id, c.article_id as "articleId", c.user_id as "userId",
              COALESCE(NULLIF(TRIM(c.author_name), ''), u.name, 'Participante') as "authorName", 
              COALESCE(NULLIF(TRIM(c.author_email), ''), u.email, '') as "authorEmail",
              COALESCE(c.author_institution, '') as "authorInstitution",
              COALESCE(c.origin_type, 'online') as "originType",
              COALESCE(c.protocol_number, '') as "protocolNumber",
              c.registered_by_id as "registeredById",
              COALESCE(c.registered_by_name, reg_u.name, '') as "registeredByName",
              c.proposed_text as "proposedText", c.justification, 
              c.decision, c.complexity, c.technical_justification as "technicalJustification",
              c.notes,
              c.created_at as "createdAt"
       FROM re_participation_contributions c
       JOIN re_participation_articles a ON c.article_id = a.id
       LEFT JOIN au_users u ON c.user_id = u.id
       LEFT JOIN au_users reg_u ON c.registered_by_id = reg_u.id
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
  const createContributionHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const {
        articleId,
        userId,
        authorName,
        authorEmail,
        authorInstitution,
        originType,
        protocolNumber,
        registeredById,
        registeredByName,
        proposedText,
        justification,
        createdAt
      } = req.body;
      if (!articleId || isNaN(Number(articleId))) {
        return res.status(400).json({ error: "ID do dispositivo/artigo inv\xE1lido." });
      }
      const effectiveOriginType = (originType || "online").trim().toLowerCase();
      let resolvedUserId = userId !== void 0 && userId !== null && !isNaN(Number(userId)) ? Number(userId) : null;
      if (resolvedUserId) {
        const uCheck = await dbPool.query("SELECT id FROM au_users WHERE id = $1", [resolvedUserId]);
        if (uCheck.rows.length === 0) {
          resolvedUserId = null;
        }
      }
      if (!resolvedUserId) {
        if (authorEmail) {
          const uRes = await dbPool.query("SELECT id FROM au_users WHERE LOWER(email) = LOWER($1)", [authorEmail.trim()]);
          if (uRes.rows.length > 0) resolvedUserId = uRes.rows[0].id;
        }
        if (!resolvedUserId && authorName) {
          const uRes = await dbPool.query("SELECT id FROM au_users WHERE LOWER(name) = LOWER($1)", [authorName.trim()]);
          if (uRes.rows.length > 0) resolvedUserId = uRes.rows[0].id;
        }
        if (!resolvedUserId && (authorName || authorEmail)) {
          const safeName = (authorName || "Usu\xE1rio").trim();
          const safeEmail = (authorEmail || `${safeName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@adasa.df.gov.br`).trim();
          const insUser = await dbPool.query(
            "INSERT INTO au_users (name, email, password, role_id, status) VALUES ($1, $2, $3, 'provider', 'active') RETURNING id",
            [safeName, safeEmail, await hashPassword("1234")]
          );
          resolvedUserId = insUser.rows[0].id;
        }
        if (!resolvedUserId) {
          const firstUser = await dbPool.query("SELECT id FROM au_users ORDER BY id ASC LIMIT 1");
          if (firstUser.rows.length > 0) resolvedUserId = firstUser.rows[0].id;
        }
      }
      if (!resolvedUserId) {
        return res.status(400).json({ error: "Usu\xE1rio autenticado obrigat\xF3rio para enviar contribui\xE7\xE3o." });
      }
      const regById = registeredById !== void 0 && registeredById !== null && !isNaN(Number(registeredById)) ? Number(registeredById) : resolvedUserId;
      const regByName = registeredByName || "";
      const cleanAuthorName = (authorName || "").trim();
      const cleanAuthorEmail = (authorEmail || "").trim();
      const cleanInstitution = (authorInstitution || "").trim();
      const cleanProtocol = (protocolNumber || "").trim();
      if (effectiveOriginType === "online") {
        const existingOnline = await dbPool.query(
          "SELECT id FROM re_participation_contributions WHERE article_id = $1 AND user_id = $2 AND (origin_type = 'online' OR origin_type IS NULL) LIMIT 1",
          [Number(articleId), resolvedUserId]
        );
        if (existingOnline.rows.length > 0) {
          const updRes = await dbPool.query(
            `UPDATE re_participation_contributions
           SET proposed_text = $1,
               justification = $2,
               author_name = $3,
               author_email = $4,
               author_institution = $5,
               protocol_number = $6,
               registered_by_id = $7,
               registered_by_name = $8,
               created_at = $9
           WHERE id = $10
           RETURNING id`,
            [
              proposedText !== void 0 ? proposedText : "",
              justification !== void 0 ? justification : "",
              cleanAuthorName,
              cleanAuthorEmail,
              cleanInstitution,
              cleanProtocol,
              regById,
              regByName,
              createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              existingOnline.rows[0].id
            ]
          );
          return res.json({ success: true, id: updRes.rows[0].id });
        }
      }
      const insRes = await dbPool.query(
        `INSERT INTO re_participation_contributions 
         (article_id, user_id, proposed_text, justification, author_name, author_email, author_institution, origin_type, protocol_number, registered_by_id, registered_by_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
        [
          Number(articleId),
          resolvedUserId,
          proposedText !== void 0 ? proposedText : "",
          justification !== void 0 ? justification : "",
          cleanAuthorName,
          cleanAuthorEmail,
          cleanInstitution,
          effectiveOriginType,
          cleanProtocol,
          regById,
          regByName,
          createdAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
      res.json({ success: true, id: insRes.rows[0].id });
    } catch (error) {
      console.error("Error creating contribution:", error);
      res.status(500).json({ error: "Failed to create contribution" });
    }
  };
  const updateContributionHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const {
        proposedText,
        justification,
        userId,
        authorName,
        authorEmail,
        authorInstitution,
        originType,
        protocolNumber,
        registeredById,
        registeredByName,
        decision,
        createdAt
      } = req.body;
      const parsedUserId = userId !== void 0 && userId !== null && !isNaN(Number(userId)) ? Number(userId) : null;
      const parsedRegById = registeredById !== void 0 && registeredById !== null && !isNaN(Number(registeredById)) ? Number(registeredById) : null;
      await dbPool.query(
        `UPDATE re_participation_contributions
       SET proposed_text = COALESCE($1, proposed_text),
           justification = COALESCE($2, justification),
           user_id = COALESCE($3, user_id),
           author_name = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE author_name END,
           author_email = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE author_email END,
           author_institution = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE author_institution END,
           origin_type = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE origin_type END,
           protocol_number = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE protocol_number END,
           registered_by_id = CASE WHEN $9::integer IS NOT NULL THEN $9 ELSE registered_by_id END,
           registered_by_name = CASE WHEN $10::text IS NOT NULL THEN $10 ELSE registered_by_name END,
           decision = CASE WHEN $11::text IS NOT NULL THEN $11 ELSE decision END,
           created_at = COALESCE($12, created_at)
       WHERE id = $13`,
        [
          proposedText !== void 0 ? proposedText : null,
          justification !== void 0 ? justification : null,
          parsedUserId,
          authorName !== void 0 ? authorName : null,
          authorEmail !== void 0 ? authorEmail : null,
          authorInstitution !== void 0 ? authorInstitution : null,
          originType !== void 0 ? originType : null,
          protocolNumber !== void 0 ? protocolNumber : null,
          parsedRegById,
          registeredByName !== void 0 ? registeredByName : null,
          decision !== void 0 ? decision : null,
          createdAt || null,
          Number(id)
        ]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating contribution:", error);
      res.status(500).json({ error: "Failed to update contribution" });
    }
  };
  const updateContributionAnalysisHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { decision, complexity, technicalJustification, notes } = req.body;
      const updates = [];
      const values = [];
      let queryIndex = 1;
      if (decision !== void 0) {
        updates.push(`decision = $${queryIndex++}`);
        values.push(decision);
      }
      if (complexity !== void 0) {
        updates.push(`complexity = $${queryIndex++}`);
        values.push(complexity);
      }
      if (technicalJustification !== void 0) {
        updates.push(`technical_justification = $${queryIndex++}`);
        values.push(technicalJustification);
      }
      if (notes !== void 0) {
        updates.push(`notes = $${queryIndex++}`);
        values.push(notes);
      }
      if (updates.length > 0) {
        values.push(Number(id));
        await dbPool.query(
          `UPDATE re_participation_contributions
         SET ${updates.join(", ")}
         WHERE id = $${queryIndex}`,
          values
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating contribution analysis:", error);
      res.status(500).json({ error: "Failed to update contribution analysis" });
    }
  };
  const deleteContributionHandler = async (req, res) => {
    console.log("[LOG] DELETE CONTRIB", req.params);
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      await dbPool.query("DELETE FROM re_participation_contributions WHERE id = $1", [Number(id)]);
      res.json({ success: true });
    } catch (error) {
      console.log("DELETE CONTRIB HIT", req.params);
      console.error("Error deleting contribution:", error);
      res.status(500).json({ error: "Failed to delete contribution" });
    }
  };
  const deleteArticleHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      await dbPool.query("DELETE FROM re_participation_articles WHERE id = $1", [Number(id)]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "Failed to delete article" });
    }
  };
  const updateArticleHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { originalText, proposedText, order, finalText, finalJustification, contentType, subjectIds } = req.body;
      await dbPool.query(
        `UPDATE re_participation_articles 
       SET original_text = COALESCE($1, original_text),
           proposed_text = COALESCE($2, proposed_text),
           order_index = COALESCE($3, order_index),
           final_text = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE final_text END,
           final_justification = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE final_justification END,
           content_type = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE content_type END,
           subject_ids = CASE WHEN $8::jsonb IS NOT NULL THEN $8 ELSE subject_ids END
       WHERE id = $7`,
        [
          originalText !== void 0 ? originalText : null,
          proposedText !== void 0 ? proposedText : null,
          order !== void 0 ? order : null,
          finalText !== void 0 ? finalText : null,
          finalJustification !== void 0 ? finalJustification : null,
          contentType !== void 0 ? contentType : null,
          Number(id)
        ]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating article:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  };
  const updateArticleFinalAnalysisHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { finalText, finalJustification } = req.body;
      await dbPool.query(
        `UPDATE re_participation_articles 
       SET final_text = $1,
           final_justification = $2
       WHERE id = $3`,
        [finalText !== void 0 ? finalText : null, finalJustification !== void 0 ? finalJustification : null, Number(id)]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating article final analysis:", error);
      res.status(500).json({ error: "Failed to update article final analysis" });
    }
  };
  const moveArticlesHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { articleIds, targetTomadaId } = req.body;
      if (!Array.isArray(articleIds) || articleIds.length === 0 || !targetTomadaId) {
        return res.status(400).json({ error: "Invalid parameters" });
      }
      const idsToMove = articleIds.filter((id) => id && !String(id).startsWith("temp-") && !String(id).startsWith("new_")).map((id) => Number(id));
      if (idsToMove.length === 0) {
        return res.json({ success: true, message: "No existing articles to move" });
      }
      await dbPool.query(
        `UPDATE re_participation_articles
       SET participation_id = $1
       WHERE id = ANY($2::int[])`,
        [Number(targetTomadaId), idsToMove]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error moving articles:", error);
      res.status(500).json({ error: "Failed to move articles" });
    }
  };
  const updateParticipationArticlesBatchHandler = async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { id } = req.params;
      const { articles } = req.body;
      if (Array.isArray(articles)) {
        const incomingIds = articles.filter((a) => a.id && !String(a.id).startsWith("temp-") && !String(a.id).startsWith("new_")).map((a) => Number(a.id));
        if (incomingIds.length > 0) {
          await dbPool.query(
            `DELETE FROM re_participation_articles WHERE participation_id = $1 AND id != ALL($2::int[])`,
            [Number(id), incomingIds]
          );
        } else {
          await dbPool.query(
            `DELETE FROM re_participation_articles WHERE participation_id = $1`,
            [Number(id)]
          );
        }
        for (const art of articles) {
          if (art.id && !String(art.id).startsWith("temp-") && !String(art.id).startsWith("new_")) {
            await dbPool.query(
              `UPDATE re_participation_articles 
             SET original_text = $1, proposed_text = $2, order_index = $3, content_type = $4, subject_ids = $7
             WHERE id = $5 AND participation_id = $6`,
              [art.originalText || null, art.proposedText || null, art.order || 0, art.contentType || "text", Number(art.id), Number(id), JSON.stringify(art.subjectIds || [])]
            );
          } else {
            await dbPool.query(
              `INSERT INTO re_participation_articles (participation_id, order_index, content_type, original_text, proposed_text, subject_ids)
             VALUES ($1, $2, $3, $4, $5, $6)`,
              [Number(id), art.order || 0, art.contentType || "text", art.originalText || null, art.proposedText || null, JSON.stringify(art.subjectIds || [])]
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
  app.post("/api/reg/articles/move", moveArticlesHandler);
  app.put("/api/reg/articles/:id", updateArticleHandler);
  app.put("/api/reg/articles/:id/final-analysis", updateArticleFinalAnalysisHandler);
  app.get("/api/reg/participations/:id/contributions", getContributionsHandler);
  app.get("/api/reg/tomadas/:id/contributions", getContributionsHandler);
  app.get("/api/reg/participations-dashboard", async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not initialized" });
    try {
      const { rows: participations } = await dbPool.query(
        `SELECT 
        id, 
        numero, 
        COALESCE(tipo_resolucao, 'nova') as "tipoResolucao",
        COALESCE(meio_participacao, 'Consulta P\xFAblica') as "meioParticipacao", 
        title, 
        objeto, 
        COALESCE(datainicio, '') as "dataInicio",
        COALESCE(datafim, '') as "dataFim", 
        COALESCE(createdat, '') as "createdAt",
        subjects
       FROM re_participations 
       ORDER BY id DESC`
      );
      const { rows: articles } = await dbPool.query(
        `SELECT id, participation_id as "participationId", content_type as "contentType", subject_ids as "subjectIds" FROM re_participation_articles ORDER BY order_index`
      );
      const { rows: contributions } = await dbPool.query(
        `SELECT c.id, c.article_id as "articleId", a.participation_id as "participationId", c.user_id as "userId", c.decision, c.complexity, c.created_at as "createdAt"
       FROM re_participation_contributions c
       JOIN re_participation_articles a ON c.article_id = a.id`
      );
      const { rows: anexos } = await dbPool.query('SELECT id, participation_id as "participationId", name, url, category FROM re_participation_attachments');
      const dashboardData = participations.map((p) => {
        const pArticles = articles.filter((a) => Number(a.participationId) === Number(p.id));
        const pContribs = contributions.filter((c) => Number(c.participationId) === Number(p.id));
        const pAnexos = anexos.filter((a) => Number(a.participationId) === Number(p.id));
        const totalArticles = pArticles.length;
        const totalContributions = pContribs.length;
        const uniqueParticipants = new Set(pContribs.map((c) => c.userId).filter(Boolean)).size;
        let acatadas = 0;
        let acatadasParciais = 0;
        let naoAcatadas = 0;
        let prejudicadas = 0;
        let retidas = 0;
        let emAnalise = 0;
        let complexidadeAlta = 0;
        let complexidadeMedia = 0;
        let complexidadeBaixa = 0;
        pContribs.forEach((c) => {
          const dec = (c.decision || "").trim();
          if (dec === "Acatada") acatadas++;
          else if (dec === "Acatada Parcialmente") acatadasParciais++;
          else if (dec === "N\xE3o Acatada") naoAcatadas++;
          else if (dec === "Prejudicada") prejudicadas++;
          else if (dec === "Retida para Estudos Adicionais" || dec === "Retida") retidas++;
          else emAnalise++;
          const comp = (c.complexity || "").trim();
          if (comp === "Alta") complexidadeAlta++;
          else if (comp === "M\xE9dia") complexidadeMedia++;
          else if (comp === "Baixa") complexidadeBaixa++;
        });
        const totalAcatadasGeral = acatadas + acatadasParciais;
        const totalDecididas = totalContributions - emAnalise;
        const taxaAcatamento = totalDecididas > 0 ? totalAcatadasGeral / totalDecididas * 100 : 0;
        const taxaConclusao = totalContributions > 0 ? totalDecididas / totalContributions * 100 : 100;
        const dInicio = p.dataInicio || p.datainicio || "";
        const dFim = p.dataFim || p.datafim || "";
        const cAt = p.createdAt || p.createdat || "";
        return {
          ...p,
          dataInicio: dInicio ? String(dInicio).split("T")[0] : "",
          dataFim: dFim ? String(dFim).split("T")[0] : "",
          createdAt: cAt,
          meioParticipacao: p.meioParticipacao || "Consulta P\xFAblica",
          tipoResolucao: p.tipoResolucao || "nova",
          anexosCount: pAnexos.length,
          totalArticles,
          totalContributions,
          uniqueParticipants,
          articles: pArticles,
          stats: {
            acatadas,
            acatadasParciais,
            naoAcatadas,
            prejudicadas,
            retidas,
            emAnalise,
            totalAcatadasGeral,
            totalDecididas,
            taxaAcatamento: Math.round(taxaAcatamento * 10) / 10,
            taxaConclusao: Math.round(taxaConclusao * 10) / 10,
            complexidadeAlta,
            complexidadeMedia,
            complexidadeBaixa
          }
        };
      });
      res.json({
        success: true,
        data: dashboardData,
        totalParticipations: participations.length,
        totalArticles: articles.length,
        totalContributions: contributions.length
      });
    } catch (error) {
      console.error("Error fetching participations dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  app.post("/api/reg/contributions", createContributionHandler);
  app.put("/api/reg/contributions/:id", updateContributionHandler);
  app.put("/api/reg/contributions/:id/analysis", updateContributionAnalysisHandler);
  app.delete("/api/reg/articles/:id", deleteArticleHandler);
  app.delete("/api/reg/contributions/:id", deleteContributionHandler);
  app.post("/api/reg/ai/analyze-contribution", async (req, res) => {
    try {
      const { originalText, proposedText, userJustification } = req.body;
      if (!originalText || !proposedText || !userJustification) {
        return res.status(400).json({ error: "Missing required fields for AI analysis." });
      }
      const prompt = `Voc\xEA \xE9 um analista t\xE9cnico de regula\xE7\xE3o da ADASA (Ag\xEAncia Reguladora de \xC1guas, Energia e Saneamento B\xE1sico do Distrito Federal).
Voc\xEA precisa analisar uma contribui\xE7\xE3o da sociedade para uma minuta de norma.
O texto original do dispositivo \xE9:
"${originalText}"

O texto sugerido pelo participante \xE9:
"${proposedText}"

A justificativa fornecida pelo participante \xE9:
"${userJustification}"

Avalie a contribui\xE7\xE3o com base no rigor t\xE9cnico regulat\xF3rio, clareza e impacto na presta\xE7\xE3o dos servi\xE7os. 
Forne\xE7a a resposta em formato JSON estrito com os seguintes campos:
- "decision": "Acatada", "Acatada Parcialmente", "N\xE3o Acatada", "Prejudicada" ou "Retida para Estudos Adicionais"
- "complexity": "Alta", "M\xE9dia" ou "Baixa"
- "technicalJustification": Um texto t\xE9cnico, impessoal e claro, com a justificativa t\xE9cnica para a decis\xE3o tomada.`;
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.OBJECT,
                properties: {
                  decision: { type: import_genai.Type.STRING },
                  complexity: { type: import_genai.Type.STRING },
                  technicalJustification: { type: import_genai.Type.STRING }
                },
                required: ["decision", "complexity", "technicalJustification"]
              }
            }
          });
          break;
        } catch (err) {
          if (err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("high demand") || err?.status === 429) {
            retries--;
            if (retries === 0) throw err;
            await new Promise((r) => setTimeout(r, 2e3));
          } else {
            throw err;
          }
        }
      }
      if (response && response.text) {
        res.json(JSON.parse(response.text));
      } else {
        throw new Error("No response from AI");
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      res.status(error?.status === 503 ? 503 : 500).json({ error: error?.message || "Failed to generate AI analysis" });
    }
  });
  app.post("/api/reg/ai/analyze-article", async (req, res) => {
    try {
      const { originalText, contributions } = req.body;
      if (!originalText || !contributions || !Array.isArray(contributions)) {
        return res.status(400).json({ error: "Missing required fields for AI article analysis." });
      }
      const contributionsText = contributions.map((c, i) => `
Contribui\xE7\xE3o ${i + 1}:
Parecer T\xE9cnico Dado: ${c.decision || "N\xE3o informado"}
Surgest\xE3o do Participante: "${c.proposedText}"
Justificativa: "${c.justification}"
Resposta T\xE9cnica Dada: "${c.technicalJustification || "N\xE3o informada"}"
`).join("\\n");
      const prompt = `Voc\xEA \xE9 um revisor t\xE9cnico de regula\xE7\xE3o da ADASA.
Abaixo est\xE1 o texto original de um dispositivo normativo e uma lista de contribui\xE7\xF5es da sociedade com seus respectivos pareceres.

Texto Original:
"${originalText}"

Contribui\xE7\xF5es:
${contributionsText}

Com base no texto original e nas contribui\xE7\xF5es que foram acatadas total ou parcialmente, escreva a Reda\xE7\xE3o Final sugerida para este dispositivo e uma Justificativa T\xE9cnica Final consolidando a vis\xE3o geral do que foi alterado e por qu\xEA.
Se nenhuma contribui\xE7\xE3o foi acatada, a reda\xE7\xE3o final deve ser igual \xE0 original e a justificativa deve apontar brevemente que n\xE3o houve altera\xE7\xF5es.

Forne\xE7a a resposta em formato JSON estrito com os seguintes campos:
- "finalText": O texto consolidado do dispositivo.
- "finalJustification": Um texto t\xE9cnico, impessoal e claro, justificando como as contribui\xE7\xF5es moldaram a reda\xE7\xE3o final.`;
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.OBJECT,
                properties: {
                  finalText: { type: import_genai.Type.STRING },
                  finalJustification: { type: import_genai.Type.STRING }
                },
                required: ["finalText", "finalJustification"]
              }
            }
          });
          break;
        } catch (err) {
          if (err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("high demand") || err?.status === 429) {
            retries--;
            if (retries === 0) throw err;
            await new Promise((r) => setTimeout(r, 2e3));
          } else {
            throw err;
          }
        }
      }
      if (response && response.text) {
        res.json(JSON.parse(response.text));
      } else {
        throw new Error("No response from AI");
      }
    } catch (error) {
      console.error("AI Article Analysis Error:", error);
      res.status(error?.status === 503 ? 503 : 500).json({ error: error?.message || "Failed to generate AI article analysis" });
    }
  });
  app.use("/api", (err, req, res, next) => {
    console.error("Express API error:", err);
    res.status(err.status || 500).json({ success: false, error: err.message || "Internal Server Error" });
  });
  if (!isVercel) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use("/api", (req, res) => {
        res.status(404).json({ success: false, error: "Endpoint n\xE3o encontrado em dev" });
      });
      app.use(vite.middlewares);
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.all("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ success: false, error: "Endpoint da API n\xE3o encontrado." });
        }
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
  }
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
if (!process.env.VERCEL) {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  startServer
});
//# sourceMappingURL=fiscalizacao-server-check.cjs.map
