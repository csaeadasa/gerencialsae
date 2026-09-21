import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Pool } = pg;

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = dateStr.trim();
  if (!d || d === '-' || d.toLowerCase() === 'não há') return null;
  
  // Try DD/MM/YYYY
  const parts = d.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }
  return null;
}

function normalizeSeiDigits(sei) {
  if (!sei) return '';
  return String(sei).replace(/\D/g, '');
}

function extractDigitsFromText(text) {
  if (!text) return [];
  // Find sequences like 00197-00001369/2019-99 or 0019700001369201999
  const matches = text.match(/\d{4,6}[\.\-\s]*\d{4,9}[\.\-\s\/\\]*\d{4}[\.\-\s]*\d{1,2}/g);
  if (matches) {
    return matches.map(m => normalizeSeiDigits(m)).filter(m => m.length >= 12);
  }
  const digits = normalizeSeiDigits(text);
  return digits.length >= 12 ? [digits] : [];
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  // Assemble all parts
  const p1 = fs.readFileSync('scripts/ouvidoria_input_part1.csv', 'utf8');
  const header = p1.split('\n').slice(0, 2).join('\n');
  
  let combinedCsv = p1;
  if (fs.existsSync('scripts/ouvidoria_input_part2.csv')) {
    combinedCsv += '\n' + fs.readFileSync('scripts/ouvidoria_input_part2.csv', 'utf8');
  }
  if (fs.existsSync('scripts/ouvidoria_input_part3.csv')) {
    combinedCsv += '\n' + fs.readFileSync('scripts/ouvidoria_input_part3.csv', 'utf8');
  }
  
  fs.writeFileSync('scripts/ouvidoria_input.csv', combinedCsv, 'utf8');
  console.log('Assembled scripts/ouvidoria_input.csv');

  const records = parse(combinedCsv, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  });

  console.log(`Parsed ${records.length} CSV records.`);

  // Load all tasks from DB
  const { rows: tasks } = await pool.query(`
    SELECT id, title, sei_process, type, ouvidoria_data, assigned_to
    FROM pl_tasks
  `);
  console.log(`Loaded ${tasks.length} tasks from database.`);

  // Index tasks by digits and strings
  const taskMapByDigits = new Map();
  const allTasks = [];

  for (const t of tasks) {
    const digSet = new Set();
    if (t.sei_process) {
      const d = normalizeSeiDigits(t.sei_process);
      if (d.length >= 10) digSet.add(d);
    }
    if (t.title) {
      const found = extractDigitsFromText(t.title);
      for (const f of found) {
        if (f.length >= 10) digSet.add(f);
      }
    }
    if (t.ouvidoria_data && typeof t.ouvidoria_data === 'object' && t.ouvidoria_data.numeroSei) {
      const d = normalizeSeiDigits(t.ouvidoria_data.numeroSei);
      if (d.length >= 10) digSet.add(d);
    }

    allTasks.push({ task: t, digSet });
    for (const d of digSet) {
      if (!taskMapByDigits.has(d)) {
        taskMapByDigits.set(d, []);
      }
      taskMapByDigits.get(d).push(t);
    }
  }

  const updatedTasks = [];
  const notFoundRecords = [];

  for (const row of records) {
    const csvId = row['ID'] || '';
    const seiRaw = (row['Nº do Processo SEI'] || '').trim();
    const docSei = (row['Nº Documento SEI'] || '').trim();
    const nomeUsuario = (row['Nome do Usuário'] || '').trim();
    const endereco = (row['Endereço do Usuário'] || '').trim();
    const ra = (row['Região Administrativa'] || '').trim();
    const classificacao = (row['Classificação do Imóvel'] || '').trim();
    const tipoManifestacao = (row['Tipo de Manifestação'] || '').trim();
    const servico = (row['Serviço'] || '').trim();
    const categoria = (row['Categoria'] || '').trim();
    const etapa = (row['Etapa'] || '').trim();
    const resultado = (row['Resultado do Processo'] || '').trim();
    const complexidade = (row['Complexidade'] || '').trim();
    const apuracao = (row['Apuração'] || '').trim();
    const posOuv = (row['Posicionamento Ouvidoria\n'] || row['Posicionamento Ouvidoria'] || '').trim();
    const posSae = (row['Posicionamento SAE'] || '').trim();
    const posJur = (row['Posicionamento Jurídico'] || '').trim();
    const posDir = (row['Posicionamento Diretoria'] || '').trim();
    const obs = (row['Observação'] || '').trim();

    const dtRecebido = parseDate(row['Recebido']);
    const dtAnalise = parseDate(row['Em Análise Técnica']);
    const dtTramitado = parseDate(row['Tramitado para a Ouvidoria']);
    const dtFinalizado = parseDate(row['Finalizado']);

    const seiDigits = normalizeSeiDigits(seiRaw);

    let matchedTask = null;

    if (seiDigits && seiDigits.length >= 10) {
      if (taskMapByDigits.has(seiDigits)) {
        const cands = taskMapByDigits.get(seiDigits);
        // Prefer already ouvidoria task
        matchedTask = cands.find(c => c.type === 'demanda_ouvidoria' || c.ouvidoria_data) || cands[0];
      } else {
        // Try substring search in digits (e.g. if organ 00197 is omitted or included)
        for (const item of allTasks) {
          for (const d of item.digSet) {
            if (d.includes(seiDigits) || seiDigits.includes(d)) {
              matchedTask = item.task;
              break;
            }
          }
          if (matchedTask) break;
        }
      }
    }

    // Fallback: search by user name if title matches and user name is meaningful
    if (!matchedTask && nomeUsuario && nomeUsuario.length > 5 && nomeUsuario !== 'Não identificado' && nomeUsuario !== 'Ouvidoria GDF') {
      const uLower = nomeUsuario.toLowerCase();
      const foundByName = tasks.find(t => t.title && t.title.toLowerCase().includes(uLower));
      if (foundByName) {
        matchedTask = foundByName;
      }
    }

    if (!matchedTask) {
      notFoundRecords.push({
        idCsv: csvId,
        processoSei: seiRaw,
        documentoSei: docSei,
        nomeUsuario: nomeUsuario,
        tipoManifestacao: tipoManifestacao,
        servico: servico,
        categoria: categoria,
        etapa: etapa,
        apuracao: apuracao.slice(0, 100),
        datas: {
          recebido: dtRecebido,
          emAnaliseTecnica: dtAnalise,
          tramitadoParaOuvidoria: dtTramitado,
          finalizado: dtFinalizado
        }
      });
      continue;
    }

    // Build stage history
    const existingOuv = matchedTask.ouvidoria_data && typeof matchedTask.ouvidoria_data === 'object' 
      ? { ...matchedTask.ouvidoria_data } 
      : {};

    const existingDates = existingOuv.datasEtapas && typeof existingOuv.datasEtapas === 'object'
      ? { ...existingOuv.datasEtapas }
      : {};

    if (dtRecebido) existingDates['Recebido'] = dtRecebido;
    if (dtAnalise) existingDates['Em Análise Técnica'] = dtAnalise;
    if (dtTramitado) existingDates['Tramitado para a Ouvidoria'] = dtTramitado;
    if (dtFinalizado) existingDates['Finalizado'] = dtFinalizado;

    const newOuvData = {
      ...existingOuv,
      numeroSei: seiRaw || existingOuv.numeroSei || matchedTask.sei_process || '',
      numeroDocumentoSei: docSei || existingOuv.numeroDocumentoSei || '',
      nomeUsuario: nomeUsuario || existingOuv.nomeUsuario || '',
      enderecoUsuario: endereco || existingOuv.enderecoUsuario || '',
      regiaoAdministrativa: ra || existingOuv.regiaoAdministrativa || '',
      classificacaoImovel: classificacao || existingOuv.classificacaoImovel || 'Residencial',
      tipoManifestacao: tipoManifestacao || existingOuv.tipoManifestacao || 'Reclamação',
      servico: servico || existingOuv.servico || 'Água',
      categoria: categoria || existingOuv.categoria || 'Consumo Medido',
      situacao: etapa || existingOuv.situacao || 'Finalizado',
      resultadoProcesso: resultado || existingOuv.resultadoProcesso || '',
      complexidade: complexidade || existingOuv.complexidade || 'Média',
      apuracao: apuracao || existingOuv.apuracao || '',
      posicionamentoOuvidoria: posOuv || existingOuv.posicionamentoOuvidoria || '',
      posicionamentoSAE: posSae || existingOuv.posicionamentoSAE || '',
      posicionamentoJuridico: posJur || existingOuv.posicionamentoJuridico || '',
      posicionamentoDiretoria: posDir || existingOuv.posicionamentoDiretoria || '',
      observacao: obs || existingOuv.observacao || '',
      datasEtapas: existingDates
    };

    const finalSeiProcess = seiRaw || matchedTask.sei_process;

    await pool.query(`
      UPDATE pl_tasks
      SET ouvidoria_data = $1,
          sei_process = $2,
          type = 'demanda_ouvidoria',
          updated_at = NOW(),
          updated_by = 'SGI Pro (Importação Ouvidoria)'
      WHERE id = $3
    `, [JSON.stringify(newOuvData), finalSeiProcess, matchedTask.id]);

    updatedTasks.push({
      csvId,
      taskId: matchedTask.id,
      seiRaw,
      taskTitle: matchedTask.title,
      etapa,
      docSei,
      usuario: nomeUsuario
    });
  }

  console.log(`\n--- RESULTADO DA ATUALIZAÇÃO ---`);
  console.log(`Total de tarefas atualizadas no banco: ${updatedTasks.length}`);
  console.log(`Total de registros da planilha não localizados: ${notFoundRecords.length}`);

  // Write JSON report
  fs.writeFileSync('scripts/relatorio_nao_localizados.json', JSON.stringify(notFoundRecords, null, 2), 'utf8');
  fs.writeFileSync('scripts/relatorio_atualizados.json', JSON.stringify(updatedTasks, null, 2), 'utf8');

  await pool.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
