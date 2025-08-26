import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-md hover:shadow-lg border border-primary/20 rounded-lg",
        destructive:
          "bg-gradient-to-b from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/95 hover:to-destructive/85 shadow-md hover:shadow-lg border border-destructive/20 rounded-lg",
        outline:
          "border-2 border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-md rounded-lg",
        secondary:
          "bg-gradient-to-b from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/95 hover:to-secondary/85 shadow-sm hover:shadow-md border border-secondary/20 rounded-lg",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm rounded-lg backdrop-blur-sm",
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
