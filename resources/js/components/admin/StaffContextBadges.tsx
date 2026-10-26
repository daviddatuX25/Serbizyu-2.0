import { Badge } from '@/components/ui/badge';
import type { StaffContext } from '@/types/admin-workspace';

export function StaffContextBadges({ staffContext }: { staffContext: StaffContext }) {
    return (
        <div className="flex flex-wrap gap-2" aria-label="Staff context">
            <Badge variant="outline">Operator · {staffContext.operator.display_name}</Badge>
            <Badge variant="outline">{staffContext.environment}</Badge>
            <Badge variant="outline">Cohort · {staffContext.cohort.selected ?? 'All'}</Badge>
        </div>
    );
}
