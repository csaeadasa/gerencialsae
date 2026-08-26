let text = "Art. 1º bla bla Parágrafo único. blabla. Conforme o § 1º do art. 2º. Veja também no Parágrafo único.";
text = text.replace(/(^|[\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\.?)\s+)?(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi, (match, p1, prep, subunit) => {
   if (prep) return match;
   return p1 + "\n" + subunit;
});
console.log(text);
