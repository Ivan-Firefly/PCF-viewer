/**
 * Valve Geometry Generator
 * Creates valve fittings
 */

import * as THREE from 'three';

export class ValveGeometry {
    /**
     * Create valve geometry
     * @param {object} component - Component data
     * @returns {THREE.Group}
     */
    static create(component, boreUnits = 'MM', color = null) {
        if (!component.endPoints || component.endPoints.length === 0) {
            return null;
        }

        const ep1 = component.endPoints[0].position;
        const bore = component.endPoints[0].bore;

        // Convert bore to mm if in inches
        let boreInMm = bore;
        if (boreUnits === 'INCH') {
            boreInMm = bore * 25.4;
        }

        const group = new THREE.Group();
        const valveColor = color !== null ? color : 0x8b5cf6;

        let midpoint, direction, length;
        let start, end;

        if (component.endPoints.length >= 2) {
            const ep2 = component.endPoints[1].position;
            start = new THREE.Vector3(ep1.x, ep1.y, ep1.z);
            end = new THREE.Vector3(ep2.x, ep2.y, ep2.z);
            midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            direction = new THREE.Vector3().subVectors(end, start);
            length = direction.length();
        } else {
            // Single point valve fallback
            midpoint = new THREE.Vector3(ep1.x, ep1.y, ep1.z);
            direction = new THREE.Vector3(0, 0, 1); // Default vertical
            length = boreInMm * 2; // Default length
        }

        // Valve body (larger cylinder)
        const bodyRadius = boreInMm * 1.0;
        const bodyLength = Math.min(length > 0.1 ? length * 0.8 : boreInMm * 2, boreInMm * 2.5);
        const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyLength, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: valveColor,
            metalness: 0,
            roughness: 1
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.copy(midpoint);
        body.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.lengthSq() > 0.0001 ? direction.normalize() : new THREE.Vector3(0, 0, 1)
        );
        group.add(body);

        // Add connection pipes
        if (component.endPoints.length >= 2) {
            const connectorLength = (length - bodyLength) / 2;
            if (connectorLength > 0.1) {
                const pipeRadius = boreInMm / 2;
                const connectorGeometry = new THREE.CylinderGeometry(pipeRadius, pipeRadius, connectorLength, 12);
                const pipeMaterial = new THREE.MeshStandardMaterial({
                    color: 0x6b7280,
                    metalness: 0,
                    roughness: 1
                });

                // Connector 1
                const connector1 = new THREE.Mesh(connectorGeometry, pipeMaterial);
                const conn1Pos = new THREE.Vector3().lerpVectors(start, midpoint, 0.5);
                connector1.position.copy(conn1Pos);
                connector1.quaternion.copy(body.quaternion);
                group.add(connector1);

                // Connector 2
                const connector2 = new THREE.Mesh(connectorGeometry, pipeMaterial);
                const conn2Pos = new THREE.Vector3().lerpVectors(midpoint, end, 0.5);
                connector2.position.copy(conn2Pos);
                connector2.quaternion.copy(body.quaternion);
                group.add(connector2);
            }
        }

        // Add metadata
        group.userData = {
            type: 'VALVE',
            startPoint: ep1,
            endPoints: component.endPoints,
            bore,
            ...component.attributes
        };

        return group;
    }

    /**
     * Get spindle direction vector
     */
    static getSpindleVector(direction) {
        const vectors = {
            'UP': new THREE.Vector3(0, 0, 1),
            'DOWN': new THREE.Vector3(0, 0, -1),
            'NORTH': new THREE.Vector3(0, 1, 0),
            'SOUTH': new THREE.Vector3(0, -1, 0),
            'EAST': new THREE.Vector3(1, 0, 0),
            'WEST': new THREE.Vector3(-1, 0, 0)
        };
        return vectors[direction] || new THREE.Vector3(0, 0, 1);
    }
}
