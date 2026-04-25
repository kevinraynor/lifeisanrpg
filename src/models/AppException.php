<?php
/**
 * Application exception hierarchy.
 *
 * Models throw these instead of calling json_error() directly.
 * A single top-level handler in public/index.php catches AppException
 * and converts it to a JSON error response at the HTTP boundary.
 *
 * This decouples models from HTTP so they can safely be called from
 * tests, CLI scripts, cron jobs, or other models without accidentally
 * sending headers and killing the process mid-flight.
 *
 * Usage in models:
 *   throw new NotFoundException('Skill not found');
 *   throw new ValidationException('Hours must be between 0 and 24');
 *   throw new AuthorizationException('Insufficient guild role');
 *   throw new AppException('Something went wrong', 500);
 *
 * Routes/controllers may still call json_error() directly — they are
 * already at the HTTP boundary. Models must never call json_error().
 */

class AppException extends RuntimeException
{
    public int $httpStatus;

    public function __construct(string $message, int $httpStatus = 400, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->httpStatus = $httpStatus;
    }
}

/** 404 Not Found */
class NotFoundException extends AppException
{
    public function __construct(string $message = 'Not found', ?\Throwable $previous = null)
    {
        parent::__construct($message, 404, $previous);
    }
}

/** 400 Bad Request / invalid input */
class ValidationException extends AppException
{
    public function __construct(string $message, ?\Throwable $previous = null)
    {
        parent::__construct($message, 400, $previous);
    }
}

/** 403 Forbidden */
class AuthorizationException extends AppException
{
    public function __construct(string $message = 'Forbidden', ?\Throwable $previous = null)
    {
        parent::__construct($message, 403, $previous);
    }
}
