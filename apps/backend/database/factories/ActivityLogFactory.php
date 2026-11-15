<?php

namespace Database\Factories;

use App\Enums\ActivityLogAction;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'user_id' => User::factory(),
            'action' => ActivityLogAction::Login->value,
            'description' => fake()->sentence(),
            'subject_type' => null,
            'subject_id' => null,
            'properties' => null,
            'ip_address' => fake()->ipv4(),
            'user_agent' => 'Mozilla/5.0 (Test)',
            'source' => 'app',
        ];
    }
}
