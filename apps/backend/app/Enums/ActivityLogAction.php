<?php

namespace App\Enums;

/**
 * Catalogue of auditable actions recorded in the activity log.
 */
enum ActivityLogAction: string
{
    // Authentication & account
    case Login = 'login';
    case Logout = 'logout';
    case Registered = 'registered';
    case ProfileUpdated = 'profile_updated';
    case PasswordUpdated = 'password_updated';
    case PasswordReset = 'password_reset';

    // Member management
    case UserCreated = 'user_created';
    case UserUpdated = 'user_updated';
    case UserActivated = 'user_activated';
    case UserDeactivated = 'user_deactivated';
    case UserSuspended = 'user_suspended';
    case UserReinstated = 'user_reinstated';

    // Group management
    case GroupCreated = 'group_created';
    case GroupUpdated = 'group_updated';
    case GroupMembersAdded = 'group_members_added';

    // Activity management
    case ActivityCreated = 'activity_created';
    case ActivityCompleted = 'activity_completed';

    // Daily reports
    case ReportSubmitted = 'report_submitted';
    case ReportUpdated = 'report_updated';
    case ReportStatusUpdated = 'report_status_updated';
    case ReportCommentAdded = 'report_comment_added';
    case ReportCommentReplied = 'report_comment_replied';

    /**
     * Human readable label for the action.
     */
    public function label(): string
    {
        return match ($this) {
            self::Login => 'Signed in',
            self::Logout => 'Signed out',
            self::Registered => 'Registered account',
            self::ProfileUpdated => 'Updated profile',
            self::PasswordUpdated => 'Changed password',
            self::PasswordReset => 'Reset password',
            self::UserCreated => 'Created member',
            self::UserUpdated => 'Updated member',
            self::UserActivated => 'Activated member',
            self::UserDeactivated => 'Deactivated member',
            self::UserSuspended => 'Suspended member',
            self::UserReinstated => 'Reinstated member',
            self::GroupCreated => 'Created group',
            self::GroupUpdated => 'Updated group',
            self::GroupMembersAdded => 'Added group members',
            self::ActivityCreated => 'Assigned activity',
            self::ActivityCompleted => 'Completed activity',
            self::ReportSubmitted => 'Submitted report',
            self::ReportUpdated => 'Updated report',
            self::ReportStatusUpdated => 'Reviewed report',
            self::ReportCommentAdded => 'Added report feedback',
            self::ReportCommentReplied => 'Replied to report feedback',
        };
    }

    /**
     * Broad grouping used by the admin filters.
     */
    public function category(): string
    {
        return match ($this) {
            self::Login,
            self::Logout,
            self::Registered,
            self::ProfileUpdated,
            self::PasswordUpdated,
            self::PasswordReset => 'auth',
            self::UserCreated,
            self::UserUpdated,
            self::UserActivated,
            self::UserDeactivated,
            self::UserSuspended,
            self::UserReinstated => 'users',
            self::GroupCreated,
            self::GroupUpdated,
            self::GroupMembersAdded => 'groups',
            self::ActivityCreated,
            self::ActivityCompleted => 'activities',
            self::ReportSubmitted,
            self::ReportUpdated,
            self::ReportStatusUpdated,
            self::ReportCommentAdded,
            self::ReportCommentReplied => 'reports',
        };
    }

    /**
     * Every action belonging to a category.
     *
     * @return list<string>
     */
    public static function valuesForCategory(string $category): array
    {
        return array_values(array_map(
            fn (self $action): string => $action->value,
            array_filter(self::cases(), fn (self $action): bool => $action->category() === $category),
        ));
    }
}
