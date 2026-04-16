/**
 * Tee Geometry Generator
 * Creates tee fittings with branches
 */

import * as THREE from 'three';

export class TeeGeometry {
    /**
     * Create tee geometry
     * @param {object} component - Component data with endPoints and branchPoint
     * @returns {THREE.Group}
     */
    static create(component, boreUnits = 'MM', color = null) {
        if (!component.endPoints || component.endPoints.length < 2) {
            return null;
        }

        const ep1 = component.endPoints[0].position;
        const ep2 = component.endPoints[1].position;
        const bore = component.endPoints[0].bore;

        // Convert bore to mm if in inches
        let boreInMm = bore;
        if (boreUnits === 'INCH') {
            boreInMm = bore * 25.4;
        }

        const group = new THREE.Group();
        const teeColor = color !== null ? color : 0xf59e0b;

        // Main run (from endpoint 1 to endpoint 2)
        const mainPipe = this.createPipeSegment(ep1, ep2, boreInMm, teeColor);
        if (mainPipe) group.add(mainPipe);

        // Branch
        if (component.branchPoint && component.centrePoint) {
            const branchStart = component.centrePoint;
            const branchEnd = component.branchPoint.position;
            const branchBore = component.branchPoint.bore || bore;

            let branchBoreInMm = branchBore;
            if (boreUnits === 'INCH') {
                branchBoreInMm = branchBore * 25.4;
            }

            const branchPipe = this.createPipeSegment(branchStart, branchEnd, branchBoreInMm, teeColor);
            if (branchPipe) group.add(branchPipe);

            // Add junction sphere at center
            const junctionGeometry = new THREE.SphereGeometry(boreInMm / 2, 16, 16);
            const junctionMaterial = new THREE.MeshStandardMaterial({
                color: teeColor,
                metalness: 0,
                roughness: 1
            });
            const junction = new THREE.Mesh(junctionGeometry, junctionMaterial);
            junction.position.set(branchStart.x, branchStart.y, branchStart.z);
            group.add(junction);
        }

        // Add metadata
        group.userData = {
            type: 'TEE',
            endPoints: component.endPoints,
            branchPoint: component.branchPoint,
            centrePoint: component.centrePoint,
            bore
        };

        return group;
    }

    /**
     * Helper to create a pipe segment
     */
    static createPipeSegment(start, end, bore) {
        const startVec = new THREE.Vector3(start.x, start.y, start.z);
        const endVec = new THREE.Vector3(end.x, end.y, end.z);

        const direction = new THREE.Vector3().subVectors(endVec, startVec);
        const length = direction.length();

        if (length < 0.1) return null;

        const radius = bore / 2;
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0,
            roughness: 1
        });

        const mesh = new THREE.Mesh(geometry, material);

        const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
        mesh.position.copy(midpoint);

        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        return mesh;
    }
}
