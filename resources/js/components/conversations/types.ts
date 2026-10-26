export type ConversationScopeType = 'order' | 'deal_chain_relay' | 'support_case';
export type ConversationAudience = 'participants' | 'staff_internal';

export type ConversationViewer = {
    actor_user_id: string;
    owner_user_id: string;
    owner_display_name: string;
    consent_grant_id: string | null;
};

export type ConversationAttachmentOption = {
    id: string;
    name: string;
    mime_type: string;
};

export type ConversationMeta = {
    id: string;
    scope_type: ConversationScopeType;
    scope_id: string;
    title: string;
    status: string;
    read_only: boolean;
    can_send: boolean;
    can_write_internal: boolean;
    viewer: ConversationViewer;
    available_attachments: ConversationAttachmentOption[];
};

export type ConversationMessage = {
    id: string;
    sequence: number;
    content: string;
    actor_user_id: string;
    owner_user_id: string;
    consent_grant_id: string | null;
    actor_display_name: string;
    owner_display_name: string;
    audience: ConversationAudience;
    created_at: string;
    attachment: null | {
        id: string;
        name: string;
        mime_type: string;
        download_url: string;
    };
};

export type ConversationMessagesPage = {
    data: ConversationMessage[];
    conversation: ConversationMeta;
    next_before_sequence: number | null;
    next_after_sequence: number;
    has_more_before: boolean;
    has_more_after: boolean;
};

export type ConversationMessageAcknowledgement = {
    data: ConversationMessage;
    conversation: ConversationMeta;
};

export type ConversationContext = {
    owner_user_id?: string;
    consent_grant_id?: string;
};
