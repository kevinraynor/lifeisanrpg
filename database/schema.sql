-- ===================================================================
-- Life Is An RPG - Database Schema
-- MariaDB 10.4+ / MySQL 8.0+
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
-- -------------------------------------------------------------------
CREATE TABLE characters (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL UNIQUE,
    name        VARCHAR(50)  NOT NULL UNIQUE,
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

-- ===================================================================
-- FUTURE STUB TABLES (schema only, no application logic yet)
-- ===================================================================

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
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- GUILDS
-- -------------------------------------------------------------------
CREATE TABLE guilds (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    leader_id   INT UNSIGNED NOT NULL,
    icon_url    VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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

-- -------------------------------------------------------------------
-- QUESTS
-- -------------------------------------------------------------------
CREATE TABLE quests (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    description  TEXT DEFAULT NULL,
    quest_type   ENUM('daily', 'weekly', 'milestone', 'custom') NOT NULL DEFAULT 'custom',
    requirements JSON DEFAULT NULL,
    xp_reward    INT UNSIGNED DEFAULT 0,
    icon         VARCHAR(100) DEFAULT NULL,
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_quests (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    quest_id     INT UNSIGNED NOT NULL,
    status       ENUM('active', 'completed', 'abandoned') NOT NULL DEFAULT 'active',
    progress     JSON DEFAULT NULL,
    started_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    UNIQUE KEY uq_user_quest (user_id, quest_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- SKINS
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
-- ACHIEVEMENTS
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
