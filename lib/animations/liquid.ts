export const liquidTimings = {
  instant: 100,
  fast: 150,
  normal: 200,
} as const;

export const liquidEasings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.33, 1, 0.68, 1)',
} as const;

export const liquidExpand = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: {
    duration: liquidTimings.normal / 1000,
    ease: liquidEasings.smooth,
  },
};

export const fluidSlide = {
  fromLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },
  fromRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },
  fromTop: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
  fromBottom: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
  },
  transition: {
    duration: liquidTimings.normal / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidHover = {
  opacity: 0.95,
  boxShadow: '0 2px 8px rgba(100, 116, 139, 0.12)',
  transition: {
    duration: liquidTimings.fast / 1000,
    ease: liquidEasings.default,
  },
};

export const liquidPress = {
  opacity: 0.95,
  transition: {
    duration: liquidTimings.instant / 1000,
    ease: liquidEasings.default,
  },
};

export const liquidFadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: {
    duration: liquidTimings.normal / 1000,
    ease: liquidEasings.smooth,
  },
};

export const liquidScaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: {
    duration: liquidTimings.fast / 1000,
    ease: liquidEasings.default,
  },
};

