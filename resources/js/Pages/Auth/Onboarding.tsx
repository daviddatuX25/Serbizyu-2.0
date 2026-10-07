import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AuthShell } from '../../components/auth/AuthShell';
import { ModernOnboarding } from '../../components/onboarding/ModernOnboarding';
import type { ReadinessState, SliceSession } from '../../types';
interface OnboardingPageProps {
    readiness?: ReadinessState | null;
    session?: SliceSession | null;
    returnTo?: string;
}

export default function Onboarding(props: OnboardingPageProps) {
    const returnTo = props.returnTo || '/';
    const [isComplete, setIsComplete] = useState(false);

    return (
        <AuthShell
            title={isComplete ? 'Account Ready' : 'Welcome to Tagudin'}
            subtitle={
                isComplete
                    ? 'Your citizen credentials are active and verified.'
                    : 'Complete your neighborhood identity and account security.'
            }
            returnTo={returnTo}
            maxWidth="wide"
        >
            <div className="sz-auth-stack flex flex-col gap-4">
                <ModernOnboarding
                    initialDisplayName={
                        props.readiness?.display_name || props.session?.display_name || ''
                    }
                    initialAreaCode={props.readiness?.area_code || 'Tagudin Centro'}
                    onSuccess={() => {
                        setIsComplete(true);
                    }}
                    onCancel={() => {
                        router.visit(returnTo);
                    }}
                />

                {!isComplete ? (
                    <div className="sz-auth-footer mt-2 flex flex-col items-center gap-1.5 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
                        <Link
                            href="/"
                            className="sz-auth-quiet-link font-semibold text-[#0F2F58] hover:underline"
                        >
                            Skip for now · Explore Tagudin Marketplace →
                        </Link>
                    </div>
                ) : null}
            </div>
        </AuthShell>
    );
}
