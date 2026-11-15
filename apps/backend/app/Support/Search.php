<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Database-agnostic case-insensitive "LIKE" helpers.
 *
 * PostgreSQL's LIKE operator is case-sensitive, while SQLite's is not for
 * ASCII. Wrapping both sides in LOWER() gives identical behaviour on every
 * supported driver (PostgreSQL, MySQL and SQLite).
 */
final class Search
{
    /**
     * Build a lowercase LIKE pattern with user wildcards escaped.
     */
    public static function likePattern(string $search): string
    {
        $escaped = str_replace(
            ['\\', '%', '_'],
            ['\\\\', '\%', '\_'],
            trim($search),
        );

        return '%'.mb_strtolower($escaped).'%';
    }

    /**
     * Add a single case-insensitive LIKE clause to a query.
     *
     * @param  Builder<*>  $query
     */
    public static function whereInsensitiveLike(
        Builder $query,
        string $column,
        string $pattern,
        string $boolean = 'and',
    ): Builder {
        $wrapped = $query->getQuery()->getGrammar()->wrap($column);

        return $query->whereRaw("LOWER({$wrapped}) LIKE ? ESCAPE '\\'", [$pattern], $boolean);
    }

    /**
     * Match any of the given columns case-insensitively, grouped so the
     * resulting clause can be combined with OR without leaking.
     *
     * @param  Builder<*>  $query
     * @param  list<string>  $columns
     */
    public static function whereAnyInsensitiveLike(Builder $query, array $columns, string $pattern): Builder
    {
        return $query->where(function (Builder $query) use ($columns, $pattern): void {
            foreach (array_values($columns) as $index => $column) {
                self::whereInsensitiveLike($query, $column, $pattern, $index === 0 ? 'and' : 'or');
            }
        });
    }
}
