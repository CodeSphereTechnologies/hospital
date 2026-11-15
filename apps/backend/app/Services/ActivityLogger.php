<?php

namespace App\Services;

use App\Enums\ActivityLogAction;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Throwable;

/**
 * Central helper for writing structured business audit entries.
 */
class ActivityLogger
{
    /**
     * Record a business activity performed by the given actor.
     *
     * Logging must never break the action it describes, so any failure is
     * reported and swallowed.
     *
     * @param  array<string, mixed>  $properties
     */
    public function record(
        ActivityLogAction $action,
        string $description,
        ?User $actor = null,
        ?Model $subject = null,
        array $properties = [],
    ): ?ActivityLog {
        try {
            $request = $this->request();
            $actor ??= $request?->user();

            return ActivityLog::create([
                'user_id' => $actor?->id,
                'action' => $action,
                'description' => $description,
                'subject_type' => $subject?->getMorphClass(),
                'subject_id' => $subject?->getKey(),
                'properties' => $properties === [] ? null : $properties,
                'ip_address' => $request?->ip(),
                'user_agent' => $this->userAgent($request),
                'source' => 'app',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    private function request(): ?Request
    {
        return app()->bound('request') ? request() : null;
    }

    private function userAgent(?Request $request): ?string
    {
        $agent = $request?->userAgent();

        return $agent === null ? null : mb_substr($agent, 0, 500);
    }
}
