/**
 * Registration Wizard — 4-step character creation flow.
 *
 * Step 1: Character name + gender
 * Step 2: Select class
 * Step 3: Pick starting skills + enter existing hours
 * Step 4: Email + password
 */
import { post, get, setCsrfToken } from '../api.js';

const data = window.__REGISTER_DATA__;
if (!data) throw new Error('Registration data not loaded');

setCsrfToken(data.csrfToken);

const skills = data.skills;
const classes = data.classes;
const container = document.getElementById('wizard-content');
const stepsEl = document.querySelectorAll('.wizard-step');

// Wizard state
const state = {
    step: 1,
    characterName: '',
    gender: 'male',
    classId: null,
    selectedClass: null,
    selectedSkills: [], // [{skill_id, initial_hours}]
    email: '',
    password: '',
};

// XP calculation (mirrors store.js / XP.php)
function xpToLevel(totalXP, maxLevel = 250) {
    if (totalXP <= 0) return 0;
    if (totalXP >= 1000000) return maxLevel;
    return Math.min(maxLevel, Math.floor(maxLevel * Math.sqrt(totalXP / 1000000)));
}

function hoursToXP(hours, mult = 1.0) {
    return Math.floor(hours * mult * 100);
}

// --- Step navigation ---

function goToStep(step) {
    state.step = step;
    stepsEl.forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('active', s === step);
        el.classList.toggle('completed', s < step);
    });
    renderStep(step);
}

function renderStep(step) {
    switch (step) {
        case 1: renderStep1(); break;
        case 2: renderStep2(); break;
        case 3: renderStep3(); break;
        case 4: renderStep4(); break;
    }
}

// --- Step 1: Name + Gender ---

function renderStep1() {
    container.innerHTML = `
        <div class="wizard-panel fade-in">
            <h2>Create Your Identity</h2>
            <p class="wizard-desc">Choose a name for your character. This is how others will know you.</p>

            <div class="form-group">
                <label class="form-label" for="char-name">Character Name</label>
                <input class="form-input" type="text" id="char-name" placeholder="Enter a unique name (3-50 chars)"
                       value="${escapeHtml(state.characterName)}" maxlength="50" autofocus>
                <div class="form-hint" id="name-status"></div>
            </div>

            <div class="form-group">
                <label class="form-label">Gender</label>
                <div class="gender-toggle">
                    <button type="button" class="gender-btn ${state.gender === 'male' ? 'active' : ''}" data-gender="male">
                        Male
                    </button>
                    <button type="button" class="gender-btn ${state.gender === 'female' ? 'active' : ''}" data-gender="female">
                        Female
                    </button>
                </div>
            </div>

            <div class="wizard-actions">
                <div></div>
                <button class="btn-fantasy btn-primary" id="step1-next" disabled>Next: Choose Class</button>
            </div>
        </div>
    `;

    const nameInput = document.getElementById('char-name');
    const nameStatus = document.getElementById('name-status');
    const nextBtn = document.getElementById('step1-next');
    let nameTimer = null;

    // Name validation with debounced uniqueness check
    nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim();
        state.characterName = name;
        clearTimeout(nameTimer);

        if (name.length < 3) {
            nameStatus.textContent = name.length > 0 ? 'Name must be at least 3 characters' : '';
            nameStatus.className = 'form-hint error';
            nextBtn.disabled = true;
            return;
        }

        if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
            nameStatus.textContent = 'Only letters, numbers, spaces, hyphens, and underscores';
            nameStatus.className = 'form-hint error';
            nextBtn.disabled = true;
            return;
        }

        nameStatus.textContent = 'Checking availability...';
        nameStatus.className = 'form-hint';

        nameTimer = setTimeout(async () => {
            try {
                const result = await get(`/api/auth/check-name?name=${encodeURIComponent(name)}`);
                if (result.available) {
                    nameStatus.textContent = 'Name is available!';
                    nameStatus.className = 'form-hint success';
                    nextBtn.disabled = false;
                } else {
                    nameStatus.textContent = result.reason || 'Name is already taken';
                    nameStatus.className = 'form-hint error';
                    nextBtn.disabled = true;
                }
            } catch {
                nameStatus.textContent = 'Could not check name';
                nameStatus.className = 'form-hint error';
            }
        }, 400);
    });

    // If name was already entered (going back), validate it
    if (state.characterName.length >= 3) {
        nameInput.dispatchEvent(new Event('input'));
    }

    // Gender toggle
    container.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.gender = btn.dataset.gender;
            container.querySelectorAll('.gender-btn').forEach(b => b.classList.toggle('active', b === btn));
        });
    });

    nextBtn.addEventListener('click', () => goToStep(2));
}

// --- Step 2: Select Class ---

function renderStep2() {
    const classCards = classes.map(c => {
        const imgUrl = state.gender === 'female' ? c.image_url_female : c.image_url_male;
        const isSelected = state.classId === c.id;
        return `
            <div class="class-card ${isSelected ? 'selected' : ''}" data-class-id="${c.id}">
                <div class="class-card__body">
                    <h3 class="class-card__name" style="color: ${c.color}">${escapeHtml(c.name)}</h3>
                    <p class="class-card__desc">${escapeHtml(c.description).substring(0, 120)}...</p>
                </div>
                <div class="class-card__img" style="border-color: ${c.color}">
                    ${imgUrl
                        ? `<img src="${imgUrl}" alt="${escapeHtml(c.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="class-card__icon" style="color: ${c.color}; display:none">&#9876;</span>`
                        : `<span class="class-card__icon" style="color: ${c.color}">&#9876;</span>`}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="wizard-panel fade-in">
            <h2>Choose Your Class</h2>
            <p class="wizard-desc">Your class suggests which skills to start with and defines your character's art. This can always be changed later.</p>

            <div class="class-grid">${classCards}</div>

            <div class="wizard-actions">
                <button class="btn-fantasy btn-secondary" id="step2-back">Back</button>
                <button class="btn-fantasy btn-primary" id="step2-next" ${state.classId ? '' : 'disabled'}>Next: Pick Skills</button>
            </div>
        </div>
    `;

    container.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => {
            const classId = parseInt(card.dataset.classId);
            state.classId = classId;
            state.selectedClass = classes.find(c => c.id === classId);
            container.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            document.getElementById('step2-next').disabled = false;
        });
    });

    document.getElementById('step2-back').addEventListener('click', () => goToStep(1));
    document.getElementById('step2-next').addEventListener('click', () => goToStep(3));
}

// --- Step 3: Starting Skills ---

function renderStep3() {
    // Get suggested skill IDs from selected class
    let suggestedIds = [];
    if (state.selectedClass?.suggested_skills) {
        try {
            suggestedIds = typeof state.selectedClass.suggested_skills === 'string'
                ? JSON.parse(state.selectedClass.suggested_skills)
                : state.selectedClass.suggested_skills;
        } catch { suggestedIds = []; }
    }

    // Pre-select suggested skills if user hasn't made choices yet
    if (state.selectedSkills.length === 0) {
        suggestedIds.forEach(id => {
            if (!state.selectedSkills.find(s => s.skill_id === id)) {
                state.selectedSkills.push({ skill_id: id, initial_hours: 0 });
            }
        });
    }

    // Group skills by category
    const categories = ['physical', 'mental', 'creative', 'technical', 'practical', 'knowledge', 'social'];
    const categoryLabels = {
        physical: 'Physical', mental: 'Mental', creative: 'Creative',
        technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social',
    };

    let skillsHTML = '';
    for (const cat of categories) {
        const catSkills = skills.filter(s => s.category === cat);
        skillsHTML += `<div class="skill-category">
            <h3 class="skill-category__title">${categoryLabels[cat]}</h3>
            <div class="skill-checklist">`;

        for (const skill of catSkills) {
            const isSelected = state.selectedSkills.some(s => s.skill_id === skill.id);
            const existing = state.selectedSkills.find(s => s.skill_id === skill.id);
            const hours = existing?.initial_hours || 0;
            const xp = hoursToXP(hours, parseFloat(skill.xp_multiplier));
            const level = xpToLevel(xp, parseInt(skill.max_level));
            const isSuggested = suggestedIds.includes(skill.id);

            skillsHTML += `
                <div class="skill-check-row ${isSelected ? 'checked' : ''} ${isSuggested ? 'suggested' : ''}" data-skill-id="${skill.id}">
                    <label class="skill-check-label">
                        <input type="checkbox" class="skill-checkbox" data-skill-id="${skill.id}" ${isSelected ? 'checked' : ''}>
                        <span class="skill-check-name">${escapeHtml(skill.name)}</span>
                        ${isSuggested ? '<span class="badge-suggested">Suggested</span>' : ''}
                    </label>
                    <div class="skill-hours-input ${isSelected ? '' : 'hidden'}">
                        <input type="number" class="form-input form-input--small hours-input" data-skill-id="${skill.id}"
                               min="0" max="10000" step="1" value="${hours}" placeholder="Hours">
                        <span class="skill-level-preview">Lv. ${level}</span>
                    </div>
                </div>`;
        }
        skillsHTML += `</div></div>`;
    }

    const selectedCount = state.selectedSkills.length;

    container.innerHTML = `
        <div class="wizard-panel fade-in">
            <h2>Pick Your Starting Skills</h2>
            <p class="wizard-desc">Select at least 5 skills you want to develop. For each, optionally enter how many hours you've already spent on it.</p>
            <p class="wizard-count">Selected: <strong id="skill-count">${selectedCount}</strong> / 5 minimum</p>

            <div class="skills-selection">${skillsHTML}</div>

            <div class="wizard-actions">
                <button class="btn-fantasy btn-secondary" id="step3-back">Back</button>
                <button class="btn-fantasy btn-primary" id="step3-next" ${selectedCount >= 5 ? '' : 'disabled'}>Next: Create Account</button>
            </div>
        </div>
    `;

    const countEl = document.getElementById('skill-count');
    const nextBtn = document.getElementById('step3-next');

    function updateCount() {
        const count = state.selectedSkills.length;
        countEl.textContent = count;
        nextBtn.disabled = count < 5;
    }

    // Checkbox handlers
    container.querySelectorAll('.skill-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const skillId = parseInt(cb.dataset.skillId);
            const row = cb.closest('.skill-check-row');
            const hoursDiv = row.querySelector('.skill-hours-input');

            if (cb.checked) {
                row.classList.add('checked');
                hoursDiv.classList.remove('hidden');
                if (!state.selectedSkills.find(s => s.skill_id === skillId)) {
                    state.selectedSkills.push({ skill_id: skillId, initial_hours: 0 });
                }
            } else {
                row.classList.remove('checked');
                hoursDiv.classList.add('hidden');
                state.selectedSkills = state.selectedSkills.filter(s => s.skill_id !== skillId);
            }
            updateCount();
        });
    });

    // Hours input handlers
    container.querySelectorAll('.hours-input').forEach(input => {
        input.addEventListener('input', () => {
            const skillId = parseInt(input.dataset.skillId);
            const hours = Math.max(0, Math.min(10000, parseFloat(input.value) || 0));
            const skill = skills.find(s => s.id === skillId);
            const xp = hoursToXP(hours, parseFloat(skill?.xp_multiplier || 1));
            const level = xpToLevel(xp, parseInt(skill?.max_level || 250));

            const preview = input.closest('.skill-hours-input').querySelector('.skill-level-preview');
            preview.textContent = `Lv. ${level}`;

            const existing = state.selectedSkills.find(s => s.skill_id === skillId);
            if (existing) existing.initial_hours = hours;
        });
    });

    document.getElementById('step3-back').addEventListener('click', () => goToStep(2));
    document.getElementById('step3-next').addEventListener('click', () => goToStep(4));
}

// --- Step 4: Account Details ---

function renderStep4() {
    container.innerHTML = `
        <div class="wizard-panel fade-in">
            <h2>Create Your Account</h2>
            <p class="wizard-desc">Almost there! Enter your email and set a password to save your character.</p>

            <div class="wizard-summary card-ornate">
                <h3>Character Summary</h3>
                <p><strong>Name:</strong> ${escapeHtml(state.characterName)}</p>
                <p><strong>Gender:</strong> ${state.gender.charAt(0).toUpperCase() + state.gender.slice(1)}</p>
                <p><strong>Class:</strong> ${escapeHtml(state.selectedClass?.name || 'None')}</p>
                <p><strong>Skills:</strong> ${state.selectedSkills.length} selected</p>
            </div>

            <div class="form-group">
                <label class="form-label" for="reg-email">Email</label>
                <input class="form-input" type="email" id="reg-email" placeholder="adventurer@example.com"
                       value="${escapeHtml(state.email)}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reg-password">Password</label>
                <input class="form-input" type="password" id="reg-password" placeholder="At least 8 characters"
                       minlength="8" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reg-password2">Confirm Password</label>
                <input class="form-input" type="password" id="reg-password2" placeholder="Confirm your password" required>
            </div>

            <div class="form-error" id="reg-error"></div>

            <div class="wizard-actions">
                <button class="btn-fantasy btn-secondary" id="step4-back">Back</button>
                <button class="btn-fantasy btn-primary btn-large" id="step4-submit">Begin Your Adventure</button>
            </div>
        </div>
    `;

    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-password');
    const pass2Input = document.getElementById('reg-password2');
    const errorEl = document.getElementById('reg-error');
    const submitBtn = document.getElementById('step4-submit');

    document.getElementById('step4-back').addEventListener('click', () => goToStep(3));

    submitBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        const email = emailInput.value.trim();
        const password = passInput.value;
        const password2 = pass2Input.value;

        if (!email) { errorEl.textContent = 'Email is required'; return; }
        if (password.length < 8) { errorEl.textContent = 'Password must be at least 8 characters'; return; }
        if (password !== password2) { errorEl.textContent = 'Passwords do not match'; return; }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating character...';

        try {
            const result = await post('/api/auth/register', {
                character_name: state.characterName,
                gender: state.gender,
                class_id: state.classId,
                starting_skills: state.selectedSkills.map(s => ({
                    skill_id: s.skill_id,
                    initial_hours: s.initial_hours,
                })),
                email,
                password,
            });

            if (result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Registration failed. Please try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Begin Your Adventure';
        }
    });
}

// --- Utility ---

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Initialize ---
goToStep(1);
