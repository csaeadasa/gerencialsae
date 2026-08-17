import { Task, RecursoRevisaoData, RecursoData, FiscalizacaoData } from '../types';

export const RECURSO_REVISAO_STAGES = [
  'Recebido',
  'Em Análise Técnica',
  'Encaminhado à Diretoria',
  'Notificação do Usuário',
  'Finalizado'
];

export const OUVIDORIA_STAGES = [
  'Recebido',
  'Em Análise Técnica',
  'Tramitado para a Ouvidoria',
  'Encaminhado à Diretoria',
  'Retornado da Diretoria',
  'Finalizado'
];

export const FISCALIZACAO_STAGES = [
  'Planejamento',
  'Execução',
  'Monitoramento',
  'Finalizada'
];

// Helper to generate deterministic progressive/crescent dates within the same year/period
export function generateRandomStageDates(
  stages: string[],
  baseYear: number,
  currentStage?: string,
  taskId: number | string = 1
): Record<string, string> {
  const dates: Record<string, string> = {};
  
  // Choose month based on taskId to distribute across the year (Jan to July)
  const seed = (typeof taskId === 'number' ? taskId : parseInt(String(taskId).replace(/\D/g, '') || '1')) || 1;
  const startMonth = (seed % 7); // 0 (Jan) to 6 (Jul)
  const startDay = ((seed * 7) % 18) + 1; // 1 to 19

  const currentD = new Date(baseYear, startMonth, startDay);

  // Generate progressive crescent dates for all stages in the flow with distinct realistic intervals
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    dates[stage] = currentD.toISOString().split('T')[0];
    
    // Realistic stage intervals:
    // Diretoria/Ouvidoria stages take longer (18-28 days), technical SAE stages take 8-15 days
    let addDays = 10;
    if (stage === 'Encaminhado à Diretoria' || stage === 'Tramitado para a Ouvidoria') {
      addDays = 20 + ((seed * 3) % 9); // 20 to 28 days
    } else if (stage === 'Em Análise Técnica') {
      addDays = 15 + ((seed * 2) % 8); // 15 to 22 days
    } else if (stage === 'Recebido') {
      addDays = 7 + (seed % 6); // 7 to 12 days
    } else {
      addDays = 8 + (seed % 7); // 8 to 14 days
    }
    
    currentD.setDate(currentD.getDate() + addDays);
  }

  return dates;
}

// Ensure all tasks of Recurso de Revisão, Demanda de Ouvidoria and Fiscalização have populated progressive stage dates
export function enrichTasksWithStageDates(tasks: Task[]): Task[] {
  if (!tasks || !Array.isArray(tasks)) return [];

  return tasks.map(task => {
    let updatedTask = { ...task };

    // Detect base year from task dates or id, default within valid range [2021..2025]
    let taskYear = 2025;
    if (task.startDate) {
      const y = new Date(task.startDate).getFullYear();
      if (!isNaN(y) && y >= 2017 && y <= 2026) taskYear = y;
    } else if (task.endDate) {
      const y = new Date(task.endDate).getFullYear();
      if (!isNaN(y) && y >= 2017 && y <= 2026) taskYear = y;
    } else {
      taskYear = 2023 + (task.id % 3); // 2023, 2024, 2025
    }

    // 1. RECURSO DE REVISÃO
    if (task.type === 'recurso_revisao' || task.recursoRevData) {
      const revData: RecursoRevisaoData = { ...(task.recursoRevData || { situacao: 'Recebido' }) };
      const currentStage = revData.situacao || 'Recebido';
      
      // If datasEtapas is missing or has fewer than 2 dates, fill with full crescent flow
      if (!revData.datasEtapas || Object.keys(revData.datasEtapas).length < 2) {
        revData.datasEtapas = generateRandomStageDates(
          RECURSO_REVISAO_STAGES,
          taskYear,
          currentStage,
          task.id
        );
        updatedTask.recursoRevData = revData;
      }
    }

    // 2. DEMANDA DE OUVIDORIA
    if (task.type === 'demanda_ouvidoria' || task.ouvidoriaData || (task.type as string) === 'recurso') {
      const ouvData: RecursoData = { ...(task.ouvidoriaData || task.recursoData || { situacao: 'Recebido' }) };
      const currentStage = ouvData.situacao || 'Recebido';

      if (!ouvData.datasEtapas || Object.keys(ouvData.datasEtapas).length < 2) {
        ouvData.datasEtapas = generateRandomStageDates(
          OUVIDORIA_STAGES,
          taskYear,
          currentStage,
          task.id
        );
        updatedTask.ouvidoriaData = ouvData;
        updatedTask.recursoData = ouvData;
      }
    }

    // 3. FISCALIZAÇÃO
    if (task.type === 'fiscalizacao' || task.fiscalizacaoData) {
      if (task.fiscalizacaoData) {
        const fiscData: FiscalizacaoData = { ...task.fiscalizacaoData };
        const currentStage = fiscData.etapa || 'Planejamento';

        if (!fiscData.datasEtapas || Object.keys(fiscData.datasEtapas).length < 2) {
          fiscData.datasEtapas = generateRandomStageDates(
            FISCALIZACAO_STAGES,
            taskYear,
            currentStage,
            task.id
          );
          updatedTask.fiscalizacaoData = fiscData;
        }
      }
    }

    return updatedTask;
  });
}
