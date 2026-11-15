<?php

namespace App\Models;

use App\Enums\ActivityLogAction;
use Database\Factories\ActivityLogFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class ActivityLog extends Model
{
    /** @use HasFactory<ActivityLogFactory> */
    use HasFactory;

    /**
     * @var string
     */
    protected $table = 'activity_logs';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'user_id',
        'action',
        'description',
        'subject_type',
        'subject_id',
        'properties',
        'ip_address',
        'user_agent',
        'source',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'action' => ActivityLogAction::class,
        'properties' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $log): void {
            if (blank($log->uuid)) {
                $log->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * The member or administrator who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The record the action was performed against, when applicable.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @param  Builder<ActivityLog>  $query
     * @return Builder<ActivityLog>
     */
    public function scopeOfAction(Builder $query, ActivityLogAction|string $action): Builder
    {
        return $query->where('action', $action instanceof ActivityLogAction ? $action->value : $action);
    }
}
