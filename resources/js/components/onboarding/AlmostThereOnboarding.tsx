import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, CardContent, Field, Notice, PasswordInput, Select, TextInput } from '../ui';
import { cn } from '../../lib/utils';
import type { ReadinessState } from '../../types';
import './almost-there-onboarding.css';

// Per-step Tagudin local facts. Typed slowly and held with a long pause before
// the next one, so onboarding feels calm and readable instead of flickering.
const STEP_FACTS = [
    'Tagudin Fact · Tagudin is the southernmost coastal town of Ilocos Sur, known for its rich agriculture, fishing, and vibrant local marketplace.',
    'Local Trust · Setting a verified display name and safe service area ensures your neighbors can trade and request services with confidence.',
    'Secured Identity · Everyday return sign-ins use your phone number & password. Verification documents or ID permits can be added anytime.',
];
type ErrorMap = Record<string, string>;

function getResponsiveMaxChars(): number {
    if (typeof window === 'undefined') {
        return 60;
    }
    const width = window.innerWidth;
    if (width < 400) {
        return 40;
    }
    if (width < 600) {
        return 55;
    }
    if (width < 900) {
        return 80;
    }
    if (width < 1200) {
        return 105;
    }
    return 140;
}

function splitIntoBatches(text: string, maxCharacters: number): string[] {
    const words = text.trim().split(/\s+/);
    const batches: string[] = [];
    let batch = '';

    for (const word of words) {
        const candidate = batch === '' ? word : `${batch} ${word}`;
        if (batch !== '' && candidate.length > maxCharacters) {
            batches.push(batch);
            batch = word;
        } else {
            batch = candidate;
        }
    }

    if (batch !== '') {
        batches.push(batch);
    }

    return batches;
}

function TypewriterText({
    items,
    text,
    active,
    speed = 70,
    itemPause = 7500,
    continuePause = 1400,
}: {
    items?: string[];
    text?: string;
    active: boolean;
    speed?: number;
    itemPause?: number;
    continuePause?: number;
}) {
    const [maxChars, setMaxChars] = useState(getResponsiveMaxChars);

    useEffect(() => {
        const handleResize = () => {
            setMaxChars(getResponsiveMaxChars());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const itemList = useMemo(() => items ?? (text ? [text] : []), [items, text]);
    const batches = useMemo(
        () => itemList.flatMap((item) => splitIntoBatches(item, maxChars)),
        [itemList, maxChars],
    );
    // True when a batch is the final segment of its item — only then does the
    // long itemPause run; mid-item batches use the short continuePause so a
    // single fact keeps flowing on narrow screens.
    const batchEndsItem = useMemo(
        () =>
            itemList.flatMap((item) => {
                const parts = splitIntoBatches(item, maxChars);
                return parts.map((_, index) => index === parts.length - 1);
            }),
        [itemList, maxChars],
    );
    const fullText = useMemo(() => itemList.join(' · '), [itemList]);
    const [batchIndex, setBatchIndex] = useState(0);
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        if (!active) {
            setBatchIndex(0);
            setDisplayed('');
        }
    }, [active, text]);

    useEffect(() => {
        if (!active || batches.length === 0) {
            return;
        }

        const batch = batches[batchIndex % batches.length];
        let characterIndex = 0;
        let pauseTimeout: number | undefined;

        setDisplayed('');
        const interval = window.setInterval(() => {
            characterIndex++;
            setDisplayed(batch.slice(0, characterIndex));

            if (characterIndex >= batch.length) {
                window.clearInterval(interval);
                const isLastOfItem = batchEndsItem[batchIndex % batches.length];
                pauseTimeout = window.setTimeout(
                    () => {
                        setBatchIndex((current) => (current + 1) % batches.length);
                    },
                    isLastOfItem ? itemPause : continuePause,
                );
            }
        }, speed);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(pauseTimeout);
        };
    }, [active, batchIndex, batches, batchEndsItem, itemPause, continuePause, speed]);
    return (
        <span key={batchIndex} className="ato-typewriter" aria-label={fullText}>
            {displayed}
            {displayed.length < batches[batchIndex % batches.length]?.length ? (
                <span className="ato-cursor" aria-hidden="true">
                    |
                </span>
            ) : null}
        </span>
    );
}

export function AlmostThereOnboarding({
    readiness,
    errors,
    notice,
    action,
}: {
    readiness?: ReadinessState | null;
    errors: ErrorMap;
    notice: string | null;
    action: 'onboarding' | null;
}) {
    const alreadyHasEmail = Boolean(readiness?.emailAttached ?? readiness?.email_attached);
    const alreadyHasPassword = Boolean(readiness?.passwordSet ?? readiness?.password_set);
    const [display, setDisplay] = useState(readiness?.displayName ?? readiness?.display_name ?? '');
    const [area, setArea] = useState(readiness?.areaCode ?? readiness?.area_code ?? 'Tagudin');
    const [language, setLanguage] = useState(
        readiness?.languageCode ?? readiness?.language_code ?? 'fil',
    );
    const [help, setHelp] = useState(
        readiness?.helpPreference ?? readiness?.help_preference ?? 'self_managed',
    );
    const [lowData, setLowData] = useState(
        Boolean(readiness?.lowDataMode ?? readiness?.low_data_mode),
    );
    const [offerEmail, setOfferEmail] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollStateRef = useRef(false);
    const scrollDebounceRef = useRef(0);

    useEffect(() => {
        let frame = 0;
        const getScrollY = () => {
            const dock = document.querySelector('.sz-auth-dock');
            return dock && dock.scrollTop > 0 ? dock.scrollTop : window.scrollY;
        };

        const handleScroll = () => {
            if (frame !== 0) {
                return;
            }

            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const current = getScrollY();
                const next = current > 140 ? true : current < 40 ? false : scrollStateRef.current;

                window.clearTimeout(scrollDebounceRef.current);
                if (next === scrollStateRef.current) {
                    return;
                }

                scrollDebounceRef.current = window.setTimeout(() => {
                    const settled = getScrollY();
                    const settledState =
                        settled > 140 ? true : settled < 40 ? false : scrollStateRef.current;

                    if (settledState === scrollStateRef.current) {
                        return;
                    }

                    scrollStateRef.current = settledState;
                    setIsScrolled(settledState);
                }, 180);
            });
        };

        handleScroll();
        const dock = document.querySelector('.sz-auth-dock');
        window.addEventListener('scroll', handleScroll, { passive: true });
        if (dock) {
            dock.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (dock) {
                dock.removeEventListener('scroll', handleScroll);
            }
            window.cancelAnimationFrame(frame);
            window.clearTimeout(scrollDebounceRef.current);
        };
    }, []);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/onboarding',
            {
                provider_intent: true,
                display_name: display.trim(),
                area_code: area,
                language_code: language,
                low_data_mode: lowData,
                help_preference: help,
                password,
                password_confirmation: passwordConfirmation,
                ...(!alreadyHasEmail && offerEmail && email.trim() !== ''
                    ? { email: email.trim() }
                    : {}),
            },
            { preserveScroll: true },
        );
    };

    return (
        <main className="sz-page ato">
            <div className="ato-sheet">
                <div className="ato-compact-sticky-wrapper">
                    <div
                        className={cn('ato-compact-progress', isScrolled && 'is-visible')}
                        aria-live="polite"
                        aria-label="Profile and trust setup progress"
                    >
                        <div className="ato-compact-copy">
                            <TypewriterText
                                items={STEP_FACTS}
                                active={isScrolled}
                                speed={70}
                                itemPause={7500}
                                continuePause={1400}
                            />
                        </div>
                        <div className="ato-compact-fraction" aria-hidden="true">
                            3<span> / 4</span>
                        </div>
                    </div>
                </div>

                <div className="ato-progress" aria-label="Setup progress: step 3 of 4">
                    <div className="ato-progress-head">
                        <div className="ato-title-group">
                            <strong className="ato-step-title">Profile & Trust Setup</strong>
                        </div>
                        <div className="ato-fraction" aria-hidden="true">
                            3<span> / 4</span>
                        </div>
                    </div>
                    <div className="ato-track" aria-hidden="true">
                        <i className="ato-track-fill" />
                        <ol>
                            <li className="is-done">
                                <span>✓</span>Account
                            </li>
                            <li className="is-done">
                                <span>✓</span>Phone
                            </li>
                            <li className="is-now">
                                <span>3</span>Profile
                            </li>
                            <li>
                                <span>4</span>Workspace
                            </li>
                        </ol>
                    </div>
                    <div className="ato-banner">
                        <strong>Mobile verified · Step 3 of 4</strong>
                        <p className="ato-banner-trivia">
                            <TypewriterText
                                items={STEP_FACTS}
                                active
                                speed={70}
                                itemPause={7500}
                                continuePause={1400}
                            />
                        </p>
                    </div>
                </div>

                <span className="ato-done-chip">Phone secured · Verified identity</span>
                <h1 className="sz-display-title">Build trust and set up your local workspace.</h1>
                <p className="sz-copy ato-lede">
                    Tell Tagudin neighbors who you are, select your primary service area, and set a
                    password to protect your return visits.
                </p>

                <form onSubmit={submit} className="ato-form">
                    <Card>
                        <CardContent className="sz-stack">
                            <Field
                                label="Display name"
                                error={errors.display_name}
                                hint="Shown on your listings · you can change it later"
                            >
                                <TextInput
                                    name="display_name"
                                    value={display}
                                    onChange={(event) => setDisplay(event.target.value)}
                                    placeholder="Rosa"
                                    required
                                />
                            </Field>
                            <Field
                                label="Safe service area"
                                error={errors.area_code}
                                hint="First slice stays inside Tagudin"
                            >
                                <Select
                                    name="area_code"
                                    value={area}
                                    onChange={(event) => setArea(event.target.value)}
                                >
                                    <option value="Tagudin">Tagudin</option>
                                    <option value="Tagudin Centro">Tagudin Centro</option>
                                </Select>
                            </Field>
                            <div className="sz-grid-2">
                                <Field label="Preferred language" error={errors.language_code}>
                                    <Select
                                        name="language_code"
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                    >
                                        <option value="fil">Filipino</option>
                                        <option value="en">English</option>
                                    </Select>
                                </Field>
                                <Field label="Setup support" error={errors.help_preference}>
                                    <Select
                                        name="help_preference"
                                        value={help}
                                        onChange={(event) => setHelp(event.target.value)}
                                    >
                                        <option value="self_managed">I’ll manage it myself</option>
                                        <option value="assistance_requested">
                                            I may need help later
                                        </option>
                                    </Select>
                                </Field>
                            </div>
                            <label className="ato-check">
                                <input
                                    name="low_data_mode"
                                    type="checkbox"
                                    checked={lowData}
                                    onChange={(event) => setLowData(event.target.checked)}
                                />
                                <span>Use lower-data presentation where possible.</span>
                            </label>

                            <div className="sz-grid-2">
                                <Field
                                    label="Password"
                                    error={errors.password}
                                    hint={
                                        alreadyHasPassword
                                            ? 'Required · replaces your current password'
                                            : 'Required · sign in with your number next time'
                                    }
                                >
                                    <PasswordInput
                                        name="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="new-password"
                                        aria-label="Password"
                                        required
                                    />
                                </Field>
                                <Field
                                    label="Confirm password"
                                    error={errors.password_confirmation}
                                    hint="Required · re-enter your password"
                                >
                                    <PasswordInput
                                        name="password_confirmation"
                                        value={passwordConfirmation}
                                        onChange={(event) =>
                                            setPasswordConfirmation(event.target.value)
                                        }
                                        autoComplete="new-password"
                                        aria-label="Confirm password"
                                        required
                                    />
                                </Field>
                            </div>

                            {!alreadyHasEmail ? (
                                <div className="ato-optional-signin">
                                    <div className="ato-optional-head">
                                        <strong>Optional · email for return sign-in</strong>
                                        <p>
                                            Password already covers phone return visits. Add email
                                            only if you want another password login path. Google
                                            linking comes later — skip anytime.
                                        </p>
                                    </div>
                                    {!offerEmail ? (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setOfferEmail(true)}
                                        >
                                            Add email (optional)
                                        </Button>
                                    ) : (
                                        <div className="sz-stack">
                                            <Field
                                                label="Email"
                                                error={errors.email}
                                                hint="Not required to finish setup"
                                            >
                                                <TextInput
                                                    type="email"
                                                    name="email"
                                                    value={email}
                                                    onChange={(event) =>
                                                        setEmail(event.target.value)
                                                    }
                                                    autoComplete="email"
                                                />
                                            </Field>
                                            <button
                                                type="button"
                                                className="sz-btn-link"
                                                onClick={() => {
                                                    setOfferEmail(false);
                                                    setEmail('');
                                                }}
                                            >
                                                Never mind — I’ll add email later
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Notice tone="success">
                                    Email sign-in is already attached to this account.
                                </Notice>
                            )}

                            {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
                            {notice ? <Notice tone="success">{notice}</Notice> : null}
                            <Button type="submit" wide loading={action === 'onboarding'}>
                                Save setup and open workspace
                            </Button>
                            <p className="ato-footnote">
                                SMS codes stay for first signup and rare fallbacks. Everyday return
                                visits should use your password.
                            </p>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </main>
    );
}
