/**
 * Flange Geometry Generator
 * Creates flange fittings
 */

import * as THREE from 'three';

export class FlangeGeometry {
    /**
     * Create flange geometry
     * @param {object} component - Component data
     * @param {string} boreUnits - Units for bore (MM or INCH)
     * @param {number} color - Color for the flange
     * @returns {THREE.Mesh}
     */
    static create(component, boreUnits = 'MM', color = null) {
        if (!component.endPoints || component.endPoints.length === 0) {
            return null;
        }

        const position = component.endPoints[0].position;
        const bore = component.endPoints[0].bore;

        // Convert bore to mm if in inches
        let boreInMm = bore;
        if (boreUnits === 'INCH') {
            boreInMm = bore * 25.4;
        }

        const flangeColor = color !== null ? color : 0x94a3b8;

        // Flange dimensions
        const outerRadius = boreInMm * 0.9; // Flange is larger than pipe
        const thickness = Math.max(boreInMm * 0.2, 10); // Minimum thickness

        const geometry = new THREE.CylinderGeometry(outerRadius, outerRadius, thickness, 32);
        const material = new THREE.MeshStandardMaterial({
            color: flangeColor,
            metalness: 0,
            roughness: 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);

        // Align with pipe direction if possible
        if (component.endPoints.length >= 2) {
            const ep1 = component.endPoints[0].position;
            const ep2 = component.endPoints[1].position;
            const direction = new THREE.Vector3(
                ep2.x - ep1.x,
                ep2.y - ep1.y,
                ep2.z - ep1.z
            );

            if (direction.lengthSq() > 0.0001) {
                const axis = new THREE.Vector3(0, 1, 0); // Cylinder Y-axis
                mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
            }
        }

        // Add metadata
        mesh.userData = {
            type: 'FLANGE',
            position,
            bore,
            ...component.attributes
        };

        return mesh;
    }
}
