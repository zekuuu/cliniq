<?php

declare(strict_types=1);

namespace App\Modules\InventoryTracker\Controllers;

use App\Modules\InventoryTracker\Services\InventoryService;
use App\Modules\UserManagement\Controllers\AuthController;
use App\Shared\Http\Paging;
use App\Shared\Support\Row;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Inventory (API-Contract Module 8). Every endpoint is Staff only. */
final class InventoryController
{
    private const ITEM_KEYS = ['name', 'category', 'unit', 'lowStockThreshold', 'brand', 'avoidIfAllergicTo', 'usedFor', 'currentStock', 'expirationDate', 'noExpirationConfirmed'];

    public function __construct(private readonly InventoryService $inventory) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => ['nullable', 'string', 'max:120'], 'category' => ['nullable', 'in:medicine,supply'], 'hasExpiredStock' => ['nullable', 'in:0,1,true,false'], 'attention' => ['nullable', 'in:low_stock,expiry']]);

        return response()->json(['data' => $this->inventory->list(
            trim($request->string('search')->value()), $request->string('category')->value(), $request->boolean('hasExpiredStock'), $request->string('attention')->value(),
        )]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(self::itemRules());

        return response()->json(['data' => $this->inventory->save(self::input($request, self::ITEM_KEYS), null, AuthController::user($request)->id)], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->inventory->find($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate(self::itemRules());

        return response()->json(['data' => $this->inventory->save(self::input($request, self::ITEM_KEYS), $id, AuthController::user($request)->id)]);
    }

    public function history(Request $request, int $id): JsonResponse
    {
        return Paging::json($request, $this->inventory->history($id));
    }

    public function movements(Request $request): JsonResponse
    {
        $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d'], 'itemId' => ['nullable', 'integer'], 'type' => ['nullable', 'in:opening,dispense,restock,adjustment']]);

        return Paging::json($request, $this->inventory->movements(
            $request->filled('from') ? $request->string('from')->value() : null, $request->filled('to') ? $request->string('to')->value() : null,
            $request->filled('itemId') ? $request->integer('itemId') : null, $request->string('type')->value(),
        ));
    }

    public function dispense(Request $request, int $id): JsonResponse
    {
        $request->validate(['quantity' => ['required'], 'studentId' => ['nullable'], 'personnelId' => ['nullable'], 'visitId' => ['nullable']]);
        $quantity = $request->input('quantity');

        return response()->json(['data' => $this->inventory->dispense($id, is_int($quantity) ? $quantity : 0, [
            'studentId' => Row::toInt($request->input('studentId')), 'personnelId' => Row::toInt($request->input('personnelId')), 'visitId' => Row::toInt($request->input('visitId')),
        ], AuthController::user($request)->id)]);
    }

    public function restock(Request $request, int $id): JsonResponse
    {
        $request->validate(['quantity' => ['required'], 'expirationDate' => ['nullable', 'string', 'max:10'], 'noExpirationConfirmed' => ['nullable', 'boolean']]);

        return response()->json(['data' => $this->inventory->restock($id, self::input($request, ['quantity', 'expirationDate', 'noExpirationConfirmed']), AuthController::user($request)->id)]);
    }

    public function adjust(Request $request, int $id): JsonResponse
    {
        $request->validate(['batchId' => ['nullable'], 'change' => ['nullable'], 'countedQuantity' => ['nullable'], 'reason' => ['nullable', 'string'], 'note' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $this->inventory->adjust($id, self::input($request, ['batchId', 'change', 'countedQuantity', 'reason', 'note']), AuthController::user($request)->id)]);
    }

    /** @return array<string, list<string>> */
    private static function itemRules(): array
    {
        return [
            'name' => ['present', 'nullable', 'string', 'max:500'], 'category' => ['present', 'nullable', 'string'], 'unit' => ['present', 'nullable', 'string', 'max:500'],
            'lowStockThreshold' => ['nullable'], 'brand' => ['nullable', 'string'], 'avoidIfAllergicTo' => ['nullable', 'array', 'max:50'], 'usedFor' => ['nullable', 'array', 'max:100'],
            'currentStock' => ['nullable'], 'expirationDate' => ['nullable', 'string', 'max:10'], 'noExpirationConfirmed' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, mixed> the sent keys only, so an omitted `usedFor` keeps the tags
     */
    private static function input(Request $request, array $keys): array
    {
        $out = [];
        foreach ($keys as $key) {
            if ($request->exists($key)) {
                $out[$key] = $request->input($key);
            }
        }

        return $out;
    }
}
