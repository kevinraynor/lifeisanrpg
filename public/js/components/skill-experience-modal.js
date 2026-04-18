/**
 * Skill Experience Modal
 *
 * Guided questionnaire that computes a user's prior hours on a skill
 * from multiple life-contexts. Replaces the manual hours number input
 * at character creation.
 *
 * Usage:
 *   openSkillExperienceModal({
 *     skillName: 'Mathematics',
 *     xpMultiplier: 1.0,
 *     maxLevel: 250,
 *     age: 30,
 *     currentHours: 0,
 *     onSave: (hours) => { ... }
 *   });
 */

function esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

export function openSkillExperienceModal(opts) {
    const {
        skillName = 'this skill',
        xpMultiplier = 1.0,
        maxLevel = 250,
        age = null,
        currentHours = 0,
        saveLabel = 'Seal Your Chronicles',
        onSave = () => {},
    } = opts;

    // Age-derived caps (applied to user-entered years, before seniority bonus)
    const cap = (v) => Math.max(0, Math.floor(v));
    const maxProYears    = age ? cap(age - 16) : 80;
    const maxAcademicYrs = age ? Math.min(20, cap(age - 5)) : 20;
    const maxHobbyYrs    = age ? cap(age - 5) : 100;
    const maxTeachYrs    = age ? cap(age - 16) : 80;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.innerHTML = `
        <div class="modal modal--skill-xp card-ornate" role="dialog" aria-modal="true">
            <div class="modal__header">
                <h2>Experience with ${esc(skillName)}</h2>
                <button type="button" class="modal__close" aria-label="Close">&times;</button>
            </div>
            <p class="modal__desc">
                Tell us how you've spent time on this skill. Check any that apply &mdash;
                we'll tally your chronicles.
            </p>

            <div class="sxp-contexts">
                ${renderContext('pro', 'I use this skill professionally', `
                    <label>Seniority
                        <select data-field="pro.seniority">
                            <option value="junior">Junior (no bonus)</option>
                            <option value="intermediate" selected>Intermediate (+3 yrs)</option>
                            <option value="senior">Senior (+6 yrs)</option>
                        </select>
                    </label>
                    <label>Years in this role
                        <input type="number" min="0" max="${maxProYears}" step="0.5" value="0" data-field="pro.years">
                    </label>
                    <label>Employment type
                        <select data-field="pro.employment">
                            <option value="fulltime">Full-time</option>
                            <option value="parttime">Part-time</option>
                        </select>
                    </label>
                    <label data-pt-only hidden>Hours per week at this job
                        <input type="number" min="1" max="39" step="1" value="20" data-field="pro.pthpw">
                    </label>
                `)}
                ${renderContext('academic', 'I studied this at school / university', `
                    <label>Years of study
                        <input type="number" min="0" max="${maxAcademicYrs}" step="0.5" value="0" data-field="academic.years">
                    </label>
                    <label>Hours per week (during term)
                        <input type="number" min="0" max="80" step="0.5" value="4" data-field="academic.hpw">
                    </label>
                `)}
                ${renderContext('hobby', 'I practice this as a hobby', `
                    <label>Years doing it
                        <input type="number" min="0" max="${maxHobbyYrs}" step="0.5" value="0" data-field="hobby.years">
                    </label>
                    <label>Avg hours per week
                        <input type="number" min="0" max="80" step="0.5" value="3" data-field="hobby.hpw">
                    </label>
                `)}
                ${renderContext('self', 'Self-taught / online courses / books', `
                    <label>Total hours spent (estimate)
                        <input type="number" min="0" max="20000" step="10" value="0" data-field="self.total">
                    </label>
                `)}
                ${renderContext('teach', 'I teach / mentor others in this skill', `
                    <label>Years teaching
                        <input type="number" min="0" max="${maxTeachYrs}" step="0.5" value="0" data-field="teach.years">
                    </label>
                    <label>Avg hours per week
                        <input type="number" min="0" max="80" step="0.5" value="2" data-field="teach.hpw">
                    </label>
                `)}
            </div>

            <div class="sxp-error" id="sxp-error"></div>

            <div class="modal__actions">
                <button type="button" class="btn-fantasy btn-secondary" id="sxp-cancel">Cancel</button>
                <button type="button" class="btn-fantasy btn-primary" id="sxp-save">${esc(saveLabel)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    function renderContext(key, label, body) {
        return `
            <div class="sxp-context" data-context="${key}">
                <label class="sxp-context__head">
                    <input type="checkbox" data-toggle="${key}">
                    <span>${label}</span>
                </label>
                <div class="sxp-context__body" data-body="${key}" hidden>${body}</div>
            </div>
        `;
    }

    // Toggle context bodies on checkbox change
    overlay.querySelectorAll('[data-toggle]').forEach(cb => {
        cb.addEventListener('change', () => {
            const key = cb.dataset.toggle;
            const body = overlay.querySelector(`[data-body="${key}"]`);
            body.hidden = !cb.checked;
            overlay.querySelector(`[data-context="${key}"]`).classList.toggle('active', cb.checked);
            recompute();
        });
    });

    // Show/hide part-time hours field when employment type changes
    const proBody = overlay.querySelector('[data-body="pro"]');
    if (proBody) {
        const employmentSel = proBody.querySelector('[data-field="pro.employment"]');
        const ptLabel = proBody.querySelector('[data-pt-only]');
        if (employmentSel && ptLabel) {
            employmentSel.addEventListener('change', () => {
                ptLabel.hidden = employmentSel.value !== 'parttime';
                recompute();
            });
        }
    }

    // Recompute on any input/select change
    overlay.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', recompute);
        el.addEventListener('change', recompute);
    });

    function readField(key) {
        const el = overlay.querySelector(`[data-field="${key}"]`);
        if (!el) return 0;
        if (el.tagName === 'SELECT') return el.value;
        const v = parseFloat(el.value);
        return isNaN(v) ? 0 : v;
    }

    function isOn(key) {
        return overlay.querySelector(`[data-toggle="${key}"]`)?.checked;
    }

    function compute() {
        let hours = 0;
        const errors = [];

        if (isOn('pro')) {
            const years      = readField('pro.years');
            const seniority  = readField('pro.seniority');
            const employment = readField('pro.employment');
            const ptHpw      = readField('pro.pthpw');

            const seniorityBonus = seniority === 'senior' ? 6 : seniority === 'intermediate' ? 3 : 0;
            const isPartTime = employment === 'parttime';
            const ptRatio = isPartTime ? Math.min(1, Math.max(0.025, ptHpw / 40)) : 1.0;

            if (age && years > maxProYears) {
                errors.push(`Professional years can't exceed ${maxProYears} at age ${age}.`);
            }
            if (isPartTime && ptHpw <= 0) {
                errors.push('Part-time hours per week must be greater than 0.');
            }
            if (isPartTime && ptHpw >= 40) {
                errors.push('Part-time hours per week must be under 40 (use Full-time for ≥40h/week).');
            }

            // effectiveYears × 46 weeks × 30h/week × part-time ratio
            const effectiveYears = years + seniorityBonus;
            hours += effectiveYears * 46 * 30 * ptRatio;
        }

        if (isOn('academic')) {
            const years = readField('academic.years');
            const hpw   = readField('academic.hpw');
            if (age && years > maxAcademicYrs) errors.push(`Academic years can't exceed ${maxAcademicYrs} at age ${age}.`);
            if (hpw > 80) errors.push('Academic hours per week cannot exceed 80.');
            hours += years * hpw * 40;
        }

        if (isOn('hobby')) {
            const years = readField('hobby.years');
            const hpw   = readField('hobby.hpw');
            if (age && years > maxHobbyYrs) errors.push(`Hobby years can't exceed ${maxHobbyYrs} at age ${age}.`);
            if (hpw > 80) errors.push('Hobby hours per week cannot exceed 80.');
            hours += years * hpw * 52;
        }

        if (isOn('self')) {
            const total = readField('self.total');
            if (total > 20000) errors.push('Self-taught hours cannot exceed 20,000.');
            hours += total;
        }

        if (isOn('teach')) {
            const years = readField('teach.years');
            const hpw   = readField('teach.hpw');
            if (age && years > maxTeachYrs) errors.push(`Teaching years can't exceed ${maxTeachYrs} at age ${age}.`);
            if (hpw > 80) errors.push('Teaching hours per week cannot exceed 80.');
            hours += years * hpw * 52;
        }

        hours = Math.max(0, Math.min(20000, Math.round(hours)));
        return { hours, errors };
    }

    function recompute() {
        const { errors } = compute();
        const err = overlay.querySelector('#sxp-error');
        err.innerHTML = errors.length
            ? errors.map(e => `<div>&#9888; ${esc(e)}</div>`).join('')
            : '';
        overlay.querySelector('#sxp-save').disabled = errors.length > 0;
    }

    recompute();

    const close = () => overlay.remove();
    overlay.querySelector('.modal__close').addEventListener('click', close);
    overlay.querySelector('#sxp-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#sxp-save').addEventListener('click', () => {
        const { hours, errors } = compute();
        if (errors.length) return;
        onSave(hours);
        close();
    });
}
