<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminGroupResource;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\DailyReport;
use App\Models\Group;
use App\Models\User;
use App\Support\Search;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Search users, groups and reports for the global admin search.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $term = trim($validated['q']);
        $pattern = Search::likePattern($term);

        $users = User::query()
            ->with('groups')
            ->withCount(['activities', 'dailyReports'])
            ->withAvg('dailyReports as average_score', 'calculated_score')
            ->where(fn ($query) => Search::whereAnyInsensitiveLike($query, ['name', 'email'], $pattern))
            ->limit(5)
            ->get();

        $groups = Group::query()
            ->withCount('users')
            ->where(fn ($query) => Search::whereAnyInsensitiveLike($query, ['name', 'description', 'leader_name'], $pattern))
            ->limit(5)
            ->get();

        $reports = DailyReport::query()
            ->with('user')
            ->withCount('comments')
            ->where(function ($query) use ($pattern): void {
                Search::whereInsensitiveLike($query, 'summary', $pattern);
                $query->orWhereHas(
                    'user',
                    fn ($user) => Search::whereAnyInsensitiveLike($user, ['name', 'email'], $pattern),
                );
            })
            ->orderByDesc('report_date')
            ->limit(5)
            ->get();

        return ApiResponse::success([
            'query' => $term,
            'users' => AdminUserResource::collection($users),
            'groups' => AdminGroupResource::collection($groups),
            'reports' => DailyReportResource::collection($reports),
        ], 'Search results retrieved.');
    }
}
