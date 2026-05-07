
import type { ReactNode } from 'react';

import { cn } from 'ui-common';

type HeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export function Header({
  title,
  description,
  eyebrow,
  action,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0">{action}</div> : null}
    </header>
  );
}
