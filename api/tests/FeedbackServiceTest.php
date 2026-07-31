<?php

require_once dirname(__DIR__) . '/services/FeedbackService.php';

function assertSameValue($expected, $actual, string $message): void {
    if ($expected !== $actual) {
        throw new RuntimeException($message . ': expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

$repository = (new ReflectionClass(FeedbackRepository::class))->newInstanceWithoutConstructor();
$service = new FeedbackService($repository);
assertSameValue(true, FeedbackRepository::isExpertRole('Technical Expert'), 'Technical Expert is assignment-scoped');
assertSameValue(false, FeedbackRepository::isExpertRole('manager'), 'Manager retains broader feedback access');

$cases = [
    'Interview Support' => [
        'input' => [
            'company_name' => 'Example Inc', 'interviewer_name' => 'Expert',
            'communication' => 5, 'technical' => 4, 'confidence' => 3, 'project_explanation' => 4,
            'career_clarity' => 1,
        ],
        'overall' => 4.0,
        'ignored' => 'career_clarity',
    ],
    'Free Counselling' => [
        'input' => [
            'communication' => 5, 'confidence' => 4,
            'custom_fields' => ['career_clarity' => 5, 'resume_readiness' => 4, 'career_goal_understanding' => 3, 'hidden' => 1],
        ],
        'overall' => 4.2,
        'ignored_custom' => 'hidden',
    ],
    'JDC' => [
        'input' => ['custom_fields' => ['jd_understanding' => 5, 'role_alignment' => 4]],
        'overall' => 4.5,
    ],
    'RUC' => [
        'input' => ['custom_fields' => ['resume_quality' => 4, 'role_alignment' => 3]],
        'overall' => 3.5,
    ],
    'TAC' => [
        'input' => ['technical' => 5, 'confidence' => 4, 'custom_fields' => ['role_readiness' => 3]],
        'overall' => 4.0,
    ],
    'Training Session' => [
        'input' => ['custom_fields' => ['participation' => 5, 'assignment_completion' => 3]],
        'overall' => 4.0,
    ],
];

foreach ($cases as $taskType => $case) {
    $prepared = $service->prepareCreate($case['input'], $taskType);
    assertSameValue($case['overall'], $prepared['overall'], "{$taskType} overall");
    if ($taskType !== 'Interview Support') {
        assertSameValue('', $prepared['company_name'], "{$taskType} receives legacy database compatibility value");
        assertSameValue('', $prepared['interviewer_name'], "{$taskType} receives legacy database compatibility value");
    }
    if (isset($case['ignored'])) {
        assertSameValue(false, array_key_exists($case['ignored'], $prepared), "{$taskType} ignores hidden field");
    }
    if (isset($case['ignored_custom'])) {
        $storedCustom = json_decode((string)$prepared['custom_fields'], true);
        assertSameValue(false, array_key_exists($case['ignored_custom'], $storedCustom), "{$taskType} ignores hidden custom field");
    }
}

$taskTypeAliases = [
    'Interview Support - Google Doc' => 'Interview Support',
    'Free Counseling Call' => 'Free Counselling',
    'Training' => 'Training Session',
];
foreach ($taskTypeAliases as $databaseName => $canonicalName) {
    assertSameValue($canonicalName, $service->configurationFor($databaseName)['name'], "{$databaseName} resolves to canonical configuration");
}

$formattedJdc = $service->formatFeedback([
    'task_type' => 'JDC',
    'custom_fields' => ['jd_understanding' => 5, 'role_alignment' => 4],
    'overall' => 4.5,
]);
assertSameValue('custom', $formattedJdc['visible_fields']['jd_understanding']['storage'], 'Response metadata identifies custom storage');

$legacyWithHiddenInvalidJson = $service->prepareCreate([
    'company_name' => 'Example Inc', 'interviewer_name' => 'Expert',
    'communication' => 5, 'technical' => 4, 'confidence' => 3, 'project_explanation' => 4,
    'custom_fields' => '{invalid hidden json',
], 'Interview Support');
assertSameValue(false, array_key_exists('custom_fields', $legacyWithHiddenInvalidJson), 'Hidden custom_fields does not trigger Interview Support validation');

$updated = $service->prepareUpdate(
    ['custom_fields' => ['career_clarity' => 1]],
    'Free Counselling',
    [
        'communication' => 5,
        'confidence' => 4,
        'custom_fields' => ['career_clarity' => 5, 'resume_readiness' => 4, 'career_goal_understanding' => 3],
    ]
);
assertSameValue(3.4, $updated['overall'], 'Update recalculates overall from updated and existing visible ratings');
$updatedCustom = json_decode((string)$updated['custom_fields'], true);
assertSameValue(4, $updatedCustom['resume_readiness'], 'Update retains untouched visible custom fields');

$formattedLegacy = $service->formatFeedback([
    'id' => 1,
    'task_id' => 10,
    'task_type' => 'Interview Support',
    'technical' => 4,
    'custom_fields' => null,
]);
assertSameValue(null, $formattedLegacy['custom_fields'], 'Legacy null custom_fields remains null');
assertSameValue(true, array_key_exists('technical', $formattedLegacy), 'Legacy flat ratings remain present');

try {
    $service->prepareCreate(['custom_fields' => ['jd_understanding' => 5]], 'JDC');
    throw new RuntimeException('Missing visible required field was not rejected');
} catch (InvalidArgumentException $e) {
    assertSameValue(true, str_contains($e->getMessage(), 'Role Alignment is required'), 'Validation identifies visible missing field');
}

echo "FeedbackService tests passed\n";
