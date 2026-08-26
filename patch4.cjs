const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchUI = `                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                              Texto da Contribuição Sugerida
                            </span>
                          </div>
                          <textarea 
                            className="w-full bg-white px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-sm text-slate-800 font-medium shadow-2xs"
                            rows={10}
                            value={proposedText}
                            onChange={e => setProposedText(e.target.value)}
                            placeholder="Insira a redação que você propõe para este dispositivo..."
                          />
                        </div>`;

const replaceUI = `                        <div>
                          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                                Texto da Contribuição Sugerida
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm">
                              <input
                                type="checkbox"
                                id={\`suppress-\${art.id}\`}
                                checked={isSuppressing}
                                onChange={(e) => {
                                  setIsSuppressing(e.target.checked);
                                  if (e.target.checked) setProposedText("");
                                }}
                                className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-600 cursor-pointer"
                              />
                              <label htmlFor={\`suppress-\${art.id}\`} className="text-xs font-bold text-rose-800 cursor-pointer select-none">
                                Propor supressão (exclusão) integral deste dispositivo
                              </label>
                            </div>
                          </div>
                          <textarea 
                            className={cn(
                              "w-full px-4 py-3 border rounded-xl text-sm font-medium shadow-2xs transition-all",
                              isSuppressing ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-2 focus:ring-emerald-600 text-slate-800"
                            )}
                            rows={10}
                            value={proposedText}
                            onChange={e => setProposedText(e.target.value)}
                            disabled={isSuppressing}
                            placeholder={isSuppressing ? "Dispositivo será excluído integralmente." : "Insira a redação que você propõe para este dispositivo..."}
                          />
                        </div>`;

content = content.replace(searchUI, replaceUI);

const searchPreview = `                        {/* Pré-visualização ao vivo do comparativo */}
                        {proposedText.trim() && (
                          <div className="pt-2">
                            {renderUserContributionComparison(
                              (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") 
                                ? art.proposedText 
                                : (art.originalText || ""),
                              proposedText
                            )}
                          </div>
                        )}`;

const replacePreview = `                        {/* Pré-visualização ao vivo do comparativo */}
                        {(proposedText.trim() || isSuppressing) && (
                          <div className="pt-2">
                            {renderUserContributionComparison(
                              (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") 
                                ? art.proposedText 
                                : (art.originalText || ""),
                              isSuppressing ? "" : proposedText
                            )}
                          </div>
                        )}`;

content = content.replace(searchPreview, replacePreview);

fs.writeFileSync(file, content, 'utf8');
