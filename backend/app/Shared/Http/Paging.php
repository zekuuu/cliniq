<?php

declare(strict_types=1);

namespace App\Shared\Http;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Paged lists (API-Contract.md "Filtering and pagination", ADR-082). `page` (from 1) and `perPage`
 * (default 25, at most 100) give one page and `meta: { page, perPage, total, lastPage }`; a page past
 * the end is an empty `data` with the same meta, not an error. `sort` is a column key, `-` in front
 * for descending.
 *
 * `sql()` pages in the database (LIMIT/OFFSET and one COUNT): the lists that grow with history.
 * `apply()` pages a list already in memory; without `page` or `perPage` it returns the whole list,
 * which the printouts and exports read on purpose (Q19).
 */
final class Paging
{
    public const MAX_PER_PAGE = 100;

    /** @return array{page: int, perPage: int} */
    public static function window(Request $request): array
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1'], 'perPage' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE]]);

        return [
            'page' => $request->filled('page') ? $request->integer('page') : 1,
            'perPage' => $request->filled('perPage') ? $request->integer('perPage') : 25,
        ];
    }

    /** True when the request asks for one page (`page` or `perPage`). */
    public static function wanted(Request $request): bool
    {
        return $request->filled('page') || $request->filled('perPage');
    }

    /**
     * The requested sort: one of `$keys` (or the default), and its direction.
     *
     * @param  list<string>  $keys
     * @return array{0: string, 1: 'asc'|'desc'}
     */
    public static function sort(Request $request, array $keys, string $default): array
    {
        $value = $request->filled('sort') ? $request->string('sort')->value() : $default;
        $key = ltrim($value, '-');
        if (! in_array($key, $keys, true)) {
            $value = $default;
            $key = ltrim($value, '-');
        }

        return [$key, str_starts_with($value, '-') ? 'desc' : 'asc'];
    }

    /** @return array{page: int, perPage: int, total: int, lastPage: int} */
    public static function meta(int $page, int $perPage, int $total): array
    {
        return ['page' => $page, 'perPage' => $perPage, 'total' => $total, 'lastPage' => max(1, (int) ceil($total / $perPage))];
    }

    /**
     * One page read in SQL: a COUNT of the filtered query, then LIMIT/OFFSET. The query carries its
     * own ORDER BY, ending on a unique column so pages never repeat or skip a row.
     *
     * @template T
     *
     * @param  callable(\stdClass): T  $map
     * @return array{0: list<T>, 1: array{page: int, perPage: int, total: int, lastPage: int}}
     */
    public static function sql(Request $request, Builder $query, callable $map): array
    {
        [$rows, $meta] = self::sqlRows($request, $query);

        return [array_values($rows->map(fn (\stdClass $r): mixed => $map($r))->all()), $meta];
    }

    /**
     * The page's raw rows, for a caller that loads something for the whole page at once.
     *
     * @return array{0: Collection<int, \stdClass>, 1: array{page: int, perPage: int, total: int, lastPage: int}}
     */
    public static function sqlRows(Request $request, Builder $query): array
    {
        ['page' => $page, 'perPage' => $perPage] = self::window($request);
        $total = (clone $query)->reorder()->count();
        /** @var Collection<int, \stdClass> $rows */
        $rows = $total > ($page - 1) * $perPage ? $query->forPage($page, $perPage)->get() : collect();

        return [$rows, self::meta($page, $perPage, $total)];
    }

    /**
     * @template T
     *
     * @param  Collection<array-key, T>|array<array-key, T>  $rows
     * @return array{0: list<T>, 1: array{page: int, perPage: int, total: int, lastPage: int}|null}
     */
    public static function apply(Request $request, Collection|array $rows): array
    {
        $rows = collect($rows)->values();
        if (! self::wanted($request)) {
            self::window($request);

            return [array_values($rows->all()), null];
        }
        ['page' => $page, 'perPage' => $perPage] = self::window($request);

        return [array_values($rows->forPage($page, $perPage)->all()), self::meta($page, $perPage, $rows->count())];
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
