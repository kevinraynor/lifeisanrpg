-- ===================================================================
-- Life Is An RPG - Database Schema
-- MariaDB 10.4+ / MySQL 8.0+
--
-- Regenerated from live DB: 2026-04-25.
-- Migrations are additive from this point — see migrations/README.md.
-- ===================================================================

CREATE DATABASE IF NOT EXISTS liferpg
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE liferpg;

-- -------------------------------------------------------------------
-- ATTRIBUTES (7 core character attributes)
-- -------------------------------------------------------------------
CREATE TABLE attributes (
    id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    slug        VARCHAR(50)  NOT NULL UNIQUE,
    icon        VARCHAR(100) DEFAULT NULL,
    color       VARCHAR(7)   DEFAULT NULL,
    sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    description TEXT DEFAULT NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- CLASSES (8 personality-based archetypes)
-- -------------------------------------------------------------------
CREATE TABLE classes (
    id               TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(50)  NOT NULL UNIQUE,
    slug             VARCHAR(50)  NOT NULL UNIQUE,
    description      TEXT         NOT NULL,
    image_url_male   VARCHAR(255) DEFAULT NULL,
    image_url_female VARCHAR(255) DEFAULT NULL,
    color            VARCHAR(7)   DEFAULT NULL,
    suggested_skills JSON         DEFAULT NULL,
    sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- SKILLS (global catalog)
-- -------------------------------------------------------------------
CREATE TABLE skills (
    id             SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    slug           VARCHAR(100) NOT NULL UNIQUE,
    description    TEXT         DEFAULT NULL,
    icon           VARCHAR(100) DEFAULT NULL,
    max_level      SMALLINT UNSIGNED NOT NULL DEFAULT 250,
    xp_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    category       VARCHAR(50)  DEFAULT NULL,
    is_active      TINYINT(1)  NOT NULL DEFAULT 1,
    sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_skills_category (category),
    INDEX idx_skills_active (is_active)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- SKILL -> ATTRIBUTE MAPPING (many-to-many with ratio)
-- -------------------------------------------------------------------
CREATE TABLE skill_attribute_map (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_id     SMALLINT UNSIGNED NOT NULL,
    attribute_id TINYINT UNSIGNED  NOT NULL,
    ratio        DECIMAL(3,2)      NOT NULL DEFAULT 0.50,

    UNIQUE KEY uq_skill_attr (skill_id, attribute_id),
    FOREIGN KEY (skill_id)     REFERENCES skills(id)     ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- SKILL PREREQUISITES
-- -------------------------------------------------------------------
CREATE TABLE skill_prerequisites (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_id          SMALLINT UNSIGNED NOT NULL,
    required_skill_id SMALLINT UNSIGNED NOT NULL,
    required_level    SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    UNIQUE KEY uq_skill_prereq (skill_id, required_skill_id),
    FOREIGN KEY (skill_id)          REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (required_skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- SKILL EXTENDED CONTENT (CMS-editable)
-- -------------------------------------------------------------------
CREATE TABLE skill_content (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_id        SMALLINT UNSIGNED NOT NULL UNIQUE,
    body_markdown   MEDIUMTEXT DEFAULT NULL,
    celebrities     JSON       DEFAULT NULL,
    resources       JSON       DEFAULT NULL,
    tips            JSON       DEFAULT NULL,
    updated_at      TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- USERS (authentication)
-- -------------------------------------------------------------------
CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_active     TINYINT(1)  NOT NULL DEFAULT 1,
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    last_login    TIMESTAMP   NULL,

    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- CHARACTERS (one per user)
--   Invariant: one row per user (UNIQUE user_id).
--   No DOB column — only age (stored at registration, may be NULL).
-- -------------------------------------------------------------------
CREATE TABLE characters (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL UNIQUE,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    quote       VARCHAR(200) DEFAULT NULL,
    age         TINYINT UNSIGNED NULL,
    gender      ENUM('male', 'female') NOT NULL,
    class_id    TINYINT UNSIGNED NOT NULL,
    skin_id     INT UNSIGNED DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- USER SKILLS (activated skills + progress)
--
--   Invariants:
--     • total_xp is authoritative.
--     • current_level is a denormalized cache of XP::xpToLevel(total_xp).
--       It MUST be updated atomically with total_xp on every write.
--       Use User::recomputeSkillLevel() — never write current_level directly.
-- -------------------------------------------------------------------
CREATE TABLE user_skills (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED      NOT NULL,
    skill_id      SMALLINT UNSIGNED NOT NULL,
    total_xp      INT UNSIGNED      NOT NULL DEFAULT 0,
    current_level SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    activated_at  TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,
    last_logged   TIMESTAMP         NULL,

    UNIQUE KEY uq_user_skill (user_id, skill_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    INDEX idx_user_skills_user (user_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- ACTIVITY LOG (XP source of truth + social feed)
-- -------------------------------------------------------------------
CREATE TABLE activity_log (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED      NOT NULL,
    skill_id     SMALLINT UNSIGNED NOT NULL,
    hours        DECIMAL(6,2)      NOT NULL,
    xp_earned    INT UNSIGNED      NOT NULL,
    level_before SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    level_after  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    note         VARCHAR(255)      DEFAULT NULL,
    logged_at    TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_logged (logged_at),
    INDEX idx_activity_user_time (user_id, logged_at)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- ACTIVITY CHEERS (reactions on log entries)
-- -------------------------------------------------------------------
CREATE TABLE activity_cheers (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activity_id BIGINT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED    NOT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_cheer (activity_id, user_id),
    INDEX idx_cheer_activity (activity_id),
    FOREIGN KEY (activity_id) REFERENCES activity_log(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- FRIENDSHIPS
-- -------------------------------------------------------------------
CREATE TABLE friendships (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    friend_id  INT UNSIGNED NOT NULL,
    status     ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_friendship (user_id, friend_id),
    FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- GUILDS
--
--   Invariants:
--     • total_xp is authoritative.
--     • current_level is a denormalized cache of Guilds::xpToLevel(total_xp).
--       Use Guilds::recomputeLevel() — never write current_level directly.
--   Level curve: maxLevel = 20, maxXP = 250,000, same sqrt formula as skills.
--   Perks: L2 chat, L3 announcement, L5 member cap 15→20, L7 icon, L10 exclusive tallies.
-- -------------------------------------------------------------------
CREATE TABLE guilds (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT         DEFAULT NULL,
    leader_id     INT UNSIGNED NOT NULL,
    icon_url      VARCHAR(255) DEFAULT NULL,
    total_xp      INT UNSIGNED NOT NULL DEFAULT 0,
    current_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    announcement  TEXT         DEFAULT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE guild_members (
    id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guild_id  INT UNSIGNED NOT NULL,
    user_id   INT UNSIGNED NOT NULL,
    role      ENUM('member', 'officer', 'leader') NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_guild_member (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE guild_invitations (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guild_id      INT UNSIGNED NOT NULL,
    invitee_id    INT UNSIGNED NOT NULL,
    inviter_id    INT UNSIGNED NOT NULL,
    status        ENUM('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at  TIMESTAMP NULL,

    UNIQUE KEY uq_guild_invite (guild_id, invitee_id),
    INDEX idx_gi_invitee_status (invitee_id, status),
    FOREIGN KEY (guild_id)   REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tally catalog: admin-managed templates. base_hours_per_member × member count = target.
CREATE TABLE guild_tally_variations (
    id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period                 ENUM('weekly','monthly') NOT NULL DEFAULT 'weekly',
    name                   VARCHAR(150) NOT NULL,
    description            VARCHAR(255) DEFAULT NULL,
    base_hours_per_member  DECIMAL(5,2) NOT NULL,
    bonus_xp               INT UNSIGNED NOT NULL DEFAULT 0,
    min_guild_level        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    sort_order             TINYINT UNSIGNED DEFAULT 0,
    is_active              TINYINT(1) NOT NULL DEFAULT 1,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_gtv_period (period, is_active)
) ENGINE=InnoDB;

-- Active tally per guild per period. UNIQUE prevents duplicate activation.
CREATE TABLE guild_tallies (
    id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guild_id                  INT UNSIGNED NOT NULL,
    guild_tally_variation_id  INT UNSIGNED NOT NULL,
    period                    ENUM('weekly','monthly') NOT NULL,
    period_start              DATE NOT NULL,
    target_hours              DECIMAL(7,2) NOT NULL,
    hours_logged              DECIMAL(8,2) NOT NULL DEFAULT 0,
    status                    ENUM('pending','completed') NOT NULL DEFAULT 'pending',
    xp_awarded                INT UNSIGNED DEFAULT 0,
    activated_by              INT UNSIGNED NOT NULL,
    completed_at              TIMESTAMP NULL,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_gt (guild_id, guild_tally_variation_id, period_start),
    INDEX idx_gt_guild_period (guild_id, period, period_start),
    FOREIGN KEY (guild_id)                 REFERENCES guilds(id)                 ON DELETE CASCADE,
    FOREIGN KEY (guild_tally_variation_id) REFERENCES guild_tally_variations(id) ON DELETE CASCADE,
    FOREIGN KEY (activated_by)             REFERENCES users(id)
) ENGINE=InnoDB;

-- Guild chat (L2 perk). Capped at 50 on initial load, 200 on full fetch.
CREATE TABLE guild_messages (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guild_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_gm_guild_time (guild_id, created_at),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- QUESTS
--
--   quest_variations: admin-managed templates (one per skill × period).
--   user_quests:      a user's activated quest for a specific period window.
--   period_start:     daily = that date; weekly = Monday; monthly = 1st of month.
-- -------------------------------------------------------------------
CREATE TABLE quest_variations (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_id       SMALLINT UNSIGNED NOT NULL,
    period         ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
    name           VARCHAR(150) NOT NULL,
    description    VARCHAR(255) DEFAULT NULL,
    hours          DECIMAL(5,2) NOT NULL,
    sort_order     TINYINT UNSIGNED DEFAULT 0,
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    INDEX idx_qv_skill_period (skill_id, period, is_active)
) ENGINE=InnoDB;

CREATE TABLE user_quests (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED NOT NULL,
    quest_variation_id  INT UNSIGNED NOT NULL,
    period              ENUM('daily','weekly','monthly') NOT NULL,
    period_start        DATE NOT NULL,
    status              ENUM('pending','completed','skipped') NOT NULL DEFAULT 'pending',
    bonus_xp            INT UNSIGNED DEFAULT 0,
    completed_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_quest_period (user_id, quest_variation_id, period_start),
    INDEX idx_uq_user_period (user_id, period, period_start),
    FOREIGN KEY (user_id)            REFERENCES users(id)             ON DELETE CASCADE,
    FOREIGN KEY (quest_variation_id) REFERENCES quest_variations(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- APP SETTINGS (admin-editable key/value pairs)
-- -------------------------------------------------------------------
CREATE TABLE app_settings (
    `key`       VARCHAR(60) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO app_settings (`key`, value) VALUES
    ('quest_bonus_multiplier_daily',   '0.5'),
    ('quest_bonus_multiplier_weekly',  '0.75'),
    ('quest_bonus_multiplier_monthly', '1.0')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- -------------------------------------------------------------------
-- SKINS (future feature — schema stub)
-- -------------------------------------------------------------------
CREATE TABLE skins (
    id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    type      ENUM('border', 'background', 'outfit', 'icon') NOT NULL,
    class_id  TINYINT UNSIGNED DEFAULT NULL,
    asset_url VARCHAR(255) NOT NULL,
    rarity    ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB;

CREATE TABLE user_skins (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    skin_id     INT UNSIGNED NOT NULL,
    equipped    TINYINT(1) NOT NULL DEFAULT 0,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_skin (user_id, skin_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skin_id) REFERENCES skins(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- ACHIEVEMENTS (future feature — schema stub)
-- -------------------------------------------------------------------
CREATE TABLE achievements (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    icon        VARCHAR(100) DEFAULT NULL,
    criteria    JSON DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_achievements (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        INT UNSIGNED NOT NULL,
    achievement_id INT UNSIGNED NOT NULL,
    unlocked_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB;
