export const gradients = {
  primary: {
    purple: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #3b82f6 100%)',
    purpleDark: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #2563eb 100%)',
    purpleLight: 'linear-gradient(135deg, #c084fc 0%, #f472b6 50%, #60a5fa 100%)',
  },
  
  status: {
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  
  mesh: {
    purple: 'radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.3) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%)',
    blue: 'radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.3) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(236, 72, 153, 0.2) 0px, transparent 50%)',
    subtle: 'radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.15) 0px, transparent 50%)',
  },
  
  glassBorder: {
    light: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)',
    dark: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
    colored: 'linear-gradient(135deg, rgba(168, 85, 247, 0.6) 0%, rgba(236, 72, 153, 0.6) 50%, rgba(59, 130, 246, 0.6) 100%)',
  },
} as const;

export const glassStyles = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  
  dark: {
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  
  colored: {
    background: 'rgba(168, 85, 247, 0.1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
  },
} as const;

export const shadowStyles = {
  sm: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  
  md: {
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  
  lg: {
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16), 0 4px 8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  
  glow: {
    purple: '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
    pink: '0 0 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(236, 72, 153, 0.3)',
    blue: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
  },
} as const;

export function createGradient(colors: string[], angle: number = 135): string {
  const colorStops = colors.map((color, index) => {
    const position = (index / (colors.length - 1)) * 100;
    return `${color} ${position}%`;
  }).join(', ');
  
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

export function createRadialGradient(colors: string[], position: string = 'center'): string {
  const colorStops = colors.map((color, index) => {
    const position = (index / (colors.length - 1)) * 100;
    return `${color} ${position}%`;
  }).join(', ');
  
  return `radial-gradient(circle at ${position}, ${colorStops})`;
}

export function createMeshGradient(
  colors: Array<{ color: string; position: string; opacity: number }>
): string {
  const gradients = colors.map(({ color, position, opacity }) => {
    const rgba = hexToRgba(color, opacity);
    return `radial-gradient(at ${position}, ${rgba} 0px, transparent 50%)`;
  });
  
  return gradients.join(', ');
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getGlassStyle(variant: 'light' | 'dark' | 'colored' = 'dark') {
  return glassStyles[variant];
}

export function getShadowStyle(size: 'sm' | 'md' | 'lg' = 'md') {
  return shadowStyles[size];
}

export function getGlowStyle(color: 'purple' | 'pink' | 'blue' = 'purple') {
  return shadowStyles.glow[color];
}

export const animatedGradient = {
  backgroundSize: '200% 200%',
  backgroundImage: gradients.primary.purple,
  animation: 'gradient-shift 3s ease infinite',
};

export const gradientTextStyle = {
  backgroundImage: gradients.primary.purple,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundSize: '200% 200%',
};
