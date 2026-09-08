with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

# 1. Remove Top handleRepeatProposedAsOriginal button
content = content.replace('''            {isAlteracao && (
              <button
                type="button"
                onClick={handleRepeatProposedAsOriginal}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all"
                title="Copia o texto proposto de cada dispositivo para o campo de texto vigente"
              >
                <Copy size={15} />
                <span>Repetir Texto Proposto como Texto Original</span>
              </button>
            )}''', '')

# 2. Remove Mobile handleRepeatProposedAsOriginal button
content = content.replace('''              {isAlteracao && (
                <button
                  type="button"
                  onClick={handleRepeatProposedAsOriginal}
                  className="flex sm:hidden items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <Copy size={14} />
                  <span>Repetir Texto Proposto como Original</span>
                </button>
              )}''', '')

# 3. Remove Footer handleRepeatProposedAsOriginal button
content = content.replace('''            {isAlteracao && (
              <button
                type="button"
                onClick={handleRepeatProposedAsOriginal}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Copy size={15} />
                <span>Repetir Texto Proposto como Texto Original</span>
              </button>
            )}''', '')

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
