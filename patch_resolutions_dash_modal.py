import re

with open("src/components/ResolutionsDashboard.tsx", "r") as f:
    text = f.read()

modal_pattern = r'\{\/\* RESOLUTION DETAILS MODAL \*\/\}.*?\}\s*</div>\s*\);\s*\}'
modal_replacement = """{/* RESOLUTION DETAILS MODAL */}
      <ResolutionDetailsModal resolution={selectedResolutionDetails} onClose={() => setSelectedResolutionDetails(null)} />
    </div>
  );
}"""

text = re.sub(modal_pattern, modal_replacement, text, flags=re.DOTALL)

with open("src/components/ResolutionsDashboard.tsx", "w") as f:
    f.write(text)

