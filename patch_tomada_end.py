import re

with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

end_pattern = r'\s*</>\s*\);\s*\};\s*$'
end_replacement = """
      <ResolutionDetailsModal 
        resolution={selectedResolutionForModal} 
        onClose={() => setSelectedResolutionForModal(null)} 
      />
    </>
  );
};
"""

text = re.sub(end_pattern, end_replacement, text)

with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
    f.write(text)

