<?php

namespace Tests\Feature;

use App\Enums\ActivityLogAction;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_list_the_activity_log(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create(['name' => 'Amina Yusuf']);

        ActivityLog::factory()->create([
            'user_id' => $member->id,
            'action' => ActivityLogAction::Login->value,
            'description' => 'Amina Yusuf signed in.',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/activity-logs')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items.0.action', 'login')
            ->assertJsonPath('data.items.0.action_label', 'Signed in')
            ->assertJsonPath('data.items.0.actor.name', 'Amina Yusuf')
            ->assertJsonPath('data.stats.total', 1)
            ->assertJsonStructure([
                'data' => [
                    'items' => [['id', 'action', 'action_label', 'category', 'description', 'actor', 'created_at']],
                    'stats' => ['total', 'today', 'week', 'members'],
                    'filters' => ['actions', 'users'],
                ],
                'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            ]);
    }

    public function test_non_administrators_cannot_view_the_activity_log(): void
    {
        $member = User::factory()->create();

        Sanctum::actingAs($member);

        $this->getJson('/api/v1/admin/activity-logs')->assertStatus(403);
    }

    public function test_guests_cannot_view_the_activity_log(): void
    {
        $this->getJson('/api/v1/admin/activity-logs')->assertStatus(401);
    }

    public function test_login_is_recorded(): void
    {
        $user = User::factory()->create([
            'email' => 'login-log@thinkcode.dev',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => ActivityLogAction::Login->value,
        ]);
    }

    public function test_registration_is_recorded(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'New Member',
            'email' => 'new-member@thinkcode.dev',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        $this->assertDatabaseHas('activity_logs', [
            'action' => ActivityLogAction::Registered->value,
        ]);
    }

    public function test_report_submission_is_recorded(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/daily-reports', [
            'report_date' => today()->toDateString(),
            'summary' => 'A day well spent.',
        ])->assertStatus(201);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => ActivityLogAction::ReportSubmitted->value,
        ]);
    }

    public function test_suspending_a_member_is_recorded(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/users/{$member->id}/toggle-suspension")->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogAction::UserSuspended->value,
        ]);
    }

    public function test_creating_a_group_is_recorded(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/groups', [
            'name' => 'Evening Circle',
        ])->assertStatus(201);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'action' => ActivityLogAction::GroupCreated->value,
        ]);
    }

    public function test_activity_log_can_be_filtered_by_action_and_user(): void
    {
        $admin = User::factory()->admin()->create();
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        ActivityLog::factory()->create([
            'user_id' => $alice->id,
            'action' => ActivityLogAction::Login->value,
        ]);
        ActivityLog::factory()->create([
            'user_id' => $bob->id,
            'action' => ActivityLogAction::GroupCreated->value,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/activity-logs?action=login')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.items.0.action', 'login');

        $this->getJson('/api/v1/admin/activity-logs?user_id='.$alice->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.items.0.actor.id', $alice->id);
    }

    public function test_activity_log_can_be_filtered_by_date_range(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        ActivityLog::factory()->create([
            'user_id' => $member->id,
            'action' => ActivityLogAction::Login->value,
            'created_at' => now()->subDays(10),
        ]);
        ActivityLog::factory()->create([
            'user_id' => $member->id,
            'action' => ActivityLogAction::Login->value,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $from = now()->subDays(2)->toDateString();

        $this->getJson('/api/v1/admin/activity-logs?from='.$from)
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }
}
