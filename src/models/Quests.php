<?php
class Quests {
    const SLOT_LIMITS = ['daily' => 3, 'weekly' => 2, 'monthly' => 1];

    private static function periodStart(string $period): string {
        return match ($period) {
            'daily'   => date('Y-m-d'),
            'weekly'  => date('Y-m-d', strtotime('monday this week')),
            'monthly' => date('Y-m-01'),
        };
    }

    private static function hoursForSkillSince(int $userId, int $skillId, string $since): float {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT COALESCE(SUM(hours), 0) FROM activity_log
                              WHERE user_id = ? AND skill_id = ? AND logged_at >= ?');
        $stmt->execute([$userId, $skillId, $since]);
        return (float) $stmt->fetchColumn();
    }

    private static function fetchForUser(int $userId): array {
        $db = Database::getInstance();
        $periods = [];
        foreach (['daily', 'weekly', 'monthly'] as $period) {
            $periods[$period] = self::periodStart($period);
        }

        $stmt = $db->prepare("
            SELECT uq.id, uq.period, uq.period_start, uq.status, uq.bonus_xp, uq.completed_at,
                   uq.created_at as activated_at,
                   qv.id as variation_id, qv.name, qv.description, qv.hours,
                   s.id as skill_id, s.name as skill_name, s.slug as skill_slug, s.icon as skill_icon
            FROM user_quests uq
            JOIN quest_variations qv ON qv.id = uq.quest_variation_id
            JOIN skills s ON s.id = qv.skill_id
            WHERE uq.user_id = ?
              AND (
                (uq.period = 'daily'   AND uq.period_start = ?)
             OR (uq.period = 'weekly'  AND uq.period_start = ?)
             OR (uq.period = 'monthly' AND uq.period_start = ?)
              )
            ORDER BY uq.period, uq.created_at
        ");
        $stmt->execute([$userId, $periods['daily'], $periods['weekly'], $periods['monthly']]);
        return $stmt->fetchAll();
    }

    public static function getAllActiveForUser(int $userId): array {
        $all = self::fetchForUser($userId);

        foreach ($all as &$q) {
            $q['hours_in_period'] = self::hoursForSkillSince(
                $userId, (int) $q['skill_id'], $q['activated_at']
            );
            $q['hours'] = (float) $q['hours'];
            $q['bonus_xp'] = (int) $q['bonus_xp'];
        }
        unset($q);

        return [
            'daily'   => array_values(array_filter($all, fn($q) => $q['period'] === 'daily')),
            'weekly'  => array_values(array_filter($all, fn($q) => $q['period'] === 'weekly')),
            'monthly' => array_values(array_filter($all, fn($q) => $q['period'] === 'monthly')),
        ];
    }

    public static function listAvailable(int $userId, string $period, int $limit = 10): array {
        $db = Database::getInstance();
        $start = self::periodStart($period);

        // Variation IDs already activated this period
        $stmt = $db->prepare("
            SELECT quest_variation_id FROM user_quests
            WHERE user_id = ? AND period = ? AND period_start = ?
        ");
        $stmt->execute([$userId, $period, $start]);
        $activatedVarIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Activated skill IDs
        $stmt = $db->prepare('SELECT skill_id FROM user_skills WHERE user_id = ?');
        $stmt->execute([$userId]);
        $activatedIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if (!$activatedIds) return [];

        $activatedPlaceholders = implode(',', array_fill(0, count($activatedIds), '?'));
        $params = [$period, 1];
        $params = array_merge($params, $activatedIds);

        $excludeClause = '';
        if ($activatedVarIds) {
            $excludePlaceholders = implode(',', array_fill(0, count($activatedVarIds), '?'));
            $excludeClause = "AND qv.id NOT IN ($excludePlaceholders)";
            $params = array_merge($params, $activatedVarIds);
        }

        // Inline LIMIT as int — PDO::ATTR_EMULATE_PREPARES=false binds ? as string,
        // which MySQL rejects in LIMIT clauses.
        $limitInt = max(1, (int) $limit);

        $stmt = $db->prepare("
            SELECT qv.id, qv.name, qv.description, qv.hours, qv.skill_id,
                   s.name as skill_name, s.slug as skill_slug, s.icon as skill_icon
            FROM quest_variations qv
            JOIN skills s ON s.id = qv.skill_id
            WHERE qv.period = ? AND qv.is_active = ?
              AND qv.skill_id IN ($activatedPlaceholders)
              $excludeClause
            ORDER BY s.name, qv.sort_order
            LIMIT $limitInt
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['hours'] = (float) $r['hours'];
        }
        return $rows;
    }

    public static function activate(int $userId, int $variationId): array {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT qv.*, s.name AS skill_name
                              FROM quest_variations qv JOIN skills s ON s.id = qv.skill_id
                              WHERE qv.id = ? AND qv.is_active = 1');
        $stmt->execute([$variationId]);
        $qv = $stmt->fetch();
        if (!$qv) json_error('Quest not found', 404);

        $stmt = $db->prepare('SELECT 1 FROM user_skills WHERE user_id = ? AND skill_id = ?');
        $stmt->execute([$userId, $qv['skill_id']]);
        if (!$stmt->fetchColumn()) json_error('Activate this skill first', 400);

        $start = self::periodStart($qv['period']);
        $limit = self::SLOT_LIMITS[$qv['period']];

        $stmt = $db->prepare('SELECT COUNT(*) FROM user_quests
                              WHERE user_id = ? AND period = ? AND period_start = ?');
        $stmt->execute([$userId, $qv['period'], $start]);
        if ((int) $stmt->fetchColumn() >= $limit) {
            json_error("You've reached the {$qv['period']} quest limit ({$limit})", 400);
        }

        try {
            $ins = $db->prepare("INSERT INTO user_quests
                (user_id, quest_variation_id, period, period_start, status)
                VALUES (?, ?, ?, ?, 'pending')");
            $ins->execute([$userId, $variationId, $qv['period'], $start]);
        } catch (PDOException $e) {
            json_error('Quest already active this period', 400);
        }
        return ['success' => true, 'id' => (int) $db->lastInsertId()];
    }

    public static function onLog(int $userId, int $skillId): array {
        $db = Database::getInstance();
        $completed = [];

        foreach (['daily', 'weekly', 'monthly'] as $period) {
            $start = self::periodStart($period);

            $stmt = $db->prepare("
                SELECT uq.id, uq.created_at as activated_at, qv.hours, qv.name, s.xp_multiplier, s.max_level
                FROM user_quests uq
                JOIN quest_variations qv ON qv.id = uq.quest_variation_id
                JOIN skills s            ON s.id = qv.skill_id
                WHERE uq.user_id = ? AND uq.period = ? AND uq.period_start = ?
                  AND uq.status = 'pending' AND qv.skill_id = ?
            ");
            $stmt->execute([$userId, $period, $start, $skillId]);
            $pending = $stmt->fetchAll();
            if (!$pending) continue;

            $mult = max(0.0, Settings::getFloat("quest_bonus_multiplier_{$period}", 0.5));

            foreach ($pending as $q) {
                $hoursSince = self::hoursForSkillSince($userId, $skillId, $q['activated_at']);
                if ($hoursSince + 1e-9 < (float) $q['hours']) continue;

                $bonusXp = (int) floor(XP::hoursToXP((float) $q['hours'], (float) $q['xp_multiplier']) * $mult);

                $db->beginTransaction();
                try {
                    $u = $db->prepare("UPDATE user_quests
                                       SET status = 'completed', bonus_xp = ?, completed_at = NOW()
                                       WHERE id = ? AND status = 'pending'");
                    $u->execute([$bonusXp, $q['id']]);
                    if ($u->rowCount() === 0) { $db->rollBack(); continue; }

                    $sel = $db->prepare('SELECT total_xp FROM user_skills WHERE user_id = ? AND skill_id = ?');
                    $sel->execute([$userId, $skillId]);
                    $newXp  = (int) $sel->fetchColumn() + $bonusXp;
                    $newLvl = XP::xpToLevel($newXp, (int) $q['max_level']);

                    $db->prepare('UPDATE user_skills SET total_xp = ?, current_level = ?
                                  WHERE user_id = ? AND skill_id = ?')
                       ->execute([$newXp, $newLvl, $userId, $skillId]);

                    $db->commit();
                    $completed[] = [
                        'quest_id' => (int) $q['id'],
                        'period'   => $period,
                        'name'     => $q['name'],
                        'bonus_xp' => $bonusXp,
                        'skill_id' => $skillId,
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                }
            }
        }
        return $completed;
    }

    public static function skipPendingForSkill(int $userId, int $skillId): void {
        $db = Database::getInstance();
        $db->prepare("
            UPDATE user_quests SET status = 'skipped'
            WHERE user_id = ? AND status = 'pending'
              AND quest_variation_id IN (SELECT id FROM quest_variations WHERE skill_id = ?)
        ")->execute([$userId, $skillId]);
    }
}
