<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityStatus;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Each personal-progress card aggregates one or more activity types.
     *
     * @var array<string, list<string>>
     */
    private const CATEGORIES = [
        'prayer' => ['prayer'],
        'quran' => ['quran', 'tafseer', 'reading'],
        'exercise' => ['exercise'],
        'other' => ['habit', 'goal', 'personal', 'other'],
    ];

    /**
     * Return the authenticated member's completion progress per category.
     */
    public function progress(Request $request): JsonResponse
    {
        $rows = DB::table('activities')
            ->where('user_id', $request->user()->id)
            ->whereNull('deleted_at')
            ->selectRaw('activity_type, count(*) as total')
            ->selectRaw('sum(case when status = ? then 1 else 0 end) as completed', [
                ActivityStatus::Completed->value,
            ])
            ->groupBy('activity_type')
            ->get()
            ->keyBy('activity_type');

        $progress = [];

        foreach (self::CATEGORIES as $key => $types) {
            $completed = 0;
            $total = 0;

            foreach ($types as $type) {
                $row = $rows->get($type);

                if ($row !== null) {
                    $completed += (int) $row->completed;
                    $total += (int) $row->total;
                }
            }

            $progress[$key] = [
                'completed' => $completed,
                'total' => $total,
                'percentage' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
            ];
        }

        return ApiResponse::success(['progress' => $progress], 'Progress retrieved.');
    }
}
