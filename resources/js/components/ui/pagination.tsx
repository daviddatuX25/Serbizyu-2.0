import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            data-slot="pagination"
            className={cn('mx-auto flex w-full justify-center', className)}
            {...props}
        />
    );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn('flex flex-row items-center gap-1', className)}
            {...props}
        />
    );
}

function PaginationItem({ className, ...props }: React.ComponentProps<'li'>) {
    return <li data-slot="pagination-item" className={cn('', className)} {...props} />;
}

type PaginationLinkProps = {
    isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
    React.ComponentProps<'button'>;

function PaginationLink({ className, isActive, size = 'sm', ...props }: PaginationLinkProps) {
    return (
        <button
            aria-current={isActive ? 'page' : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            className={cn(
                buttonVariants({
                    variant: isActive ? 'outline' : 'ghost',
                    size,
                }),
                isActive && 'border-border bg-muted font-bold text-foreground',
                'h-7 min-w-7 cursor-pointer px-2 text-xs',
                className,
            )}
            {...props}
        />
    );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="sm"
            className={cn('gap-1 px-2.5', className)}
            {...props}
        >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Prev</span>
        </PaginationLink>
    );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to next page"
            size="sm"
            className={cn('gap-1 px-2.5', className)}
            {...props}
        >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-3.5" />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn(
                'flex size-7 items-center justify-center text-muted-foreground',
                className,
            )}
            {...props}
        >
            <MoreHorizontal className="size-3.5" />
            <span className="sr-only">More pages</span>
        </span>
    );
}

export {
    Pagination,
    PaginationContent,
    PaginationLink,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
};
