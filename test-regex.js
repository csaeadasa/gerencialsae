const regex = /^(?:§\s*([0-9]+[ºª]?(?:-[A-Za-z0-9]+)?)|Par[aá]grafo\s+[uú]nico)[\.:\s\-–—]*/i;
const texts = [
  "Parágrafo único. blabla",
  "Paragrafo unico. blabla",
  "Parágrafo Único blabla",
  "Parágrafo único - blabla"
];
texts.forEach(t => console.log(t, regex.exec(t)));
