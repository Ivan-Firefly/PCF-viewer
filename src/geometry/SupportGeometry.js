/**
 * Support/Marker Geometry Generator
 * Creates sphere markers for supports and IDF points
 */

import * as THREE from 'three';

export class SupportGeometry {
    /**
     * Create support marker geometry
     * @param {object} component - Component data
     * @returns {THREE.Mesh}
     */
    static create(component, colorOverride = null) {
        if (!component.endPoints || component.endPoints.length === 0) {
            return null;
        }

        const position = component.endPoints[0].position;
        const bore = component.endPoints[0].bore || 50;
        const radius = bore / 2;

        const group = new THREE.Group();
        const color = colorOverride !== null ? colorOverride : 0x94a3b8;
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0,
            roughness: 1
        });

        // Create Shoe Support (Horizontal Plate Only)
        const plateWidth = bore * 1.5;
        const plateLength = bore * 2;
        const plateThickness = Math.max(bore * 0.15, 10);
        // In Z-up system, plate is in XY plane, thickness is Z
        const plateGeometry = new THREE.BoxGeometry(plateWidth, plateLength, plateThickness);
        const plate = new THREE.Mesh(plateGeometry, material);

        // Position plate below the pipe (radius + clearance + half thickness) in Z-up system
        const clearance = Math.max(bore * 0.2, 20);
        plate.position.set(0, 0, -(radius + clearance + plateThickness / 2));
        group.add(plate);

        group.position.set(position.x, position.y, position.z);

        // Add metadata
        group.userData = {
            type: component.type,
            position,
            bore,
            ...component.attributes
        };

        return group;
    }
}
