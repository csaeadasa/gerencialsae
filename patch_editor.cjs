const fs = require('fs');
let content = fs.readFileSync('src/components/FiscalizacaoEditor.tsx', 'utf-8');

content = content.replace(
`                  onChange={e => updateField('codigo', e.target.value)}
                  placeholder="Ex: FISC 01-2026"
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-pink-500 outline-none"`,
`                  readOnly
                  disabled
                  placeholder="Gerado automaticamente"
                  className="w-full border-2 border-slate-200 bg-slate-100 cursor-not-allowed text-slate-500 rounded-lg px-3 py-2 text-sm focus:border-pink-500 outline-none"`
);

fs.writeFileSync('src/components/FiscalizacaoEditor.tsx', content);
console.log("Patched FiscalizacaoEditor.tsx");
