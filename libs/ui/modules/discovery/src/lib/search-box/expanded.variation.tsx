import { motion } from 'motion/react';
import { type KeyboardEvent, type SubmitEvent } from 'react';
import { useSearchSuggestions, type SearchSuggestion } from './use-suggestions.query';
import { Input, cn } from 'ui-common';
import { RiMapPinLine, RiRestaurantLine, RiSearchLine as Search, RiSparklingLine, RiTimeLine } from '@remixicon/react';

export interface ExpandedVariationProps {
    handleSubmit: (e: SubmitEvent<HTMLFormElement>) => void,
    query: string,
    setQuery: (s: string) => void,
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void,
    placeholder: string,
    className?: string,
    expandedClassName?: string,
}


export function ExpandedVariation({
    handleSubmit,
    query,
    setQuery,
    handleKeyDown,
    placeholder,
    className,
    expandedClassName,
}: ExpandedVariationProps) {

    const { suggestions, isLoading } = useSearchSuggestions({ query });

    return <motion.form
        key="input"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
        }}
        onSubmit={handleSubmit}
        className={cn("relative w-full", className)}
    >
        <motion.div
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(12px)" }}
            className={cn(
                "relative flex h-12 w-full items-center overflow-hidden rounded-4xl border border-border bg-card/90 shadow-lg shadow-black/5 backdrop-blur-md transition-shadow focus-within:shadow-xl",
                expandedClassName,
            )}
        >
            <Search className="ml-4 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className="h-12 flex-1 border-0 bg-transparent pl-3 pr-12 text-sm shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" 
            />
            <motion.button
                type="submit"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Search"
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
            >
                <Search className="h-4 w-4" />
            </motion.button>
        </motion.div>
        {(query.length || isLoading) ? (
            <QuerySuggestions
                isLoading={isLoading}
                suggestions={suggestions}
                onSelect={(suggestion) => setQuery(suggestion.label)}
            />
        ): null}
    </motion.form>;
}

function QuerySuggestions({
    isLoading,
    suggestions,
    onSelect,
}: {
    isLoading: boolean;
    suggestions: SearchSuggestion[];
    onSelect: (suggestion: SearchSuggestion) => void;
}) {
    return <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-2 z-10 
             overflow-hidden rounded-3xl border border-border 
             bg-card shadow-xl shadow-black/10"
    >
        <div className="border-b border-border/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Search suggestions
            </p>
        </div>
        {isLoading ? (
            <div className="space-y-2 p-4" aria-live="polite">
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
            </div>
        ) : suggestions.length > 0 ? suggestions.map((suggestion) => (
            <button
                type="button"
                key={`${suggestion.kind}-${suggestion.label}`}
                onClick={() => onSelect(suggestion)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <SuggestionIcon kind={suggestion.kind} />
                </span>
                <span className="min-w-0">
                    <span className="block truncate font-medium">{suggestion.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{suggestion.detail}</span>
                </span>
            </button>
        )) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">
                No matches yet. Try a cuisine, place, or dish.
            </div>
        )}
    </motion.div>;
}

function SuggestionIcon({ kind }: { kind: SearchSuggestion['kind'] }) {
    if (kind === 'restaurant') {
        return <RiRestaurantLine className="size-4" />;
    }

    if (kind === 'area') {
        return <RiMapPinLine className="size-4" />;
    }

    if (kind === 'category') {
        return <RiSparklingLine className="size-4" />;
    }

    return <RiTimeLine className="size-4" />;
}
