/**
 * Component Tree UI
 * Displays hierarchical component tree
 */

export class ComponentTree {
    constructor(containerElement, onComponentClicked) {
        this.container = containerElement;
        this.onComponentClicked = onComponentClicked;
        this.components = [];
    }

    /**
     * Update tree with component data
     */
    update(components) {
        this.components = components;
        this.render();
    }

    /**
     * Render the tree
     */
    render() {
        if (!this.components || this.components.length === 0) {
            this.container.innerHTML = '<p class="empty-state">Load a file to view components</p>';
            return;
        }

        // Group by type
        const grouped = {};
        this.components.forEach((comp, treeIndex) => {
            if (!grouped[comp.type]) {
                grouped[comp.type] = [];
            }
            grouped[comp.type].push({ ...comp, treeIndex });
        });

        let html = '';

        for (const [type, items] of Object.entries(grouped)) {
            html += `
                <div class="tree-group">
                    <div class="tree-group-header">
                        <span class="arrow">▼</span>
                        <strong>${type}</strong>
                        <span class="count">(${items.length})</span>
                    </div>
                    <div class="tree-group-items">
            `;

            items.forEach(item => {
                const icon = this.getComponentIcon(type);
                const label = item.attributes?.itemCode || `${type}-${item.index + 1}`;

                html += `
                    <div class="tree-item" data-tree-index="${item.treeIndex}">
                        ${icon}
                        <span>${label}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        this.container.innerHTML = html;

        // ✅ Collapse toggle (FIXED)
        this.container.querySelectorAll('.tree-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.parentElement;
                group.classList.toggle('collapsed');
            });
        });

        // ✅ Item click handlers (moved OUTSIDE collapse block)
        this.container.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const treeIndex = parseInt(e.currentTarget.dataset.treeIndex);
                this.selectItem(treeIndex);

                if (this.onComponentClicked) {
                    this.onComponentClicked(this.components[treeIndex], treeIndex);
                }
            });
        });
    }

    /**
     * Select a tree item
     */
    selectItem(treeIndex) {
        this.container.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });

        const item = this.container.querySelector(`[data-tree-index="${treeIndex}"]`);
        if (item) {
            item.classList.add('selected');

            const containerRect = this.container.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();

            if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    /**
     * Clear all selections in the tree
     */
    clearSelection() {
        this.container.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    /**
     * Get icon for component type
     */
    getComponentIcon(type) {
        const icons = {
            'PIPE': '⬌',
            'ELBOW': '↩',
            'TEE': '⊥',
            'VALVE': '⊗',
            'REDUCER-CONCENTRIC': '▷',
            'REDUCER-ECCENTRIC': '▶',
            'FLANGE': '○'
        };
        return `<span class="tree-item-icon">${icons[type] || '●'}</span>`;
    }

    /**
     * Clear tree
     */
    clear() {
        this.components = [];
        this.container.innerHTML = '<p class="empty-state">Load a file to view components</p>';
    }
}
