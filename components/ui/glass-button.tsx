import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-liquid-fast ease-liquid-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium hover:shadow-corporate-strong active:brightness-95 backdrop-blur-sm",
        secondary:
          "bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-glass-sm hover:shadow-corporate-subtle hover:border-slate-300/60 dark:hover:border-slate-600/60 text-foreground",
        ghost:
          "bg-transparent hover:bg-white/50 dark:hover:bg-black/30 backdrop-blur-sm text-foreground hover:shadow-corporate-subtle",
        glass:
          "bg-white/60 dark:bg-black/30 backdrop-blur-lg border border-white/40 dark:border-white/10 shadow-glass-md hover:shadow-corporate-medium hover:border-slate-300/50 dark:hover:border-slate-600/50 text-foreground",
        gradient:
          "bg-gradient-to-r from-slate-600/80 to-slate-700/80 dark:from-slate-400/80 dark:to-slate-500/80 backdrop-blur-md border border-slate-200/20 dark:border-slate-700/20 shadow-corporate-subtle hover:shadow-corporate-medium hover:from-slate-700/90 hover:to-slate-800/90 dark:hover:from-slate-300/90 dark:hover:to-slate-400/90 text-white dark:text-slate-900",
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
        subtle: "hover:shadow-corporate-subtle",
        medium: "hover:shadow-corporate-medium",
        strong: "shadow-corporate-medium hover:shadow-corporate-strong",
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
              <div className="absolute inset-0 rounded-full bg-righello-pink animate-spin opacity-60" />
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
