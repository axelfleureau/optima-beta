import { Variants } from 'framer-motion'

export const glassCardVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  hover: {
    scale: 1.02,
    opacity: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

export const glassCardVariantsReducedMotion: Variants = {
  initial: { opacity: 1 },
  hover: { opacity: 0.95 },
  tap: { opacity: 0.9 },
}
