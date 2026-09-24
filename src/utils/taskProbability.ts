import { Task } from "../types";

export interface SubtaskAnalysis {
  task: Task;
  weight: number;
  weightPercent: number; // e.g. 35.5%
  progress: number;
  idealProgress: number;
  progressDiff: number; // real - ideal
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isOverdue: boolean;
  overdueDays: number;
  spi: number;
  status: "Concluída" | "No Prazo" | "Atenção" | "Atrasada" | "Não iniciada";
  impactOnParent: "positivo" | "neutro" | "moderado" | "critico";
  impactExplanation: string;
}

export interface TaskProbabilityResult {
  hasDates: boolean;
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isOverdue: boolean;
  overdueDays: number;
  isCompleted: boolean;
  isNotStarted: boolean;

  realProgress: number;
  idealProgress: number;
  progressDiff: number; // real - ideal
  progressStatus: "adiantado" | "no_ritmo" | "atencao" | "atrasado_critico";

  spi: number; // Schedule Performance Index (IDP)
  dailyVelocityReal: number; // % ao dia
  dailyVelocityNeeded: number; // % ao dia necessária para terminar no prazo

  probability: number; // 0 to 100
  riskLevel: "baixo" | "medio" | "alto" | "critico";
  riskLabel: string;
  riskColor: "emerald" | "blue" | "amber" | "rose";

  projectedEndDate: Date | null;
  projectedDiffDays: number; // positivo = folga, negativo = dias de atraso

  subtasks: SubtaskAnalysis[];
  criticalSubtasks: SubtaskAnalysis[];
  totalWeight: number;

  recommendations: string[];
}

export const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(12, 0, 0, 0);
    return d;
  } catch {
    return null;
  }
};

export const calculateTaskProbability = (
  targetTask: Task | null | undefined,
  taskById: Record<number, Task>,
  childrenMap: Record<number, Task[]>
): TaskProbabilityResult => {
  const emptyResult: TaskProbabilityResult = {
    hasDates: false,
    startDate: null,
    endDate: null,
    totalDays: 0,
    elapsedDays: 0,
    remainingDays: 0,
    isOverdue: false,
    overdueDays: 0,
    isCompleted: false,
    isNotStarted: false,
    realProgress: 0,
    idealProgress: 0,
    progressDiff: 0,
    progressStatus: "no_ritmo",
    spi: 1.0,
    dailyVelocityReal: 0,
    dailyVelocityNeeded: 0,
    probability: 50,
    riskLevel: "medio",
    riskLabel: "Datas não definidas",
    riskColor: "blue",
    projectedEndDate: null,
    projectedDiffDays: 0,
    subtasks: [],
    criticalSubtasks: [],
    totalWeight: 0,
    recommendations: ["Defina as datas de início e término da tarefa para ativar os cálculos probabilísticos."],
  };

  if (!targetTask) return emptyResult;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayMs = today.getTime();

  // Recursive progress & weight evaluator
  const computeNodeProgressAndWeight = (nodeId: number): { progress: number; weight: number } => {
    const node = taskById[nodeId];
    if (!node) return { progress: 0, weight: 1 };
    const w = node.weight !== undefined && node.weight !== ("" as any) && Number(node.weight) > 0 ? Number(node.weight) : 1;
    const cList = childrenMap[nodeId] || [];
    if (cList.length === 0) {
      return { progress: Math.min(100, Math.max(0, node.progress || 0)), weight: w };
    }
    let sumWeight = 0;
    let sumWeightedProg = 0;
    cList.forEach(child => {
      const childData = computeNodeProgressAndWeight(child.id);
      sumWeight += childData.weight;
      sumWeightedProg += childData.progress * childData.weight;
    });
    return {
      progress: sumWeight > 0 ? Math.round(sumWeightedProg / sumWeight) : 0,
      weight: w,
    };
  };

  const directChildren = childrenMap[targetTask.id] || [];
  const hasSubtasks = directChildren.length > 0;

  // Real progress calculation
  let realProgress = 0;
  if (hasSubtasks) {
    let sumW = 0;
    let sumP = 0;
    directChildren.forEach(c => {
      const cData = computeNodeProgressAndWeight(c.id);
      sumW += cData.weight;
      sumP += cData.progress * cData.weight;
    });
    realProgress = sumW > 0 ? Math.round(sumP / sumW) : (targetTask.progress || 0);
  } else {
    realProgress = Math.min(100, Math.max(0, targetTask.progress || 0));
  }

  // Determine parent dates (fallback to min/max of children if parent has missing dates)
  let startDate = parseSafeDate(targetTask.startDate);
  let endDate = parseSafeDate(targetTask.endDate);

  if ((!startDate || !endDate) && hasSubtasks) {
    const childDates = directChildren
      .map(c => ({
        s: parseSafeDate(c.startDate),
        e: parseSafeDate(c.endDate),
      }))
      .filter(cd => cd.s || cd.e);

    if (childDates.length > 0) {
      if (!startDate) {
        const minS = Math.min(...childDates.map(cd => (cd.s ? cd.s.getTime() : cd.e!.getTime())));
        startDate = new Date(minS);
      }
      if (!endDate) {
        const maxE = Math.max(...childDates.map(cd => (cd.e ? cd.e.getTime() : cd.s!.getTime())));
        endDate = new Date(maxE);
      }
    }
  }

  const hasDates = !!(startDate && endDate && startDate <= endDate);

  if (!hasDates) {
    return {
      ...emptyResult,
      realProgress,
      isCompleted: realProgress >= 100,
      recommendations: [
        "Para calcular o progresso ideal e a probabilidade de cumprimento, informe a Data de Início e o Prazo Final.",
      ],
    };
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

  const isCompleted = realProgress >= 100;
  const isNotStarted = todayMs < startMs && realProgress === 0;
  const isOverdue = todayMs > endMs && !isCompleted;
  const overdueDays = isOverdue ? Math.round((todayMs - endMs) / (1000 * 60 * 60 * 24)) : 0;

  let elapsedDays = 0;
  let remainingDays = 0;

  if (todayMs <= startMs) {
    elapsedDays = 0;
    remainingDays = totalDays;
  } else if (todayMs >= endMs) {
    elapsedDays = totalDays;
    remainingDays = Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24)); // negative or 0
  } else {
    elapsedDays = Math.max(0, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)));
    remainingDays = Math.max(0, Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24)));
  }

  // Progresso Ideal esperado na data de hoje
  let idealProgress = 0;
  if (todayMs <= startMs) {
    idealProgress = 0;
  } else if (todayMs >= endMs) {
    idealProgress = 100;
  } else {
    idealProgress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  }

  const progressDiff = realProgress - idealProgress;

  let progressStatus: "adiantado" | "no_ritmo" | "atencao" | "atrasado_critico" = "no_ritmo";
  if (progressDiff >= 5) {
    progressStatus = "adiantado";
  } else if (progressDiff >= -5) {
    progressStatus = "no_ritmo";
  } else if (progressDiff >= -15) {
    progressStatus = "atencao";
  } else {
    progressStatus = "atrasado_critico";
  }

  // Schedule Performance Index (IDP / SPI)
  let spi = 1.0;
  if (idealProgress === 0) {
    spi = realProgress > 0 ? 1.25 : 1.0;
  } else {
    spi = Math.round((realProgress / idealProgress) * 100) / 100;
  }

  // Daily velocities (% per day)
  const dailyVelocityReal = elapsedDays > 0 ? Math.round((realProgress / elapsedDays) * 100) / 100 : 0;
  const neededRemaining = Math.max(0, 100 - realProgress);
  const dailyVelocityNeeded =
    remainingDays > 0 ? Math.round((neededRemaining / remainingDays) * 100) / 100 : neededRemaining > 0 ? 99 : 0;

  // Analyze Subtasks
  let totalWeight = 0;
  const subtasksRaw = directChildren.map(child => {
    const cData = computeNodeProgressAndWeight(child.id);
    totalWeight += cData.weight;
    return {
      task: child,
      weight: cData.weight,
      progress: cData.progress,
    };
  });

  let subtaskPenalty = 0;
  const subtasks: SubtaskAnalysis[] = subtasksRaw.map(({ task: cTask, weight, progress }) => {
    const wPct = totalWeight > 0 ? Math.round((weight / totalWeight) * 1000) / 10 : 100;
    const cStart = parseSafeDate(cTask.startDate);
    const cEnd = parseSafeDate(cTask.endDate);
    let cTotalDays = 0;
    let cElapsedDays = 0;
    let cRemainingDays = 0;
    let cIdealProgress = 0;
    let cIsOverdue = false;
    let cOverdueDays = 0;

    if (cStart && cEnd && cStart <= cEnd) {
      cTotalDays = Math.max(1, Math.round((cEnd.getTime() - cStart.getTime()) / (1000 * 60 * 60 * 24)));
      if (todayMs <= cStart.getTime()) {
        cElapsedDays = 0;
        cRemainingDays = cTotalDays;
        cIdealProgress = 0;
      } else if (todayMs >= cEnd.getTime()) {
        cElapsedDays = cTotalDays;
        cRemainingDays = Math.round((cEnd.getTime() - todayMs) / (1000 * 60 * 60 * 24));
        cIdealProgress = 100;
        cIsOverdue = progress < 100;
        cOverdueDays = cIsOverdue ? Math.abs(cRemainingDays) : 0;
      } else {
        cElapsedDays = Math.max(0, Math.round((todayMs - cStart.getTime()) / (1000 * 60 * 60 * 24)));
        cRemainingDays = Math.max(0, Math.round((cEnd.getTime() - todayMs) / (1000 * 60 * 60 * 24)));
        cIdealProgress = Math.min(100, Math.max(0, Math.round((cElapsedDays / cTotalDays) * 100)));
      }
    } else {
      // Inherit parent ideal progress if no dates
      cIdealProgress = idealProgress;
      cTotalDays = totalDays;
      cRemainingDays = remainingDays;
    }

    const cDiff = progress - cIdealProgress;
    const cSpi = cIdealProgress > 0 ? Math.round((progress / cIdealProgress) * 100) / 100 : progress > 0 ? 1.2 : 1.0;

    let status: SubtaskAnalysis["status"] = "No Prazo";
    if (progress >= 100) {
      status = "Concluída";
    } else if (cIsOverdue) {
      status = "Atrasada";
    } else if (todayMs < (cStart ? cStart.getTime() : startMs)) {
      status = "Não iniciada";
    } else if (cDiff < -10) {
      status = "Atenção";
    }

    let impactOnParent: SubtaskAnalysis["impactOnParent"] = "neutro";
    let impactExplanation = "";

    const relativeWeightFactor = wPct / 100; // 0 to 1

    if (progress >= 100) {
      impactOnParent = "positivo";
      impactExplanation = `100% concluída. Garante a entrega de ${wPct}% do peso total da tarefa pai.`;
    } else if (cIsOverdue) {
      impactOnParent = "critico";
      const penalty = Math.min(30, cOverdueDays * 1.5) * relativeWeightFactor;
      subtaskPenalty += penalty;
      impactExplanation = `Atrasada em ${cOverdueDays} dia(s). Representa ${wPct}% do peso da tarefa pai e reduz fortemente a probabilidade final.`;
    } else if (cDiff < -15 && relativeWeightFactor >= 0.2) {
      impactOnParent = "moderado";
      const penalty = Math.min(15, Math.abs(cDiff) * 0.4) * relativeWeightFactor;
      subtaskPenalty += penalty;
      impactExplanation = `Progresso (${progress}%) abaixo do ideal (${cIdealProgress}%). Alto peso (${wPct}%) exige recuperação de ritmo.`;
    } else if (cDiff >= 10) {
      impactOnParent = "positivo";
      impactExplanation = `Adiantada em +${cDiff}% do cronograma previsto. Favorece a entrega antes do prazo final.`;
    } else {
      impactExplanation = `Em conformidade com o cronograma planejado (${progress}% vs ideal de ${cIdealProgress}%).`;
    }

    return {
      task: cTask,
      weight,
      weightPercent: wPct,
      progress,
      idealProgress: cIdealProgress,
      progressDiff: cDiff,
      startDate: cStart,
      endDate: cEnd,
      totalDays: cTotalDays,
      elapsedDays: cElapsedDays,
      remainingDays: cRemainingDays,
      isOverdue: cIsOverdue,
      overdueDays: cOverdueDays,
      spi: cSpi,
      status,
      impactOnParent,
      impactExplanation,
    };
  });

  const criticalSubtasks = subtasks.filter(s => s.impactOnParent === "critico" || s.impactOnParent === "moderado");

  // Projected Completion Date
  let projectedEndDate: Date | null = null;
  let projectedDiffDays = 0;

  if (isCompleted) {
    projectedEndDate = today;
    projectedDiffDays = remainingDays;
  } else if (dailyVelocityReal > 0) {
    const daysNeeded = Math.round(neededRemaining / dailyVelocityReal);
    projectedEndDate = new Date(todayMs + daysNeeded * 24 * 3600 * 1000);
    projectedDiffDays = Math.round((endMs - projectedEndDate.getTime()) / (1000 * 60 * 60 * 24));
  } else if (isNotStarted) {
    projectedEndDate = endDate;
    projectedDiffDays = 0;
  } else {
    // Zero velocity in progress
    projectedEndDate = null;
    projectedDiffDays = -999;
  }

  // Calculate Probability (0 to 100)
  let probability = 50;

  if (isCompleted) {
    probability = 100;
  } else if (isOverdue) {
    // Prazo expirado e não concluída
    probability = Math.max(1, Math.round(15 - overdueDays * 1.5));
  } else if (isNotStarted) {
    // Prazo ainda não iniciou
    probability = 88;
  } else {
    // Em andamento antes do prazo
    // Componente A: Índice de Ritmo (SPI)
    let spiScore = 80;
    if (spi >= 1.0) {
      spiScore = 85 + Math.min(13, (spi - 1.0) * 35); // 85% to 98%
    } else {
      spiScore = Math.max(10, 85 * spi); // decreases proportionally
    }

    // Componente B: Razão de Velocidade Real vs Necessária
    let velBonus = 0;
    if (dailyVelocityNeeded > 0) {
      const velRatio = dailyVelocityReal / dailyVelocityNeeded;
      if (velRatio >= 1.0) {
        velBonus = Math.min(8, (velRatio - 1.0) * 10);
      } else {
        velBonus = Math.max(-25, (velRatio - 1.0) * 35);
      }
    }

    // Componente C: Margem de Tempo (Time Buffer)
    const timeBufferRatio = Math.max(0, remainingDays) / totalDays;
    const bufferScore = (timeBufferRatio - 0.2) * 10; // small adjustment

    const rawProb = spiScore + velBonus + bufferScore - subtaskPenalty;
    probability = Math.min(99, Math.max(3, Math.round(rawProb)));
  }

  // Risk Classification
  let riskLevel: TaskProbabilityResult["riskLevel"] = "baixo";
  let riskLabel = "Alta Probabilidade (No Prazo)";
  let riskColor: TaskProbabilityResult["riskColor"] = "emerald";

  if (isCompleted) {
    riskLevel = "baixo";
    riskLabel = "Concluída com Sucesso (100%)";
    riskColor = "emerald";
  } else if (isOverdue) {
    riskLevel = "critico";
    riskLabel = `Prazo Vencido (${overdueDays}d de atraso)`;
    riskColor = "rose";
  } else if (probability >= 80) {
    riskLevel = "baixo";
    riskLabel = "Alta Probabilidade (Dentro do Prazo)";
    riskColor = "emerald";
  } else if (probability >= 60) {
    riskLevel = "medio";
    riskLabel = "Probabilidade Moderada (No Ritmo)";
    riskColor = "blue";
  } else if (probability >= 40) {
    riskLevel = "alto";
    riskLabel = "Risco de Atraso (Requer Atenção)";
    riskColor = "amber";
  } else {
    riskLevel = "critico";
    riskLabel = "Alto Risco de Não Cumprimento";
    riskColor = "rose";
  }

  // Recommendations
  const recommendations: string[] = [];

  if (isCompleted) {
    recommendations.push("Atividade 100% finalizada dentro do ciclo de acompanhamento.");
  } else if (isOverdue) {
    recommendations.push(
      `O prazo original encerrou em ${endDate.toLocaleDateString("pt-BR")}. É recomendado renegociar ou registrar aditivo de prazo formal.`
    );
    if (criticalSubtasks.length > 0) {
      recommendations.push(
        `Focar imediatamente nas subatividades pendentes: ${criticalSubtasks.map(s => s.task.title).join(", ")}.`
      );
    }
  } else if (isNotStarted) {
    recommendations.push(
      `A atividade está programada para iniciar em ${startDate.toLocaleDateString("pt-BR")}. Mantenha os recursos alocados conforme o plano.`
    );
  } else {
    if (progressDiff >= 5) {
      recommendations.push(
        `O progresso real (${realProgress}%) está ${progressDiff}% à frente do ideal planejado para hoje (${idealProgress}%). Excelente ritmo de execução!`
      );
    } else if (progressDiff >= -5) {
      recommendations.push(
        `A atividade está em perfeita conformidade com o cronograma esperado (${realProgress}% realizado vs ${idealProgress}% ideal).`
      );
    } else {
      recommendations.push(
        `Existe uma defasagem de ${Math.abs(progressDiff)}% em relação ao cronograma ideal de hoje (${idealProgress}%).`
      );
    }

    if (dailyVelocityNeeded > 0) {
      if (dailyVelocityReal < dailyVelocityNeeded) {
        recommendations.push(
          `Para concluir até ${endDate.toLocaleDateString("pt-BR")}, a velocidade média de entrega precisa subir de ${dailyVelocityReal}%/dia para ${dailyVelocityNeeded}%/dia.`
        );
      } else {
        recommendations.push(
          `O ritmo diário observado (${dailyVelocityReal}%/dia) é suficiente para cumprir a demanda diária necessária (${dailyVelocityNeeded}%/dia).`
        );
      }
    }

    if (criticalSubtasks.length > 0) {
      const topCritical = criticalSubtasks.sort((a, b) => b.weightPercent - a.weightPercent)[0];
      recommendations.push(
        `Gargalo prioritário: A subatividade "${topCritical.task.title}" concentra ${topCritical.weightPercent}% do peso total da tarefa e está com pendências.`
      );
    }

    if (projectedEndDate && projectedDiffDays !== 0) {
      if (projectedDiffDays > 0) {
        recommendations.push(
          `Projeção atual: Término estimado em ${projectedEndDate.toLocaleDateString("pt-BR")} (com margem de segurança de +${projectedDiffDays} dias).`
        );
      } else if (projectedDiffDays < 0) {
        recommendations.push(
          `Projeção atual: Mantido o ritmo histórico, a entrega poderá sofrer um atraso de aproximadamente ${Math.abs(projectedDiffDays)} dias além do prazo final.`
        );
      }
    }
  }

  return {
    hasDates,
    startDate,
    endDate,
    totalDays,
    elapsedDays,
    remainingDays,
    isOverdue,
    overdueDays,
    isCompleted,
    isNotStarted,
    realProgress,
    idealProgress,
    progressDiff,
    progressStatus,
    spi,
    dailyVelocityReal,
    dailyVelocityNeeded,
    probability,
    riskLevel,
    riskLabel,
    riskColor,
    projectedEndDate,
    projectedDiffDays,
    subtasks,
    criticalSubtasks,
    totalWeight,
    recommendations,
  };
};
