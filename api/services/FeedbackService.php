<?php

require_once dirname(__DIR__) . '/models/FeedbackModel.php';
require_once dirname(__DIR__) . '/repositories/FeedbackRepository.php';

class FeedbackService {
    private array $config;

    public function __construct(private FeedbackRepository $repository, ?array $config = null) {
        $this->config = $config ?? require dirname(__DIR__) . '/config/feedback.php';
    }

    public function getTaskContext(int $taskId, bool $forUpdate = false): ?array {
        return $this->repository->getTaskContext($taskId, $forUpdate);
    }

    public function prepareCreate(array $input, string $taskType): array {
        return $this->prepareData($input, $taskType, false);
    }

    public function prepareUpdate(array $input, string $taskType, array $existingFeedback = []): array {
        return $this->prepareData($input, $taskType, true, $existingFeedback);
    }

    public function formatFeedback(array $feedback): array {
        $taskType = (string)($feedback['task_type'] ?? '');
        $key = $this->normalizeTaskType($taskType);
        if (!isset($this->config[$key])) {
            $feedback['visible_fields'] = [];
            return $feedback;
        }
        $configuration = $this->config[$key];
        $customFields = is_array($feedback['custom_fields'] ?? null) ? $feedback['custom_fields'] : [];
        $visibleValues = [];
        $visibleDefinitions = [];

        foreach ($configuration['fields'] as $name => $definition) {
            $visibleDefinitions[$name] = [
                'label' => $definition['label'],
                'type' => $definition['type'],
                'required' => (bool)($definition['required'] ?? false),
            ];
            if (isset($definition['min'], $definition['max'])) {
                $visibleDefinitions[$name]['min'] = $definition['min'];
                $visibleDefinitions[$name]['max'] = $definition['max'];
            }
            $visibleValues[$name] = ($definition['storage'] ?? 'column') === 'custom'
                ? ($customFields[$name] ?? null)
                : ($feedback[$name] ?? null);
        }

        // Preserve all legacy flat fields for Interview Support clients.
        if ($this->normalizeTaskType((string)$configuration['name']) === 'interview support') {
            $response = $feedback;
        } else {
            $response = array_intersect_key($feedback, array_flip([
                'id', 'task_id', 'task_type', 'overall', 'created_at', 'updated_at',
                'due_date', 'candidate_name', 'task_status', 'assigned_to_name',
            ]));
            foreach ($visibleValues as $name => $value) {
                if (($configuration['fields'][$name]['storage'] ?? 'column') === 'column') {
                    $response[$name] = $value;
                }
            }
        }

        $response['task_type'] = $configuration['name'];
        $response['visible_fields'] = $visibleDefinitions;
        $visibleCustomFields = array_intersect_key(
            $customFields,
            array_filter(
                $configuration['fields'],
                static fn (array $definition): bool => ($definition['storage'] ?? 'column') === 'custom'
            )
        );
        $response['custom_fields'] = $this->hasCustomFields($configuration)
            ? $visibleCustomFields
            : ($feedback['custom_fields'] ?? null);

        return $response;
    }

    public function configurationFor(string $taskType): array {
        $key = $this->normalizeTaskType($taskType);
        if (!isset($this->config[$key])) {
            throw new InvalidArgumentException("Feedback is not configured for task type: {$taskType}");
        }

        return $this->config[$key];
    }

    private function prepareData(array $input, string $taskType, bool $partial, array $existingFeedback = []): array {
        $configuration = $this->configurationFor($taskType);
        $providedCustom = $this->hasCustomFields($configuration)
            ? $this->normalizeCustomFields($input['custom_fields'] ?? null)
            : [];
        $existingCustom = $this->hasCustomFields($configuration)
            ? $this->normalizeCustomFields($existingFeedback['custom_fields'] ?? null)
            : [];
        $data = [];
        $custom = [];
        $values = [];
        $errors = [];

        foreach ($configuration['fields'] as $name => $definition) {
            $isCustom = ($definition['storage'] ?? 'column') === 'custom';
            $provided = $isCustom
                ? array_key_exists($name, $providedCustom) || array_key_exists($name, $input)
                : array_key_exists($name, $input);
            $value = $isCustom ? ($providedCustom[$name] ?? $input[$name] ?? null) : ($input[$name] ?? null);

            if (!$partial && ($definition['required'] ?? false) && (!$provided || $value === null || $value === '')) {
                $errors[] = $definition['label'] . ' is required';
                continue;
            }
            if (!$provided) {
                continue;
            }

            if (($definition['type'] ?? 'text') === 'rating') {
                if (!is_numeric($value)) {
                    $errors[] = $definition['label'] . ' must be numeric';
                    continue;
                }
                $value = (float)$value;
                // Interview Support historically accepted numeric scores without range validation.
                if ($this->normalizeTaskType($taskType) !== 'interview support'
                    && ($value < (float)$definition['min'] || $value > (float)$definition['max'])) {
                    $errors[] = sprintf('%s must be between %s and %s', $definition['label'], $definition['min'], $definition['max']);
                    continue;
                }
            } elseif (is_scalar($value) || $value === null) {
                $value = trim((string)$value);
            } else {
                $errors[] = $definition['label'] . ' must be a valid value';
                continue;
            }

            $values[$name] = $value;
            if ($isCustom) {
                $custom[$name] = $value;
            } else {
                $data[$name] = $value;
            }
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(implode('; ', $errors));
        }

        // These legacy columns are NOT NULL in existing installations. They are
        // internal compatibility values for non-interview types, not visible input.
        if (!$partial && $this->normalizeTaskType($taskType) !== 'interview support') {
            $data['company_name'] = '';
            $data['interviewer_name'] = '';
        }

        if (!$partial) {
            $data['overall'] = $this->calculateOverall($configuration['overall_fields'], $values);
        } elseif (array_intersect($configuration['overall_fields'], array_keys($values)) !== []) {
            $merged = $this->valuesForExistingFeedback(
                array_replace($existingFeedback, $input),
                array_replace($existingCustom, $providedCustom),
                $configuration
            );
            $overall = $this->calculateOverall($configuration['overall_fields'], $merged, true);
            if ($overall !== null) {
                $data['overall'] = $overall;
            }
        }

        if ($custom !== [] || (!$partial && $this->hasCustomFields($configuration))) {
            $data['custom_fields'] = FeedbackModel::customFieldsForStorage(
                $partial ? array_replace($existingCustom, $custom) : $custom
            );
        }

        return $data;
    }

    private function calculateOverall(array $fieldNames, array $values, bool $allowIncomplete = false): ?float {
        $scores = [];
        foreach ($fieldNames as $fieldName) {
            if (!array_key_exists($fieldName, $values) || !is_numeric($values[$fieldName])) {
                if ($allowIncomplete) {
                    return null;
                }
                throw new InvalidArgumentException("{$fieldName} is required to calculate overall");
            }
            $scores[] = (float)$values[$fieldName];
        }

        return $scores === [] ? null : round(array_sum($scores) / count($scores), 2);
    }

    private function normalizeCustomFields($value): array {
        if ($value === null || $value === '') {
            return [];
        }
        if (is_object($value)) {
            return get_object_vars($value);
        }
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        throw new InvalidArgumentException('custom_fields must contain a JSON object');
    }

    private function valuesForExistingFeedback(array $input, array $custom, array $configuration): array {
        $values = $custom;
        foreach ($configuration['fields'] as $name => $definition) {
            if (($definition['storage'] ?? 'column') === 'column' && array_key_exists($name, $input)) {
                $values[$name] = $input[$name];
            }
        }
        return $values;
    }

    private function hasCustomFields(array $configuration): bool {
        foreach ($configuration['fields'] as $definition) {
            if (($definition['storage'] ?? 'column') === 'custom') {
                return true;
            }
        }
        return false;
    }

    private function normalizeTaskType(string $taskType): string {
        return strtolower(trim($taskType));
    }
}
