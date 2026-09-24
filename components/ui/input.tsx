import * as React from "react"

import { cn } from "@/lib/utils"

const nativeDateTimeInputTypes = new Set(["date", "time", "datetime-local", "month", "week"])

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isNativeDateTime = typeof type === "string" && nativeDateTimeInputTypes.has(type)

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full min-w-0 rounded-xl border border-input/90 bg-background/72 px-3.5 py-2 text-base shadow-sm ring-offset-background transition-[border-color,background-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring/60 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isNativeDateTime && "optima-native-date-time",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
