/**
 * Properties Panel UI
 * Displays component properties
 */

export class PropertiesPanel {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentComponent = null;
    }

    /**
     * Update panel with component data
     */
    update(component) {
        this.currentComponent = component;
        this.render();
    }

    /**
     * Render the panel
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
                html += this.createPropertyRow('Length', `${comp.attributes.length} mm`);
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
