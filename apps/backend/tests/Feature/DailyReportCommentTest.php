<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\DailyReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailyReportCommentTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_owner_can_reply_on_their_own_report(): void
    {
        $owner = User::factory()->create();
        $report = $this->createReport($owner);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => 'Thanks for the feedback!',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.comment', 'Thanks for the feedback!')
            ->assertJsonPath('data.author_id', $owner->id);

        $this->assertDatabaseHas('daily_report_comments', [
            'daily_report_id' => $report->id,
            'author_id' => $owner->id,
            'comment' => 'Thanks for the feedback!',
        ]);
    }

    public function test_member_cannot_comment_on_another_members_report(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $report = $this->createReport($owner);

        Sanctum::actingAs($intruder);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => 'Should not be allowed.',
        ])->assertStatus(404);

        $this->assertDatabaseCount('daily_report_comments', 0);
    }

    public function test_administrator_can_comment_and_the_owner_is_notified(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $report = $this->createReport($owner);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => 'Great progress this week.',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.author_id', $admin->id);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => NotificationType::DailyReportComment->value,
        ]);
    }

    public function test_member_reply_notifies_administrators(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $report = $this->createReport($owner);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => 'Could you clarify the last point?',
        ])->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => NotificationType::DailyReportComment->value,
        ]);
    }

    public function test_comment_requires_a_body(): void
    {
        $owner = User::factory()->create();
        $report = $this->createReport($owner);

        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => '',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('comment');
    }

    public function test_guests_cannot_comment(): void
    {
        $owner = User::factory()->create();
        $report = $this->createReport($owner);

        $this->postJson('/api/v1/daily-reports/'.$report->id.'/comments', [
            'comment' => 'Anonymous',
        ])->assertStatus(401);
    }

    private function createReport(User $owner): DailyReport
    {
        return DailyReport::create([
            'user_id' => $owner->id,
            'report_date' => today()->toDateString(),
            'summary' => 'A test report',
            'calculated_score' => 50,
            'scheduled_count' => 2,
            'completed_count' => 1,
            'submitted_at' => now(),
        ]);
    }
}
