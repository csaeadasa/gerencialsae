import re

with open("src/components/PresentationMode.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  // Reset progress when index changes manually
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);"""

replacement = """  // Reset progress when index changes manually
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Auto-scroll logic
  useEffect(() => {
    if (!isPlaying) return;

    const mainContainer = document.querySelector('main');
    
    // Reset scroll when panel changes
    if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });

    let scrollIntervalId: NodeJS.Timeout;
    
    // Start scrolling after a brief pause so users can read the top of the panel
    const startTimeout = setTimeout(() => {
      // Calculate dynamic speed? Or just a steady 1px per 25ms.
      scrollIntervalId = setInterval(() => {
        if (mainContainer) {
          mainContainer.scrollBy({ top: 1, behavior: 'auto' });
        }
        window.scrollBy({ top: 1, behavior: 'auto' });
      }, 25);
    }, 2000);

    return () => {
      clearTimeout(startTimeout);
      if (scrollIntervalId) clearInterval(scrollIntervalId);
    };
  }, [isPlaying, currentIndex]);"""

content = content.replace(target, replacement)

with open("src/components/PresentationMode.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
