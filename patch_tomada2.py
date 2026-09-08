with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad_str = """                  />
)}
                  </div>
                )}
              {editModalTab === "anexos" && ("""

good_str = """                  />
              {editModalTab === "anexos" && ("""

content = content.replace(bad_str, good_str)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
