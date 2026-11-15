<?php

use App\Enums\ActivityLogAction;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\DailyReportComment;
use App\Models\Group;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seed the activity log with the history that already exists so the new admin
 * Activity Logs page is not empty on first load.
 *
 * Rows written here are tagged with source = "backfill" so they can be removed
 * cleanly if the migration is rolled back.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->backfillRegistrations();
        $this->backfillReports();
        $this->backfillComments();
        $this->backfillGroups();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('activity_logs')->where('source', 'backfill')->delete();
    }

    private function backfillRegistrations(): void
    {
        DB::table('users')->orderBy('id')->chunk(500, function ($users): void {
            $rows = [];

            foreach ($users as $user) {
                $rows[] = $this->row(
                    userId: $user->id,
                    action: ActivityLogAction::Registered,
                    description: ($user->name ?? 'A member').' registered their account.',
                    subjectType: User::class,
                    subjectId: $user->id,
                    createdAt: $user->created_at,
                );
            }

            $this->insert($rows);
        });
    }

    private function backfillReports(): void
    {
        DB::table('daily_reports')->orderBy('id')->chunk(500, function ($reports): void {
            $rows = [];

            foreach ($reports as $report) {
                $rows[] = $this->row(
                    userId: $report->user_id,
                    action: ActivityLogAction::ReportSubmitted,
                    description: 'Submitted a daily report for '.($report->report_date ?? 'an earlier day').'.',
                    subjectType: DailyReport::class,
                    subjectId: $report->id,
                    createdAt: $report->submitted_at ?? $report->created_at,
                );
            }

            $this->insert($rows);
        });
    }

    private function backfillComments(): void
    {
        DB::table('daily_report_comments')
            ->join('users', 'users.id', '=', 'daily_report_comments.author_id')
            ->orderBy('daily_report_comments.id')
            ->select([
                'daily_report_comments.id',
                'daily_report_comments.daily_report_id',
                'daily_report_comments.author_id',
                'daily_report_comments.created_at',
                'users.name as author_name',
            ])
            ->chunk(500, function ($comments): void {
                $rows = [];

                foreach ($comments as $comment) {
                    $rows[] = $this->row(
                        userId: $comment->author_id,
                        action: ActivityLogAction::ReportCommentAdded,
                        description: ($comment->author_name ?? 'A member').' commented on a daily report.',
                        subjectType: DailyReportComment::class,
                        subjectId: $comment->id,
                        createdAt: $comment->created_at,
                    );
                }

                $this->insert($rows);
            });
    }

    private function backfillGroups(): void
    {
        DB::table('groups')->orderBy('id')->chunk(500, function ($groups): void {
            $rows = [];

            foreach ($groups as $group) {
                $rows[] = $this->row(
                    userId: $group->created_by,
                    action: ActivityLogAction::GroupCreated,
                    description: 'Created the group "'.($group->name ?? 'Untitled').'".',
                    subjectType: Group::class,
                    subjectId: $group->id,
                    createdAt: $group->created_at,
                );
            }

            $this->insert($rows);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function row(
        ?int $userId,
        ActivityLogAction $action,
        string $description,
        ?string $subjectType,
        ?int $subjectId,
        ?string $createdAt,
    ): array {
        $timestamp = $createdAt ?? now()->toDateTimeString();

        return [
            'uuid' => (string) Str::uuid(),
            'user_id' => $userId,
            'action' => $action->value,
            'description' => mb_substr($description, 0, 500),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'properties' => null,
            'ip_address' => null,
            'user_agent' => null,
            'source' => 'backfill',
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function insert(array $rows): void
    {
        if ($rows === []) {
            return;
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('activity_logs')->insert($chunk);
        }
    }
};
