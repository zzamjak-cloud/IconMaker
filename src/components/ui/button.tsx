import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "disabled:opacity-50 disabled:pointer-events-none",
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
          'border border-input hover:bg-muted': variant === 'outline',
          'hover:bg-muted': variant === 'ghost',
          'h-10 px-4 py-2': size === 'default',
          'h-8 px-3 text-sm': size === 'sm',
          'h-12 px-6': size === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}
