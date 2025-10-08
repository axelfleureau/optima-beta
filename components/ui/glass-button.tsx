import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-liquid-fast ease-liquid-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-glass-md hover:shadow-glow-purple hover:scale-[1.02] active:brightness-95 backdrop-blur-sm",
        secondary:
          "bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-glass-sm hover:shadow-glass-md hover:border-purple-500/40 text-foreground",
        ghost:
          "bg-transparent hover:bg-white/50 dark:hover:bg-black/30 backdrop-blur-sm text-foreground hover:shadow-glow-purple/30",
        glass:
          "bg-white/60 dark:bg-black/30 backdrop-blur-lg border border-white/40 dark:border-white/10 shadow-glass-md hover:shadow-glow-purple hover:border-purple-500/50 text-foreground",
        gradient:
          "bg-gradient-to-r from-purple-500/80 via-pink-500/80 to-blue-500/80 backdrop-blur-md border border-white/20 shadow-glass-md hover:shadow-glow-pink hover:from-purple-600/90 hover:via-pink-600/90 hover:to-blue-600/90 text-white",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base",
        xl: "h-12 px-10 text-lg",
        icon: "h-10 w-10",
      },
      glow: {
        none: "",
        subtle: "hover:shadow-glow-purple/50",
        medium: "hover:shadow-glow-purple",
        strong: "shadow-glow-purple hover:shadow-glow-pink",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      glow: "none",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, glow, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, glow, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <div className="relative h-4 w-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-spin opacity-60" />
              <div className="absolute inset-1 rounded-full bg-white dark:bg-black" />
            </div>
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
