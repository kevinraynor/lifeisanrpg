<?php

class XP
{
    /**
     * Calculate XP earned from hours logged.
     */
    public static function hoursToXP(float $hours, float $xpMultiplier = 1.0): int
    {
        global $config;
        return (int) floor($hours * $xpMultiplier * $config['xp']['base_per_hour']);
    }

    /**
     * Calculate level from total XP.
     * Formula: level = floor(250 * sqrt(total_xp / 1,000,000))
     */
    public static function xpToLevel(int $totalXP, int $maxLevel = 250): int
    {
        global $config;
        $maxXP = $config['xp']['max_xp'];
        $capLevel = min($maxLevel, $config['xp']['max_level']);

        if ($totalXP <= 0) return 0;
        if ($totalXP >= $maxXP) return $capLevel;

        return min($capLevel, (int) floor($capLevel * sqrt($totalXP / $maxXP)));
    }

    /**
     * Calculate XP needed for a specific level.
     */
    public static function xpForLevel(int $level, int $maxLevel = 250): int
    {
        global $config;
        $maxXP = $config['xp']['max_xp'];
        $capLevel = min($maxLevel, $config['xp']['max_level']);

        if ($level <= 0) return 0;
        if ($level >= $capLevel) return $maxXP;

        return (int) ceil($maxXP * pow($level / $capLevel, 2));
    }

    /**
     * Calculate progress percentage towards next level.
     */
    public static function levelProgress(int $totalXP, int $maxLevel = 250): float
    {
        $currentLevel = self::xpToLevel($totalXP, $maxLevel);

        if ($currentLevel >= $maxLevel) return 100.0;

        $xpForCurrent = self::xpForLevel($currentLevel, $maxLevel);
        $xpForNext = self::xpForLevel($currentLevel + 1, $maxLevel);
        $xpInLevel = $xpForNext - $xpForCurrent;

        if ($xpInLevel <= 0) return 100.0;

        return min(100.0, (($totalXP - $xpForCurrent) / $xpInLevel) * 100);
    }

    /**
     * Convert initial hours to XP and level (for registration).
     */
    public static function initialHoursToProgress(float $hours, float $xpMultiplier = 1.0, int $maxLevel = 250): array
    {
        $xp = self::hoursToXP($hours, $xpMultiplier);
        $level = self::xpToLevel($xp, $maxLevel);
        $progress = self::levelProgress($xp, $maxLevel);

        return [
            'total_xp'      => $xp,
            'current_level'  => $level,
            'progress'       => round($progress, 1),
        ];
    }
}
