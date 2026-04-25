/**
 * Page lifecycle — cleanup registry.
 *
 * Any page that subscribes to Store changes must register its unsubscribe
 * function here so stale listeners don't accumulate across SPA navigations.
 *
 * Usage (inside a page render function):
 *   import { addPageCleanup } from '../page-lifecycle.js';
 *   import Store from '../store.js';
 *
 *   export function renderMyPage(container) {
 *     const unsub = Store.on('userSkills', () => renderSkillList(container));
 *     addPageCleanup(unsub);
 *     // ... rest of render
 *   }
 *
 * app.js calls runPageCleanups() automatically before each navigation,
 * so pages don't need to manage this themselves beyond registering.
 *
 * Note: app.js-level subscriptions (e.g. badge watchers) are intentionally
 * NOT registered here — they should live for the entire session.
 */

/** @type {Array<Function>} */
let _cleanups = [];

/**
 * Register a cleanup function to run before the next page navigation.
 * Safe to call with the return value of Store.on() directly.
 * @param {Function} fn
 */
export function addPageCleanup(fn) {
    if (typeof fn === 'function') _cleanups.push(fn);
}

/**
 * Run all registered cleanup functions and reset the registry.
 * Called by app.js's withCleanup() wrapper before each page render.
 */
export function runPageCleanups() {
    _cleanups.forEach(fn => fn());
    _cleanups = [];
}
