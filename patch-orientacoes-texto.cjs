const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `              <div className="space-y-3">
                <h4 className="text-rose-700 font-bold uppercase tracking-wider text-xs">🗑️ Supressão (Exclusão) Total de Dispositivo</h4>
                <p>
                  Para sugerir que um parágrafo, inciso ou artigo inteiro seja removido da norma:
                </p>`;

const replace = `              <div className="space-y-3">
                <h4 className="text-orange-600 font-bold uppercase tracking-wider text-xs">✂️ Supressão (Exclusão) Parcial</h4>
                <p>
                  Para propor exclusões parciais, como retirar apenas um parágrafo, inciso ou alínea sem remover o artigo inteiro, basta utilizar o botão <strong className="text-indigo-600">Propor Alteração</strong> e, no campo de texto, excluir a parte indesejada. O sistema irá riscar o texto removido automaticamente.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-rose-700 font-bold uppercase tracking-wider text-xs">🗑️ Supressão (Exclusão) Total de Dispositivo</h4>
                <p>
                  Para sugerir que um dispositivo inteiro seja removido da norma:
                </p>`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
