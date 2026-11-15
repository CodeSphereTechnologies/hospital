<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ActivityLogAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Http\Responses\ApiResponse;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\Search;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * List the system activity log with server-side search and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'action' => ['sometimes', 'nullable', 'string', 'max:60'],
            'category' => ['sometimes', 'nullable', 'string', 'max:30'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'from' => ['sometimes', 'nullable', 'date'],
            'to' => ['sometimes', 'nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $paginator = $this->filteredQuery($validated)->paginate((int) ($validated['per_page'] ?? 20));

        return ApiResponse::success([
            'items' => ActivityLogResource::collection($paginator->items()),
            'stats' => $this->stats(),
            'filters' => $this->filters(),
        ], 'Activity logs retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<ActivityLog>
     */
    private function filteredQuery(array $filters): Builder
    {
        return ActivityLog::query()
            ->with('user')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $pattern = Search::likePattern($search);

                $query->where(function (Builder $query) use ($pattern): void {
                    Search::whereInsensitiveLike($query, 'description', $pattern);
                    Search::whereInsensitiveLike($query, 'action', $pattern, 'or');
                    $query->orWhereHas(
                        'user',
                        fn (Builder $user) => Search::whereAnyInsensitiveLike($user, ['name', 'email'], $pattern),
                    );
                });
            })
            ->when($filters['action'] ?? null, fn (Builder $query, string $action) => $query->where('action', $action))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->whereIn(
                'action',
                ActivityLogAction::valuesForCategory($category),
            ))
            ->when($filters['user_id'] ?? null, fn (Builder $query, int|string $userId) => $query->where('user_id', $userId))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'total' => ActivityLog::query()->count(),
            'today' => ActivityLog::query()->whereDate('created_at', today())->count(),
            'week' => ActivityLog::query()->where('created_at', '>=', now()->subDays(7))->count(),
            'members' => ActivityLog::query()->whereNotNull('user_id')->distinct()->count('user_id'),
        ];
    }

    /**
     * Build the option lists used by the admin filters.
     *
     * @return array{actions: list<array{value: string, label: string}>, users: list<array{value: int, label: string}>}
     */
    private function filters(): array
    {
        $userIds = ActivityLog::query()
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id')
            ->all();

        $users = User::query()
            ->whereIn('id', $userIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user): array => ['value' => $user->id, 'label' => $user->name])
            ->values()
            ->all();

        $actions = array_map(
            fn (ActivityLogAction $action): array => ['value' => $action->value, 'label' => $action->label()],
            ActivityLogAction::cases(),
        );

        return ['actions' => $actions, 'users' => $users];
    }
}
