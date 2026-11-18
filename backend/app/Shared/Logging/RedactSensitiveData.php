<?php

declare(strict_types=1);

namespace App\Shared\Logging;

use Illuminate\Log\Logger;
use Monolog\Logger as Monolog;
use Monolog\LogRecord;
use Throwable;

/**
 * Keeps data out of the log files (D10). An exception's message can hold a query and its values, so
 * only its class and place are kept. Text loses LRNs and emails, and sensitive context keys go.
 */
final class RedactSensitiveData
{
    private const SENSITIVE_KEY = '/lrn|birth|password|token|secret|name|email|phone/i';

    public function __invoke(Logger $logger): void
    {
        $monolog = $logger->getLogger();
        assert($monolog instanceof Monolog);

        $monolog->pushProcessor(fn (LogRecord $record): LogRecord => $this->redact($record));
    }

    private function redact(LogRecord $record): LogRecord
    {
        $exception = $record->context['exception'] ?? null;

        if ($exception instanceof Throwable) {
            return $record->with(
                message: sprintf('%s at %s:%d', $exception::class, $exception->getFile(), $exception->getLine()),
                context: ['exception_class' => $exception::class],
            );
        }

        return $record->with(message: $this->text($record->message), context: $this->values($record->context));
    }

    /**
     * @param  array<mixed>  $values
     * @return array<mixed>
     */
    private function values(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_string($key) && preg_match(self::SENSITIVE_KEY, $key) === 1) {
                $values[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $values[$key] = $this->values($value);
            } elseif (is_string($value)) {
                $values[$key] = $this->text($value);
            }
        }

        return $values;
    }

    private function text(string $text): string
    {
        return (string) preg_replace(['/\b\d{12}\b/', '/[^\s@]+@[^\s@]+/'], ['[lrn]', '[email]'], $text);
    }
}
