import { Variants } from 'framer-motion'

export const liquidButtonVariants: Variants = {
  initial: {
    scale: 1,
    borderRadius: '0.5rem', // 8px
  },
  hover: {
    scale: 1.05,
    borderRadius: '1rem', // 16px
    transition: {
      duration: 0.3,
      ease: [0.34, 1.56, 0.64, 1], // Overshoot bounce
    },
  },
  tap: {
    scale: 0.95,
    borderRadius: '0.375rem', // 6px (squeeze effect)
    transition: {
      duration: 0.15,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
}

export const liquidButtonVariantsReducedMotion: Variants = {
  initial: { opacity: 1 },
  hover: { opacity: 0.9 },
  tap: { opacity: 0.8 },
}

export const gradientShiftVariants: Variants = {
  initial: { backgroundPosition: '0% 50%' },
  hover: { 
    backgroundPosition: '100% 50%',
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
}
