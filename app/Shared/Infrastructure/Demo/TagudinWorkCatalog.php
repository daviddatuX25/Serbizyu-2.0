<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Demo;

/**
 * Canonical work-contract catalog used by the Tagudin demo supply.
 *
 * These are catalog templates, not live work instances. A Work instance is
 * created only after an order agreement is finalized.
 */
final class TagudinWorkCatalog
{
    /**
     * @return list<array{
     *     id: string,
     *     catalog_code: string,
     *     work_shape: string,
     *     shape_contract_version: int,
     *     payload_schema_version: int,
     *     catalog_version: int,
     *     title: string,
     *     summary: string,
     *     status: string,
     *     definition: array<string, mixed>
     * }>
     */
    public static function definitions(): array
    {
        return [
            [
                'id' => '0198a3b1-7c40-7abc-8def-7234567890c1',
                'catalog_code' => 'tagudin-local-service-a1',
                'work_shape' => 'A1',
                'shape_contract_version' => 1,
                'payload_schema_version' => 2,
                'catalog_version' => 2,
                'title' => 'Tagudin Local Service',
                'summary' => 'Short local service work with scope confirmation, execution proof, and handoff sign-off.',
                'status' => 'published',
                'definition' => [
                    'category_codes' => ['greeting-cards', 'repairs', 'local-services', 'print-assist'],
                    'listing_types' => ['service'],
                    'variance_threshold_percent' => 10,
                    'evaluation_window_hours' => 48,
                    'steps' => [
                        [
                            'id' => 'a1-scope',
                            'ordinal' => 1,
                            'title' => 'Scope confirmation and intake',
                            'description' => 'Confirm the requested scope, handoff point, and safety constraints before execution.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Buyer and provider confirm the scoped handoff details.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a1-execution',
                            'ordinal' => 2,
                            'title' => 'Service execution',
                            'description' => 'Perform the agreed local task and capture the required work evidence.',
                            'evidence_type' => 'photo_required',
                            'evidence_description' => 'Before and after work evidence where the task permits it.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a1-handoff',
                            'ordinal' => 3,
                            'title' => 'Handoff and sign-off',
                            'description' => 'Return the item or deliver the result and record the buyer handoff.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Buyer handoff acknowledgement in the work event trail.',
                            'mandatory' => true,
                        ],
                    ],
                    'work_sets' => [
                        [
                            'option_id' => 'set-repairs-inverter-clean',
                            'set_code' => 'set-repairs-inverter-clean',
                            'set_version' => 2,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-local-service-a1',
                            'work_shape' => 'A1',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 2,
                            'category_codes' => ['repairs'],
                            'listing_types' => ['service'],
                            'title' => 'Inverter Aircon Cleaning & Checkup',
                            'summary' => 'Clean the unit, verify airflow, and review the result with the customer.',
                            'target_duration_label' => '75m',
                            'steps' => [
                                ['id' => 'inverter-intake', 'title' => 'Confirm unit and service scope', 'description' => 'Check the unit model, symptoms, access, and agreed service scope.', 'dur' => '10m', 'evidence_type' => 'dual_sign'],
                                ['id' => 'inverter-clean', 'title' => 'Clean filters and accessible coils', 'description' => 'Clean agreed components and capture condition evidence.', 'dur' => '45m', 'evidence_type' => 'photo_required'],
                                [
                                    'id' => 'inverter-check',
                                    'title' => 'Run airflow and cooling check',
                                    'description' => 'Record operating observations and share the completed result.',
                                    'dur' => '20m',
                                    'evidence_type' => 'meter_log',
                                    'required_proofs' => ['metric_reading'],
                                    'metric_requirements' => [['id' => 'cooling-delta', 'name' => 'Supply-to-return air temperature difference', 'unit' => '°C', 'required' => true]],
                                ],
                            ],
                        ],
                        [
                            'option_id' => 'set-repairs-plumbing-leak',
                            'set_code' => 'set-repairs-plumbing-leak',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-local-service-a1',
                            'work_shape' => 'A1',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['repairs'],
                            'listing_types' => ['service'],
                            'title' => 'Plumbing Leak Repair',
                            'summary' => 'Isolate the leak, repair the fitting, and verify the line before handoff.',
                            'steps' => [
                                ['id' => 'leak-scope', 'title' => 'Locate leak and confirm scope', 'description' => 'Agree the affected line, access, and repair boundaries.', 'evidence_type' => 'dual_sign'],
                                ['id' => 'leak-repair', 'title' => 'Repair fitting or joint', 'description' => 'Complete the agreed repair and document the work area.', 'evidence_type' => 'photo_required'],
                                ['id' => 'leak-test', 'title' => 'Restore flow and check for leaks', 'description' => 'Check the repaired connection and record customer handoff.', 'evidence_type' => 'photo_required'],
                            ],
                        ],
                        [
                            'option_id' => 'set-local-services-errand',
                            'set_code' => 'set-local-services-errand',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-local-service-a1',
                            'work_shape' => 'A1',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['local-services'],
                            'listing_types' => ['service'],
                            'title' => 'Local Errand & Pickup',
                            'summary' => 'Confirm a local errand, complete the pickup or task, and hand back proof.',
                            'steps' => [
                                ['id' => 'errand-scope', 'title' => 'Confirm request and pickup details', 'description' => 'Agree the destination, items, and handoff instructions.', 'evidence_type' => 'dual_sign'],
                                ['id' => 'errand-task', 'title' => 'Complete the local errand', 'description' => 'Carry out the agreed task and capture appropriate proof.', 'evidence_type' => 'photo_required'],
                                ['id' => 'errand-handoff', 'title' => 'Return items or confirm completion', 'description' => 'Hand back items or confirm the result with the requester.', 'evidence_type' => 'dual_sign'],
                            ],
                        ],
                        [
                            'option_id' => 'set-cleaning-residential',
                            'set_code' => 'set-cleaning-residential',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-local-service-a1',
                            'work_shape' => 'A1',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['home-cleaning'],
                            'listing_types' => ['service'],
                            'title' => 'Residential Home Cleaning',
                            'summary' => 'Confirm the cleaning scope, complete agreed rooms, and review the result.',
                            'steps' => [
                                ['id' => 'home-clean-scope', 'title' => 'Confirm rooms and cleaning priorities', 'description' => 'Agree included rooms, surfaces, and any customer preferences.', 'evidence_type' => 'dual_sign'],
                                ['id' => 'home-clean-work', 'title' => 'Clean the agreed spaces', 'description' => 'Complete the agreed cleaning tasks and capture work evidence.', 'evidence_type' => 'photo_required'],
                                ['id' => 'home-clean-review', 'title' => 'Review completed spaces with customer', 'description' => 'Walk through the result and record customer acknowledgement.', 'evidence_type' => 'dual_sign'],
                            ],
                        ],
                    ],
                    'observed_variations' => [
                        [
                            'id' => 'a1-tagudin-standard',
                            'title' => 'Standard local task with proof gates',
                            'adopted_jobs_count' => 42,
                            'adoption_rate' => 84,
                        ],
                    ],
                ],
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-7234567890c3',
                'catalog_code' => 'tagudin-onsite-service-a3',
                'work_shape' => 'A3',
                'shape_contract_version' => 1,
                'payload_schema_version' => 2,
                'catalog_version' => 2,
                'title' => 'Tagudin On-site Service',
                'summary' => 'Scheduled on-site work with safety triage, execution evidence, measurement, and customer sign-off.',
                'status' => 'published',
                'definition' => [
                    'category_codes' => ['repairs', 'local-services'],
                    'listing_types' => ['service'],
                    'variance_threshold_percent' => 10,
                    'evaluation_window_hours' => 48,
                    'steps' => [
                        [
                            'id' => 'a3-checkin',
                            'ordinal' => 1,
                            'title' => 'Arrival check-in and safety triage',
                            'description' => 'Confirm the site, customer contact, and safe work conditions before starting.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Location timestamp and customer check-in confirmation.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a3-execution',
                            'ordinal' => 2,
                            'title' => 'Physical service execution',
                            'description' => 'Execute the scheduled inspection, cleaning, repair, or treatment.',
                            'evidence_type' => 'photo_required',
                            'evidence_description' => 'Before and after work evidence photos.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a3-measurement',
                            'ordinal' => 3,
                            'title' => 'Measurement and quality check',
                            'description' => 'Capture the agreed measurement or operating result for the work.',
                            'evidence_type' => 'meter_log',
                            'evidence_description' => 'Instrument reading or quality checklist evidence.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a3-signoff',
                            'ordinal' => 4,
                            'title' => 'Customer sign-off',
                            'description' => 'Review the result with the customer and record the completion decision.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Customer acknowledgement after the quality check.',
                            'mandatory' => true,
                        ],
                    ],
                    'work_sets' => [
                        [
                            'option_id' => 'set-repairs-electrical-turnkey',
                            'set_code' => 'set-repairs-electrical-turnkey',
                            'set_version' => 2,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-onsite-service-a3',
                            'work_shape' => 'A3',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 2,
                            'category_codes' => ['repairs'],
                            'listing_types' => ['service'],
                            'title' => 'Electrical Diagnostic & Repair',
                            'summary' => 'Inspect safely, complete an agreed repair, test operation, and confirm handoff.',
                            'target_duration_label' => '90m',
                            'steps' => [
                                ['id' => 'electrical-checkin', 'title' => 'Confirm issue and make area safe', 'description' => 'Review symptoms, access, and safe isolation before work.', 'dur' => '15m', 'evidence_type' => 'dual_sign'],
                                ['id' => 'electrical-repair', 'title' => 'Diagnose and complete agreed repair', 'description' => 'Inspect the circuit and perform the approved repair.', 'dur' => '55m', 'evidence_type' => 'photo_required'],
                                [
                                    'id' => 'electrical-test',
                                    'title' => 'Test operation and review result',
                                    'description' => 'Record relevant checks and obtain customer acknowledgement.',
                                    'dur' => '20m',
                                    'evidence_type' => 'meter_log',
                                    'required_proofs' => ['metric_reading'],
                                    'metric_requirements' => [
                                        ['id' => 'supply-voltage', 'name' => 'Supply voltage', 'unit' => 'V', 'required' => true],
                                        ['id' => 'load-current', 'name' => 'Load current', 'unit' => 'A', 'required' => true],
                                    ],
                                ],
                            ],
                        ],
                        [
                            'option_id' => 'set-cleaning-scheduled-turnover',
                            'set_code' => 'set-cleaning-scheduled-turnover',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-onsite-service-a3',
                            'work_shape' => 'A3',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['home-cleaning'],
                            'listing_types' => ['service'],
                            'title' => 'Scheduled Home Turnover Cleaning',
                            'summary' => 'Walk the property, clean the agreed areas, and review the finished rooms.',
                            'steps' => [
                                ['id' => 'turnover-arrival', 'title' => 'Walk through rooms and confirm scope', 'description' => 'Confirm priority rooms, access, and turnover requirements.', 'evidence_type' => 'dual_sign'],
                                ['id' => 'turnover-clean', 'title' => 'Clean agreed rooms and surfaces', 'description' => 'Complete the cleaning plan and capture any noted exceptions.', 'evidence_type' => 'photo_required'],
                                ['id' => 'turnover-review', 'title' => 'Review property and hand back access', 'description' => 'Walk through the result with the customer or contact.', 'evidence_type' => 'dual_sign'],
                            ],
                        ],
                    ],
                    'observed_variations' => [
                        [
                            'id' => 'a3-tagudin-hvac',
                            'title' => 'HVAC clean with delta-temperature check',
                            'adopted_jobs_count' => 36,
                            'adoption_rate' => 88,
                        ],
                    ],
                ],
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-7234567890a4',
                'catalog_code' => 'tagudin-product-handoff-a4',
                'work_shape' => 'A4',
                'shape_contract_version' => 1,
                'payload_schema_version' => 1,
                'catalog_version' => 1,
                'title' => 'Tagudin Product Handoff',
                'summary' => 'Product preparation, physical handoff, and recipient confirmation for seeded local goods.',
                'status' => 'published',
                'definition' => [
                    'category_codes' => ['local-food', 'repairs'],
                    'listing_types' => ['product'],
                    'variance_threshold_percent' => 5,
                    'evaluation_window_hours' => 24,
                    'steps' => [
                        [
                            'id' => 'a4-prepare',
                            'ordinal' => 1,
                            'title' => 'Sourcing and package preparation',
                            'description' => 'Verify the product count, condition, packaging, and dispatch details.',
                            'evidence_type' => 'receipt_upload',
                            'evidence_description' => 'Receipt, inventory slip, or prepared package evidence.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a4-handoff',
                            'ordinal' => 2,
                            'title' => 'Handoff and recipient confirmation',
                            'description' => 'Transfer the product to the recipient or independently contracted courier.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Recipient confirmation and product count evidence.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a4-close',
                            'ordinal' => 3,
                            'title' => 'Condition close-out',
                            'description' => 'Record the delivered condition and close the product work instance.',
                            'evidence_type' => 'photo_required',
                            'evidence_description' => 'Final package or recipient handoff photo where applicable.',
                            'mandatory' => true,
                        ],
                    ],
                    'work_sets' => [
                        [
                            'option_id' => 'set-product-market-handoff',
                            'set_code' => 'set-product-market-handoff',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-product-handoff-a4',
                            'work_shape' => 'A4',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['local-food', 'repairs'],
                            'listing_types' => ['product'],
                            'title' => 'Market Product Preparation & Handoff',
                            'summary' => 'Prepare package, confirm recipient or courier handoff, and record condition close-out.',
                            'steps' => [
                                ['id' => 'a4-prepare', 'ordinal' => 1, 'title' => 'Sourcing and package preparation', 'description' => 'Verify the product count, condition, packaging, and dispatch details.', 'evidence_type' => 'receipt_upload', 'evidence_description' => 'Receipt, inventory slip, or prepared package evidence.', 'mandatory' => true],
                                ['id' => 'a4-handoff', 'ordinal' => 2, 'title' => 'Handoff and recipient confirmation', 'description' => 'Transfer the product to the recipient or independently contracted courier.', 'evidence_type' => 'dual_sign', 'evidence_description' => 'Recipient confirmation and product count evidence.', 'mandatory' => true],
                                ['id' => 'a4-close', 'ordinal' => 3, 'title' => 'Condition close-out', 'description' => 'Record the delivered condition and close the product work instance.', 'evidence_type' => 'photo_required', 'evidence_description' => 'Final package or recipient handoff photo where applicable.', 'mandatory' => true],
                            ],
                        ],
                    ],
                    'observed_variations' => [
                        [
                            'id' => 'a4-tagudin-market',
                            'title' => 'Market product handoff with pickup or delivery',
                            'adopted_jobs_count' => 28,
                            'adoption_rate' => 92,
                        ],
                    ],
                ],
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-7234567890a9',
                'catalog_code' => 'tagudin-digital-delivery-a9',
                'work_shape' => 'A9',
                'shape_contract_version' => 1,
                'payload_schema_version' => 1,
                'catalog_version' => 1,
                'title' => 'Tagudin Digital Delivery',
                'summary' => 'Private artifact delivery with scan, review, and formal acceptance evidence.',
                'status' => 'published',
                'definition' => [
                    'category_codes' => ['greeting-cards', 'print-assist'],
                    'listing_types' => ['service'],
                    'variance_threshold_percent' => 10,
                    'evaluation_window_hours' => 72,
                    'steps' => [
                        [
                            'id' => 'a9-upload',
                            'ordinal' => 1,
                            'title' => 'Draft artifact upload and scan',
                            'description' => 'Upload the draft to the private evidence area and complete the file safety scan.',
                            'evidence_type' => 'receipt_upload',
                            'evidence_description' => 'Artifact checksum and scan result recorded in the evidence trail.',
                            'mandatory' => true,
                        ],
                        [
                            'id' => 'a9-review',
                            'ordinal' => 2,
                            'title' => 'Client review and final acceptance',
                            'description' => 'The client reviews the artifact and records the final acceptance decision.',
                            'evidence_type' => 'dual_sign',
                            'evidence_description' => 'Signed acceptance event in the audit trail.',
                            'mandatory' => true,
                        ],
                    ],
                    'work_sets' => [
                        [
                            'option_id' => 'set-print-proof-assist',
                            'set_code' => 'set-print-proof-assist',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-digital-delivery-a9',
                            'work_shape' => 'A9',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['print-assist'],
                            'listing_types' => ['service'],
                            'title' => 'Print Proof & File Assist',
                            'summary' => 'Check print-ready files, prepare a proof, and record customer approval.',
                            'steps' => [
                                ['id' => 'print-files', 'title' => 'Receive files and check print settings', 'description' => 'Confirm dimensions, page count, and output requirements.', 'evidence_type' => 'receipt_upload'],
                                ['id' => 'print-proof', 'title' => 'Prepare proof for customer review', 'description' => 'Generate a proof copy and note any layout adjustments.', 'evidence_type' => 'photo_required'],
                                ['id' => 'print-approval', 'title' => 'Record proof approval and deliver files', 'description' => 'Capture approval and provide the final agreed files.', 'evidence_type' => 'dual_sign'],
                            ],
                        ],
                        [
                            'option_id' => 'set-crafts-custom-card',
                            'set_code' => 'set-crafts-custom-card',
                            'set_version' => 1,
                            'status' => 'published',
                            'catalog_code' => 'tagudin-digital-delivery-a9',
                            'work_shape' => 'A9',
                            'shape_contract_version' => 1,
                            'payload_schema_version' => 1,
                            'category_codes' => ['greeting-cards'],
                            'listing_types' => ['service'],
                            'title' => 'Custom Greeting Card Design',
                            'summary' => 'Create a custom card draft, review requested edits, and deliver the approved design.',
                            'steps' => [
                                ['id' => 'card-brief', 'title' => 'Confirm card message and style', 'description' => 'Collect the message, occasion, format, and visual preferences.', 'evidence_type' => 'dual_sign'],
                                ['id' => 'card-draft', 'title' => 'Create and share the card draft', 'description' => 'Prepare a private draft for the customer to review.', 'evidence_type' => 'receipt_upload'],
                                ['id' => 'card-final', 'title' => 'Apply edits and deliver approved design', 'description' => 'Complete the agreed edits and record approval and delivery.', 'evidence_type' => 'dual_sign'],
                            ],
                        ],
                    ],
                    'observed_variations' => [
                        [
                            'id' => 'a9-tagudin-proof',
                            'title' => 'Soft proof with one revision',
                            'adopted_jobs_count' => 19,
                            'adoption_rate' => 76,
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function definitionForShape(string $shape): ?array
    {
        foreach (self::definitions() as $definition) {
            if ($definition['work_shape'] === $shape) {
                return $definition;
            }
        }

        return null;
    }
}
