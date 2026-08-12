<?php

class FeedbackEligibility {
    private const REQUIRED_TYPES = [
        'interview support', 'interview support - google doc', 'otter support',
        'jdc', 'ruc', 'resume + ruc', 'tac', 'mock',
        'free counselling', 'free counseling', 'free counseling call',
        'training', 'training session',
    ];

    public static function isEligible(string $taskType, string $status): bool {
        return strtolower(trim($status)) === 'completed'
            && in_array(self::normalize($taskType), self::REQUIRED_TYPES, true);
    }

    public static function sql(string $taskTypeExpression = 'tt.name', string $statusExpression = 'ts.name'): string {
        $types = implode(', ', array_map(static fn (string $type): string => "'" . str_replace("'", "''", $type) . "'", self::REQUIRED_TYPES));
        return "LOWER(TRIM(COALESCE({$statusExpression}, ''))) = 'completed' AND LOWER(TRIM(COALESCE({$taskTypeExpression}, ''))) IN ({$types})";
    }

    private static function normalize(string $value): string {
        return strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? $value));
    }
}
