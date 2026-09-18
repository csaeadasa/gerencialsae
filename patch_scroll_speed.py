import re

with open('src/components/PresentationMode.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        // Calculate progress within the scrolling window (0 to 1)
        const scrollProgress = (elapsed - pauseStart) / scrollDuration;
                
        let scrolled = false;
        // Try scrolling the main container if it has internal overflow
        if (mainContainer) {
          const maxScrollMain = Math.max(0, mainContainer.scrollHeight - mainContainer.clientHeight);
          if (maxScrollMain > 0) {
            const targetScroll = maxScrollMain * scrollProgress;
            mainContainer.scrollTo({ top: targetScroll, behavior: 'auto' });
            scrolled = true;
          }
        }
        // Try scrolling the window if the document is taller than the viewport
        const maxScrollWindow = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScrollWindow > 0) {
          const targetScroll = maxScrollWindow * scrollProgress;
          window.scrollTo({ top: targetScroll, behavior: 'auto' });
          scrolled = true;
        }"""

# Actually, I'll just find the exact lines
def patch():
    with open('src/components/PresentationMode.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if 'const scrollProgress = (elapsed - pauseStart) / scrollDuration;' in line:
            start_idx = i - 1 # include the comment
        if 'scrolled = true;' in line and 'const targetScroll = maxScrollWindow * scrollProgress;' in lines[i-2]:
            end_idx = i + 1
            break
            
    if start_idx != -1 and end_idx != -1:
        replacement = """        const timeScrollingMs = elapsed - pauseStart;
        // Velocidade padrão lenta (pixels por segundo)
        const PIXELS_PER_SECOND = 40;
        const targetScroll = (timeScrollingMs / 1000) * PIXELS_PER_SECOND;
        
        let scrolled = false;
        // Try scrolling the main container if it has internal overflow
        if (mainContainer) {
          const maxScrollMain = Math.max(0, mainContainer.scrollHeight - mainContainer.clientHeight);
          if (maxScrollMain > 0) {
            mainContainer.scrollTo({ top: Math.min(targetScroll, maxScrollMain), behavior: 'auto' });
            scrolled = true;
          }
        }
        
        // Try scrolling the window if the document is taller than the viewport
        const maxScrollWindow = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScrollWindow > 0) {
          window.scrollTo({ top: Math.min(targetScroll, maxScrollWindow), behavior: 'auto' });
          scrolled = true;
        }
"""
        new_lines = lines[:start_idx] + [replacement] + lines[end_idx:]
        with open('src/components/PresentationMode.tsx', 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("Patched via lines")

patch()
