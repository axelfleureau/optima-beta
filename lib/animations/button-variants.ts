import { Variants } from 'framer-motion'

export const liquidButtonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1],
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
