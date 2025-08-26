import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu active:scale-[0.98] active:shadow-inner",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border-2 border-primary/30 hover:border-primary/50 rounded-lg border-t-primary/50 border-l-primary/50 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border-2 border-destructive/30 hover:border-destructive/50 rounded-lg border-t-destructive/50 border-l-destructive/50 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
        outline:
          "border-2 border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-[0_4px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_3px_6px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] border-2 border-secondary/30 hover:border-secondary/50 rounded-lg border-t-secondary/50 border-l-secondary/50 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-lg backdrop-blur-sm border-2 border-transparent hover:border-accent/30 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 py-1.5",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
