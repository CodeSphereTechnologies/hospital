<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the admin- and user-side fixes tracked in
 * "docs/Issues of Daei Mini.md".
 */
class DaeiIssueFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_search_matches_a_group_name_case_insensitively(): void
    {
        $admin = User::factory()->admin()->create();
        $group = $this->createGroup('Daei');
        $member = User::factory()->create(['name' => 'Yusuf Ali']);
        $member->groups()->attach($group->id);

        User::factory()->create(['name' => 'Unrelated Person']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users?q=daei')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $member->id);
    }

    public function test_user_search_matches_name_and_email_case_insensitively(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create([
            'name' => 'Aisha Rahman',
            'email' => 'AISHA@thinkcode.dev',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users?q=aisha')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $user->id);
    }

    public function test_group_search_is_case_insensitive(): void
    {
        $admin = User::factory()->admin()->create();
        $this->createGroup('Daei');
        $this->createGroup('Evening Circle');

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/groups?q=DAEI')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.name', 'Daei');
    }

    public function test_admin_created_activity_appears_on_the_member_dashboard(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/activities', [
            'title' => 'Fajr congregation',
            'activity_type' => ActivityType::Prayer->value,
            'scheduled_date' => today()->toDateString(),
            'start_time' => '05:00',
            'end_time' => '05:30',
            'user_ids' => [$member->id],
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.created_count', 1)
            ->assertJsonPath('data.activity.title', 'Fajr congregation');

        $this->assertDatabaseHas('activities', [
            'user_id' => $member->id,
            'title' => 'Fajr congregation',
        ]);

        Sanctum::actingAs($member);

        $this->getJson('/api/v1/activities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Fajr congregation');
    }

    public function test_admin_created_activity_fans_out_to_every_group_member(): void
    {
        $admin = User::factory()->admin()->create();
        $group = $this->createGroup('Daei');

        $first = User::factory()->create();
        $second = User::factory()->create();
        $group->users()->attach([$first->id, $second->id]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/activities', [
            'title' => 'Group halaqa',
            'activity_type' => ActivityType::Quran->value,
            'scheduled_date' => today()->toDateString(),
            'group_id' => $group->id,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.created_count', 2);

        $this->assertDatabaseHas('activities', ['user_id' => $first->id, 'title' => 'Group halaqa']);
        $this->assertDatabaseHas('activities', ['user_id' => $second->id, 'title' => 'Group halaqa']);
    }

    public function test_admin_activity_creation_requires_a_target(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/activities', [
            'title' => 'No target',
            'scheduled_date' => today()->toDateString(),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['user_ids']);
    }

    public function test_regular_members_cannot_create_admin_activities(): void
    {
        $member = User::factory()->create();

        Sanctum::actingAs($member);

        $this->postJson('/api/v1/admin/activities', [
            'title' => 'Not allowed',
            'scheduled_date' => today()->toDateString(),
            'user_ids' => [$member->id],
        ])->assertForbidden();
    }

    public function test_admin_can_add_already_registered_users_to_a_group(): void
    {
        $admin = User::factory()->admin()->create();
        $group = $this->createGroup('Daei');

        $existing = User::factory()->create();
        $newMember = User::factory()->create();
        $group->users()->attach($existing->id);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/groups/{$group->id}/members", [
            'user_ids' => [$newMember->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.group.members_count', 2);

        $this->assertDatabaseHas('group_user', [
            'group_id' => $group->id,
            'user_id' => $newMember->id,
        ]);

        // Existing members must be preserved (syncWithoutDetaching semantics).
        $this->assertDatabaseHas('group_user', [
            'group_id' => $group->id,
            'user_id' => $existing->id,
        ]);
    }

    public function test_adding_group_members_requires_valid_user_ids(): void
    {
        $admin = User::factory()->admin()->create();
        $group = $this->createGroup('Daei');

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/groups/{$group->id}/members", [
            'user_ids' => [999999],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['user_ids.0']);
    }

    public function test_member_can_upload_a_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/auth/avatar', [
            'avatar' => UploadedFile::fake()->create('avatar.png', 10, 'image/png'),
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Profile picture updated.');

        $path = $user->refresh()->avatar_path;

        $this->assertNotNull($path);
        $this->assertNotNull($response->json('data.user.avatar_url'));
        Storage::disk('public')->assertExists($path);
    }

    public function test_avatar_upload_rejects_non_image_files(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/avatar', [
            'avatar' => UploadedFile::fake()->create('notes.txt', 5, 'text/plain'),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);

        $this->assertNull($user->refresh()->avatar_path);
    }

    public function test_dashboard_progress_aggregates_personal_activities(): void
    {
        $user = User::factory()->create();

        $this->createActivity($user, ActivityType::Prayer, ActivityStatus::Completed);
        $this->createActivity($user, ActivityType::Prayer, ActivityStatus::Pending);
        $this->createActivity($user, ActivityType::Quran, ActivityStatus::Completed);
        $this->createActivity($user, ActivityType::Tafseer, ActivityStatus::Completed);
        $this->createActivity($user, ActivityType::Exercise, ActivityStatus::Pending);
        $this->createActivity($user, ActivityType::Personal, ActivityStatus::Completed);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/dashboard/progress')->assertOk();

        $response->assertJsonPath('data.progress.prayer.completed', 1)
            ->assertJsonPath('data.progress.prayer.total', 2)
            ->assertJsonPath('data.progress.prayer.percentage', 50)
            // Quran card also folds in tafseer and reading activities.
            ->assertJsonPath('data.progress.quran.completed', 2)
            ->assertJsonPath('data.progress.quran.total', 2)
            ->assertJsonPath('data.progress.quran.percentage', 100)
            ->assertJsonPath('data.progress.exercise.total', 1)
            ->assertJsonPath('data.progress.exercise.percentage', 0)
            ->assertJsonPath('data.progress.other.completed', 1)
            ->assertJsonPath('data.progress.other.percentage', 100);
    }

    public function test_dashboard_progress_is_scoped_to_the_authenticated_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->createActivity($other, ActivityType::Prayer, ActivityStatus::Completed);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/dashboard/progress')
            ->assertOk()
            ->assertJsonPath('data.progress.prayer.total', 0)
            ->assertJsonPath('data.progress.prayer.percentage', 0);
    }

    private function createGroup(string $name): Group
    {
        return Group::query()->create([
            'name' => $name,
            'client_created_at' => now(),
            'client_updated_at' => now(),
        ]);
    }

    private function createActivity(User $user, ActivityType $type, ActivityStatus $status): Activity
    {
        return Activity::create([
            'user_id' => $user->id,
            'title' => $type->value.' activity',
            'activity_type' => $type,
            'scheduled_date' => today()->toDateString(),
            'status' => $status,
        ]);
    }
}
