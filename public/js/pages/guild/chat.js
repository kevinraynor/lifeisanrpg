/**
 * Guild chat — message rendering and form binding.
 */
import { get, post } from '../../api.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast } from '../../utils/toast.js';

/**
 * Render a single chat message.
 * @param {Object} msg - Message object from API
 */
export function renderChatMessage(msg) {
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
        <div class="guild-chat-msg">
            <span class="guild-chat-msg__author">${escapeHtml(msg.character_name)}</span>
            <span class="guild-chat-msg__time">${time}</span>
            <p class="guild-chat-msg__body">${escapeHtml(msg.body)}</p>
        </div>
    `;
}

/** Scroll the chat panel to the latest message. */
export function scrollChatToBottom(container) {
    const el = container.querySelector('#guild-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
}

/**
 * Attach submit handler to the chat form.
 * @param {HTMLElement} container
 */
export function bindChatForm(container) {
    container.querySelector('#guild-chat-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = container.querySelector('#guild-chat-input');
        const body  = input.value.trim();
        if (!body) return;
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
            await post('/api/guild/messages', { body });
            input.value = '';
            // Refresh just the messages list — no full page re-render needed
            const msgs = await get('/api/guild/messages').catch(() => []);
            const el = container.querySelector('#guild-chat-messages');
            if (el) el.innerHTML = msgs.length
                ? msgs.map(renderChatMessage).join('')
                : `<p class="guild-empty">No messages yet.</p>`;
            scrollChatToBottom(container);
        } catch (err) { showToast(err.message); }
        btn.disabled = false;
    });
}
