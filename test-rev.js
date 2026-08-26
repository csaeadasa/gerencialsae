const ana = {
  artLabel: "Art. 1º",
  deletedSubunits: [
    { id: "par_unico", type: "paragrafo", label: "Parágrafo único", text: "Parágrafo Único." }
  ],
  subunits: [
    { id: "caput", type: "caput" },
    { id: "art_1a_", type: "artigo_inserido" },
    { id: "art_2a_", type: "artigo_inserido" }
  ]
};

const articles = [ana];
const base = "Resolução 01/2026";

const buildRevogadosText = (articles, base) => {
  const items = [];
  for (const ana of articles) {
    const art = ana.artLabel.toLowerCase();
    const isFullArticle = ana.deletedSubunits.some(s => s.type === "caput") && ana.subunits.length === 0; 
    
    if (isFullArticle) {
       items.push(`o ${art}`);
    } else {
       const labels = ana.deletedSubunits.map(s => s.label.toLowerCase()); 
       const formattedLabels = labels.map(l => {
         if (l.startsWith("alínea") || l.startsWith("alinea")) return `a ${l}`;
         if (l.startsWith("§") || l.startsWith("parágrafo")) return `o ${l}`;
         if (l.startsWith("inciso")) return `o ${l}`;
         return `o ${l}`;
       });

       let labelStr = "";
       if (formattedLabels.length === 1) {
         labelStr = formattedLabels[0];
       } else if (formattedLabels.length === 2) {
         labelStr = `${formattedLabels[0]} e ${formattedLabels[1]}`;
       } else {
         const last = formattedLabels.pop();
         labelStr = `${formattedLabels.join(", ")} e ${last}`;
       }
       
       items.push(`${labelStr}, do ${art}`);
    }
  }
  if (items.length === 0) return "";
  
  let combined = "";
  if (items.length === 1) {
    combined = items[0];
  } else if (items.length === 2) {
    combined = `${items[0]} e ${items[1]}`;
  } else {
    const last = items.pop();
    combined = `${items.join(", ")} e ${last}`;
  }

  return `Ficam revogados ${combined}, da ${base}.`;
};

console.log(buildRevogadosText(articles, base));
