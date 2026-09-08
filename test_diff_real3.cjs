const diff = require("diff");

const origRows = [
  ["Protocolo", "Número do protocolo de atendimento", "Texto"],
];

const propRows = [
  ["Protocolo Modificado", "Número do protocolo de atendimento", "Texto"],
];

const changes = diff.diffArrays(origRows, propRows, {
  comparator: (a, b) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return true;
    const maxCols = Math.max(a.length, b.length);
    if (maxCols === 0) return true;
    
    const a0 = (a[0] || "").trim();
    const b0 = (b[0] || "").trim();
    if (a0 !== "" && a0 === b0) return true;
    
    let same = 0;
    for (let i = 0; i < maxCols; i++) {
      if ((a[i] || "").trim() === (b[i] || "").trim()) same++;
    }
    return same >= Math.ceil(maxCols * 0.66);
  }
});

console.log(JSON.stringify(changes, null, 2));

