USE liferpg;

INSERT INTO skills (id, name, slug, description, icon, max_level, xp_multiplier, category, is_active, sort_order) VALUES
-- =============================================
-- Physical (IDs 1-20)
-- =============================================
(1,  'Fitness',            'fitness',            'General physical conditioning and overall body health.',                            'fitness.svg',            250, 1.00, 'physical', 1, 1),
(2,  'Running',            'running',            'Cardiovascular endurance built through consistent running practice.',               'running.svg',            250, 1.00, 'physical', 1, 2),
(3,  'Swimming',           'swimming',           'Aquatic movement, endurance, and water safety techniques.',                         'swimming.svg',           250, 1.00, 'physical', 1, 3),
(4,  'Cycling',            'cycling',            'Two-wheeled endurance, exploration, and efficient transportation.',                 'cycling.svg',            250, 1.00, 'physical', 1, 4),
(5,  'Weightlifting',      'weightlifting',      'Building raw strength through progressive resistance training with weights.',       'weightlifting.svg',      250, 1.00, 'physical', 1, 5),
(6,  'Yoga',               'yoga',               'Mind-body connection cultivated through poses, breathwork, and meditation.',         'yoga.svg',               250, 1.00, 'physical', 1, 6),
(7,  'Martial Arts',       'martial-arts',       'Combat disciplines encompassing self-defense, focus, and physical mastery.',         'martial-arts.svg',       250, 1.00, 'physical', 1, 7),
(8,  'Dance',              'dance',              'Rhythmic movement, coordination, and artistic body expression.',                    'dance.svg',              250, 1.00, 'physical', 1, 8),
(9,  'Rock Climbing',      'rock-climbing',      'Scaling vertical surfaces using strength, technique, and problem-solving.',          'rock-climbing.svg',      250, 1.00, 'physical', 1, 9),
(10, 'Hiking',             'hiking',             'Long-distance walking through nature, building endurance and wilderness awareness.', 'hiking.svg',             250, 1.00, 'physical', 1, 10),
(11, 'Gymnastics',         'gymnastics',         'Acrobatic feats requiring exceptional strength, flexibility, and control.',          'gymnastics.svg',         250, 1.00, 'physical', 1, 11),
(12, 'Boxing',             'boxing',             'Striking combat sport that builds conditioning, reflexes, and mental toughness.',    'boxing.svg',             250, 1.00, 'physical', 1, 12),
(13, 'Surfing',            'surfing',            'Wave riding that demands balance, ocean awareness, and timing.',                    'surfing.svg',            150, 1.20, 'physical', 1, 13),
(14, 'Skiing',             'skiing',             'Snow sports combining speed, mountain navigation, and precise edge control.',        'skiing.svg',             150, 1.20, 'physical', 1, 14),
(15, 'Tennis',             'tennis',             'Racquet sport requiring agility, strategy, and quick reflexes.',                    'tennis.svg',             250, 1.00, 'physical', 1, 15),
(16, 'Basketball',         'basketball',         'Team court sport involving shooting, passing, and fast-paced decision-making.',      'basketball.svg',         250, 1.00, 'physical', 1, 16),
(17, 'Soccer',             'soccer',             'The world''s game, demanding precise footwork, stamina, and teamwork.',              'soccer.svg',             250, 1.00, 'physical', 1, 17),
(18, 'Stretching',         'stretching',         'Dedicated flexibility and mobility training to prevent injury and improve range.',   'stretching.svg',         100, 0.80, 'physical', 1, 18),
(19, 'Calisthenics',       'calisthenics',       'Bodyweight strength training using movements like push-ups, pull-ups, and dips.',    'calisthenics.svg',       250, 1.00, 'physical', 1, 19),
(20, 'Parkour',            'parkour',            'Urban movement art focused on navigating obstacles with speed and efficiency.',      'parkour.svg',            250, 1.10, 'physical', 1, 20),

-- =============================================
-- Mental (IDs 21-40)
-- =============================================
(21, 'Mathematics',        'mathematics',        'Numbers, patterns, and quantitative reasoning across all branches of math.',         'mathematics.svg',        250, 1.00, 'mental', 1, 21),
(22, 'Reading',            'reading',            'Comprehension and absorption of written knowledge from books and articles.',         'reading.svg',            250, 1.00, 'mental', 1, 22),
(23, 'Writing',            'writing',            'Expressing ideas clearly and persuasively through the written word.',                'writing.svg',            250, 1.00, 'mental', 1, 23),
(24, 'Critical Thinking',  'critical-thinking',  'Analyzing arguments, evaluating evidence, and forming well-reasoned judgments.',      'critical-thinking.svg',  250, 1.00, 'mental', 1, 24),
(25, 'Memory Training',    'memory-training',    'Techniques and exercises for improving recall, retention, and mental agility.',       'memory-training.svg',    150, 1.00, 'mental', 1, 25),
(26, 'Chess',              'chess',              'Strategic board game demanding deep tactical thinking and long-term planning.',       'chess.svg',              250, 1.00, 'mental', 1, 26),
(27, 'Logic Puzzles',      'logic-puzzles',      'Pattern recognition and deductive reasoning through structured challenges.',         'logic-puzzles.svg',      150, 1.00, 'mental', 1, 27),
(28, 'Philosophy',         'philosophy',         'Examining fundamental questions about existence, knowledge, and ethics.',            'philosophy.svg',         250, 1.00, 'mental', 1, 28),
(29, 'Speed Reading',      'speed-reading',      'Rapid text processing techniques while maintaining strong comprehension.',           'speed-reading.svg',      150, 0.90, 'mental', 1, 29),
(30, 'Debate',             'debate',             'Structured argumentation, persuasive reasoning, and defending positions under pressure.', 'debate.svg',         250, 1.00, 'mental', 1, 30),
(31, 'Research',           'research',           'Systematic investigation, information gathering, and source evaluation.',            'research.svg',           250, 1.00, 'mental', 1, 31),
(32, 'Statistics',         'statistics',         'Data analysis, probabilistic thinking, and drawing conclusions from numbers.',        'statistics.svg',         250, 1.00, 'mental', 1, 32),
(33, 'Problem Solving',    'problem-solving',    'Methodical approaches to identifying, analyzing, and overcoming challenges.',        'problem-solving.svg',    250, 1.00, 'mental', 1, 33),
(34, 'Focus & Meditation', 'focus-meditation',   'Training sustained attention, mental clarity, and inner calm.',                      'focus-meditation.svg',   250, 1.00, 'mental', 1, 34),
(35, 'Study Techniques',   'study-techniques',   'Methods for efficient learning, note-taking, and long-term knowledge retention.',    'study-techniques.svg',   100, 0.80, 'mental', 1, 35),
(36, 'Mental Math',        'mental-math',        'Performing quick calculations in your head without aids or tools.',                  'mental-math.svg',        150, 0.90, 'mental', 1, 36),
(37, 'Decision Making',    'decision-making',    'Frameworks and mental models for making better, more confident choices.',            'decision-making.svg',    250, 1.00, 'mental', 1, 37),
(38, 'Systems Thinking',   'systems-thinking',   'Understanding complex interconnected systems and their emergent behaviors.',         'systems-thinking.svg',   250, 1.00, 'mental', 1, 38),
(39, 'Lateral Thinking',   'lateral-thinking',   'Creative problem-solving by approaching challenges from unexpected angles.',         'lateral-thinking.svg',   150, 1.00, 'mental', 1, 39),
(40, 'Abstract Reasoning', 'abstract-reasoning', 'Working with patterns, symbols, and non-concrete concepts to draw conclusions.',     'abstract-reasoning.svg', 150, 1.00, 'mental', 1, 40),

-- =============================================
-- Creative (IDs 41-55)
-- =============================================
(41, 'Drawing',            'drawing',            'Visual art created through pencil, pen, charcoal, and other dry media.',             'drawing.svg',            250, 1.00, 'creative', 1, 41),
(42, 'Painting',           'painting',           'Expressive art using color and composition on canvas, paper, or other surfaces.',    'painting.svg',           250, 1.00, 'creative', 1, 42),
(43, 'Music Instrument',   'music-instrument',   'Playing any musical instrument, from guitar and piano to violin and drums.',         'music-instrument.svg',   250, 1.00, 'creative', 1, 43),
(44, 'Singing',            'singing',            'Vocal performance encompassing pitch control, tone, and musical expression.',        'singing.svg',            250, 1.00, 'creative', 1, 44),
(45, 'Photography',        'photography',        'Capturing compelling moments through lens selection, light, and composition.',       'photography.svg',        250, 1.00, 'creative', 1, 45),
(46, 'Graphic Design',     'graphic-design',     'Visual communication through digital layout, typography, and brand identity.',       'graphic-design.svg',     250, 1.00, 'creative', 1, 46),
(47, 'Creative Writing',   'creative-writing',   'Crafting fiction, poetry, and narrative storytelling that captivates readers.',       'creative-writing.svg',   250, 1.00, 'creative', 1, 47),
(48, 'Sculpting',          'sculpting',          'Creating three-dimensional art from clay, stone, metal, or other materials.',        'sculpting.svg',          250, 1.10, 'creative', 1, 48),
(49, 'Digital Art',        'digital-art',        'Creating visual art with digital tools, tablets, and specialized software.',         'digital-art.svg',        250, 1.00, 'creative', 1, 49),
(50, 'Film Making',        'film-making',        'Visual storytelling through motion picture, editing, and cinematic technique.',      'film-making.svg',        250, 1.20, 'creative', 1, 50),
(51, 'Animation',          'animation',          'Bringing drawings and models to life through frame-by-frame motion.',               'animation.svg',          250, 1.20, 'creative', 1, 51),
(52, 'Poetry',             'poetry',             'Condensed emotional expression and imagery crafted through verse and rhythm.',       'poetry.svg',             200, 1.00, 'creative', 1, 52),
(53, 'Calligraphy',        'calligraphy',        'The art of beautiful, decorative handwriting using specialized tools.',              'calligraphy.svg',        150, 1.00, 'creative', 1, 53),
(54, 'Origami',            'origami',            'Transforming flat paper into intricate three-dimensional geometric designs.',        'origami.svg',            100, 0.80, 'creative', 1, 54),
(55, 'Knitting & Crochet', 'knitting-crochet',   'Creating textiles, garments, and art with yarn, needles, and hooks.',               'knitting-crochet.svg',   150, 1.00, 'creative', 1, 55),

-- =============================================
-- Technical (IDs 56-70)
-- =============================================
(56, 'Programming',        'programming',        'Writing code to solve problems, automate tasks, and build software systems.',        'programming.svg',        250, 1.00, 'technical', 1, 56),
(57, 'Web Development',    'web-development',    'Building websites and web applications using HTML, CSS, JavaScript, and more.',      'web-development.svg',    250, 1.00, 'technical', 1, 57),
(58, 'Data Science',       'data-science',       'Extracting meaningful insights from data through analysis and visualization.',       'data-science.svg',       250, 1.00, 'technical', 1, 58),
(59, 'Cybersecurity',      'cybersecurity',      'Protecting systems, networks, and data from digital threats and attacks.',           'cybersecurity.svg',      250, 1.00, 'technical', 1, 59),
(60, 'Networking',         'networking',         'Designing, implementing, and managing computer networks and infrastructure.',        'networking.svg',         250, 1.00, 'technical', 1, 60),
(61, 'Electronics',        'electronics',        'Working with circuits, components, and electronic systems from design to assembly.',  'electronics.svg',        250, 1.00, 'technical', 1, 61),
(62, '3D Printing',        '3d-printing',        'Additive manufacturing and digital fabrication to bring designs into reality.',      '3d-printing.svg',        150, 1.10, 'technical', 1, 62),
(63, 'CAD Design',         'cad-design',         'Computer-aided design for engineering, architecture, and product development.',      'cad-design.svg',         250, 1.00, 'technical', 1, 63),
(64, 'Game Development',   'game-development',   'Creating interactive digital entertainment from concept to playable product.',       'game-development.svg',   250, 1.10, 'technical', 1, 64),
(65, 'Mobile Development', 'mobile-development', 'Building applications for smartphones and tablets across iOS and Android.',          'mobile-development.svg', 250, 1.00, 'technical', 1, 65),
(66, 'Database Management','database-management', 'Organizing, querying, and optimizing structured data storage systems.',             'database-management.svg',250, 1.00, 'technical', 1, 66),
(67, 'DevOps',             'devops',             'Automating infrastructure, continuous integration, and deployment pipelines.',       'devops.svg',             250, 1.00, 'technical', 1, 67),
(68, 'Machine Learning',   'machine-learning',   'Teaching computers to learn from data and make intelligent predictions.',            'machine-learning.svg',   250, 1.20, 'technical', 1, 68),
(69, 'Robotics',           'robotics',           'Building and programming autonomous machines that interact with the physical world.','robotics.svg',           250, 1.20, 'technical', 1, 69),
(70, 'System Administration','system-administration','Managing servers, operating systems, and IT infrastructure for reliability.',    'system-administration.svg',250, 1.00, 'technical', 1, 70),

-- =============================================
-- Practical (IDs 71-85)
-- =============================================
(71, 'Cooking',            'cooking',            'Preparing delicious food with skill, creativity, and nutritional awareness.',        'cooking.svg',            250, 1.00, 'practical', 1, 71),
(72, 'Gardening',          'gardening',          'Growing plants, herbs, and vegetables through patient cultivation and care.',        'gardening.svg',          250, 1.00, 'practical', 1, 72),
(73, 'DIY & Home Repair',  'diy-home-repair',    'Fixing, maintaining, and improving your living space with practical know-how.',      'diy-home-repair.svg',    250, 1.00, 'practical', 1, 73),
(74, 'Woodworking',        'woodworking',        'Crafting functional and decorative items from wood using hand and power tools.',     'woodworking.svg',        250, 1.00, 'practical', 1, 74),
(75, 'Financial Management','financial-management','Budgeting, saving, investing, and managing personal finances wisely.',             'financial-management.svg',250, 1.00, 'practical', 1, 75),
(76, 'First Aid',          'first-aid',          'Emergency medical response, basic care, and life-saving techniques.',               'first-aid.svg',          100, 0.80, 'practical', 1, 76),
(77, 'Driving',            'driving',            'Operating vehicles safely, skillfully, and with defensive awareness.',              'driving.svg',            100, 0.70, 'practical', 1, 77),
(78, 'Sewing',             'sewing',             'Creating and repairing garments, textiles, and fabric-based items.',                'sewing.svg',             250, 1.00, 'practical', 1, 78),
(79, 'Cleaning & Organization','cleaning-organization','Maintaining order, cleanliness, and efficient systems in your environment.',   'cleaning-organization.svg',100, 0.70, 'practical', 1, 79),
(80, 'Time Management',    'time-management',    'Prioritizing tasks, managing schedules, and making the most of every day.',         'time-management.svg',    150, 0.80, 'practical', 1, 80),
(81, 'Nutrition',          'nutrition',          'Understanding food science, macronutrients, and dietary planning for health.',       'nutrition.svg',          150, 1.00, 'practical', 1, 81),
(82, 'Home Brewing',       'home-brewing',       'Crafting beer, wine, mead, and other fermented beverages at home.',                 'home-brewing.svg',       150, 1.10, 'practical', 1, 82),
(83, 'Leatherworking',     'leatherworking',     'Crafting durable and beautiful items from leather using traditional techniques.',    'leatherworking.svg',     150, 1.10, 'practical', 1, 83),
(84, 'Metalworking',       'metalworking',       'Shaping and joining metals through forging, welding, and fabrication.',             'metalworking.svg',       250, 1.10, 'practical', 1, 84),
(85, 'Plumbing',           'plumbing',           'Water system installation, maintenance, and repair for residential needs.',         'plumbing.svg',           150, 1.00, 'practical', 1, 85),

-- =============================================
-- Knowledge (IDs 86-90)
-- =============================================
(86, 'History',            'history',            'Understanding past civilizations, events, and the forces that shaped our world.',     'history.svg',            250, 1.00, 'knowledge', 1, 86),
(87, 'Language Learning',  'language-learning',  'Acquiring fluency in foreign languages through study and immersive practice.',       'language-learning.svg',  250, 1.00, 'knowledge', 1, 87),
(88, 'Geography',          'geography',          'Understanding places, environments, and spatial relationships across the globe.',    'geography.svg',          150, 1.00, 'knowledge', 1, 88),
(89, 'Science Literacy',   'science-literacy',   'Understanding scientific methods, principles, and how the natural world works.',     'science-literacy.svg',   250, 1.00, 'knowledge', 1, 89),
(90, 'Cultural Studies',   'cultural-studies',   'Appreciating diverse customs, arts, traditions, and worldviews.',                   'cultural-studies.svg',   200, 1.00, 'knowledge', 1, 90),

-- =============================================
-- Social (IDs 91-100)
-- =============================================
(91, 'Public Speaking',    'public-speaking',    'Commanding attention and delivering impactful presentations with confidence.',       'public-speaking.svg',    250, 1.00, 'social', 1, 91),
(92, 'Leadership',         'leadership',         'Guiding teams, inspiring action, and making tough decisions under pressure.',        'leadership.svg',         250, 1.00, 'social', 1, 92),
(93, 'Negotiation',        'negotiation',        'Finding mutually beneficial agreements through persuasion and compromise.',          'negotiation.svg',        250, 1.00, 'social', 1, 93),
(94, 'Social Networking',  'social-networking',  'Building and maintaining meaningful professional and personal relationships.',       'social-networking.svg',  250, 1.00, 'social', 1, 94),
(95, 'Teaching',           'teaching',           'Transferring knowledge effectively and inspiring a love of learning in others.',     'teaching.svg',           250, 1.00, 'social', 1, 95),
(96, 'Mentoring',          'mentoring',          'Guiding others through personal and professional growth with wisdom and patience.',  'mentoring.svg',          200, 1.00, 'social', 1, 96),
(97, 'Conflict Resolution','conflict-resolution','Mediating disputes and finding peaceful, constructive solutions for all parties.',   'conflict-resolution.svg',150, 1.00, 'social', 1, 97),
(98, 'Active Listening',   'active-listening',   'Fully engaging with, understanding, and responding thoughtfully to others.',         'active-listening.svg',   250, 1.00, 'social', 1, 98),
(99, 'Storytelling',       'storytelling',       'Captivating audiences with compelling narratives and vivid imagery.',               'storytelling.svg',       250, 1.00, 'social', 1, 99),
(100,'Team Building',      'team-building',      'Creating cohesion, trust, and effective collaboration within groups.',               'team-building.svg',      150, 1.00, 'social', 1, 100);
