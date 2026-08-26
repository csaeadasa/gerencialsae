const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const modalUI = `
      {/* Modal de Orientações */}
      {showOrientacoesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                Guia de Orientação: Como Propor Alterações
              </h3>
              <button 
                onClick={() => setShowOrientacoesModal(false)}
                className="p-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed font-medium">
              <div className="space-y-3">
                <h4 className="text-emerald-700 font-bold uppercase tracking-wider text-xs">📝 Edição Simples de Texto</h4>
                <p>
                  Para propor uma pequena alteração no texto de um dispositivo, clique no botão <strong className="text-indigo-600">Propor Alteração</strong> correspondente ao dispositivo desejado. 
                  Você visualizará o texto original. Edite-o conforme sua proposta e preencha a Justificativa Técnica para explicar a motivação. 
                  O sistema destacará suas inclusões (em verde) e exclusões (riscadas em vermelho) automaticamente para a área técnica.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-rose-700 font-bold uppercase tracking-wider text-xs">🗑️ Supressão (Exclusão) Total de Dispositivo</h4>
                <p>
                  Para sugerir que um parágrafo, inciso ou artigo inteiro seja removido da norma:
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Clique em "Propor Alteração" no dispositivo que deseja suprimir.</li>
                  <li>Marque a opção <strong className="text-rose-600">"Propor supressão (exclusão) integral deste dispositivo"</strong> localizada acima da caixa de texto.</li>
                  <li>A caixa de texto será desativada, não sendo necessário apagar o texto manualmente.</li>
                  <li>Insira a Justificativa Técnica com os motivos da exclusão e salve.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="text-amber-600 font-bold uppercase tracking-wider text-xs">➕ Inclusão de Novo Artigo / Dispositivo</h4>
                <p>
                  Caso deseje incluir um novo artigo ou dispositivo no meio do texto normativo:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Identificação:</strong> Ao invés de renumerar todos os artigos subsequentes, utilize a numeração do artigo anterior seguida de uma letra maiúscula. <br />
                    <em>Exemplo:</em> Para sugerir um novo artigo após o <strong className="font-mono bg-slate-100 px-1 rounded">Art. 1º</strong>, denomine-o como <strong className="font-mono bg-slate-100 px-1 rounded text-indigo-700">Art. 1Aº</strong>, <strong className="font-mono bg-slate-100 px-1 rounded text-indigo-700">Art. 1Bº</strong>, etc.
                  </li>
                  <li><strong>Como fazer:</strong> Se o novo dispositivo for substituir totalmente o anterior, você pode usar a opção de edição normal no próprio artigo anterior, apagando todo o texto e escrevendo o seu novo texto. Se for uma adição além do que já existe, utilize o artigo mais próximo ao local desejado e adicione a sua proposta junto ao texto, ou adicione no final do capítulo/seção.</li>
                </ul>
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-indigo-900">
                <h4 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> Dicas Importantes
                </h4>
                <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                  <li>Cada usuário pode enviar <strong>apenas uma proposta por dispositivo</strong>. Porém, enquanto a participação estiver aberta, você pode editar sua proposta livremente.</li>
                  <li>O preenchimento da <strong>Justificativa Técnica</strong> é obrigatório em todas as contribuições, pois fundamenta a análise pela área técnica da ADASA.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowOrientacoesModal(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('    </>\n  );\n};', modalUI + '    </>\n  );\n};\n');
fs.writeFileSync(file, content, 'utf8');
