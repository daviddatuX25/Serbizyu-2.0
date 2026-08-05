import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Card, CardContent, Field, Notice, Select, TextInput } from '../ui';
import type { ReadinessState } from '../../types';
import './almost-there-onboarding.css';

type ErrorMap = Record<string, string>;

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
    const [display, setDisplay] = useState(readiness?.displayName ?? readiness?.display_name ?? '');
    const [area, setArea] = useState(readiness?.areaCode ?? readiness?.area_code ?? 'Tagudin');
    const [language, setLanguage] = useState(readiness?.languageCode ?? readiness?.language_code ?? 'fil');
    const [help, setHelp] = useState(readiness?.helpPreference ?? readiness?.help_preference ?? 'self_managed');
    const [lowData, setLowData] = useState(Boolean(readiness?.lowDataMode ?? readiness?.low_data_mode));

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
            },
            { preserveScroll: true },
        );
    };

    return (
        <main className="sz-page ato">
            <div className="ato-sheet">
                <div className="ato-progress" aria-label="Setup progress: step 3 of 4">
                    <div className="ato-progress-head">
                        <div className="ato-fraction" aria-hidden="true">
                            3<span> / 4</span>
                        </div>
                        <p>Almost into your workspace</p>
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
                        <strong>Three-quarters done.</strong>
                        <p>Your number is verified. One short profile finishes the door into your workspace. No government ID in this pass.</p>
                    </div>
                </div>

                <span className="ato-done-chip">Phone secured · code used once</span>
                <h1 className="sz-display-title">Name the person buyers will meet.</h1>
                <p className="sz-copy ato-lede">
                    This is not a government ID check. Just how Serbizyu addresses you, and where your first offers live.
                </p>

                <form onSubmit={submit} className="ato-form">
                    <Card>
                        <CardContent className="sz-stack">
                            <Field label="Display name" error={errors.display_name} hint="Shown on your listings · you can change it later">
                                <TextInput
                                    name="display_name"
                                    value={display}
                                    onChange={(event) => setDisplay(event.target.value)}
                                    placeholder="Rosa"
                                />
                            </Field>
                            <Field label="Safe service area" error={errors.area_code} hint="First slice stays inside Tagudin">
                                <Select name="area_code" value={area} onChange={(event) => setArea(event.target.value)}>
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
                                    <Select name="help_preference" value={help} onChange={(event) => setHelp(event.target.value)}>
                                        <option value="self_managed">I’ll manage it myself</option>
                                        <option value="assistance_requested">I may need help later</option>
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
                            {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
                            {notice ? <Notice tone="success">{notice}</Notice> : null}
                            <Button type="submit" loading={action === 'onboarding'}>
                                Save setup and open workspace
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </main>
    );
}
