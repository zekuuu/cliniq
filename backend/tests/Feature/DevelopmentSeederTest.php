<?php

declare(strict_types=1);

use App\Shared\Database\DevelopmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('loads the mock seed through the services, with stock and the Staff No. sequence as in the mock', function () {
    $mock = json_decode((string) file_get_contents(base_path('../frontend/src/lib/mock-db/mock-db.json')), true);
    $this->seed(DevelopmentSeeder::class);

    expect(DB::table('users')->count())->toBe(count($mock['users']))
        ->and(DB::table('students')->count())->toBe(count($mock['students']))
        ->and(DB::table('personnel')->count())->toBe(count($mock['personnel']))
        ->and(DB::table('visits')->count())->toBe(count($mock['visits']))
        ->and(DB::table('incidents')->count())->toBe(count($mock['incidents']))
        ->and(DB::table('incidents')->where('stage', 2)->count())->toBe(collect($mock['incidents'])->where('stage', 2)->count())
        ->and(DB::table('follow_ups')->count())->toBe(count($mock['followUps']))
        ->and(DB::table('calendar_events')->count())->toBe(count($mock['frontendOnly']['calendarEvents']))
        ->and(DB::table('personnel')->orderBy('id')->pluck('staff_number')->all())->toBe(array_column($mock['personnel'], 'staffNumber'))
        ->and((int) DB::table('number_sequences')->where('sequence_name', 'staff_number')->value('last_value'))->toBe(count($mock['personnel']));

    foreach ($mock['inventoryItems'] as $item) {
        $stock = (int) DB::table('inventory_batches as b')->join('inventory_items as i', 'i.id', '=', 'b.item_id')->where('i.name', $item['name'])->sum('b.quantity');
        expect($stock)->toBe($item['currentStock']);
    }
    expect(fn () => $this->seed(DevelopmentSeeder::class))->toThrow(RuntimeException::class, 'The database already has data.');
});
