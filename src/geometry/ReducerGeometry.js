/**
 * Reducer Geometry Generator
 * Creates concentric and eccentric reducers
 */

import * as THREE from 'three';

export class ReducerGeometry {
    /**
     * Create reducer geometry
     * @param {object} component - Component data
     * @returns {THREE.Mesh}
     */
    static create(component, boreUnits = 'MM', colorOverride = null) {
        if (!component.endPoints || component.endPoints.length < 2) {
            return null;
        }

        const ep1 = component.endPoints[0].position;
        const ep2 = component.endPoints[1].position;
        const bore1 = component.endPoints[0].bore;
        const bore2 = component.endPoints[1].bore;

        // Convert bores to mm if in inches
        let radius1 = bore1 / 2;
        let radius2 = bore2 / 2;

        if (boreUnits === 'INCH') {
            radius1 = (bore1 * 25.4) / 2;
            radius2 = (bore2 * 25.4) / 2;
        }

        const start = new THREE.Vector3(ep1.x, ep1.y, ep1.z);
        const end = new THREE.Vector3(ep2.x, ep2.y, ep2.z);

        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();

        if (length < 0.1) return null;

        // Create cone geometry
        const geometry = new THREE.CylinderGeometry(
            radius2,  // Top radius
            radius1,  // Bottom radius
            length,
            32,       // Radial segments
            1,        // Height segments
            false
        );

        const isEccentric = component.type === 'REDUCER-ECCENTRIC';
        const color = colorOverride !== null ? colorOverride : (isEccentric ? 0xef4444 : 0x06b6d4);

        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0,
            roughness: 1
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position at midpoint
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mesh.position.copy(midpoint);

        // Rotate to align with direction
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        // For eccentric reducer, offset slightly
        if (isEccentric) {
            const offset = (radius1 - radius2) / 2;
            const perpendicular = new THREE.Vector3(0, 0, 1);
            if (Math.abs(direction.z) > 0.9) {
                perpendicular.set(1, 0, 0);
            }
            perpendicular.cross(direction).normalize().multiplyScalar(offset);
            mesh.position.add(perpendicular);
        }

        // Add metadata
        mesh.userData = {
            type: component.type,
            startPoint: ep1,
            endPoint: ep2,
            bore1,
            bore2,
            length
        };

        return mesh;
    }
}
