import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '../utils'

interface SelectProps {
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    children: React.ReactNode
}

interface SelectTriggerProps {
    className?: string
    children: React.ReactNode
}

interface SelectContentProps {
    className?: string
    children: React.ReactNode
}

interface SelectItemProps {
    value: string
    className?: string
    children: React.ReactNode
}

interface SelectValueProps {
    placeholder?: string
    className?: string
}

const SelectContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}>({
    open: false,
    setOpen: () => {},
})

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
    ({ value, onValueChange, children, disabled }, ref) => {
        const [open, setOpen] = React.useState(false)

        return (
            <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
                <div ref={ref} className="tw-relative">
                    {children}
                </div>
            </SelectContext.Provider>
        )
    }
)
Select.displayName = 'Select'

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
    ({ className, children, ...props }, ref) => {
        const { open, setOpen } = React.useContext(SelectContext)

        return (
            <button
                ref={ref}
                type="button"
                role="combobox"
                aria-expanded={open}
                className={cn(
                    'tw-flex tw-h-10 tw-w-full tw-items-center tw-justify-between tw-rounded-md tw-border tw-border-gray-600 tw-bg-gray-700 tw-px-3 tw-py-2 tw-text-sm tw-text-white placeholder:tw-text-gray-400 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-ring-offset-2 disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
                    className
                )}
                onClick={() => setOpen(!open)}
                {...props}
            >
                {children}
                <ChevronDownIcon className="tw-h-4 tw-w-4 tw-opacity-50" />
            </button>
        )
    }
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
    ({ placeholder, className }, ref) => {
        const { value } = React.useContext(SelectContext)

        return (
            <span ref={ref} className={cn('tw-block tw-truncate', className)}>
                {value || placeholder}
            </span>
        )
    }
)
SelectValue.displayName = 'SelectValue'

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
    ({ className, children }, ref) => {
        const { open, setOpen } = React.useContext(SelectContext)

        if (!open) return null

        return (
            <>
                <div
                    className="tw-fixed tw-inset-0 tw-z-40"
                    onClick={() => setOpen(false)}
                />
                <div
                    ref={ref}
                    className={cn(
                        'tw-absolute tw-z-50 tw-mt-1 tw-max-h-60 tw-w-full tw-overflow-auto tw-rounded-md tw-border tw-border-gray-600 tw-bg-gray-700 tw-py-1 tw-text-base tw-shadow-lg focus:tw-outline-none sm:tw-text-sm',
                        className
                    )}
                >
                    {children}
                </div>
            </>
        )
    }
)
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
    ({ className, children, value, ...props }, ref) => {
        const { onValueChange, setOpen } = React.useContext(SelectContext)

        return (
            <div
                ref={ref}
                className={cn(
                    'tw-relative tw-cursor-pointer tw-select-none tw-py-2 tw-px-3 tw-text-white hover:tw-bg-gray-600 focus:tw-bg-gray-600 focus:tw-outline-none',
                    className
                )}
                onClick={() => {
                    onValueChange?.(value)
                    setOpen(false)
                }}
                {...props}
            >
                {children}
            </div>
        )
    }
)
SelectItem.displayName = 'SelectItem'

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
