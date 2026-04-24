<?php
class Settings {
    private static $cache = null;

    private static function load(): void {
        if (self::$cache !== null) return;
        $db = Database::getInstance();
        $rows = $db->query('SELECT `key`, value FROM app_settings')->fetchAll();
        self::$cache = [];
        foreach ($rows as $r) self::$cache[$r['key']] = $r['value'];
    }

    public static function get(string $key, $default = null) {
        self::load();
        return self::$cache[$key] ?? $default;
    }

    public static function getFloat(string $key, float $default = 0.0): float {
        $v = self::get($key, null);
        return $v === null ? $default : (float) $v;
    }

    public static function set(string $key, $value): void {
        $db = Database::getInstance();
        $stmt = $db->prepare('INSERT INTO app_settings (`key`, value) VALUES (?, ?)
                              ON DUPLICATE KEY UPDATE value = VALUES(value)');
        $stmt->execute([$key, (string) $value]);
        if (self::$cache !== null) self::$cache[$key] = (string) $value;
    }

    public static function all(): array {
        self::load();
        return self::$cache;
    }
}
