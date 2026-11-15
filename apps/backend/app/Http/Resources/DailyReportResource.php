<?php

namespace App\Http\Resources;

use App\Services\DailyReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        [$scheduledCount, $completedCount, $calculatedScore] = $this->snapshotCounts();

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'user_id' => $this->user_id,
            'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
            'user_email' => $this->whenLoaded('user', fn () => $this->user?->email),
            'user_avatar_url' => $this->whenLoaded('user', fn () => $this->user?->avatar_url),
            'report_date' => $this->report_date?->toDateString(),
            'summary' => $this->summary,
            'self_assessment' => $this->self_assessment,
            'calculated_score' => $calculatedScore,
            'scheduled_count' => $scheduledCount,
            'completed_count' => $completedCount,
            // Legacy aliases retained for existing clients.
            'score' => $this->score === null ? null : (float) $this->score,
            'completed_activities_count' => (int) $this->completed_activities_count,
            'total_activities_count' => (int) $this->total_activities_count,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'status' => $this->status ?? 'submitted',
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'comments_count' => $this->whenCounted('comments', fn () => (int) $this->comments_count),
            'activities' => DailyReportActivityResource::collection($this->whenLoaded('activities')),
            'comments' => DailyReportCommentResource::collection($this->whenLoaded('comments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Resolve the immutable score snapshot.
     *
     * Reports written before the snapshot columns existed only stored their
     * values in the legacy columns. Fall back to those so older rows stay
     * consistent with the activity list they render.
     *
     * @return array{0: int, 1: int, 2: float}
     */
    private function snapshotCounts(): array
    {
        $scheduled = (int) ($this->scheduled_count ?? 0);
        $completed = (int) ($this->completed_count ?? 0);
        $score = (float) ($this->calculated_score ?? 0);

        if ($scheduled === 0 && (int) ($this->total_activities_count ?? 0) > 0) {
            $scheduled = (int) $this->total_activities_count;
            $completed = (int) ($this->completed_activities_count ?? 0);
            $score = (float) ($this->score ?? DailyReportService::calculateScore($completed, $scheduled));
        }

        return [$scheduled, $completed, $score];
    }
}
