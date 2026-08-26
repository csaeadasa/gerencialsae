const regex = /(^|[\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\.?)\s+)?(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi;
let texts = [
  "Art. 1º caput bla Parágrafo único. texto do parágrafo.",
  "bla bla; § 1º texto.",
  "nos termos do § 1º do art.",
  "referente ao Parágrafo único do",
  "o § 1º determina",
  "bla bla.\n§ 2º texto"
];
texts.forEach(t => {
  let res = t.replace(regex, (match, p1, prep, subunit) => {
     if (prep) return match; // don't split
     return p1 + "\n" + subunit;
  });
  console.log("---");
  console.log(res);
});
