'use client'

import { motion, useReducedMotion, HTMLMotionProps } from 'framer-motion'
import { liquidButtonVariantsReducedMotion } from '@/lib/animations/button-variants'
import { cn } from '@/lib/utils'

interface LiquidButtonProps extends Omit<HTMLMotionProps<"button">, "variants"> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function LiquidButton({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  ...props 
}: LiquidButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 bg-size-200 text-white',
    secondary: 'bg-gray-700 text-white',
    outline: 'border border-purple-500/50 bg-transparent text-purple-400',
  }

  // Reduced-motion: Framer Motion opacity + smooth transition
  if (shouldReduceMotion) {
    return (
      <motion.button
        variants={liquidButtonVariantsReducedMotion}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className={cn(
          'font-medium',
          'transition-opacity duration-300',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    )
  }

  // For full motion: subtle corporate scale
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        'font-medium transition-transform will-change-transform',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
