<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'activity_type' => ['sometimes', Rule::enum(ActivityType::class)],
            'scheduled_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'status' => ['sometimes', Rule::enum(ActivityStatus::class)],
            'reminder_enabled' => ['sometimes', 'boolean'],
            // Target either explicit members or every member of a group.
            'user_ids' => ['required_without:group_id', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'group_id' => ['required_without:user_ids', 'integer', 'exists:groups,id'],
        ];
    }
}
