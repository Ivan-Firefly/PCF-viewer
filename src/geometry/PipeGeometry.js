/**
 * Pipe Geometry Generator
 * Creates cylindrical pipe segments
 * Enhanced to handle different bore units
 */

import * as THREE from 'three';

export class PipeGeometry {
    /**
     * Create pipe geometry between two points
     * @param {object} startPoint - {x, y, z}
     * @param {object} endPoint - {x, y, z}
     * @param {number} bore - Pipe bore diameter (in mm or inches based on file)
     * @param {string} boreUnits - 'MM' or 'INCH' (default MM)
     * @param {number} color - Optional color override
     * @returns {THREE.Mesh}
     */
    static create(startPoint, endPoint, bore, boreUnits = 'MM', color = null) {
        const start = new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z);
        const end = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z);

        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();

        if (length < 0.1) return null; // Skip very short pipes

        // Convert bore to mm if in inches
        let boreInMm = bore;
        if (boreUnits === 'INCH') {
            boreInMm = bore * 25.4; // Convert inches to mm
        }

        // Convert bore from mm to appropriate scale
        const radius = boreInMm / 2;
        const wallThickness = Math.max(boreInMm * 0.05, 2); // 5% of bore or 2mm minimum

        // Create pipe as cylinder
        const geometry = new THREE.CylinderGeometry(
            radius,
            radius,
            length,
            32, // radial segments
            1,  // height segments
            false // open ended
        );

        const material = new THREE.MeshStandardMaterial({
            color: color !== null ? color : 0x4a5568,
            metalness: 0,
            roughness: 1,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position pipe at midpoint
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mesh.position.copy(midpoint);

        // Rotate pipe to align with direction
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        // Add metadata
        mesh.userData = {
            type: 'PIPE',
            startPoint,
            endPoint,
            bore,
            boreUnits,
            length
        };

        return mesh;
    }
}
