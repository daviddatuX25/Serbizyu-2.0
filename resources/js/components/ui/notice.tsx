import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type NoticeTone = 'neutral' | 'warning' | 'danger' | 'error' | 'success' | 'forest' | 'warm';

export interface NoticeProps extends React.ComponentProps<typeof Alert> {
    tone?: NoticeTone;
    title?: string;
}

function Notice({ tone = 'neutral', title, children, className, ...props }: NoticeProps) {
    const toneClass =
        tone === 'danger' || tone === 'error'
            ? 'border-red-200 text-red-700 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
            : tone === 'warning' || tone === 'warm'
              ? 'border-mango-200 text-mango-600 bg-mango-50/50 dark:bg-mango-950/20 dark:border-mango-800'
              : tone === 'success' || tone === 'forest'
                ? 'border-forest-200 text-forest-700 bg-forest-50/50 dark:bg-forest-950/20 dark:border-forest-800'
                : 'border-border text-foreground bg-muted/30';

    return (
        <Alert
            className={cn(toneClass, className)}
            role={tone === 'danger' ? 'alert' : 'note'}
            {...props}
        >
            {title ? <AlertTitle className="font-semibold">{title}</AlertTitle> : null}
            <AlertDescription className="text-sm leading-relaxed">{children}</AlertDescription>
        </Alert>
    );
}

export { Notice };
