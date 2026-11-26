<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Arrival is descriptive: out-of-order times warn in the form and remain recordable.
        DB::statement('ALTER TABLE incidents ADD COLUMN arrived_at_clinic_at DATETIME NULL AFTER occurred_at');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE incidents DROP COLUMN arrived_at_clinic_at');
    }
};
