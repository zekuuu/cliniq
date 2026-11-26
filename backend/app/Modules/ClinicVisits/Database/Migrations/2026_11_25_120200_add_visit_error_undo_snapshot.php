<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE visits ADD COLUMN entered_error_undo_snapshot LONGTEXT NULL AFTER entered_in_error_reason');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE visits DROP COLUMN entered_error_undo_snapshot');
    }
};
