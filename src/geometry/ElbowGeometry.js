/**
 * Elbow Geometry Generator
 * Creates elbow/bend fittings
 */

import * as THREE from 'three';

export class ElbowGeometry {
    /**
     * Create elbow geometry
     * @param {object} component - Component data with endPoints and centrePoint
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

        const start = new THREE.Vector3(ep1.x, ep1.y, ep1.z);
        const end = new THREE.Vector3(ep2.x, ep2.y, ep2.z);

        // Calculate center point
        // In IDF/PCF, the provided 'centrePoint' is usually the intersection vertex (V)
        // of the two legs. The actual torus center (C) is offset along the bisector.
        let vertex;
        if (component.centrePoint) {
            vertex = new THREE.Vector3(
                component.centrePoint.x,
                component.centrePoint.y,
                component.centrePoint.z
            );
        } else {
            // Estimate vertex as midpoint (though this won't be perfect for elbows)
            vertex = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        }

        // Vectors from vertex to endpoints
        const v1 = new THREE.Vector3().subVectors(start, vertex);
        const v2 = new THREE.Vector3().subVectors(end, vertex);

        const L1 = v1.length();
        const L2 = v2.length();
        const tangentLength = (L1 + L2) / 2;

        if (tangentLength < 0.1) return null;

        // Angle between legs (alpha)
        const alpha = v1.angleTo(v2);

        // Bend angle (theta) = 180 - alpha
        const bendAngle = Math.PI - alpha;

        if (bendAngle < 0.01) return null; // Straight pipe

        // Calculate true bend radius (R)
        // R = T * tan(alpha / 2)
        const bendRadius = tangentLength * Math.tan(alpha / 2);

        // Create torus for the bend
        const pipeRadius = boreInMm / 2;
        const geometry = new THREE.TorusGeometry(
            bendRadius,      // Radius of the torus
            pipeRadius,      // Tube radius
            16,              // Radial segments
            32,              // Tubular segments
            bendAngle        // Arc angle
        );

        const material = new THREE.MeshStandardMaterial({
            color: color !== null ? color : 0x10b981,
            metalness: 0,
            roughness: 1
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Find true torus center (C)
        // C = V + normalize(bisector) * (tangentLength / cos(alpha/2))
        const bisector = new THREE.Vector3().addVectors(v1.clone().normalize(), v2.clone().normalize()).normalize();
        const distFromVertexToCenter = tangentLength / Math.cos(alpha / 2);
        const trueCenter = vertex.clone().add(bisector.clone().multiplyScalar(distFromVertexToCenter));

        // Position at the calculated arc center
        mesh.position.copy(trueCenter);

        // Orient the torus
        // The arc starts at E1. Let's find the radius vectors from center to endpoints.
        const cToE1 = new THREE.Vector3().subVectors(start, trueCenter).normalize();
        const cToE2 = new THREE.Vector3().subVectors(end, trueCenter).normalize();

        // The rotation axis for the torus MUST be the cross product of radius vectors
        // to ensure the arc goes from E1 to E2 correctly.
        let zAxis = new THREE.Vector3().crossVectors(cToE1, cToE2).normalize();

        // Fallback for 180 degree turns or degenerate cases
        if (zAxis.length() < 0.01) {
            zAxis = new THREE.Vector3(0, 0, 1);
        }

        const xAxis = cToE1; // Torus start direction (arc starts from local X)
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

        const matrix = new THREE.Matrix4();
        matrix.makeBasis(xAxis, yAxis, zAxis);
        mesh.quaternion.setFromRotationMatrix(matrix);

        // Add metadata
        mesh.userData = {
            type: 'ELBOW',
            startPoint: ep1,
            endPoint: ep2,
            centrePoint: component.centrePoint,
            bore,
            angle: (bendAngle * 180 / Math.PI).toFixed(1) + '°'
        };

        return mesh;
    }
}
