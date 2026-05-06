import { motion } from 'motion/react';
import { RiSearchLine as Search } from '@remixicon/react';
import { cn } from 'ui-common';

export function NonExpandedVariation({
    handleExpand,
    className,
}: {
    handleExpand: () => void;
    className?: string;
}) {
    return <motion.button
        key="icon"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={handleExpand}
        aria-label="Open search"
        className={cn("flex h-12 w-full items-center justify-between gap-3 rounded-full border border-border bg-card px-4 pr-3 text-sm font-medium text-foreground shadow-sm transition-all hover:shadow-md focus-visible:outline-none", className)}
    >
        <span>Discover what&apos;s there!</span>
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
    </motion.button>;
}
