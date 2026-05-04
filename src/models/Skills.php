<?php
/**
 * Skills model — shared column definitions and row helpers.
 *
 * WHY THIS EXISTS
 * ---------------
 * The SELECT column list for skills was copied in 6+ route files. Adding a new
 * display column (e.g. `difficulty`) previously required hunting down every copy.
 * Now there is one source of truth for what "a skill" looks like on the wire.
 *
 * USAGE
 * -----
 *   // Standalone skills query
 *   $db->query('SELECT ' . Skills::COLS . ' FROM skills WHERE is_active = 1')
 *
 *   // JOIN query — alias the columns under table alias 's'
 *   'SELECT us.*, ' . Skills::joinCols('s') . '
 *    FROM user_skills us JOIN skills s ON s.id = us.skill_id ...'
 *
 *   // Decode JSON fields after fetch
 *   $row = $stmt->fetch();
 *   Skills::decodeContent($row);
 */
class Skills
{
    /**
     * Core display columns for a skills table query (no table prefix).
     * Covers every field the JS front-end expects when rendering a skill card.
     */
    const COLS = 'id, name, slug, description, icon, max_level, xp_multiplier, category, sort_order';

    /**
     * Core columns prefixed with a table alias for JOIN queries.
     * Excludes sort_order (rarely needed in JOIN result-sets).
     *
     * @param string $alias  Table alias, default 's'
     */
    public static function joinCols(string $alias = 's'): string
    {
        $cols = ['name', 'slug', 'description', 'icon', 'max_level', 'xp_multiplier', 'category'];
        return implode(', ', array_map(fn($c) => "{$alias}.{$c}", $cols));
    }

    /**
     * Decode the three JSON fields in a skill_content-joined row in-place.
     * Call this after every SELECT that includes skill_content columns.
     */
    public static function decodeContent(array &$row): void
    {
        $row['celebrities'] = json_decode($row['celebrities'] ?? 'null', true);
        $row['resources']   = json_decode($row['resources']   ?? 'null', true);
        $row['tips']        = json_decode($row['tips']        ?? 'null', true);
    }
}
