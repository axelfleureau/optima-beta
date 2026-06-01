import Image from "next/image"
import { cn } from "@/lib/utils"

type RighelloIconProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
}

export function RighelloIcon({ className, imageClassName, priority = false }: RighelloIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-[#0b0f18] shadow-[0_14px_32px_rgba(214,72,126,0.18)]",
        className,
      )}
    >
      <Image
        src="/assets/logos/righello-logo.svg"
        alt=""
        width={24}
        height={24}
        priority={priority}
        className={cn("h-5 w-5 object-contain", imageClassName)}
      />
    </span>
  )
}
