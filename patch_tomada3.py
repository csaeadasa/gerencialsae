with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad_str = """                  />
              {editModalTab === "anexos" && ("""

good_str = """                  />
                </div>
              )}
              {editModalTab === "anexos" && ("""

content = content.replace(bad_str, good_str)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
