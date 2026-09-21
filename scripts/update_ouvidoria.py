import os
import csv
import io
import json
import psycopg2
from datetime import datetime

# Read database URL
db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")

def parse_date(date_str):
    if not date_str:
        return None
    d = date_str.strip()
    if not d or d == '-':
        return None
    # Expect DD/MM/YYYY
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(d, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None

def normalize_sei(sei):
    if not sei:
        return ""
    s = sei.strip().replace(" ", "").replace(".", "")
    return s

def run_update(csv_text):
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Load all pl_tasks
    cur.execute("SELECT id, title, sei_process, type, ouvidoria_data FROM pl_tasks")
    tasks = cur.fetchall()
    print(f"Loaded {len(tasks)} tasks from pl_tasks")

    # Build maps for matching:
    # 1. By exact or normalized sei_process
    # 2. By sei_process extracted or present in title
    tasks_by_sei = {}
    for tid, title, sei, ttype, ouv in tasks:
        if sei:
            norm = normalize_sei(sei)
            if norm:
                tasks_by_sei.setdefault(norm, []).append((tid, title, sei, ttype, ouv))
        # Also check title for SEI match if not matched
    
    reader = csv.DictReader(io.StringIO(csv_text.strip()), delimiter=';')
    
    matched = []
    not_matched = []

    for row in reader:
        csv_id = row.get("ID", "").strip()
        sei_raw = row.get("Nº do Processo SEI", "").strip()
        doc_sei = row.get("Nº Documento SEI", "").strip()
        nome_usuario = row.get("Nome do Usuário", "").strip()
        endereco_usuario = row.get("Endereço do Usuário", "").strip()
        ra = row.get("Região Administrativa", "").strip()
        classificacao = row.get("Classificação do Imóvel", "").strip()
        tipo_manifestacao = row.get("Tipo de Manifestação", "").strip()
        servico = row.get("Serviço", "").strip()
        categoria = row.get("Categoria", "").strip()
        etapa = row.get("Etapa", "").strip()
        resultado = row.get("Resultado do Processo", "").strip()
        complexidade = row.get("Complexidade", "").strip()
        apuracao = row.get("Apuração", "").strip()
        pos_ouvidoria = row.get("Posicionamento Ouvidoria\n", row.get("Posicionamento Ouvidoria", "")).strip()
        pos_sae = row.get("Posicionamento SAE", "").strip()
        pos_juridico = row.get("Posicionamento Jurídico", "").strip()
        pos_diretoria = row.get("Posicionamento Diretoria", "").strip()
        obs = row.get("Observação", "").strip()

        dt_recebido = parse_date(row.get("Recebido", ""))
        dt_analise = parse_date(row.get("Em Análise Técnica", ""))
        dt_tramitado = parse_date(row.get("Tramitado para a Ouvidoria", ""))
        dt_finalizado = parse_date(row.get("Finalizado", ""))

        norm_sei = normalize_sei(sei_raw)
        
        target_task = None

        if norm_sei and norm_sei in tasks_by_sei:
            candidates = tasks_by_sei[norm_sei]
            # Prefer ouvidoria task if exists
            ouv_cands = [c for c in candidates if c[3] in ('demanda_ouvidoria', 'recurso') or c[4] is not None]
            target_task = ouv_cands[0] if ouv_cands else candidates[0]
        elif norm_sei:
            # Try searching in task titles
            for tid, title, sei, ttype, ouv in tasks:
                if title and norm_sei in normalize_sei(title):
                    target_task = (tid, title, sei, ttype, ouv)
                    break

        if not target_task:
            not_matched.append({
                "id": csv_id,
                "sei": sei_raw,
                "usuario": nome_usuario,
                "tipo": tipo_manifestacao,
                "servico": servico,
                "categoria": categoria,
                "assunto": apuracao[:60] if apuracao else ""
            })
            continue

        tid, title, curr_sei, ttype, curr_ouv = target_task
        
        # Build datasEtapas
        curr_datas = {}
        if curr_ouv and isinstance(curr_ouv, dict) and "datasEtapas" in curr_ouv and isinstance(curr_ouv["datasEtapas"], dict):
            curr_datas = dict(curr_ouv["datasEtapas"])
        
        if dt_recebido: curr_datas["Recebido"] = dt_recebido
        if dt_analise: curr_datas["Em Análise Técnica"] = dt_analise
        if dt_tramitado: curr_datas["Tramitado para a Ouvidoria"] = dt_tramitado
        if dt_finalizado: curr_datas["Finalizado"] = dt_finalizado

        # Build ouvidoria_data
        ouv_data = curr_ouv if isinstance(curr_ouv, dict) else {}
        ouv_data["numeroSei"] = sei_raw or curr_sei or ""
        ouv_data["numeroDocumentoSei"] = doc_sei
        ouv_data["nomeUsuario"] = nome_usuario
        ouv_data["enderecoUsuario"] = endereco_usuario
        ouv_data["regiaoAdministrativa"] = ra
        ouv_data["classificacaoImovel"] = classificacao
        ouv_data["tipoManifestacao"] = tipo_manifestacao
        ouv_data["servico"] = servico
        ouv_data["categoria"] = categoria
        ouv_data["situacao"] = etapa or ouv_data.get("situacao", "Finalizado")
        ouv_data["resultadoProcesso"] = resultado
        ouv_data["complexidade"] = complexidade
        ouv_data["apuracao"] = apuracao
        ouv_data["posicionamentoOuvidoria"] = pos_ouvidoria
        ouv_data["posicionamentoSAE"] = pos_sae
        ouv_data["posicionamentoJuridico"] = pos_juridico
        ouv_data["posicionamentoDiretoria"] = pos_diretoria
        ouv_data["observacao"] = obs
        ouv_data["datasEtapas"] = curr_datas

        # Update pl_tasks
        # Also ensure task type is demanda_ouvidoria, sei_process is set, assigned_to is updated if empty
        cur.execute("""
            UPDATE pl_tasks
            SET ouvidoria_data = %s,
                sei_process = COALESCE(sei_process, %s),
                type = 'demanda_ouvidoria',
                updated_at = NOW(),
                updated_by = 'SGI Pro (Importação Ouvidoria)'
            WHERE id = %s
        """, (json.dumps(ouv_data), sei_raw if sei_raw else None, tid))

        matched.append((csv_id, sei_raw, tid, title))

    conn.commit()
    cur.close()
    conn.close()

    print(f"Total CSV rows matched: {len(matched)}")
    print(f"Total CSV rows NOT matched: {len(not_matched)}")
    
    # Save report
    with open("scripts/relatorio_nao_localizados.json", "w", encoding="utf-8") as f:
        json.dump(not_matched, f, indent=2, ensure_ascii=False)

    return matched, not_matched

if __name__ == "__main__":
    with open("scripts/ouvidoria_input.csv", "r", encoding="utf-8") as f:
        data = f.read()
    run_update(data)
