<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyReportCommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'daily_report_id' => $this->daily_report_id,
            'author_id' => $this->author_id,
            'author' => new UserResource($this->whenLoaded('author')),
            'author_name' => $this->whenLoaded('author', fn () => $this->author?->name),
            'role' => $this->whenLoaded('author', fn () => $this->author?->role?->value === 'admin' ? 'Administrator' : 'Member'),
            'avatar_url' => $this->whenLoaded('author', fn () => $this->author?->avatar_url),
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
