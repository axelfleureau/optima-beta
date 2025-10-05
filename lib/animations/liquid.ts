export const liquidTimings = {
  fast: 200,
  smooth: 400,
  slow: 600,
} as const;

export const liquidEasings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.33, 1, 0.68, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

export const liquidExpand = {
  initial: { scale: 0.95, opacity: 0, filter: 'blur(8px)' },
  animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
  exit: { scale: 0.95, opacity: 0, filter: 'blur(8px)' },
  transition: {
    duration: liquidTimings.smooth / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidMorph = {
  initial: { 
    borderRadius: '50%', 
    scale: 0.8,
    rotate: -180,
    opacity: 0 
  },
  animate: { 
    borderRadius: '0.75rem', 
    scale: 1,
    rotate: 0,
    opacity: 1 
  },
  exit: { 
    borderRadius: '50%', 
    scale: 0.8,
    rotate: 180,
    opacity: 0 
  },
  transition: {
    duration: liquidTimings.smooth / 1000,
    ease: liquidEasings.elastic,
  },
};

export const glowPulse = {
  initial: { 
    boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)',
    scale: 1 
  },
  animate: { 
    boxShadow: [
      '0 0 0 0 rgba(168, 85, 247, 0.7)',
      '0 0 0 10px rgba(168, 85, 247, 0)',
      '0 0 0 0 rgba(168, 85, 247, 0)',
    ],
    scale: [1, 1.02, 1],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: liquidEasings.smooth,
  },
};

export const fluidSlide = {
  fromLeft: {
    initial: { x: -100, opacity: 0, filter: 'blur(4px)' },
    animate: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { x: 100, opacity: 0, filter: 'blur(4px)' },
  },
  fromRight: {
    initial: { x: 100, opacity: 0, filter: 'blur(4px)' },
    animate: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { x: -100, opacity: 0, filter: 'blur(4px)' },
  },
  fromTop: {
    initial: { y: -100, opacity: 0, filter: 'blur(4px)' },
    animate: { y: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { y: 100, opacity: 0, filter: 'blur(4px)' },
  },
  fromBottom: {
    initial: { y: 100, opacity: 0, filter: 'blur(4px)' },
    animate: { y: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { y: -100, opacity: 0, filter: 'blur(4px)' },
  },
  transition: {
    duration: liquidTimings.smooth / 1000,
    ease: liquidEasings.smooth,
  },
};

export const particleBurst = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.5, 1],
    opacity: [0, 1, 0],
    rotate: [0, 180, 360],
  },
  transition: {
    duration: liquidTimings.slow / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidHover = {
  scale: 1.02,
  y: -2,
  boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)',
  transition: {
    duration: liquidTimings.fast / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidPress = {
  scale: 0.98,
  filter: 'brightness(0.95)',
  transition: {
    duration: liquidTimings.fast / 1000,
    ease: liquidEasings.default,
  },
};

export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'linear',
  },
};

export const liquidFadeIn = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, filter: 'blur(4px)' },
  transition: {
    duration: liquidTimings.smooth / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidScaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: {
    duration: liquidTimings.fast / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidRotate = {
  animate: {
    rotate: [0, 360],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'linear',
  },
};
