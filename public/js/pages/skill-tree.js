/**
 * Skill Tree — SVG visualization of skill prerequisites.
 * Shows skills as nodes connected by arrows based on prerequisite relationships.
 */
import Store from '../store.js';

const NODE_W = 150;
const NODE_H = 48;
const H_GAP = 60;
const V_GAP = 80;

export function renderSkillTree(container) {
    // Build adjacency from prerequisites
    const prereqs = Store.skillPrereqs;
    if (!prereqs || prereqs.length === 0) {
        container.innerHTML = `
            <h2>Skill Tree</h2>
            <p class="section-subtitle">No prerequisite chains exist yet.</p>
        `;
        return;
    }

    // Find all skills involved in prerequisite chains
    const involvedIds = new Set();
    prereqs.forEach(p => {
        involvedIds.add(Number(p.skill_id));
        involvedIds.add(Number(p.required_skill_id));
    });

    // Build graph: children[parentId] = [{childId, requiredLevel}]
    const children = {};
    const parents = {};
    prereqs.forEach(p => {
        const parent = Number(p.required_skill_id);
        const child = Number(p.skill_id);
        if (!children[parent]) children[parent] = [];
        children[parent].push({ id: child, level: Number(p.required_level) });
        if (!parents[child]) parents[child] = [];
        parents[child].push(parent);
    });

    // Find roots (nodes with no parents in this graph)
    const roots = [];
    involvedIds.forEach(id => {
        if (!parents[id]) roots.push(id);
    });

    // BFS to assign layers (depth) and positions
    const layers = {};
    const visited = new Set();
    const queue = roots.map(id => ({ id, depth: 0 }));
    roots.forEach(id => { layers[id] = 0; visited.add(id); });

    while (queue.length > 0) {
        const { id, depth } = queue.shift();
        layers[id] = Math.max(layers[id] || 0, depth);
        (children[id] || []).forEach(c => {
            const newDepth = depth + 1;
            layers[c.id] = Math.max(layers[c.id] || 0, newDepth);
            if (!visited.has(c.id)) {
                visited.add(c.id);
                queue.push({ id: c.id, depth: newDepth });
            }
        });
    }

    // Group by layer
    const byLayer = {};
    let maxDepth = 0;
    Object.entries(layers).forEach(([id, depth]) => {
        if (!byLayer[depth]) byLayer[depth] = [];
        byLayer[depth].push(Number(id));
        maxDepth = Math.max(maxDepth, depth);
    });

    // Assign x/y positions
    const positions = {};
    for (let d = 0; d <= maxDepth; d++) {
        const nodes = byLayer[d] || [];
        const totalW = nodes.length * NODE_W + (nodes.length - 1) * H_GAP;
        const startX = -totalW / 2 + NODE_W / 2;
        nodes.forEach((id, i) => {
            positions[id] = {
                x: startX + i * (NODE_W + H_GAP),
                y: d * (NODE_H + V_GAP),
            };
        });
    }

    // Compute SVG bounds
    const allPos = Object.values(positions);
    const minX = Math.min(...allPos.map(p => p.x)) - NODE_W / 2 - 20;
    const maxX = Math.max(...allPos.map(p => p.x)) + NODE_W / 2 + 20;
    const maxY = Math.max(...allPos.map(p => p.y)) + NODE_H + 20;
    const svgW = maxX - minX;
    const svgH = maxY + 20;

    // Draw SVG
    let edgesSVG = '';
    let nodesSVG = '';

    // Edges
    prereqs.forEach(p => {
        const from = positions[Number(p.required_skill_id)];
        const to = positions[Number(p.skill_id)];
        if (!from || !to) return;

        const x1 = from.x - minX;
        const y1 = from.y + NODE_H;
        const x2 = to.x - minX;
        const y2 = to.y;
        const midY = (y1 + y2) / 2;

        const userSkill = Store.getUserSkill(Number(p.required_skill_id));
        const met = userSkill && Number(userSkill.current_level) >= Number(p.required_level);
        const strokeColor = met ? '#4a7c3f' : '#8a7a6a';
        const strokeOpacity = met ? '0.8' : '0.3';

        edgesSVG += `<path d="M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}"
            fill="none" stroke="${strokeColor}" stroke-width="2" stroke-opacity="${strokeOpacity}"
            marker-end="url(#arrow-${met ? 'met' : 'unmet'})"/>`;

        // Level label on edge
        const labelX = (x1 + x2) / 2;
        const labelY = midY - 4;
        edgesSVG += `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="tree-edge-label" fill="${strokeColor}">Lv. ${p.required_level}</text>`;
    });

    // Nodes
    involvedIds.forEach(id => {
        const pos = positions[id];
        if (!pos) return;
        const skill = Store.getSkillById(id);
        const userSkill = Store.getUserSkill(id);
        const isActivated = !!userSkill;
        const level = userSkill ? Number(userSkill.current_level) : 0;
        const name = skill ? skill.name : `Skill ${id}`;

        const x = pos.x - minX - NODE_W / 2;
        const y = pos.y;

        const fillClass = isActivated ? 'tree-node--active' : 'tree-node--inactive';

        nodesSVG += `
            <g class="tree-node ${fillClass}" data-skill-id="${id}">
                <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="8"/>
                <text x="${x + NODE_W / 2}" y="${y + 19}" text-anchor="middle" class="tree-node-name">${truncate(name, 18)}</text>
                ${isActivated
                    ? `<text x="${x + NODE_W / 2}" y="${y + 36}" text-anchor="middle" class="tree-node-level">Lv. ${level}</text>`
                    : `<text x="${x + NODE_W / 2}" y="${y + 36}" text-anchor="middle" class="tree-node-locked">Locked</text>`}
            </g>
        `;
    });

    container.innerHTML = `
        <h2>Skill Tree</h2>
        <p class="section-subtitle">Prerequisite chains between skills. Green nodes are activated, grey are locked.</p>
        <div class="skill-tree-container">
            <svg class="skill-tree-svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
                <defs>
                    <marker id="arrow-met" viewBox="0 0 10 10" refX="10" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="#4a7c3f"/>
                    </marker>
                    <marker id="arrow-unmet" viewBox="0 0 10 10" refX="10" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="#8a7a6a"/>
                    </marker>
                </defs>
                ${edgesSVG}
                ${nodesSVG}
            </svg>
        </div>
    `;

    // Click to navigate to skill detail
    container.querySelectorAll('.tree-node').forEach(node => {
        node.style.cursor = 'pointer';
        node.addEventListener('click', () => {
            const skillId = node.dataset.skillId;
            import('../router.js').then(({ default: Router }) => {
                Router.navigate(`/app/skill/${skillId}`);
            });
        });
    });
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len - 1) + '\u2026' : str;
}
