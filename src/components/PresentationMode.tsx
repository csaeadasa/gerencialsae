import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PresentationConfig {
  isActive: boolean;
  intervalSeconds?: number;
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

  // References for animation and timing
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(!isPlaying);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    isPausedRef.current = !isPlaying;
  }, [isPlaying]);

  // Mouse move detection for controls
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  // Main dynamic auto-scrolling & transition engine
  useEffect(() => {
    // Reset scroll smoothly when panel changes or loop restarts
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setProgress(0);
    startTimeRef.current = null;

    if (!isPlaying) return;

    // Configurable reading speeds & pauses (in ms)
    const TOP_PAUSE = 3500; // 3.5s pause at top to read banners & key KPIs
    const BOTTOM_PAUSE = 4000; // 4s pause at bottom to read footer & bottom charts
    const PIXELS_PER_SECOND = 42; // Comfortable reading scroll speed (px/sec)
    const FIT_TOTAL_TIME = 8000; // If page fits without scroll, show for 8s

    let isCompleted = false;

    const runScrollLoop = (timestamp: number) => {
      if (isPausedRef.current) {
        animRef.current = requestAnimationFrame(runScrollLoop);
        return;
      }

      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;

      // Dynamically calculate current max scroll height
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const windowMaxScroll = Math.max(0, docHeight - viewHeight);

      let containerMaxScroll = 0;
      if (mainContainer) {
        containerMaxScroll = Math.max(0, mainContainer.scrollHeight - mainContainer.clientHeight);
      }
      const maxScroll = Math.max(windowMaxScroll, containerMaxScroll);

      // Case A: Page fits on screen (no scroll needed)
      if (maxScroll <= 20) {
        const pct = Math.min(100, (elapsed / FIT_TOTAL_TIME) * 100);
        setProgress(pct);

        if (elapsed >= FIT_TOTAL_TIME && !isCompleted) {
          isCompleted = true;
          if (config.panels.length > 1) {
            onNext();
          } else {
            // Loop single panel by restarting timer and state
            setCycleCount(c => c + 1);
          }
          return;
        }

        animRef.current = requestAnimationFrame(runScrollLoop);
        return;
      }

      // Case B: Page has scrollable content
      const scrollDuration = (maxScroll / PIXELS_PER_SECOND) * 1000;
      const totalPanelTime = TOP_PAUSE + scrollDuration + BOTTOM_PAUSE;

      if (elapsed < TOP_PAUSE) {
        // Paused at top
        if (mainContainer && mainContainer.scrollTop > 0) mainContainer.scrollTop = 0;
        if (window.scrollY > 0) window.scrollTo({ top: 0 });
        setProgress(0);
      } else if (elapsed < TOP_PAUSE + scrollDuration) {
        // Scrolling smoothly down
        const scrollElapsed = elapsed - TOP_PAUSE;
        const targetScroll = Math.min(maxScroll, (scrollElapsed / scrollDuration) * maxScroll);

        if (mainContainer && containerMaxScroll > 0) {
          mainContainer.scrollTop = Math.min(targetScroll, containerMaxScroll);
        }
        if (windowMaxScroll > 0) {
          window.scrollTo({ top: Math.min(targetScroll, windowMaxScroll), behavior: 'auto' });
        }

        const pct = Math.min(100, Math.max(0, (targetScroll / maxScroll) * 100));
        setProgress(pct);
      } else if (elapsed < totalPanelTime) {
        // Paused at bottom to read summary / footer
        if (mainContainer && containerMaxScroll > 0) mainContainer.scrollTop = containerMaxScroll;
        if (windowMaxScroll > 0) window.scrollTo({ top: windowMaxScroll });
        setProgress(100);
      } else {
        // Reached end of panel display
        if (!isCompleted) {
          isCompleted = true;
          if (config.panels.length > 1) {
            onNext();
          } else {
            // Single panel: smoothly scroll back to top and restart presentation cycle without re-querying DB
            if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setCycleCount(c => c + 1);
          }
          return;
        }
      }

      animRef.current = requestAnimationFrame(runScrollLoop);
    };

    animRef.current = requestAnimationFrame(runScrollLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentIndex, cycleCount, config.panels.length, onNext]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end">
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/95 backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 pointer-events-auto"
          >
            {config.panels.length > 1 && (
              <button 
                onClick={onPrev}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Painel Anterior"
              >
                <SkipBack size={20} />
              </button>
            )}
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "p-3 rounded-full transition-all shadow-lg flex items-center justify-center",
                isPlaying ? "bg-white text-slate-900 hover:bg-slate-200 hover:scale-105" : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105"
              )}
              title={isPlaying ? "Pausar Rolagem" : "Continuar Rolagem"}
            >
              {isPlaying ? <Pause size={22} className="fill-current" /> : <Play size={22} className="fill-current ml-0.5" />}
            </button>
            
            {config.panels.length > 1 && (
              <button 
                onClick={onNext}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Próximo Painel"
              >
                <SkipForward size={20} />
              </button>
            )}

            <div className="w-px h-8 bg-slate-700 mx-1"></div>

            <button 
              onClick={onExit}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-xl transition-colors flex items-center gap-2"
              title="Sair do Modo Apresentação"
            >
              <X size={18} />
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Sair</span>
            </button>

            {/* Reading Progress Indicator Bar */}
            {isPlaying && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-100"
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
