<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\DailyReport;
use App\Models\User;
use App\Services\DailyReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailyReportScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_with_zero_scheduled_activities_records_zero_score(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.scheduled_count', 0)
            ->assertJsonPath('data.completed_count', 0);

        $this->assertEqualsWithDelta(0.0, $response->json('data.calculated_score'), 0.001);

        $report = DailyReport::query()->where('user_id', $user->id)->firstOrFail();

        $this->assertSame('0.00', (string) $report->calculated_score);
        $this->assertSame(0, $report->scheduled_count);
        $this->assertSame(0, $report->completed_count);
    }

    public function test_score_equals_completed_over_scheduled_percentage(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        foreach ([ActivityStatus::Completed, ActivityStatus::Completed, ActivityStatus::Pending] as $index => $status) {
            Activity::create([
                'user_id' => $user->id,
                'title' => 'Activity '.$index,
                'activity_type' => ActivityType::Personal,
                'scheduled_date' => today()->toDateString(),
                'status' => $status,
            ]);
        }

        $response = $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
            'summary' => 'Two out of three.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.scheduled_count', 3)
            ->assertJsonPath('data.completed_count', 2)
            ->assertJsonCount(3, 'data.activities');

        $this->assertEqualsWithDelta(66.67, $response->json('data.calculated_score'), 0.001);
        $this->assertEqualsWithDelta(66.67, $response->json('data.score'), 0.001);

        $this->assertDatabaseHas('daily_reports', [
            'user_id' => $user->id,
            'scheduled_count' => 3,
            'completed_count' => 2,
        ]);
    }

    public function test_score_is_capped_at_one_hundred_percent(): void
    {
        $this->assertSame(100.0, DailyReportService::calculateScore(5, 5));
        $this->assertSame(100.0, DailyReportService::calculateScore(9, 5));
        $this->assertSame(0.0, DailyReportService::calculateScore(0, 0));
        $this->assertSame(0.0, DailyReportService::calculateScore(5, 0));
    }

    public function test_submitted_score_snapshot_is_permanently_locked(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $reportId = $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
            'summary' => 'Initial report.',
        ])->assertStatus(201)->json('data.id');

        Activity::create([
            'user_id' => $user->id,
            'title' => 'Late completion',
            'activity_type' => ActivityType::Prayer,
            'scheduled_date' => today()->toDateString(),
            'status' => ActivityStatus::Completed,
        ]);

        $response = $this->patchJson('/api/v1/daily-reports/'.$reportId, [
            'summary' => 'Edited narrative only.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.summary', 'Edited narrative only.')
            ->assertJsonPath('data.scheduled_count', 0)
            ->assertJsonPath('data.completed_count', 0)
            ->assertJsonCount(0, 'data.activities');

        $this->assertEqualsWithDelta(0.0, $response->json('data.calculated_score'), 0.001);
    }

    public function test_legacy_report_rows_fall_back_to_the_legacy_score_columns(): void
    {
        $user = User::factory()->create();

        // Simulates a row written before the immutable snapshot columns existed:
        // the legacy columns carry the real values while the snapshot is zeroed.
        $report = DailyReport::create([
            'user_id' => $user->id,
            'report_date' => today()->subDays(2)->toDateString(),
            'summary' => 'Legacy report',
            'calculated_score' => 0,
            'scheduled_count' => 0,
            'completed_count' => 0,
            'score' => 75.00,
            'total_activities_count' => 4,
            'completed_activities_count' => 3,
            'submitted_at' => now()->subDays(2),
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/daily-reports/'.$report->id);

        $response->assertOk()
            ->assertJsonPath('data.scheduled_count', 4)
            ->assertJsonPath('data.completed_count', 3);

        $this->assertEqualsWithDelta(75.0, $response->json('data.calculated_score'), 0.001);
    }

    public function test_migration_reconciles_stale_score_snapshots(): void
    {
        $user = User::factory()->create();

        DB::table('daily_reports')->insert([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'report_date' => today()->subDays(3)->toDateString(),
            'summary' => 'Stale snapshot',
            'calculated_score' => 0,
            'scheduled_count' => 0,
            'completed_count' => 0,
            'score' => 50.00,
            'total_activities_count' => 2,
            'completed_activities_count' => 1,
            'status' => 'submitted',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = require database_path(
            'migrations/2026_11_15_000001_reconcile_daily_report_score_snapshots.php'
        );
        $migration->up();

        $this->assertDatabaseHas('daily_reports', [
            'user_id' => $user->id,
            'scheduled_count' => 2,
            'completed_count' => 1,
            'calculated_score' => 50.00,
        ]);
    }

    public function test_previous_day_report_cannot_be_edited(): void
    {
        $user = User::factory()->create();

        $report = DailyReport::create([
            'user_id' => $user->id,
            'report_date' => today()->subDay()->toDateString(),
            'summary' => 'Locked report',
            'calculated_score' => 50.00,
            'scheduled_count' => 2,
            'completed_count' => 1,
            'score' => 50.00,
            'total_activities_count' => 2,
            'completed_activities_count' => 1,
            'submitted_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/daily-reports/'.$report->id, [
            'summary' => 'Attempted rewrite',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('report_date');

        $this->deleteJson('/api/v1/daily-reports/'.$report->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors('report_date');

        $this->assertDatabaseHas('daily_reports', [
            'id' => $report->id,
            'summary' => 'Locked report',
            'calculated_score' => 50.00,
        ]);
    }
}
