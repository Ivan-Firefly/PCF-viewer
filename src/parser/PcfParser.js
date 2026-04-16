/**
 * PCF (Piping Component File) Parser
 * Parses PCF files into structured 3D piping data
 * Enhanced to handle real-world production PCF files
 */

export class PcfParser {
    constructor() {
        this.data = {
            header: {},
            pipeline: {},
            components: [],
            materials: {}
        };
        this.supportsCoords = new Set();
    }

    /**
     * Parse a PCF file content
     * @param {string} content - The PCF file content
     * @param {object} externalOffset - Optional offset from another file
     * @returns {object} Parsed piping data
     */
    parse(content, externalOffset = null) {
        this.offset = externalOffset;
        this.data.offset = this.offset;
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let currentSection = null;
        let currentComponent = null;

        console.log(`Parsing PCF: ${lines.length} lines`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip comments
            if (line.startsWith('#')) continue;

            // Check for main sections
            if (line.startsWith('ISOGEN-FILES') || line.startsWith('UNITS-')) {
                this.parseHeader(line);
            } else if (line.startsWith('PIPELINE-REFERENCE')) {
                currentSection = 'pipeline';
                this.data.pipeline.reference = line.split(/\s+/).slice(1).join(' ');
            } else if (line.startsWith('MATERIALS') || line.startsWith('MATERIAL-IDENTIFIER')) {
                currentSection = 'materials';
            } else if (this.isComponentType(line)) {
                // Save previous component (only if it has geometry)
                if (currentComponent && this.hasGeometry(currentComponent)) {
                    // Deduplicate supports
                    if (currentComponent.type === 'SUPPORT' && currentComponent.endPoints.length > 0) {
                        const p = currentComponent.endPoints[0].position;
                        const coordKey = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
                        if (this.supportsCoords.has(coordKey)) {
                            currentComponent = null;
                        } else {
                            this.supportsCoords.add(coordKey);
                        }
                    }

                    if (currentComponent) {
                        // Calculate length for pipes
                        if (currentComponent.type === 'PIPE' && currentComponent.endPoints.length >= 2) {
                            const ep1 = currentComponent.endPoints[0].position;
                            const ep2 = currentComponent.endPoints[1].position;
                            const dx = ep1.x - ep2.x;
                            const dy = ep1.y - ep2.y;
                            const dz = ep1.z - ep2.z;
                            currentComponent.attributes.length = Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(0);
                        }
                        this.data.components.push(currentComponent);
                    }
                }
                // Start new component
                currentComponent = {
                    type: line,
                    endPoints: [],
                    attributes: {}
                };
                currentSection = 'component';
            } else if (line.startsWith('ITEM-CODE') && currentSection === 'materials') {
                this.parseMaterial(line, lines, i);
            } else if (currentComponent && currentSection === 'component') {
                this.parseComponentAttribute(line, currentComponent);
            } else if (currentSection === 'pipeline') {
                this.parsePipelineAttribute(line);
            }
        }

        // Add last component if it has geometry
        if (currentComponent && this.hasGeometry(currentComponent)) {
            // Deduplicate supports
            if (currentComponent.type === 'SUPPORT' && currentComponent.endPoints.length > 0) {
                const p = currentComponent.endPoints[0].position;
                const coordKey = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
                if (this.supportsCoords.has(coordKey)) {
                    currentComponent = null;
                } else {
                    this.supportsCoords.add(coordKey);
                }
            }

            if (currentComponent) {
                // Calculate length for pipes
                if (currentComponent.type === 'PIPE' && currentComponent.endPoints.length >= 2) {
                    const ep1 = currentComponent.endPoints[0].position;
                    const ep2 = currentComponent.endPoints[1].position;
                    const dx = ep1.x - ep2.x;
                    const dy = ep1.y - ep2.y;
                    const dz = ep1.z - ep2.z;
                    currentComponent.attributes.length = Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(0);
                }
                this.data.components.push(currentComponent);
            }
        }

        console.log(`Parsed ${this.data.components.length} components with geometry`);

        return this.data;
    }

    /**
     * Check if component has geometry data
     */
    hasGeometry(component) {
        // Skip components without geometric representation
        const nonGeometricTypes = ['WELD', 'GASKET', 'BOLT'];
        if (nonGeometricTypes.includes(component.type)) {
            return false;
        }

        // Must have at least one endpoint or coordinate
        return component.endPoints && component.endPoints.length > 0;
    }

    /**
     * Parse header line
     */
    parseHeader(line) {
        const parts = line.split(/\s+/);
        const key = parts[0].replace('UNITS-', '').toLowerCase();
        const value = parts.slice(1).join(' ');
        this.data.header[key] = value;
    }

    /**
     * Parse pipeline attribute
     */
    parsePipelineAttribute(line) {
        const trimmed = line.trim();
        if (trimmed.startsWith('PIPING-SPEC')) {
            this.data.pipeline.pipingSpec = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('INSULATION-SPEC')) {
            this.data.pipeline.insulationSpec = trimmed.split(/\s+/).slice(1).join(' ');
        }
    }

    /**
     * Check if line is a component type
     */
    isComponentType(line) {
        const componentTypes = [
            'PIPE', 'ELBOW', 'TEE', 'OLET', 'VALVE', 'FLANGE',
            'REDUCER-CONCENTRIC', 'REDUCER-ECCENTRIC', 'REDUCER',
            'GASKET', 'BOLT', 'SUPPORT', 'CAP', 'INSTRUMENT',
            'WELD', 'COUPLING', 'UNION', 'CROSS', 'BUSHING',
            'PLUG', 'NIPPLE', 'SWAGE'
        ];
        return componentTypes.includes(line);
    }

    /**
     * Parse component attribute
     */
    parseComponentAttribute(line, component) {
        const trimmed = line.trim();

        if (trimmed.startsWith('COMPONENT-IDENTIFIER')) {
            component.componentId = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('END-POINT')) {
            const endPoint = this.parseEndPoint(trimmed);
            component.endPoints.push(endPoint);
        } else if (trimmed.startsWith('CO-ORDS')) {
            // For components like SUPPORT that use CO-ORDS
            const coords = this.parseCoords(trimmed);
            component.endPoints.push({
                position: coords,
                bore: 0,
                connectionType: 'NONE'
            });
        } else if (trimmed.startsWith('CENTRE-POINT')) {
            component.centrePoint = this.parsePoint(trimmed.split(/\s+/).slice(1));
        } else if (trimmed.startsWith('BRANCH1-POINT')) {
            component.branchPoint = this.parseEndPoint(trimmed.replace('BRANCH1-POINT', 'POINT'));
        } else if (trimmed.startsWith('SPINDLE-DIRECTION') || trimmed.startsWith('DIRECTION')) {
            const parts = trimmed.split(/\s+/);
            component.attributes.spindleDirection = parts[parts.length - 1];
        } else if (trimmed.startsWith('ITEM-CODE')) {
            component.attributes.itemCode = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('DESCRIPTION')) {
            component.attributes.description = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('SKEY')) {
            component.attributes.skey = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('WEIGHT')) {
            component.attributes.weight = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('MATERIAL-IDENTIFIER')) {
            component.attributes.materialId = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('UCI')) {
            component.attributes.uci = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('NAME')) {
            component.attributes.name = trimmed.split(/\s+/).slice(1).join(' ');
        } else if (trimmed.startsWith('SUPPORT-TYPE')) {
            component.attributes.supportType = trimmed.split(/\s+/).slice(1).join(' ');
        }
    }

    /**
     * Parse END-POINT line
     */
    parseEndPoint(line) {
        const parts = line.split(/\s+/).filter(p => p.length > 0);
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        const pos = { x, y, z };
        if (this.offset) {
            pos.x -= this.offset.x;
            pos.y -= this.offset.y;
            pos.z -= this.offset.z;
        }

        return {
            position: pos,
            bore: parts[4] ? parseFloat(parts[4]) : 0,
            connectionType: parts[5] || 'BUTT-WELD'
        };
    }

    /**
     * Parse CO-ORDS line (for SUPPORT and other components)
     */
    parseCoords(line) {
        const parts = line.split(/\s+/).filter(p => p.length > 0);
        const pos = {
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3])
        };

        if (this.offset) {
            pos.x -= this.offset.x;
            pos.y -= this.offset.y;
            pos.z -= this.offset.z;
        }

        return pos;
    }

    /**
     * Parse CENTRE-POINT or coordinate
     */
    parsePoint(parts) {
        const pos = {
            x: parseFloat(parts[0]),
            y: parseFloat(parts[1]),
            z: parseFloat(parts[2])
        };

        if (this.offset) {
            pos.x -= this.offset.x;
            pos.y -= this.offset.y;
            pos.z -= this.offset.z;
        }

        return pos;
    }

    /**
     * Parse material definition
     */
    parseMaterial(line, lines, index) {
        const itemCode = line.split(/\s+/).slice(1).join(' ');
        // Look ahead for DESCRIPTION
        if (index + 1 < lines.length && lines[index + 1].trim().startsWith('DESCRIPTION')) {
            const description = lines[index + 1].trim().split(/\s+/).slice(1).join(' ');
            this.data.materials[itemCode] = description;
        }
    }

    /**
     * Get component statistics
     */
    getStatistics() {
        const stats = {
            totalComponents: this.data.components.length,
            byType: {}
        };

        this.data.components.forEach(comp => {
            stats.byType[comp.type] = (stats.byType[comp.type] || 0) + 1;
        });

        return stats;
    }
}
