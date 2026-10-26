import { router } from '@inertiajs/react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import ConversationDrawer from '../../components/conversations/ConversationDrawer';
import type { ConversationContext, ConversationMeta } from '../../components/conversations/types';

type ConversationPageProps = {
    conversation: ConversationMeta;
    context?: ConversationContext;
};

export default function ConversationShow({ conversation, context }: ConversationPageProps) {
    const validatedContext = context ?? (
        conversation.viewer.actor_user_id !== conversation.viewer.owner_user_id && conversation.viewer.consent_grant_id
            ? {
                owner_user_id: conversation.viewer.owner_user_id,
                consent_grant_id: conversation.viewer.consent_grant_id,
            }
            : undefined
    );
    return (
        <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : router.visit('/orders')} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">
                    <ArrowLeft className="size-4" aria-hidden="true" />Back
                </button>
                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800"><MessageSquare className="size-5" aria-hidden="true" /></span>
                        <div>
                            <h1 className="text-lg font-extrabold text-[#0F2F58]">{conversation.title}</h1>
                            <p className="text-sm text-slate-500">Open the secure conversation to view its latest messages.</p>
                        </div>
                    </div>
                </section>
            </div>
            <ConversationDrawer
                open
                onClose={() => window.history.length > 1 ? window.history.back() : router.visit('/orders')}
                initialConversation={conversation}
                context={validatedContext}
            />
        </main>
    );
}
