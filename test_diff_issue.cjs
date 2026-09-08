const diff = require("diff");

const origRows = [
  ["Protocolo", "Numero"],
  ["Serviço", "Servico refer"],
  ["Descrição", "Descricao"],
  ["Tipo", "Tipo da relc"]
];

const propRows = [
  ["Protocolo", "Numero"],
  ["Serviço", "Servico refer"],
  ["Tipo Teste", "fdfdfdfd"], // Added
  ["Tipo", "Tipo da relc"] // Shifted
];

const changes = diff.diffArrays(origRows, propRows, {
  comparator: (a, b) => {
    let same = 0;
    const maxCols = Math.max(a.length, b.length);
    if (maxCols === 0) return true;
    for (let i = 0; i < maxCols; i++) {
      if ((a[i] || "").trim() === (b[i] || "").trim()) same++;
    }
    return same >= Math.max(1, Math.floor(maxCols / 2));
  }
});

console.log(JSON.stringify(changes, null, 2));

