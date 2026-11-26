<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE calendar_events ADD COLUMN deleted_at DATETIME NULL AFTER updated_at');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE calendar_events DROP COLUMN deleted_at');
    }
};
