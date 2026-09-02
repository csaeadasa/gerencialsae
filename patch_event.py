with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_event = """                    onClick={() => {
                      if (typeof window !== 'undefined') {
                         window.dispatchEvent(new CustomEvent('open-resolution-details', { detail: res }));
                      }
                    }}"""

new_event = """                    onClick={() => setSelectedResolutionForModal(res)}"""

if old_event in text:
    text = text.replace(old_event, new_event)
    print("Patched event")

with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
    f.write(text)
