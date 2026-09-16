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
