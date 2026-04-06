'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input } from 'ui-common';
import { RiCloseLine, RiFilter3Line, RiSearchLine } from '@remixicon/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear: () => void;
  activeFilterCount: number;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  activeFilterCount,
  showFilters,
  onToggleFilters,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    onClear();
  };

  return (
    <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
      <form className="flex flex-1 items-center gap-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search restaurants, cuisines, neighborhoods..."
            className="h-10 rounded-full border-border/70 pl-9 pr-10 text-sm shadow-sm focus-visible:ring-1"
          />
          {inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <RiCloseLine className="size-4" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`relative h-10 rounded-full px-3 text-xs ${
            activeFilterCount > 0
              ? 'border-primary/50 bg-primary/5 text-primary'
              : ''
          }`}
          onClick={onToggleFilters}
        >
          <RiFilter3Line className="size-4" />
          <span className="ml-1 hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </form>

      <Button
        variant="outline"
        size="sm"
        className="h-10 rounded-full px-3 lg:hidden"
        onClick={onToggleFilters}
      >
        {showFilters ? (
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </Button>
    </header>
  );
}
