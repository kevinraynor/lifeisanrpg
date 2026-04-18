/**
 * Renders the HTML for a skill icon tile. If `/img/skills/{slug}.webp`
 * exists it shows the image; otherwise the <img> onerror swaps in the
 * crossed-hammers placeholder. Slug is sanitized to prevent HTML injection.
 */
export function skillIconHtml(slug) {
    const safeSlug = String(slug || '').replace(/[^a-z0-9-]/gi, '');
    if (!safeSlug) {
        return `<div class="skill-icon skill-icon--placeholder" aria-hidden="true">&#9876;</div>`;
    }
    return `<div class="skill-icon" aria-hidden="true">`
        + `<img src="/img/skills/${safeSlug}.webp" alt=""`
        + ` onerror="this.parentNode.classList.add('skill-icon--placeholder');this.parentNode.innerHTML='&#9876;'">`
        + `</div>`;
}
