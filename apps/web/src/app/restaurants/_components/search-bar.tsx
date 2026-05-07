'use client';

import { useEffect, useState, type FormEvent } from 'react';
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

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    onClear();
  };

  return (
    <form className="rounded-[1.25rem] border border-border/70 bg-background/92 p-3 shadow-xl shadow-black/5 backdrop-blur-xl" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Search restaurants, cuisines, neighborhoods..."
            className="h-11 rounded-full border-border/70 pl-9 pr-10 text-sm shadow-sm focus-visible:ring-1"
          />
          {inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
            >
              <RiCloseLine className="size-4" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="relative h-11 rounded-full px-3 text-xs"
          onClick={onToggleFilters}
        >
          <RiFilter3Line className="size-4" />
          <span className="ml-1 hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-end lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 rounded-full px-3 text-xs"
          onClick={onToggleFilters}
        >
          {showFilters ? 'Hide filters' : 'Show filters'}
        </Button>
      </div>
    </form>
  );
}
