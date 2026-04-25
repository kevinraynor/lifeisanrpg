/**
 * Registration Wizard — 4-step character creation flow.
 *
 * Step 1: Character name + gender
 * Step 2: Select class
 * Step 3: Pick starting skills + enter existing hours
 * Step 4: Email + password
 */
import { post, get, setCsrfToken } from '../api.js';
import { openSkillExperienceModal } from '../components/skill-experience-modal.js';
import { escapeHtml } from '../utils/html.js';

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
    age: null,
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
                <label class="form-label" for="char-age">Age</label>
                <input class="form-input" type="number" id="char-age" min="13" max="120" step="1"
                       placeholder="Your real-world age" value="${state.age ?? ''}">
                <div class="form-hint" id="age-status">We use this to sanity-check your experience estimates.</div>
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
    const ageInput = document.getElementById('char-age');
    const ageStatus = document.getElementById('age-status');
    const nextBtn = document.getElementById('step1-next');
    let nameTimer = null;
    let nameOk = false;

    function ageOk() {
        const a = parseInt(ageInput.value, 10);
        return !isNaN(a) && a >= 13 && a <= 120;
    }
    function refreshNext() {
        nextBtn.disabled = !(nameOk && ageOk());
    }
    ageInput.addEventListener('input', () => {
        const a = parseInt(ageInput.value, 10);
        if (isNaN(a)) {
            state.age = null;
            ageStatus.textContent = 'Enter your age (13-120).';
            ageStatus.className = 'form-hint';
        } else if (a < 13 || a > 120) {
            state.age = null;
            ageStatus.textContent = 'Age must be between 13 and 120.';
            ageStatus.className = 'form-hint error';
        } else {
            state.age = a;
            ageStatus.textContent = 'Thanks! This helps keep skill estimates realistic.';
            ageStatus.className = 'form-hint success';
        }
        refreshNext();
    });

    // Name validation with debounced uniqueness check
    nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim();
        state.characterName = name;
        clearTimeout(nameTimer);

        if (name.length < 3) {
            nameStatus.textContent = name.length > 0 ? 'Name must be at least 3 characters' : '';
            nameStatus.className = 'form-hint error';
            nameOk = false; refreshNext();
            return;
        }

        if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
            nameStatus.textContent = 'Only letters, numbers, spaces, hyphens, and underscores';
            nameStatus.className = 'form-hint error';
            nameOk = false; refreshNext();
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
                    nameOk = true; refreshNext();
                } else {
                    nameStatus.textContent = result.reason || 'Name is already taken';
                    nameStatus.className = 'form-hint error';
                    nameOk = false; refreshNext();
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
    if (state.age != null) {
        ageInput.dispatchEvent(new Event('input'));
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

    const categories = ['physical', 'mental', 'creative', 'technical', 'practical', 'knowledge', 'social'];
    const categoryLabels = {
        physical: 'Physical', mental: 'Mental', creative: 'Creative',
        technical: 'Technical', practical: 'Practical', knowledge: 'Knowledge', social: 'Social',
    };

    // Build category HTML — all start collapsed
    let skillsHTML = '';
    for (const cat of categories) {
        const catSkills = skills.filter(s => s.category === cat);
        if (catSkills.length === 0) continue;

        const hasSuggested = catSkills.some(s => suggestedIds.includes(s.id));
        const selectedInCat = catSkills.filter(s => state.selectedSkills.some(sel => sel.skill_id === s.id)).length;

        let rowsHTML = '';
        for (const skill of catSkills) {
            const isSelected = state.selectedSkills.some(s => s.skill_id === skill.id);
            const existing = state.selectedSkills.find(s => s.skill_id === skill.id);
            const hasHours = (existing?.initial_hours || 0) > 0;
            const isSuggested = suggestedIds.includes(skill.id);

            rowsHTML += `
                <div class="skill-check-row ${isSelected ? 'checked' : ''} ${isSuggested ? 'suggested' : ''}" data-skill-id="${skill.id}" data-skill-name="${escapeHtml(skill.name.toLowerCase())}">
                    <label class="skill-check-label">
                        <input type="checkbox" class="skill-checkbox" data-skill-id="${skill.id}" ${isSelected ? 'checked' : ''}>
                        <span class="skill-check-name">${escapeHtml(skill.name)}</span>
                        ${isSuggested ? '<span class="badge-suggested">Suggested</span>' : ''}
                    </label>
                    <div class="skill-hours-input ${isSelected ? '' : 'hidden'}">
                        <span class="skill-xp-status" data-xp-for="${skill.id}">${hasHours ? '&#10022; Chronicles sealed' : ''}</span>
                        <button type="button" class="btn-fantasy btn-secondary btn-small btn-select-xp" data-skill-id="${skill.id}">
                            ${hasHours ? 'Edit experience' : 'Select experience'}
                        </button>
                    </div>
                </div>`;
        }

        skillsHTML += `
            <div class="skill-category" data-cat="${cat}">
                <div class="skill-category__header" role="button" tabindex="0" aria-expanded="false">
                    <div class="skill-category__title-row">
                        <h3 class="skill-category__title">${categoryLabels[cat]}
                            ${hasSuggested ? '<span class="cat-suggested-tag">&#10022; Suggested</span>' : ''}
                        </h3>
                        <span class="cat-sel-count" id="cat-count-${cat}">${selectedInCat > 0 ? `${selectedInCat} selected` : ''}</span>
                    </div>
                    <span class="cat-toggle-icon">&#9656;</span>
                </div>
                <div class="skill-category__body" hidden>
                    <div class="skill-checklist">${rowsHTML}</div>
                </div>
            </div>`;
    }

    const selectedCount = state.selectedSkills.length;

    container.innerHTML = `
        <div class="wizard-panel fade-in">
            <h2>Pick Your Starting Skills</h2>
            <p class="wizard-desc">Select at least 5 skills. Expand categories to browse, or use search. Use "Select experience" to log prior hours once checked.</p>
            <p class="wizard-count">Selected: <strong id="skill-count">${selectedCount}</strong> / 5 minimum</p>

            <div class="skills-search-bar">
                <input type="text" id="skills-search" class="form-input" placeholder="Search skills...">
            </div>

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

    function updateCatCount(cat) {
        const catEl = container.querySelector(`[data-cat="${cat}"]`);
        if (!catEl) return;
        const total = catEl.querySelectorAll('.skill-check-row').length;
        const sel = catEl.querySelectorAll('.skill-check-row.checked').length;
        const countEl2 = catEl.querySelector('.cat-sel-count');
        if (countEl2) countEl2.textContent = sel > 0 ? `${sel} selected` : '';
    }

    // Category header toggle
    container.querySelectorAll('.skill-category__header').forEach(header => {
        const toggle = () => {
            const cat = header.closest('.skill-category');
            const body = cat.querySelector('.skill-category__body');
            const isOpen = !body.hidden;
            body.hidden = isOpen;
            header.setAttribute('aria-expanded', String(!isOpen));
            cat.classList.toggle('open', !isOpen);
        };
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    // Search bar — filter rows, auto-expand/collapse categories
    const searchInput = document.getElementById('skills-search');
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();

        container.querySelectorAll('.skill-category').forEach(catEl => {
            const rows = catEl.querySelectorAll('.skill-check-row');
            let visibleCount = 0;

            rows.forEach(row => {
                const name = row.dataset.skillName || '';
                const match = !q || name.includes(q);
                row.style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            const body = catEl.querySelector('.skill-category__body');
            const header = catEl.querySelector('.skill-category__header');
            if (q) {
                // Show/hide category based on whether it has matches
                catEl.style.display = visibleCount > 0 ? '' : 'none';
                if (visibleCount > 0) {
                    body.hidden = false;
                    header.setAttribute('aria-expanded', 'true');
                    catEl.classList.add('open');
                }
            } else {
                // Restore collapsed state
                catEl.style.display = '';
                body.hidden = true;
                header.setAttribute('aria-expanded', 'false');
                catEl.classList.remove('open');
                rows.forEach(row => { row.style.display = ''; });
            }
        });
    });

    // Checkbox handlers
    container.querySelectorAll('.skill-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const skillId = parseInt(cb.dataset.skillId);
            const row = cb.closest('.skill-check-row');
            const hoursDiv = row.querySelector('.skill-hours-input');
            const cat = row.closest('.skill-category').dataset.cat;

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
            updateCatCount(cat);
        });
    });

    // Select-experience button handlers
    container.querySelectorAll('.btn-select-xp').forEach(btn => {
        btn.addEventListener('click', () => {
            const skillId = parseInt(btn.dataset.skillId);
            const skill = skills.find(s => s.id === skillId);
            if (!skill) return;
            const existing = state.selectedSkills.find(s => s.skill_id === skillId);
            openSkillExperienceModal({
                skillName: skill.name,
                xpMultiplier: parseFloat(skill.xp_multiplier) || 1,
                maxLevel: parseInt(skill.max_level) || 250,
                age: state.age,
                currentHours: existing?.initial_hours || 0,
                onSave: (hours) => {
                    if (existing) existing.initial_hours = hours;
                    const statusEl = container.querySelector(`[data-xp-for="${skillId}"]`);
                    if (statusEl) statusEl.innerHTML = hours > 0 ? '&#10022; Chronicles sealed' : '';
                    btn.textContent = hours > 0 ? 'Edit experience' : 'Select experience';
                },
            });
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
                ${state.age ? `<p><strong>Age:</strong> ${state.age}</p>` : ''}
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
                age: state.age,
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

// --- Initialize ---
goToStep(1);
