<?php

class FeedbackModel {
    public const EXTENDED_FIELDS = [
        'strengths',
        'recommendations',
        'next_action',
        'additional_feedback',
        'custom_fields',
    ];

    public static function customFieldsForStorage($value): ?string {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new InvalidArgumentException('custom_fields must contain valid JSON');
            }

            return $value;
        }

        $encoded = json_encode($value);
        if ($encoded === false) {
            throw new InvalidArgumentException('custom_fields must contain valid JSON');
        }

        return $encoded;
    }

    public static function map(?array $row): ?array {
        if ($row === null) {
            return null;
        }

        if (array_key_exists('custom_fields', $row) && $row['custom_fields'] !== null) {
            $decoded = json_decode((string)$row['custom_fields'], true);
            $row['custom_fields'] = json_last_error() === JSON_ERROR_NONE ? $decoded : $row['custom_fields'];
        }

        return $row;
    }
}
