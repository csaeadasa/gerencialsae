import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's insert a helper function right after getSmartDiff or before the exports.
# Actually, I can just inject it around line 3720 (right before handleExportConsolidadoPDF).

helper = """
  const renderDiffForPdf = (oldText: string, newText: string, isTableContext: boolean) => {
    if (isTableContext || isTableJson(oldText) || isTableJson(newText)) {
      return formatContentForPdf(newText, false, true, oldText);
    }
    const diffParts = getSmartDiff(oldText || "", newText || "");
    const escapeHtml = (unsafe: string) => {
      return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    return `<div style="white-space: pre-wrap; font-family: inherit; font-size: 11px; line-height: 1.4;">` +
      diffParts.map(part => {
        if (part.added) return `<span style="color: #047857; font-weight: 600; text-decoration: underline; text-decoration-color: rgba(16, 185, 129, 0.5); text-decoration-thickness: 2px;">${escapeHtml(part.value)}</span>`;
        if (part.removed) return `<span style="color: rgba(244, 63, 94, 0.8); font-weight: 500; text-decoration: line-through; text-decoration-color: rgba(244, 63, 94, 0.8);">${escapeHtml(part.value)}</span>`;
        return escapeHtml(part.value);
      }).join('') +
    `</div>`;
  };
"""

if "renderDiffForPdf" not in content:
    content = content.replace("const handleExportConsolidadoPDF = () => {", helper + "\n  const handleExportConsolidadoPDF = () => {")


# For handleExportConsolidadoPDF:
# const origTextHtml = formatContentForPdf(origText, false, isPropostaTable);
# const origTextVigenteHtml = formatContentForPdf(art.originalText || "Sem texto original cadastrado", false, isOriginalTable);
# const fTextHtml = formatContentForPdf(fText, false, isTableFinal, origText);

content = re.sub(
    r'const origTextHtml = formatContentForPdf\(origText, false, isPropostaTable\);',
    r'const origTextHtml = selectedTomada.tipoResolucao === "alteracao" ? renderDiffForPdf(art.originalText || "", origText, isPropostaTable) : formatContentForPdf(origText, false, isPropostaTable);',
    content
)

content = re.sub(
    r'const fTextHtml = formatContentForPdf\(fText, false, isTableFinal, origText\);',
    r'const fTextHtml = renderDiffForPdf(origText, fText, isTableFinal);',
    content
)


# For handleExportContributionsPDF:
# const vigStr = formatContentForPdf(originalArticle?.originalText || "Sem texto original cadastrado", false, isOriginalTable);
# const minStr = formatContentForPdf(originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || ""), false, isPropostaTable);
# const finStr = formatContentForPdf(originalArticle?.finalText || originalArticle?.proposedText || originalArticle?.originalText || "", false, isTableFinal, originalText);

content = re.sub(
    r'const minStr = formatContentForPdf\(originalArticle\?\.proposedText !== undefined \? originalArticle\.proposedText : \(originalArticle\?\.originalText \|\| ""\), false, isPropostaTable\);',
    r'const minStr = selectedTomada?.tipoResolucao === "alteracao" ? renderDiffForPdf(originalArticle?.originalText || "", originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || ""), isPropostaTable) : formatContentForPdf(originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || ""), false, isPropostaTable);',
    content
)

content = re.sub(
    r'const finStr = formatContentForPdf\(originalArticle\?\.finalText \|\| originalArticle\?\.proposedText \|\| originalArticle\?\.originalText \|\| "", false, isTableFinal, originalText\);',
    r'const finStr = renderDiffForPdf(originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || ""), originalArticle?.finalText || originalArticle?.proposedText || originalArticle?.originalText || "", isTableFinal);',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied for PDF exports")
