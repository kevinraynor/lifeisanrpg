# Life Is An RPG

A gamified life-goals tracker that turns personal development into a fantasy RPG adventure. Create a character, activate real-world skills, log hours to earn XP, level up, and watch your attributes grow.

**Domain:** [lifeisanrpg.app](https://lifeisanrpg.app)

## Features

- **Character System** — Create a character with a unique name, class, and gender. 7 core attributes (Strength, Stamina, Dexterity, Intelligence, Wisdom, Creativity, Charisma) derived from your skill levels.
- **100+ Skills** — From Fitness to Programming, Cooking to Creative Writing. Each skill maps to attributes with configurable ratios. Some skills have prerequisites, forming a skill tree.
- **XP & Leveling** — Log hours on skills to earn XP. Square-root curve means early levels come fast (10,000 hours = level 250 max). Satisfying progress bars and level-up animations.
- **8 Character Classes** — Warrior, Scholar, Artisan, Ranger, Diplomat, Sage, Tinkerer, Bard. Each suggests starting skills and provides character art.
- **Admin CMS** — Manage skills (CRUD + Markdown content editor), users, and classes through a built-in admin panel.
- **Extensible** — Database schema includes stubs for friends, guilds, quests, skins, and achievements.

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | PHP 8.2 (no framework, zero dependencies) |
| Database | MariaDB 10.4 / MySQL 8.0+ |
| Frontend | Vanilla ES6 modules, CSS custom properties |

## Local Development Setup

### Prerequisites

- [XAMPP](https://www.apachefriends.org/) with PHP 8.2+ and MariaDB/MySQL
- A text editor

### 1. Configure hosts file

Add to `C:\Windows\System32\drivers\etc\hosts` (requires Administrator):

```
127.0.0.1    liferpg.local
```

### 2. Configure Apache vhost

Append to `C:\xampp\apache\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    DocumentRoot "D:/Projects/LifeIsAnRPG/public"
    ServerName liferpg.local
    <Directory "D:/Projects/LifeIsAnRPG/public">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog "logs/liferpg-error.log"
    CustomLog "logs/liferpg-access.log" common
</VirtualHost>
```

Restart Apache after saving.

### 3. Create the database

Start MySQL in XAMPP, then run:

```bash
mysql -u root < database/schema.sql
mysql -u root liferpg < database/seed_attributes.sql
mysql -u root liferpg < database/seed_classes.sql
mysql -u root liferpg < database/seed_skills.sql
mysql -u root liferpg < database/seed_skill_attributes.sql
```

### 4. Configure local settings

```bash
cp src/config.local.php.example src/config.local.php
```

Edit `src/config.local.php` with your database credentials (defaults to `root` with no password).

### 5. Visit the site

Open [http://liferpg.local](http://liferpg.local) in your browser.

## Project Structure

```
public/          Apache DocumentRoot — static assets + front controller
  index.php      Single entry point (all requests route through here)
  css/           Theme, layout, components, pages, animations
  js/            App bootstrap, SPA router, data store, components, pages
  img/           Class art, skill icons, UI elements
src/             PHP backend (not web-accessible in production)
  config.php     Application config with local override support
  Router.php     Lightweight custom router (~100 lines)
  Middleware.php  Auth, admin, and CSRF middleware
  helpers.php    Utility functions (JSON responses, CSRF, rendering)
  models/        Database, User, Character, Skill, XP, ActivityLog
  routes/        API route handlers (auth, character, skills, explore, social, admin)
  views/         PHP templates (layouts, pages, partials)
database/        SQL schema and seed files
storage/logs/    Application logs (gitignored)
```

## XP Formula

```
xp_earned = hours * xp_multiplier * 100
level     = floor(250 * sqrt(total_xp / 1,000,000))
```

| Level | Hours Required |
|-------|---------------|
| 1     | ~0.2          |
| 10    | 16            |
| 50    | 400           |
| 100   | 1,600         |
| 250   | 10,000        |

Attribute scores are derived (never stored): `sum(skill_level * ratio)` across all active skills.

## Deploying to HostGator

1. Upload `public/` contents to `public_html/`
2. Upload `src/` one level above `public_html/`
3. Create `src/config.local.php` with production DB credentials
4. Import `database/schema.sql` + seed files via phpMyAdmin
5. Enable SSL via cPanel and set `secure: true` in session config
