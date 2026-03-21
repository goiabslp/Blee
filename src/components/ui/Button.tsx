import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600',
    secondary: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600',
    success: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'h-10 w-10 p-0 rounded-full',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : children}
    </motion.button>
  );
};
