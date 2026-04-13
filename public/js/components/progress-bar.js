/**
 * Progress bar component.
 */

/**
 * Render a progress bar HTML string.
 * @param {number} percent - 0-100
 * @param {boolean} animate - Whether to animate on load
 * @returns {string}
 */
export function renderProgressBar(percent, animate = false) {
    const clamped = Math.max(0, Math.min(100, percent));
    return `
        <div class="progress-bar">
            <div class="progress-bar__fill ${animate ? 'animate' : ''}"
                 style="width: ${clamped}%"
                 data-percent="${clamped}"></div>
        </div>
    `;
}

/**
 * Animate a progress bar fill from its current width to a new percentage.
 * @param {HTMLElement} barEl - The .progress-bar element
 * @param {number} toPercent - Target percentage
 * @param {number} duration - Animation duration in ms
 */
export function animateProgressBar(barEl, toPercent, duration = 800) {
    const fill = barEl.querySelector('.progress-bar__fill');
    if (!fill) return;

    fill.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    fill.style.width = `${Math.max(0, Math.min(100, toPercent))}%`;
    fill.dataset.percent = toPercent;
}

/**
 * Animate all progress bars that have data-percent set.
 * Useful for animating bars after they're inserted into the DOM.
 */
export function animateAllBars(container = document) {
    const bars = container.querySelectorAll('.progress-bar__fill[data-percent]');
    bars.forEach((fill, i) => {
        const target = parseFloat(fill.dataset.percent);
        fill.style.width = '0%';
        setTimeout(() => {
            fill.style.transition = 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)';
            fill.style.width = `${target}%`;
        }, 100 + i * 50);
    });
}
