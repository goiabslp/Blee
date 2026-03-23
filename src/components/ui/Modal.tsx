import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  subHeader?: React.ReactNode;
  maxWidth?: string;
  position?: 'center' | 'bottom';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  subHeader,
  maxWidth = 'md:w-[450px]',
  position = 'center',
}) => {
  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const containerVariants = {
    center: {
      initial: { opacity: 0, scale: 0.95, y: '-50%', x: '-50%' },
      animate: { opacity: 1, scale: 1, y: '-50%', x: '-50%' },
      exit: { opacity: 0, scale: 0.95, y: '-50%', x: '-50%' },
      className: 'fixed left-1/2 top-1/2 rounded-3xl',
    },
    bottom: {
      initial: { opacity: 0, y: '100%' },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: '100%' },
      className: 'fixed inset-x-4 bottom-8 rounded-3xl md:left-1/2 md:w-[400px] md:-translate-x-1/2',
    },
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={containerVariants[position].initial}
            animate={containerVariants[position].animate}
            exit={containerVariants[position].exit}
            className={`z-[110] max-h-[90vh] overflow-hidden bg-white p-6 shadow-2xl flex flex-col ${containerVariants[position].className} ${maxWidth}`}
          >
            <div className="mb-6 flex items-center justify-between">
              {title && (
                typeof title === 'string' ? (
                  <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                ) : title
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-slate-100">
                <X size={18} />
              </Button>
            </div>
            
            {subHeader && (
              <div className="mb-6">
                {subHeader}
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
              {children}
            </div>

            {footer && (
              <div className="mt-6 flex gap-3 pt-4 border-t border-slate-50">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
