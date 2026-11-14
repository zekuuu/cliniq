<?php

declare(strict_types=1);

namespace App\Shared\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Optional paging on the long lists (API-Contract.md Q19: visits, incidents, the audit log and the
 * inventory history). Without `page` or `perPage` the whole list comes back, as in the mock; with
 * either, one page and `meta: { page, perPage, total }`. `perPage` defaults to 25, at most 100.
 */
final class Paging
{
    /**
     * @template T
     *
     * @param  Collection<array-key, T>|array<array-key, T>  $rows
     * @return array{0: list<T>, 1: array{page: int, perPage: int, total: int}|null}
     */
    public static function apply(Request $request, Collection|array $rows): array
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1'], 'perPage' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $rows = collect($rows)->values();
        if (! $request->filled('page') && ! $request->filled('perPage')) {
            return [array_values($rows->all()), null];
        }
        $page = $request->filled('page') ? $request->integer('page') : 1;
        $perPage = $request->filled('perPage') ? $request->integer('perPage') : 25;

        return [array_values($rows->forPage($page, $perPage)->all()), ['page' => $page, 'perPage' => $perPage, 'total' => $rows->count()]];
    }

    /**
     * @template T
     *
     * @param  Collection<array-key, T>|array<array-key, T>  $rows
     */
    public static function json(Request $request, Collection|array $rows): JsonResponse
    {
        [$data, $meta] = self::apply($request, $rows);

        return response()->json(['data' => $data] + ($meta === null ? [] : ['meta' => $meta]));
    }
}
