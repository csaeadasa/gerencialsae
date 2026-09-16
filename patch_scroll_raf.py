import re

with open("src/components/PresentationMode.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  // Auto-scroll logic
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

replacement = """  // Auto-scroll logic
  useEffect(() => {
    if (!isPlaying) return;

    const mainContainer = document.querySelector('main');
    
    // Reset scroll when panel changes
    if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });

    let animationFrameId: number;
    let startTime: number | null = null;
    
    // Total duration for the panel in milliseconds
    const totalDuration = config.intervalSeconds * 1000;
    // We pause for 2s at the start and 2s at the end
    const pauseStart = 2000;
    const pauseEnd = 2000;
    const scrollDuration = Math.max(0, totalDuration - pauseStart - pauseEnd);

    const scrollStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed > pauseStart && elapsed < (pauseStart + scrollDuration)) {
        // Calculate progress within the scrolling window (0 to 1)
        const scrollProgress = (elapsed - pauseStart) / scrollDuration;
        
        if (mainContainer) {
          const maxScroll = Math.max(0, mainContainer.scrollHeight - mainContainer.clientHeight);
          const targetScroll = maxScroll * scrollProgress;
          mainContainer.scrollTo({ top: targetScroll, behavior: 'auto' });
        } else {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const targetScroll = maxScroll * scrollProgress;
          window.scrollTo({ top: targetScroll, behavior: 'auto' });
        }
      }

      if (elapsed < totalDuration) {
        animationFrameId = requestAnimationFrame(scrollStep);
      }
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, currentIndex, config.intervalSeconds]);"""

content = content.replace(target, replacement)

with open("src/components/PresentationMode.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
