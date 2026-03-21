import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends HTMLMotionProps<'div'> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  bordered = true,
  shadow = true,
  className = '',
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <motion.div
      className={`
        rounded-3xl bg-white
        ${bordered ? 'border border-slate-100' : ''}
        ${shadow ? 'shadow-sm hover:shadow-md' : ''}
        ${paddings[padding]}
        transition-all
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};
