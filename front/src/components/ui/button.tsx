import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Кнопка панели. Раньше каждая кнопка собиралась из десятка утилит по месту,
 * поэтому одинаковые по смыслу действия выглядели по-разному. Здесь варианты
 * заданы один раз, а вёрстка выбирает смысл: primary, ghost, danger.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap outline-none transition-colors disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/88',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline: 'border border-border bg-transparent text-foreground/75 hover:border-primary/40 hover:text-primary',
        ghost: 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
        danger: 'bg-destructive/12 text-destructive hover:bg-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-2 text-xs',
        default: 'h-8 px-3 text-sm',
        lg: 'h-9 px-4 text-base',
        icon: 'size-8',
        'icon-sm': 'size-6 rounded',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Отрисовать вместо <button> дочерний элемент — например ссылку. */
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
