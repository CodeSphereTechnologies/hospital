<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ActivityLogAction;
use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdminActivityRequest;
use App\Http\Resources\AdminActivityResource;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Services\ActivityLogger;
use App\Support\Csv;
use App\Support\Search;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityController extends Controller
{
    public function __construct(private readonly ActivityLogger $activityLogger) {}

    /**
     * List every member activity with server-side search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'nullable', 'in:pending,completed,missed'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $paginator = $this->filteredQuery($validated)->paginate((int) ($validated['per_page'] ?? 15));

        return ApiResponse::success([
            'items' => AdminActivityResource::collection($paginator->items()),
            'stats' => $this->stats(),
        ], 'Activities retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * Create an activity on behalf of one or more members or a whole group.
     *
     * A personal activity row is created for every targeted member so the
     * activity immediately appears on each member's own dashboard.
     */
    public function store(StoreAdminActivityRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $userIds = collect($validated['user_ids'] ?? [])->map(fn ($id) => (int) $id);

        if (! empty($validated['group_id'])) {
            $userIds = $userIds->merge(
                DB::table('group_user')->where('group_id', $validated['group_id'])->pluck('user_id'),
            );
        }

        $userIds = $userIds->unique()->values();

        if ($userIds->isEmpty()) {
            return ApiResponse::error('Select at least one member to assign this activity to.', 422);
        }

        $created = DB::transaction(function () use ($validated, $userIds) {
            return $userIds->map(fn (int $userId) => Activity::create([
                'user_id' => $userId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'activity_type' => $validated['activity_type'] ?? ActivityType::Other->value,
                'scheduled_date' => $validated['scheduled_date'],
                'start_time' => $validated['start_time'] ?? null,
                'end_time' => $validated['end_time'] ?? null,
                'status' => $validated['status'] ?? ActivityStatus::Pending->value,
                'reminder_enabled' => $validated['reminder_enabled'] ?? false,
                'server_version' => 1,
                'synced_at' => now(),
            ]));
        });

        $created->each->load('user');

        $this->activityLogger->record(
            ActivityLogAction::ActivityCreated,
            ($request->user()?->name ?? 'An administrator').' assigned "'.$validated['title'].'" to '.$created->count().' member(s).',
            $request->user(),
            $created->first(),
            ['created_count' => $created->count()],
        );

        return ApiResponse::success([
            'activity' => new AdminActivityResource($created->first()),
            'activities' => AdminActivityResource::collection($created),
            'created_count' => $created->count(),
        ], $created->count() === 1
            ? 'Activity created.'
            : $created->count().' activities created.', 201);
    }

    /**
     * Mark an activity as completed on behalf of its owner.
     */
    public function complete(Request $request, Activity $activity): JsonResponse
    {
        $activity->forceFill(['status' => ActivityStatus::Completed])->save();
        $activity->load('user');

        $this->activityLogger->record(
            ActivityLogAction::ActivityCompleted,
            ($request->user()?->name ?? 'An administrator').' marked "'.$activity->title.'" as completed for '.($activity->user?->name ?? 'a member').'.',
            $request->user(),
            $activity,
        );

        return ApiResponse::success([
            'activity' => new AdminActivityResource($activity),
        ], 'Activity marked as completed.');
    }

    /**
     * Stream the filtered activity list as a CSV download.
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'nullable', 'in:pending,completed,missed'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $query = $this->filteredQuery($validated);

        $rows = function () use ($query): \Generator {
            foreach ($query->lazy(500) as $activity) {
                yield [
                    $activity->id,
                    $activity->title,
                    $activity->activity_type?->value,
                    $activity->scheduled_date?->toDateString(),
                    $activity->start_time,
                    $activity->end_time,
                    $activity->status?->value,
                    $activity->user?->name ?? '',
                    $activity->user?->email ?? '',
                ];
            }
        };

        return Csv::download('activities-'.now()->format('Y-m-d').'.csv', [
            'ID', 'Activity', 'Type', 'Date', 'Start', 'End', 'Status', 'Member', 'Email',
        ], $rows());
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Activity>
     */
    private function filteredQuery(array $filters): Builder
    {
        return Activity::query()
            ->with('user')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $pattern = Search::likePattern($search);

                $query->where(function (Builder $query) use ($pattern): void {
                    Search::whereInsensitiveLike($query, 'title', $pattern);
                    Search::whereInsensitiveLike($query, 'description', $pattern, 'or');
                    $query->orWhereHas(
                        'user',
                        fn (Builder $user) => Search::whereAnyInsensitiveLike($user, ['name', 'email'], $pattern),
                    );
                });
            })
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('activity_type', $type))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['user_id'] ?? null, fn (Builder $query, int|string $userId) => $query->where('user_id', $userId))
            ->orderByDesc('scheduled_date')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'total' => Activity::query()->count(),
            'completed' => Activity::query()->where('status', ActivityStatus::Completed)->count(),
            'pending' => Activity::query()->where('status', ActivityStatus::Pending)->count(),
            'missed' => Activity::query()->where('status', ActivityStatus::Missed)->count(),
        ];
    }
}
