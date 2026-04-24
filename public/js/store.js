/**
 * Client-side data store.
 * Holds pre-loaded data and provides computed helpers.
 */

const Store = {
    user: null,
    character: null,
    userSkills: [],
    attributeScores: {},
    allSkills: [],
    allClasses: [],
    allAttributes: [],
    skillAttrMap: [],
    skillPrereqs: [],
    csrfToken: '',
    pendingFriendCount: 0,
    friends: [],             // populated lazily when friends page or explore loads
    quests:           { daily: [], weekly: [], monthly: [] },
    questMultipliers: { daily: 0.5, weekly: 0.75, monthly: 1.0 },
    questSlotLimits:  { daily: 3, weekly: 2, monthly: 1 },
    guild:                   null,
    guildInvitations:        [],
    pendingGuildInviteCount: 0,

    /**
     * Initialize from inline JSON data.
     */
    init(data) {
        if (!data) return;
        this.user = data.user || null;
        this.character = data.character || null;
        this.userSkills = data.userSkills || [];
        this.attributeScores = data.attributeScores || {};
        this.allSkills = data.allSkills || [];
        this.allClasses = data.allClasses || [];
        this.allAttributes = data.allAttributes || [];
        this.skillAttrMap = data.skillAttrMap || [];
        this.skillPrereqs = data.skillPrereqs || [];
        this.csrfToken = data.csrfToken || '';
        this.pendingFriendCount = data.pendingFriendCount || 0;
        this.friends = [];
        this.quests           = data.quests           || this.quests;
        this.questMultipliers = data.questMultipliers || this.questMultipliers;
        this.questSlotLimits  = data.questSlotLimits  || this.questSlotLimits;
        this.guild                   = data.guild                   || null;
        this.guildInvitations        = data.guildInvitations        || [];
        this.pendingGuildInviteCount = data.pendingGuildInviteCount || 0;
    },

    // --- Lookups ---

    getSkillById(id) {
        return this.allSkills.find(s => s.id == id);
    },

    getClassById(id) {
        return this.allClasses.find(c => c.id == id);
    },

    getAttributeById(id) {
        return this.allAttributes.find(a => a.id == id);
    },

    getUserSkill(skillId) {
        return this.userSkills.find(us => us.skill_id == skillId);
    },

    // --- Skill filters ---

    getSkillsByCategory(category) {
        return this.allSkills.filter(s => s.category === category);
    },

    getActiveUserSkills() {
        return this.userSkills;
    },

    getTopSkills(n = 5) {
        return [...this.userSkills]
            .sort((a, b) => b.current_level - a.current_level)
            .slice(0, n);
    },

    getRecentSkills(n = 10) {
        return [...this.userSkills]
            .sort((a, b) => {
                const aTime = a.last_logged ? new Date(a.last_logged) : new Date(0);
                const bTime = b.last_logged ? new Date(b.last_logged) : new Date(0);
                return bTime - aTime;
            })
            .slice(0, n);
    },

    // --- Skill prerequisites ---

    getPrerequisites(skillId) {
        return this.skillPrereqs
            .filter(p => p.skill_id == skillId)
            .map(p => ({
                ...p,
                skill: this.getSkillById(p.required_skill_id),
            }));
    },

    getSkillAttributeRatios(skillId) {
        return this.skillAttrMap
            .filter(m => m.skill_id == skillId)
            .map(m => ({
                ...m,
                attribute: this.getAttributeById(m.attribute_id),
            }));
    },

    canActivateSkill(skillId) {
        const prereqs = this.getPrerequisites(skillId);
        for (const p of prereqs) {
            const userSkill = this.getUserSkill(p.required_skill_id);
            if (!userSkill || userSkill.current_level < p.required_level) {
                return { can: false, missing: p };
            }
        }
        return { can: true };
    },

    isSkillActivated(skillId) {
        return this.userSkills.some(us => us.skill_id == skillId);
    },

    getAvailableSkills() {
        return this.allSkills.filter(s => {
            if (this.isSkillActivated(s.id)) return false;
            return this.canActivateSkill(s.id).can;
        });
    },

    // --- XP Calculations (mirrors PHP XP.php) ---

    xpToLevel(totalXP, maxLevel = 250) {
        const maxXP = 1000000;
        if (totalXP <= 0) return 0;
        if (totalXP >= maxXP) return maxLevel;
        return Math.min(maxLevel, Math.floor(maxLevel * Math.sqrt(totalXP / maxXP)));
    },

    xpForLevel(level, maxLevel = 250) {
        const maxXP = 1000000;
        if (level <= 0) return 0;
        if (level >= maxLevel) return maxXP;
        return Math.ceil(maxXP * Math.pow(level / maxLevel, 2));
    },

    hoursToXP(hours, xpMultiplier = 1.0) {
        return Math.floor(hours * xpMultiplier * 100);
    },

    levelProgress(totalXP, maxLevel = 250) {
        const currentLevel = this.xpToLevel(totalXP, maxLevel);
        if (currentLevel >= maxLevel) return 100;
        const xpCurrent = this.xpForLevel(currentLevel, maxLevel);
        const xpNext = this.xpForLevel(currentLevel + 1, maxLevel);
        const xpInLevel = xpNext - xpCurrent;
        if (xpInLevel <= 0) return 100;
        return Math.min(100, ((totalXP - xpCurrent) / xpInLevel) * 100);
    },

    // --- Attribute derivation ---

    computeAttributeScores() {
        const scores = {};
        for (const attr of this.allAttributes) {
            scores[attr.id] = 0;
        }
        for (const us of this.userSkills) {
            for (const map of this.skillAttrMap) {
                if (map.skill_id == us.skill_id) {
                    scores[map.attribute_id] += us.current_level * parseFloat(map.ratio);
                }
            }
        }
        for (const id in scores) {
            scores[id] = Math.round(scores[id]);
        }
        this.attributeScores = scores;
        return scores;
    },

    // --- Mutation helpers ---

    updateUserSkill(skillId, updates) {
        const idx = this.userSkills.findIndex(us => us.skill_id == skillId);
        if (idx >= 0) {
            Object.assign(this.userSkills[idx], updates);
        }
        this.computeAttributeScores();
    },

    addUserSkill(skillData) {
        this.userSkills.push(skillData);
        this.computeAttributeScores();
    },

    removeUserSkill(skillId) {
        this.userSkills = this.userSkills.filter(us => us.skill_id != skillId);
        this.computeAttributeScores();
    },

    setPendingFriendCount(n) {
        this.pendingFriendCount = Math.max(0, n);
    },

    setQuests(quests) {
        this.quests = quests || this.quests;
    },

    setGuild(guild) {
        this.guild = guild || null;
    },

    setGuildInvitations(invites) {
        this.guildInvitations = Array.isArray(invites) ? invites : [];
        this.pendingGuildInviteCount = this.guildInvitations.length;
    },

    setPendingGuildInviteCount(n) {
        this.pendingGuildInviteCount = Math.max(0, n);
    },
};

export default Store;
