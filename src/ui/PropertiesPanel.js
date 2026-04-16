/**
 * Properties Panel UI
 * Displays component properties, supports single and multi-selection summary.
 */

export class PropertiesPanel {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentComponent = null;
    }

    /**
     * Update panel with single component data
     */
    update(component) {
        this.currentComponent = component;
        this.render();
    }

    /**
     * Update panel with multi-selection data (box select)
     * Shows total length of selected elements.
     */
    updateMultiSelection(components) {
        if (!components || components.length === 0) {
            this.clear();
            return;
        }

        if (components.length === 1) {
            this.update(components[0]);
            return;
        }

        // Calculate total length for components that have it
        let totalLengthMm = 0;
        let lengthCount = 0;
        const byType = {};

        components.forEach(comp => {
            const type = comp.type || 'UNKNOWN';
            byType[type] = (byType[type] || 0) + 1;

            // Length from attributes (parsed from PCF/IDF)
            if (comp.attributes && comp.attributes.length) {
                totalLengthMm += parseFloat(comp.attributes.length) || 0;
                lengthCount++;
            } else if (comp.endPoints && comp.endPoints.length >= 2) {
                // Calculate on the fly from endpoints
                const ep1 = comp.endPoints[0].position;
                const ep2 = comp.endPoints[1].position;
                const dx = ep1.x - ep2.x;
                const dy = ep1.y - ep2.y;
                const dz = ep1.z - ep2.z;
                totalLengthMm += Math.sqrt(dx * dx + dy * dy + dz * dz);
                lengthCount++;
            }
        });

        let html = '<div class="properties-content">';

        // Summary box
        html += `<div class="selection-summary">
            <div class="selection-summary-title">📦 ${components.length} Elements Selected</div>`;

        if (lengthCount > 0) {
            const lengthM = (totalLengthMm / 1000).toFixed(3);
            const lengthMmStr = totalLengthMm.toFixed(0);
            html += `<div class="selection-total-length">
                Total Length: <span>${lengthMmStr} mm</span>
                <div style="font-size:0.75rem; color: var(--text-secondary); font-weight:400; margin-top:2px">(${lengthM} m)</div>
            </div>`;
        } else {
            html += `<div style="font-size:0.8rem; color: var(--text-secondary);">No length data available</div>`;
        }

        html += `</div>`;

        // Breakdown by type
        html += `<div class="property-row"><div class="property-label" style="font-weight:600;color:var(--text-primary)">By Type</div></div>`;
        for (const [type, count] of Object.entries(byType)) {
            html += this.createPropertyRow(type, count);
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    /**
     * Render single component
     */
    render() {
        if (!this.currentComponent) {
            this.container.innerHTML = '<p class="empty-state">Select a component to view details</p>';
            return;
        }

        const comp = this.currentComponent;
        let html = '<div class="properties-content">';

        // Type
        html += this.createPropertyRow('Type', comp.type);

        // End Points
        if (comp.endPoints && comp.endPoints.length > 0) {
            comp.endPoints.forEach((ep, i) => {
                html += `<div class="property-section">
          <div class="property-section-title">Endpoint ${i + 1}</div>
        `;
                html += this.createPropertyRow('Position', this.formatPoint(ep.position));
                html += this.createPropertyRow('Bore', `${ep.bore} mm`);
                html += this.createPropertyRow('Connection', ep.connectionType);
                html += '</div>';
            });
        }

        // Centre Point
        if (comp.centrePoint) {
            html += this.createPropertyRow('Centre Point', this.formatPoint(comp.centrePoint));
        }

        // Branch Point
        if (comp.branchPoint) {
            html += this.createPropertyRow('Branch Point', this.formatPoint(comp.branchPoint.position));
            html += this.createPropertyRow('Branch Bore', `${comp.branchPoint.bore} mm`);
        }

        // Attributes
        if (comp.attributes) {
            if (comp.attributes.name) {
                html += this.createPropertyRow('Tag/Name', comp.attributes.name);
            }
            if (comp.attributes.length) {
                html += this.createPropertyRow('Length', `<span class="highlight">${comp.attributes.length} mm</span>`);
            }
            if (comp.attributes.itemCode) {
                html += this.createPropertyRow('Item Code', comp.attributes.itemCode);
            }
            if (comp.attributes.description) {
                html += this.createPropertyRow('Description', comp.attributes.description);
            }
            if (comp.attributes.skey) {
                html += this.createPropertyRow('SKEY', comp.attributes.skey);
            }

            // Show source file if multiple files loaded
            if (comp.sourceFile) {
                html += this.createPropertyRow('File', comp.sourceFile.split('\\').pop().split('/').pop());
            }

            if (comp.attributes.weight) {
                html += this.createPropertyRow('Weight', comp.attributes.weight);
            }
            if (comp.attributes.spindleDirection) {
                html += this.createPropertyRow('Spindle', comp.attributes.spindleDirection);
            }
        }

        html += '</div>';
        this.container.innerHTML = html;
    }

    /**
     * Create a property row
     */
    createPropertyRow(label, value) {
        return `
      <div class="property-row">
        <div class="property-label">${label}</div>
        <div class="property-value">${value}</div>
      </div>
    `;
    }

    /**
     * Format a 3D point
     */
    formatPoint(point) {
        return `${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}`;
    }

    /**
     * Clear panel
     */
    clear() {
        this.currentComponent = null;
        this.container.innerHTML = '<p class="empty-state">Select a component to view details</p>';
    }
}
