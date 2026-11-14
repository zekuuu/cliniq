<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/*
 * The symptom lists and first-aid steps that ship with the product, copied from mock-db.json
 * (frontendOnly.visitComplaintTypes and incidentComplaintTypes). Product data like the defaults
 * before it, so a plain `migrate` gives working Visit and Incident forms; the nurse edits them later.
 */
return new class extends Migration
{
    private const VISIT = [
        'Headache' => ['Check temperature', 'Ask about hydration and meals', 'Allow supervised rest'],
        'Stomachache' => [],
        'Fever' => ['Check temperature', 'Ask about onset of symptoms', 'Notify parent if fever persists'],
        'Cough and colds' => [],
        'Dizziness' => [],
        'Minor wound' => ['Clean wound', 'Apply dressing', 'Record location and cause'],
        'Menstrual cramps' => [],
        'Toothache' => [],
        'Sprain' => [],
        'Allergic reaction' => [],
        'Fainting' => ['Check responsiveness', 'Record pulse and breathing', 'Keep student lying down'],
        'Chills' => [],
    ];

    private const INCIDENT = ['Fainting', 'Fall injury', 'Asthma attack', 'Severe allergic reaction', 'Head bump during PE'];

    public function up(): void
    {
        $order = 0;
        foreach (self::VISIT as $label => $steps) {
            $id = DB::table('complaint_types')->insertGetId([
                'label' => $label, 'used_in_visits' => 1, 'used_in_incidents' => in_array($label, self::INCIDENT, true) ? 1 : 0, 'sort_order' => $order++,
            ]);
            foreach ($steps as $i => $step) {
                DB::table('triage_steps')->insert(['complaint_type_id' => $id, 'step_text' => $step, 'sort_order' => $i]);
            }
        }
        foreach (array_diff(self::INCIDENT, array_keys(self::VISIT)) as $label) {
            DB::table('complaint_types')->insert(['label' => $label, 'used_in_visits' => 0, 'used_in_incidents' => 1, 'sort_order' => $order++]);
        }
    }

    public function down(): void
    {
        $labels = array_merge(array_keys(self::VISIT), self::INCIDENT);
        $ids = DB::table('complaint_types')->whereIn('label', $labels)->pluck('id');
        DB::table('triage_steps')->whereIn('complaint_type_id', $ids)->delete();
        DB::table('complaint_types')->whereIn('id', $ids)->delete();
    }
};
