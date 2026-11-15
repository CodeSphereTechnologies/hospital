<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Reconcile stale daily report score snapshots.
     *
     * Reports written before the immutable snapshot columns
     * (`calculated_score`, `scheduled_count`, `completed_count`) existed only
     * stored their values in the legacy columns (`score`,
     * `completed_activities_count`, `total_activities_count`). Those rows kept a
     * zeroed snapshot, which made the report detail pages disagree with the
     * activity list they render. Copy the legacy values across for any row whose
     * snapshot is still empty but whose legacy counts show scheduled work.
     */
    public function up(): void
    {
        DB::table('daily_reports')
            ->where('scheduled_count', 0)
            ->where('total_activities_count', '>', 0)
            ->update([
                'calculated_score' => DB::raw('COALESCE(score, 0)'),
                'scheduled_count' => DB::raw('COALESCE(total_activities_count, 0)'),
                'completed_count' => DB::raw('COALESCE(completed_activities_count, 0)'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // The reconciliation only repairs derived data and is not reversible.
    }
};
