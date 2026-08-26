const origText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.`;

const finText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais e Horizontais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Art. 1Aº O prestador de serviços é responsável pelo manejo, acondicionamento, transporte, disposição final adequada e ambientalmente correta dos lodos.

Art. 2Aº Todos os hidrômetros, inclusive o geral, deverão ser instalados em local que possibilite a sua fácil leitura pelo prestador de serviços`;

// Let's implement parseLegalSubunits
const parseLegalSubunits = (rawText) => {
  if (!rawText || !rawText.trim()) return [];

  let preparedText = rawText;
  preparedText = preparedText.replace(/(^|[\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\.?)\s+)?(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi, (match, p1, prep, subunit) => {
    if (prep) return match;
    return p1 + "\n" + subunit;
  });
  preparedText = preparedText.replace(/([.;:])\s*(Art(?:igo)?\.?\s*[0-9]+(?:\s*[ºª])?(?:[\s\-_]*[A-Za-z0-9]+)*(?:\s*[ºª])?[\.:\s\-–—]+)/gi, "$1\n$2");
  preparedText = preparedText.replace(/(^|[^a-zA-Z])([IVXLCDM]+\s*[-–—\.]\s*)/g, (match, p1, p2) => {
    if (p1.match(/t[íi]tulo\s*$|cap[íi]tulo\s*$|se[çc][ãa]o\s*$/i)) return match;
    return p1 + "\n" + p2;
  });

  const lines = preparedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const subunits = [];
  let currentSubunit = null;
  let counter = 0;

  for (const line of lines) {
    const cleanLine = line.replace(/^["'“]+/, "").replace(/["'”]+$/, "").trim();
    if (!cleanLine) continue;

    const parMatch = cleanLine.match(/^(?:§\s*([0-9]+[ºª]?(?:-[A-Za-z0-9]+)?)|Par[aá]grafo\s+[uú]nico)[\.:\s\-–—]*/i);
    const incisoMatch = cleanLine.match(/^([IVXLCDM]+)\s*[-–—\.]\s*(.*)$/i);
    const alineaMatch = cleanLine.match(/^([a-z])\)\s*(.*)$/i);
    const itemMatch = cleanLine.match(/^([0-9]+(?:\.[0-9]+)+)\.?\s*[-–—\.]?\s*(.*)$/);
    const artMatch = cleanLine.match(/^Art(?:igo)?\.?\s*([0-9]+(?:[ºª])?(?:[-_]?[A-Za-z]{1,3})?(?:[ºª])?)(?:[\.:\s\-–—]+|$)/i);

    if (artMatch) {
      const hasRealCaput = subunits.some(s => s.type === "caput" && s.label.startsWith("Art.")) ||
                           (currentSubunit && currentSubunit.type === "caput" && currentSubunit.label.startsWith("Art."));
      if (!hasRealCaput) {
        if (currentSubunit) {
          if (currentSubunit.type === "caput") {
             currentSubunit.id = `texto_intro_${currentSubunit.orderIndex}`;
             currentSubunit.type = "outro";
             currentSubunit.label = "Introdução";
          }
          subunits.push(currentSubunit);
        }
        counter++;
        const rawNum = artMatch[1].trim();
        currentSubunit = {
          id: "caput",
          type: "caput",
          label: `Art. ${rawNum}`,
          text: cleanLine,
          orderIndex: counter
        };
      } else {
        if (currentSubunit) subunits.push(currentSubunit);
        counter++;
        const rawNum = artMatch[1].trim();
        const cleanId = rawNum.toLowerCase().replace(/[^a-z0-9]/g, "_");
        currentSubunit = {
          id: `art_${cleanId}`,
          type: "artigo_inserido",
          label: `Art. ${rawNum}`,
          text: cleanLine,
          orderIndex: counter
        };
      }
    } else if (parMatch) {
      if (currentSubunit && currentSubunit.type === "artigo_inserido") {
        currentSubunit.text += `\n${cleanLine}`;
      } else {
        if (currentSubunit) subunits.push(currentSubunit);
        counter++;
        const isUnico = /par[aá]grafo\s+[uú]nico/i.test(parMatch[0]);
        const parNum = isUnico ? "unico" : (parMatch[1] || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
        const label = isUnico ? "Parágrafo único" : `§ ${parMatch[1] || ""}`;
        currentSubunit = {
          id: `par_${parNum}`,
          type: "paragrafo",
          label,
          text: cleanLine,
          orderIndex: counter
        };
      }
    } else if (incisoMatch) {
      if (currentSubunit && currentSubunit.type === "artigo_inserido") {
        currentSubunit.text += `\n${cleanLine}`;
      } else {
        if (currentSubunit) subunits.push(currentSubunit);
        counter++;
        const roman = incisoMatch[1].toUpperCase();
        currentSubunit = {
          id: `inciso_${roman}`,
          type: "inciso",
          label: `Inciso ${roman}`,
          text: cleanLine,
          orderIndex: counter
        };
      }
    } else if (alineaMatch) {
      if (currentSubunit && currentSubunit.type === "artigo_inserido") {
        currentSubunit.text += `\n${cleanLine}`;
      } else {
        if (currentSubunit) subunits.push(currentSubunit);
        counter++;
        const letter = alineaMatch[1].toLowerCase();
        currentSubunit = {
          id: `alinea_${letter}`,
          type: "alinea",
          label: `Alínea ${letter})`,
          text: cleanLine,
          orderIndex: counter
        };
      }
    } else if (itemMatch) {
      if (currentSubunit && currentSubunit.type === "artigo_inserido") {
        currentSubunit.text += `\n${cleanLine}`;
      } else {
        if (currentSubunit) subunits.push(currentSubunit);
        counter++;
        const itemNum = itemMatch[1];
        currentSubunit = {
          id: `item_${itemNum.replace(/\./g, "_")}`,
          type: "item",
          label: `Item ${itemNum}`,
          text: cleanLine,
          orderIndex: counter
        };
      }
    } else {
      if (currentSubunit && currentSubunit.type === "caput" && subunits.length === 0) {
        currentSubunit.text += `\n${cleanLine}`;
      } else if (!currentSubunit) {
        currentSubunit = {
          id: "caput",
          type: "caput",
          label: "Caput",
          text: cleanLine,
          orderIndex: ++counter
        };
      } else {
        currentSubunit.text += `\n${cleanLine}`;
      }
    }
  }

  if (currentSubunit) subunits.push(currentSubunit);
  return subunits;
};

const orig = parseLegalSubunits(origText);
const fin = parseLegalSubunits(finText);
console.log("ORIG:", JSON.stringify(orig, null, 2));
console.log("FIN:", JSON.stringify(fin, null, 2));
