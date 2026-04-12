USE liferpg;

-- suggested_skills JSON arrays reference skill IDs from seed_skills.sql
-- These will be updated after skills are seeded if IDs differ

INSERT INTO classes (name, slug, description, image_url_male, image_url_female, color, suggested_skills, sort_order) VALUES
(
    'Warrior',
    'warrior',
    'Those who forge their path through physical discipline and endurance. Warriors thrive on challenge, pushing their bodies to the limit. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/warrior-male.png',
    '/img/classes/warrior-female.png',
    '#8B0000',
    '[1, 2, 3, 5, 6, 8, 12]',
    1
),
(
    'Scholar',
    'scholar',
    'Seekers of knowledge who sharpen the mind above all else. Scholars are driven by curiosity and the pursuit of understanding. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/scholar-male.png',
    '/img/classes/scholar-female.png',
    '#1B3A6B',
    '[21, 22, 23, 24, 28, 30, 36]',
    2
),
(
    'Artisan',
    'artisan',
    'Creators and craftspeople who shape the world with their hands. Artisans find meaning in making things beautiful and functional. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/artisan-male.png',
    '/img/classes/artisan-female.png',
    '#8B6914',
    '[41, 42, 45, 48, 84, 85, 55]',
    3
),
(
    'Ranger',
    'ranger',
    'Explorers who thrive in nature and value self-reliance. Rangers are at home in the wild and seek adventure beyond four walls. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/ranger-male.png',
    '/img/classes/ranger-female.png',
    '#2D5A27',
    '[1, 3, 10, 11, 82, 9, 14]',
    4
),
(
    'Diplomat',
    'diplomat',
    'Masters of connection who build bridges between people. Diplomats navigate social landscapes with grace and purpose. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/diplomat-male.png',
    '/img/classes/diplomat-female.png',
    '#6B3A8A',
    '[91, 92, 93, 94, 95, 99, 100]',
    5
),
(
    'Sage',
    'sage',
    'Contemplative minds who seek wisdom and inner growth. Sages value reflection, balance, and the deeper meaning behind everyday life. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/sage-male.png',
    '/img/classes/sage-female.png',
    '#4A6B82',
    '[28, 34, 7, 23, 38, 96, 97]',
    6
),
(
    'Tinkerer',
    'tinkerer',
    'Problem-solvers who love systems, code, and mechanisms. Tinkerers are driven to understand how things work and make them work better. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/tinkerer-male.png',
    '/img/classes/tinkerer-female.png',
    '#5A5A5A',
    '[56, 57, 58, 61, 63, 66, 67]',
    7
),
(
    'Bard',
    'bard',
    'Storytellers and entertainers who inspire through expression. Bards use words, music, and performance to move hearts and minds. Your class defines your starting skills and character art — it can always be changed later.',
    '/img/classes/bard-male.png',
    '/img/classes/bard-female.png',
    '#8B4585',
    '[43, 44, 47, 53, 91, 99, 8]',
    8
);
