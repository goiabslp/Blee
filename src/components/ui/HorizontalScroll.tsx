import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  indicatorClassName?: string;
}

export const HorizontalScroll: React.FC<HorizontalScrollProps> = ({ 
  children, 
  className = "",
  indicatorClassName = ""
}) => {
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkOverflow = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Show arrow if there's more content to the right (with a small buffer)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Check on mount and resize
    checkOverflow();
    
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    // Also check when children change (e.g. dynamic lists)
    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [checkOverflow]);

  return (
    <div className={`relative group/scroll ${className}`}>
      <div 
        ref={scrollRef}
        onScroll={checkOverflow}
        className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar lg:no-scrollbar scroll-smooth"
      >
        {children}
      </div>
      
      <AnimatePresence>
        {showRightArrow && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 0.6, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-10 pr-2 ${indicatorClassName}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 backdrop-blur-[2px] border border-slate-200/50 shadow-sm animate-pulse-subtle">
              <ChevronRight size={18} className="text-slate-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
