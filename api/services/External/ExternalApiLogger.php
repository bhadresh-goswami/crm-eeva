<?php
class ExternalApiLogger {
    public function __construct(private array $config) {}
    public function log(array $entry): void {
        $file = $this->config['log_file'];
        $dir = dirname($file);
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }
        $entry['date'] = date('Y-m-d');
        $entry['time'] = date('H:i:s');
        file_put_contents($file, json_encode($entry, JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
