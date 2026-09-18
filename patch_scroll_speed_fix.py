with open('src/components/PresentationMode.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        // Try scrolling the window if the document is taller than the viewport
        const maxScrollWindow = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScrollWindow > 0) {
          window.scrollTo({ top: Math.min(targetScroll, maxScrollWindow), behavior: 'auto' });
          scrolled = true;
        }
        }
      }

      if (elapsed < totalDuration) {"""

replacement = """        // Try scrolling the window if the document is taller than the viewport
        const maxScrollWindow = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScrollWindow > 0) {
          window.scrollTo({ top: Math.min(targetScroll, maxScrollWindow), behavior: 'auto' });
          scrolled = true;
        }
      }

      if (elapsed < totalDuration) {"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/PresentationMode.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed syntax error")
else:
    print("Target not found")
