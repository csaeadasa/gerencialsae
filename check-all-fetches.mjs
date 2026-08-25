import fs from 'fs';

const grepOutput = `
src/components/TaskModelManager.tsx:87:      const res = await fetch(\`/api/task-models?t=\${Date.now()}\`);
src/components/TaskModelManager.tsx:249:      const res = await fetch(url, {
src/components/TaskModelManager.tsx:274:      const res = await fetch(\`/api/task-models/\${id}\`, { method: "DELETE" });
src/components/MapTab.tsx:88:      const res = await fetch(\`/api/save-geojson?waterBalanceId=\${waterBalanceId}\`, {
src/components/MapTab.tsx:110:        const res = await fetch(\`/api/load-geojson?waterBalanceId=\${waterBalanceId}\`);
src/components/RadarAtividadesTab.tsx:144:      const response = await fetch("/api/radar-activities");
src/components/RadarAtividadesTab.tsx:245:      const response = await fetch(\`/api/radar-activities/\${actId}\`, {
src/components/RadarAtividadesTab.tsx:305:        response = await fetch(\`/api/radar-activities/\${editingId}\`, {
src/components/RadarAtividadesTab.tsx:311:        response = await fetch("/api/radar-activities", {
src/components/RadarAtividadesTab.tsx:339:      const response = await fetch(\`/api/radar-activities/\${id}\`, {
src/components/RadarAtividadesTab.tsx:365:      const response = await fetch("/api/radar-activities/import", {
src/components/ResolutionsDashboard.tsx:42:        const response = await fetch("/api/resolutions");
src/components/PublicationsDashboard.tsx:112:        const res = await fetch("/api/publications");
src/components/RegulatoryAgendaTab.tsx:57:      const agendasRes = await fetch("/api/agendas");
src/components/RegulatoryAgendaTab.tsx:65:      const tasksRes = await fetch("/api/tasks");
src/components/RegulatoryAgendaTab.tsx:178:      const response = await fetch(\`/api/agendas/\${id}\`, {
src/components/RegulatoryAgendaTab.tsx:217:      const response = await fetch(url, {
src/components/TomadaSubsidiosTab.tsx:128:      const res = await fetch("/api/reg/ai/analyze-contribution", {
src/components/TomadaSubsidiosTab.tsx:316:      const res = await fetch("/api/reg/ai/analyze-article", {
src/components/TomadaSubsidiosTab.tsx:585:      const res = await fetch("/api/extract-text", {
src/components/TomadaSubsidiosTab.tsx:672:      const res = await fetch('/api/reg/tomadas');
src/components/TomadaSubsidiosTab.tsx:686:        fetch(\`/api/reg/tomadas/\${id}/articles\`),
src/components/TomadaSubsidiosTab.tsx:687:        fetch(\`/api/reg/tomadas/\${id}/contributions\`)
src/components/TomadaSubsidiosTab.tsx:1041:      const res = await fetch('/api/reg/tomadas', {
src/components/TomadaSubsidiosTab.tsx:1088:      const res = await fetch(\`/api/reg/participations/\${tomada.id}/articles\`);
src/components/TomadaSubsidiosTab.tsx:1119:      const res = await fetch(\`/api/reg/participations/\${editFormData.id}\`, {
src/components/TomadaSubsidiosTab.tsx:1130:        await fetch(\`/api/reg/participations/\${editFormData.id}/articles\`, {
src/components/TomadaSubsidiosTab.tsx:1164:      const res = await fetch(\`/api/reg/participations/\${deletingTomada.id}\`, { method: 'DELETE' });
src/components/TomadaSubsidiosTab.tsx:1231:      const res = await fetch(\`/api/reg/contributions/\${contribId}\`, {
src/components/TomadaSubsidiosTab.tsx:1280:        const res = await fetch(\`/api/reg/contributions/\${editingContributionId}\`, {
src/components/TomadaSubsidiosTab.tsx:1333:        const res = await fetch('/api/reg/contributions', {
src/components/TomadaSubsidiosTab.tsx:1387:      const res = await fetch(\`/api/reg/contributions/\${contributionId}/analysis\`, {
src/components/TomadaSubsidiosTab.tsx:1406:      const res = await fetch(\`/api/reg/articles/\${articleId}/final-analysis\`, {
src/components/ResolutionsTab.tsx:68:      const response = await fetch("/api/resolutions");
src/components/ResolutionsTab.tsx:179:      const response = await fetch(url, {
src/components/ResolutionsTab.tsx:201:      const response = await fetch(\`/api/resolutions/\${id}\`, { method: "DELETE" });
src/components/ResolutionsTab.tsx:224:      const response = await fetch("/api/resolutions/import", {
src/components/RegulatoryAgendaDashboard.tsx:124:          const agendasRes = await fetch("/api/agendas");
src/components/RegulatoryAgendaDashboard.tsx:136:          const loadDataRes = await fetch("/api/load-data");
src/components/PublicationsTab.tsx:61:      const response = await fetch("/api/publications");
src/components/PublicationsTab.tsx:161:      const response = await fetch(url, {
src/components/PublicationsTab.tsx:184:      const response = await fetch(\`/api/publications/\${id}\`, {
src/components/PublicationsTab.tsx:209:      const response = await fetch("/api/publications/import", {
src/components/FiscalizacaoEditor.tsx:27:      const res = await fetch('/api/upload', {
src/components/PlanningTab.tsx:330:        const res = await fetch("/api/tasks/import", {
src/components/PlanningTab.tsx:679:      const res = await fetch(\`/api/task-models?t=\${Date.now()}\`);
src/components/PlanningTab.tsx:724:      const res = await fetch("/api/task-models/generate", {
src/components/PlanningTab.tsx:1128:      const res = await fetch(url, {
src/components/PlanningTab.tsx:1175:          const res = await fetch(\`/api/plans/\${id}\`, { method: "DELETE" });
src/components/PlanningTab.tsx:1207:      const res = await fetch(url, {
src/components/PlanningTab.tsx:1254:          const res = await fetch(\`/api/areas/\${id}\`, { method: "DELETE" });
src/components/PlanningTab.tsx:1284:      const res = await fetch(url, {
src/components/PlanningTab.tsx:1328:          const res = await fetch(\`/api/categories/\${id}\`, { method: "DELETE" });
src/components/PlanningTab.tsx:1365:      const res = await fetch(url, {
src/components/PlanningTab.tsx:1490:          const res = await fetch(\`/api/responsibles/\${id}\`, { method: "DELETE" });
src/components/PlanningTab.tsx:3270:      const res = await fetch(url, {
src/components/PlanningTab.tsx:3464:          const res = await fetch(\`/api/tasks/\${id}\`, { method: "DELETE" });
src/components/PlanningTab.tsx:3498:      const res = await fetch(\`/api/tasks/\${task.id}\`, {
src/components/UserManagementTab.tsx:121:        fetch("/api/responsibles").then(r => r.json()).catch(() => ({ success: false, data: [] })),
src/components/UserManagementTab.tsx:122:        fetch("/api/areas").then(r => r.json()).catch(() => ({ success: false, data: [] }))
src/components/UserManagementTab.tsx:394:      const res = await fetch("/api/responsibles", {
src/lib/auth.tsx:146:      const response = await fetch("/api/roles");
src/lib/auth.tsx:161:      const response = await fetch("/api/departments");
src/lib/auth.tsx:176:      const response = await fetch("/api/users");
src/lib/auth.tsx:197:      const response = await fetch("/api/auth/login", {
src/lib/auth.tsx:266:      const response = await fetch("/api/users", {
src/lib/auth.tsx:293:      const response = await fetch(\`/api/users/\${id}\`, {
src/lib/auth.tsx:321:      const response = await fetch(\`/api/users/\${id}\`, {
src/lib/auth.tsx:342:      const response = await fetch("/api/roles", {
src/lib/auth.tsx:370:      const response = await fetch(\`/api/roles/\${id}\`, {
src/lib/auth.tsx:396:      const response = await fetch(\`/api/roles/\${id}\`, {
src/lib/auth.tsx:420:      const response = await fetch("/api/departments", {
src/lib/auth.tsx:446:      const response = await fetch(\`/api/departments/\${id}\`, {
src/lib/auth.tsx:470:      const response = await fetch(\`/api/departments/\${id}\`, {
src/App.tsx:460:      const resTasks = await fetch("/api/tasks");
src/App.tsx:476:          const putRes = await fetch(\`/api/tasks/\${taskId}\`, {
src/App.tsx:504:    fetch("/api/db-status")
src/App.tsx:825:        const res = await fetch("/api/load-data");
src/App.tsx:922:      const res = await fetch("/api/save-module", {
src/App.tsx:1007:      const res = await fetch("/api/save-data", {
src/App.tsx:1059:      const res = await fetch("/api/save-templates", {
`;

const lines = grepOutput.split('\n').filter(Boolean);
const endpoints = [...new Set(lines.map(line => {
  const match = line.match(/fetch\(['"`]([^'"`?]+)/);
  return match ? match[1] : null;
}).filter(Boolean))];

for (const ep of endpoints) {
  try {
    let method = 'GET';
    const line = lines.find(l => l.includes(ep));
    if (line.includes('method: "DELETE"')) method = 'DELETE';
    else if (line.includes('method: "PUT"')) method = 'PUT';
    else if (line.includes('method: "POST"')) method = 'POST';
    else if (line.includes('body:')) method = 'POST'; // Assuming POST if there's a body and no explicit method

    // Some endpoints have `${id}` or `${waterBalanceId}`, replace with 1
    const safeEp = ep.replace(/\$\{[^}]+\}/g, '1');

    const res = await fetch(`http://localhost:3000${safeEp}`, { method });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      console.log(`[HTML RESPONSE] ${method} ${safeEp}`);
    } else {
      console.log(`[OK] ${method} ${safeEp} (Type: ${contentType})`);
    }
  } catch(e) {
    console.log(`[ERROR] ${ep}:`, e);
  }
}
