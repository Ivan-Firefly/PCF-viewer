/**
 * IDF (Isogen Data File) Parser - Advanced Implementation
 * Supports Isogen/AVEVA record types (20-199) and drawing records (3/4)
 * Handles auto-centering for large absolute plant coordinates
 */

export class IdfParser {
    constructor() {
        this.reset();
    }

    reset() {
        this.data = {
            header: {
                bore: 'MM',
                'co-ords': 'MM'
            },
            pipeline: {
                reference: 'IDF Data'
            },
            components: [],
            materials: {}
        };
        this.offset = null; // Used for auto-centering
        this.hasPlantCoords = false;
        this.pendingBend = null; // For merging 35/36 legs
        this.supportsCoords = new Set();
    }

    /**
     * Tokenize an IDF line using regex to handle glued numbers/identifiers
     */
    tokenize(line) {
        if (!line) return [];
        // Match numbers (including decimals and signs) or alphanumeric identifiers
        const tokens = line.trim().match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[A-Z*#]+/gi) || [];
        return tokens.map(t => {
            const n = parseFloat(t);
            return isNaN(n) ? t : n;
        });
    }

    /**
     * Parse an IDF file content
     * @param {string} content - The IDF file content
     * @param {object} externalOffset - Optional offset from another file
     * @returns {object} Parsed piping data
     */
    parse(content, externalOffset = null) {
        this.reset();

        if (externalOffset) {
            this.offset = externalOffset;
            this.hasPlantCoords = true;
            console.log('Using external offset for IDF parsing:', this.offset);
        }

        console.log('Parsing IDF file (Refined Advanced Mode)...');

        const lines = content.split(/\r?\n/);

        // First pass: Detect coordinate offset if not provided
        if (!this.offset) {
            this.detectOffset(lines);
        }

        // Second pass: Parse components
        let currentComponent = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = this.tokenize(line);
            if (parts.length === 0) continue;

            const recordType = parts[0];

            // Handle Tags / Information Records
            if (recordType === -10 && currentComponent) {
                const tag = line.substring(line.indexOf('-10') + 3).trim();
                if (tag) {
                    currentComponent.attributes.name = tag;
                }
                continue;
            }

            if (typeof recordType !== 'number') continue;

            // Handle Process Records 20-199 (Plant components)
            if (recordType >= 20 && recordType < 200) {
                // Finalize pending bend if this is not a leg of the same bend
                if (this.pendingBend && recordType !== 36) {
                    this.finalizePendingBend();
                    // Note: currentComponent for tag logic usually follows individual records
                }
                const comp = this.parseProcessRecord(parts, line);
                if (comp) currentComponent = comp;
            }
            // Handle Drawing Records 3 and 4
            else if (recordType === 3 || recordType === 4) {
                if (this.pendingBend) this.finalizePendingBend();
                // Skip drawing records if they are paper-space but we have plant coords
                this.parseDrawingRecord(parts, recordType);
                currentComponent = null; // Drawing records reset context
            }
            // Metadata
            else if (recordType === -5) {
                if (this.pendingBend) this.finalizePendingBend();
                this.data.pipeline.reference = line.replace('-5', '').trim();
            }
        }

        // Finalize any last component
        if (this.pendingBend) this.finalizePendingBend();

        console.log(`Parsed ${this.data.components.length} components from IDF`);
        if (this.offset) {
            console.log(`Model origin (scaled mm): [${this.offset.x}, ${this.offset.y}, ${this.offset.z}]`);
            // Attach offset to data for retrieval by main app
            this.data.offset = this.offset;
        }

        return this.data;
    }

    /**
     * Detect the best coordinate offset and check for plant coordinates
     */
    detectOffset(lines) {
        let maxBoreSeen = 0;
        let boreSum = 0;
        let boreCount = 0;

        for (const line of lines) {
            const parts = this.tokenize(line);
            if (parts.length < 4) continue;

            const recordType = parts[0];

            // Record 0/1 often contains units in fixed positions
            if (recordType === 0 || recordType === 1) {
                // Heuristic for units based on common Isogen formats
                // (This is a simplified check, can be expanded)
                if (line.includes('INCH') || (parts.length > 30 && parts[31] === 1)) {
                    this.data.header.bore = 'INCH';
                } else if (line.includes('MM') || (parts.length > 30 && parts[31] === 2)) {
                    this.data.header.bore = 'MM';
                }
            }

            // Use records 20-199 to detect plant coordinates and bore units
            if (recordType >= 20 && recordType < 200) {
                const x = parts[1];
                const y = parts[2];
                const z = parts[3];
                const bore = parts[7];

                if (typeof bore === 'number') {
                    maxBoreSeen = Math.max(maxBoreSeen, bore);
                    boreSum += bore;
                    boreCount++;
                }

                if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
                    // Coordinates > 1000000 are definitely plant absolute (in 0.01mm)
                    if (Math.abs(x) > 1000000 || Math.abs(y) > 1000000) {
                        this.hasPlantCoords = true;
                        if (!this.offset) {
                            // Store offset in scaled units (mm)
                            const scale = 0.01;
                            this.offset = { x: x * scale, y: y * scale, z: z * scale };
                        }
                    }
                }
            }
        }

        // Heuristic auto-detection for bore units if not found in header
        if (this.data.header.bore === 'MM' && boreCount > 0) {
            const avgBore = boreSum / boreCount;
            // If average bore is very small (e.g. < 24) and max is small, might be INCH
            if (maxBoreSeen < 24 && avgBore < 10) {
                console.log(`Auto-detected INCH units based on max bore ${maxBoreSeen}`);
                this.data.header.bore = 'INCH';
            }
        }
    }

    /**
     * Parse Record Types 20-199 (Process Components)
     */
    parseProcessRecord(parts, originalLine) {
        if (parts.length < 8) return;

        const recordType = parts[0];
        // Specific skips for metadata/informational records that look like process records
        if (recordType === 149 || recordType === 151 || recordType === 199) return;

        const x1 = parts[1];
        const y1 = parts[2];
        const z1 = parts[3];
        const x2 = parts[4];
        const y2 = parts[5];
        const z2 = parts[6];
        const bore = parts[7] || 50;

        // Skip if coordinates are missing or invalid
        if (typeof x1 !== 'number' || typeof y1 !== 'number') return;

        // Filter out components that don't look like physical plant items (near origin when in plant mode)
        // Check both endpoints to be sure
        if (this.hasPlantCoords) {
            const isP1NearOrigin = Math.abs(x1) < 50000 && Math.abs(y1) < 50000;
            const isP2NearOrigin = isNaN(x2) ? isP1NearOrigin : (Math.abs(x1) < 50000 && Math.abs(y1) < 50000);
            if (isP1NearOrigin && isP2NearOrigin) {
                console.log(`Skipping paper-space process record ${recordType} at ${x1},${y1}`);
                return;
            }
        }

        // Apply offset/centering AND scale by 0.01 for MM conversion
        // IDF coordinates are typically in 100ths of a unit (0.01mm)
        const scale = 0.01;
        const p1 = this.applyOffset({ x: x1 * scale, y: y1 * scale, z: z1 * scale });

        // Handle second coordinate: in many IDF records, 0 0 0 is just padding/placeholder
        // If we are in plant mode, a real 0 0 0 coordinate is extremely unlikely
        const isP2Placeholder = (this.hasPlantCoords && x2 === 0 && y2 === 0 && z2 === 0) || isNaN(x2);
        const p2 = isP2Placeholder ? null : this.applyOffset({ x: x2 * scale, y: y2 * scale, z: z2 * scale });

        // SPECIAL CASE: Merging Record 35 (Leg 1) and 36 (Leg 2) for Elbows
        if (recordType === 35) {
            this.pendingBend = {
                type: 'ELBOW',
                inlet: p1,
                center: p2, // The intersection point
                bore: bore,
                skey: String(parts[8] || '9000').toUpperCase(),
                idfRecord: recordType
            };
            return;
        }

        if (recordType === 36 && this.pendingBend) {
            // Check if it's the outlet leg for our pending bend
            // They should share the center point
            const dist = Math.abs(this.pendingBend.center.x - p1.x) +
                Math.abs(this.pendingBend.center.y - p1.y) +
                Math.abs(this.pendingBend.center.z - p1.z);

            if (dist < 1) { // Same point
                const component = {
                    type: 'ELBOW',
                    endPoints: [
                        { position: this.pendingBend.inlet, bore: this.pendingBend.bore, connectionType: 'BW' },
                        { position: p2 || p1, bore: bore, connectionType: 'BW' }
                    ],
                    centrePoint: this.pendingBend.center,
                    attributes: {
                        idfRecord: `35/36`,
                        bore: bore,
                        boreUnits: this.data.header.bore,
                        skey: this.pendingBend.skey
                    }
                };
                this.data.components.push(component);
                this.pendingBend = null;
                return;
            } else {
                // Not a match, finalize previous and continue
                this.finalizePendingBend();
            }
        }

        let type = this.mapRecordTypeToPcf(recordType, originalLine);

        // Extract SKEY if available
        let skey = '';
        if (parts.length >= 9) {
            skey = String(parts[8] || '').toUpperCase();
        }

        const component = {
            type: type,
            endPoints: [],
            attributes: {
                idfRecord: recordType,
                originalCoords: [x1, y1, z1],
                bore: bore,
                boreUnits: this.data.header.bore,
                skey: skey || 'NONE'
            }
        };

        component.endPoints.push({ position: p1, bore: bore, connectionType: 'BW' });

        if (p2 && (Math.abs(p1.x - p2.x) > 0.1 || Math.abs(p1.y - p2.y) > 0.1 || Math.abs(p1.z - p2.z) > 0.1)) {
            component.endPoints.push({ position: p2, bore: bore, connectionType: 'BW' });
        }

        this.data.components.push(component);

        // Deduplicate supports
        if (type === 'SUPPORT') {
            const coordKey = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}`;
            if (this.supportsCoords.has(coordKey)) {
                this.data.components.pop();
                return;
            }
            this.supportsCoords.add(coordKey);
        }

        // Calculate length for pipes
        if (type === 'PIPE' && component.endPoints.length >= 2) {
            const ep1 = component.endPoints[0].position;
            const ep2 = component.endPoints[1].position;
            const dx = ep1.x - ep2.x;
            const dy = ep1.y - ep2.y;
            const dz = ep1.z - ep2.z;
            component.attributes.length = Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(0);
        }

        return component;
    }

    /**
     * Finalize any pending bend record that didn't get a matching leg
     */
    finalizePendingBend() {
        if (!this.pendingBend) return null;

        const b = this.pendingBend;
        const component = {
            type: 'ELBOW',
            endPoints: [
                { position: b.inlet, bore: b.bore, connectionType: 'BW' },
                { position: b.center, bore: b.bore, connectionType: 'BW' }
            ],
            attributes: {
                idfRecord: b.idfRecord,
                bore: b.bore,
                boreUnits: this.data.header.bore,
                skey: b.skey
            }
        };
        this.data.components.push(component);
        this.pendingBend = null;
        return component;
    }

    /**
     * Parse Drawing Records 3 and 4 
     */
    parseDrawingRecord(parts, type) {
        const x = parts[2];
        const y = parts[3];
        const z = parts[4];

        if (isNaN(x) || isNaN(y) || isNaN(z)) return;

        // If we have plant coordinates, drawing records (near 0) are just noise
        if (this.hasPlantCoords && Math.abs(x) < 50000 && Math.abs(y) < 50000) {
            return;
        }

        const scale = 0.01;
        const p = this.applyOffset({ x: x * scale, y: y * scale, z: z * scale });

        this.data.components.push({
            type: type === 4 ? 'PIPE' : 'SUPPORT',
            endPoints: [{ position: p, bore: parts[5] || 25, connectionType: 'NONE' }],
            attributes: {
                description: `Drawing Record Type ${type}`,
                idfId: parts[1]
            }
        });
    }

    /**
     * Apply centering offset
     */
    applyOffset(pos) {
        if (!this.offset) return pos;
        return {
            x: pos.x - this.offset.x,
            y: pos.y - this.offset.y,
            z: pos.z - this.offset.z
        };
    }

    /**
     * Mapping of SKEY to component types based on PipeCAD/AVEVA standards
     */
    static SKEY_MAP = {
        'BUBW': 'ELBOW', 'BM**': 'ELBOW', 'ELBW': 'ELBOW', 'EUBW': 'ELBOW',
        'FLWN': 'FLANGE', 'FLSO': 'FLANGE', 'FLGM': 'FLANGE', 'FLFF': 'FLANGE',
        'VALV': 'VALVE', 'VTFL': 'VALVE', 'BALL': 'VALVE', 'GATE': 'VALVE',
        'TEE': 'TEE', 'TIFL': 'TEE', 'OLET': 'TEE',
        'REDU': 'REDUCER-CONCENTRIC', 'TRED': 'REDUCER-CONCENTRIC',
        'GASK': 'GASKET', 'BOLT': 'BOLT',
        'SUPP': 'SUPPORT', 'SPRE': 'SUPPORT',
        'KABW': 'CAP', 'KAFL': 'CAP',
        'FT': 'FLAME-TRAP', 'SG': 'SIGHT-GLASS', 'EX': 'EXPANSION-BELLOWS',
        'CLMP': 'CLAMP', 'COVT': 'COUPLING', 'COCP': 'COUPLING'
    };

    /**
     * Mapping of Record Types to PCF types
     */
    mapRecordTypeToPcf(recordType, line) {
        // 1. Keyword/SKEY check
        const upperLine = line.toUpperCase();

        // Extract SKEY if present (usually 4 chars after the record type and coords)
        const parts = line.trim().split(/\s+/);
        let skey = '';
        if (parts.length >= 9) {
            skey = parts[8].toUpperCase();
        }

        if (skey && IdfParser.SKEY_MAP[skey]) {
            return IdfParser.SKEY_MAP[skey];
        }

        // 2. Keyword check for common patterns
        if (upperLine.includes('VTFL') || upperLine.includes('VALV')) return 'VALVE';
        if (upperLine.includes('FLWN') || upperLine.includes('FLSO') || upperLine.includes('FLNG')) return 'FLANGE';
        if (upperLine.includes('TRED') || upperLine.includes('REDU')) return 'REDUCER-CONCENTRIC';
        if (upperLine.includes('ELBW') || upperLine.includes('BEND')) return 'ELBOW';
        if (upperLine.includes('TEE') || upperLine.includes('TIFL')) return 'TEE';
        if (upperLine.includes('GASK')) return 'GASKET';
        if (upperLine.includes('BOLT')) return 'BOLT';
        if (upperLine.includes('SUPP') || upperLine.includes('SPRE')) return 'SUPPORT';

        // 3. Numeric fallback based on common Isogen usage
        switch (recordType) {
            case 100: return 'PIPE';
            case 105:
            case 106:
            case 107: return 'FLANGE';
            case 110: return 'GASKET';
            case 115: return 'BOLT';
            case 120:
            case 125: return 'REDUCER-CONCENTRIC';
            case 130: return 'VALVE';
            case 140: return 'TEE';
            case 145: return 'TEE'; // Branch
            case 150: return 'ELBOW';
            case 160: return 'ELBOW'; // Bend
            case 170: return 'TEE'; // Olet
            case 180: return 'INSTRUMENT';
            case 40:
            case 41:
            case 42: return 'PIPE'; // Common segment records
            default:
                if (line.includes('PIPE')) return 'PIPE';
                return 'SUPPORT';
        }
    }

    /**
     * Get statistics
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
