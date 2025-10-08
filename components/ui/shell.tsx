import type * as React from "react"
import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  layout?: "default" | "dashboard" | "auth" | "marketing" | "full"
}

function Shell({ as: Comp = "section", className, layout = "default", ...props }: ShellProps) {
  return (
    <Comp
      className={cn(
        "grid items-center gap-8 pb-8 pt-6 md:py-8",
        {
          "container max-w-screen-2xl": layout === "default",
          "container max-w-screen-xl": layout === "dashboard",
          "container max-w-lg": layout === "auth",
          "container max-w-7xl": layout === "marketing",
          "w-full": layout === "full",
        },
        className,
      )}
      {...props}
    />
  )
}

export { Shell }
