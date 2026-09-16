import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PresentationConfig {
  isActive: boolean;
  intervalSeconds: number;
  panels: string[];
}

interface PresentationControlsProps {
  config: PresentationConfig;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export const PresentationControls: React.FC<PresentationControlsProps> = ({ config, currentIndex, onNext, onPrev, onExit }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  // Mouse move detection for controls
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isPlaying || config.panels.length <= 1) {
      return;
    }

    const intervalMs = config.intervalSeconds * 1000;
    const tickMs = 50; 
    let elapsed = 0;

    const timerId = setInterval(() => {
      elapsed += tickMs;
      setProgress((elapsed / intervalMs) * 100);

      if (elapsed >= intervalMs) {
        setProgress(0);
        onNext();
        elapsed = 0;
      }
    }, tickMs);

    return () => clearInterval(timerId);
  }, [isPlaying, config.intervalSeconds, config.panels.length, onNext]);

  // Reset progress when index changes manually
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
  }, [isPlaying, currentIndex, config.intervalSeconds]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end">
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-slate-700/50 pointer-events-auto"
          >
            <button 
              onClick={onPrev}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Painel Anterior"
            >
              <SkipBack size={20} />
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "p-3 rounded-full transition-colors shadow-lg flex items-center justify-center",
                isPlaying ? "bg-white text-slate-900 hover:bg-slate-200" : "bg-blue-600 text-white hover:bg-blue-500"
              )}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
            </button>
            
            <button 
              onClick={onNext}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Próximo Painel"
            >
              <SkipForward size={20} />
            </button>

            <div className="w-px h-8 bg-slate-700 mx-2"></div>

            <button 
              onClick={onExit}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-full transition-colors flex items-center gap-2"
              title="Sair da Apresentação"
            >
              <X size={20} />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Sair</span>
            </button>

            {/* Progress Bar under controls */}
            {isPlaying && config.panels.length > 1 && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
