import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Состояния контейнеров и образов: цвет несёт смысл, а не украшает. */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-foreground/8 text-foreground/70',
        outline: 'border border-border text-muted-foreground',
        success: 'bg-success/12 text-success',
        warning: 'bg-warning/14 text-warning',
        danger: 'bg-destructive/14 text-destructive',
        info: 'bg-info/14 text-info',
        primary: 'bg-primary/14 text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'span'
  return <Component data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
