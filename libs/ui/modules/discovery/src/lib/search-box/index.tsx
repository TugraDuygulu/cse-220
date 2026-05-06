"use client";

import { AnimatePresence } from 'motion/react';
import { useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { ExpandedVariation } from './expanded.variation';
import { NonExpandedVariation } from './non-expanded.variation';
import { cn } from 'ui-common';

interface ExpandingSearchDockProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  defaultExpanded?: boolean;
  className?: string;
  expandedClassName?: string;
  searchPath?: string;
}

export function SearchBox({
  onSearch,
  placeholder = "Search...",
  defaultExpanded = false,
  className,
  expandedClassName,
  searchPath,
}: ExpandingSearchDockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [query, setQuery] = useState("");

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery("");
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    if (onSearch) {
      onSearch(normalizedQuery);
    } else if (searchPath) {
      const params = new URLSearchParams({ q: normalizedQuery });
      window.location.href = `${searchPath}?${params.toString()}`;
    }

    handleCollapse();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleCollapse();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <NonExpandedVariation handleExpand={handleExpand} className={expandedClassName} />
        ) : (
            <ExpandedVariation {...{ handleSubmit, query, setQuery, handleKeyDown, placeholder, className, expandedClassName }} />
        )}
      </AnimatePresence>
    </div>
  );
}
