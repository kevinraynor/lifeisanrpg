/**
 * Form field helper — generates the standard `.form-group` block.
 *
 * Covers the most common pattern: a label, a single `<input>`, and an optional
 * hint line. For complex inputs (select, textarea, checkbox groups) continue
 * writing HTML inline — they're too varied to template usefully.
 *
 * Usage:
 *   import { formGroup } from '../utils/form-row.js';
 *
 *   formGroup({ label: 'Email', name: 'email', type: 'email', required: true })
 *   formGroup({ label: 'Password', name: 'pass', type: 'password',
 *               hint: 'Minimum 8 characters', hintId: 'pass-hint' })
 *
 * @param {Object}  opts
 * @param {string}  opts.label       Visible label text
 * @param {string}  opts.name        input[name] (also used as id when id is omitted)
 * @param {string}  [opts.type='text']
 * @param {string}  [opts.id]        Explicit id; defaults to opts.name
 * @param {string}  [opts.inputAttrs='']  Extra HTML attribute string, e.g. 'minlength="8" maxlength="200"'
 * @param {boolean} [opts.required=false]
 * @param {string}  [opts.hint]      Optional hint text below the input
 * @param {string}  [opts.hintId]    id for the hint element (useful for aria-describedby)
 * @param {string}  [opts.value='']  Pre-filled value
 * @returns {string} HTML string
 */
export function formGroup({
    label,
    name,
    type = 'text',
    id,
    inputAttrs = '',
    required = false,
    hint,
    hintId,
    value = '',
} = {}) {
    const inputId = id || name;
    const reqAttr = required ? ' required' : '';
    const hintHtml = hint
        ? `<div class="form-hint"${hintId ? ` id="${hintId}"` : ''}>${hint}</div>`
        : '';

    return `
        <div class="form-group">
            <label class="form-label" for="${inputId}">${label}</label>
            <input type="${type}" class="form-input" id="${inputId}" name="${name}"
                   value="${value}"${reqAttr}${inputAttrs ? ' ' + inputAttrs : ''}>
            ${hintHtml}
        </div>
    `;
}
