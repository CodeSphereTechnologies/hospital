<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityLogAction;
use App\Enums\NotificationType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDailyReportCommentRequest;
use App\Http\Requests\StoreDailyReportRequest;
use App\Http\Requests\UpdateDailyReportRequest;
use App\Http\Resources\DailyReportCommentResource;
use App\Http\Resources\DailyReportResource;
use App\Http\Responses\ApiResponse;
use App\Models\DailyReport;
use App\Models\DailyReportComment;
use App\Models\Notification;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\DailyReportService;
use App\Support\Search;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DailyReportController extends Controller
{
    public function __construct(
        private readonly DailyReportService $reports,
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'all' => ['sometimes', 'boolean'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'status' => ['sometimes', 'nullable', 'string', 'in:all,submitted,reviewed,flagged'],
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $user = $request->user();
        $query = DailyReport::query()
            ->with(['user', 'activities'])
            ->withCount('comments')
            ->orderByDesc('report_date')
            ->orderByDesc('id');

        if ($user->isAdmin() && $request->boolean('all')) {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->integer('user_id'));
            }
        } else {
            $query->ownedBy($user);
        }

        if ($request->filled('from')) {
            $query->whereDate('report_date', '>=', $request->date('from')->toDateString());
        }

        if ($request->filled('to')) {
            $query->whereDate('report_date', '<=', $request->date('to')->toDateString());
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('q')) {
            $pattern = Search::likePattern($request->string('q')->toString());
            $query->where(function ($q) use ($pattern) {
                Search::whereInsensitiveLike($q, 'summary', $pattern);
                Search::whereInsensitiveLike($q, 'self_assessment', $pattern, 'or');
            });
        }

        $paginator = $query->paginate((int) $request->integer('per_page', 20));

        return ApiResponse::paginated(
            $paginator,
            DailyReportResource::collection($paginator->items()),
            'Daily reports retrieved.',
        );
    }

    public function store(StoreDailyReportRequest $request): JsonResponse
    {
        $report = $this->reports->submit($request->user(), $request->validated());

        $this->activityLogger->record(
            ActivityLogAction::ReportSubmitted,
            $request->user()->name.' submitted a daily report for '.$report->report_date?->toDateString().'.',
            $request->user(),
            $report,
        );

        return ApiResponse::success(
            new DailyReportResource($report->load(['activities', 'comments.author'])),
            'Daily report submitted.',
            201,
        );
    }

    public function show(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureCanView($request, $dailyReport);

        return ApiResponse::success(
            new DailyReportResource($dailyReport->load(['activities', 'comments.author'])),
        );
    }

    public function update(UpdateDailyReportRequest $request, DailyReport $dailyReport): JsonResponse
    {
        abort_unless($dailyReport->user_id === $request->user()->id, 404);

        $report = $this->reports->update($dailyReport, $request->validated());

        $this->activityLogger->record(
            ActivityLogAction::ReportUpdated,
            $request->user()->name.' updated the daily report for '.$report->report_date?->toDateString().'.',
            $request->user(),
            $report,
        );

        return ApiResponse::success(
            new DailyReportResource($report->load(['activities', 'comments.author'])),
            'Daily report updated.',
        );
    }

    public function destroy(Request $request, DailyReport $dailyReport): JsonResponse
    {
        abort_unless($dailyReport->user_id === $request->user()->id, 404);

        if ($dailyReport->submitted_at !== null && $dailyReport->report_date?->lt(today())) {
            throw ValidationException::withMessages([
                'report_date' => ['Daily reports for previous days are locked.'],
            ]);
        }

        $dailyReport->delete();

        return ApiResponse::success(null, 'Daily report deleted.');
    }

    public function comments(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureCanView($request, $dailyReport);

        return ApiResponse::success(
            DailyReportCommentResource::collection(
                $dailyReport->comments()->with('author')->orderBy('created_at')->get(),
            ),
            'Daily report comments retrieved.',
        );
    }

    public function storeComment(
        StoreDailyReportCommentRequest $request,
        DailyReport $dailyReport,
    ): JsonResponse {
        // Only the report owner or an administrator may join the discussion.
        $this->ensureCanView($request, $dailyReport);

        $author = $request->user();

        $comment = $dailyReport->comments()->create([
            'author_id' => $author->id,
            'comment' => $request->string('comment')->toString(),
        ]);

        if ($dailyReport->user_id !== $author->id) {
            // Administrator feedback: notify the report owner.
            Notification::create([
                'user_id' => $dailyReport->user_id,
                'type' => NotificationType::DailyReportComment,
                'title' => 'New feedback on your daily report',
                'body' => 'An administrator commented on your report for '.$dailyReport->report_date?->toDateString().'.',
                'data' => [
                    'daily_report_id' => $dailyReport->id,
                    'daily_report_uuid' => $dailyReport->uuid,
                ],
                'sent_at' => now(),
            ]);
        } else {
            // Member reply: notify every administrator so the discussion continues.
            $this->notifyAdministratorsOfReply($dailyReport, $author);
        }

        $this->activityLogger->record(
            $dailyReport->user_id === $author->id
                ? ActivityLogAction::ReportCommentReplied
                : ActivityLogAction::ReportCommentAdded,
            $author->name.' '.($dailyReport->user_id === $author->id ? 'replied to feedback on' : 'left feedback on').' the report for '.$dailyReport->report_date?->toDateString().'.',
            $author,
            $dailyReport,
        );

        return ApiResponse::success(
            new DailyReportCommentResource($comment->load('author')),
            'Comment added.',
            201,
        );
    }

    /**
     * Notify every administrator that a member replied on their own report.
     */
    private function notifyAdministratorsOfReply(DailyReport $dailyReport, User $author): void
    {
        $administrators = User::query()
            ->where('role', UserRole::Admin)
            ->whereKeyNot($author->id)
            ->pluck('id');

        foreach ($administrators as $administratorId) {
            Notification::create([
                'user_id' => $administratorId,
                'type' => NotificationType::DailyReportComment,
                'title' => 'New reply on a daily report',
                'body' => $author->name.' replied on the report for '.$dailyReport->report_date?->toDateString().'.',
                'data' => [
                    'daily_report_id' => $dailyReport->id,
                    'daily_report_uuid' => $dailyReport->uuid,
                ],
                'sent_at' => now(),
            ]);
        }
    }

    public function destroyComment(
        Request $request,
        DailyReport $dailyReport,
        DailyReportComment $comment,
    ): JsonResponse {
        abort_unless($comment->daily_report_id === $dailyReport->id, 404);
        abort_unless(
            $request->user()->isAdmin() || $comment->author_id === $request->user()->id,
            403,
        );

        $comment->delete();

        return ApiResponse::success(null, 'Comment deleted.');
    }

    private function ensureCanView(Request $request, DailyReport $dailyReport): void
    {
        abort_unless(
            $request->user()->isAdmin() || $dailyReport->user_id === $request->user()->id,
            404,
        );
    }
}
