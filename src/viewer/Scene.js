/**
 * Three.js Scene Manager
 * Handles 3D scene setup, rendering, and component visualization
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PipeGeometry } from '../geometry/PipeGeometry.js';
import { ElbowGeometry } from '../geometry/ElbowGeometry.js';
import { TeeGeometry } from '../geometry/TeeGeometry.js';
import { ValveGeometry } from '../geometry/ValveGeometry.js';
import { ReducerGeometry } from '../geometry/ReducerGeometry.js';
import { SupportGeometry } from '../geometry/SupportGeometry.js';
import { FlangeGeometry } from '../geometry/FlangeGeometry.js';

export class Scene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pipingGroup = new THREE.Group();
        this.fileGroups = new Map(); // Store multiple files
        this.selectedObject = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.grid = null;
        this.axes = null;
        this.onComponentSelected = null;
        this.onFilesChanged = null; // Callback for file list updates

        this.init();
    }

    /**
     * Initialize the scene
     */
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Light blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 1000000, 500000000); // Very far fog by default

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 100, 1000000000); // 1e9 far plane
        this.camera.up.set(0, 0, 1); // Z is up
        this.camera.position.set(2000, -2000, 2000);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 2000000000; // 2e9
        // Note: OrbitControls naturally uses camera.up

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight1.position.set(1000, 2000, 1000);
        directionalLight1.castShadow = true;
        this.scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-1000, -1000, -1000);
        this.scene.add(directionalLight2);

        // Grid (lying on XY plane)
        this.grid = new THREE.GridHelper(10000, 100, 0x3b82f6, 0x777777);
        this.grid.rotateX(Math.PI / 2); // Rotate to XY plane
        this.grid.material.opacity = 0.1;
        this.grid.material.transparent = true;
        this.scene.add(this.grid);

        // Axes
        this.axes = new THREE.AxesHelper(1000);
        this.scene.add(this.axes);

        // Add piping group
        this.scene.add(this.pipingGroup);

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Start animation loop
        this.animate();
    }

    /**
     * Load piping data for a single file
     */
    loadPipingData(data, filename, clearExisting = true) {
        if (clearExisting) {
            this.clearPiping();
        }

        console.log('Loading piping data:', data.components.length, 'components from', filename);

        // Create a group for this file
        const fileGroup = new THREE.Group();
        fileGroup.name = filename;

        // Generate color for this file
        const fileColor = this.generateFileColor(this.fileGroups.size);

        // Create geometry for each component
        let successCount = 0;
        data.components.forEach((component, index) => {
            let mesh = null;

            try {
                const boreUnits = component.attributes?.boreUnits || data.header?.bore || 'MM';

                switch (component.type) {
                    case 'PIPE':
                        if (component.endPoints.length >= 2) {
                            mesh = PipeGeometry.create(
                                component.endPoints[0].position,
                                component.endPoints[1].position,
                                component.endPoints[0].bore,
                                boreUnits,
                                fileColor
                            );
                        }
                        break;

                    case 'ELBOW':
                        mesh = ElbowGeometry.create(component, boreUnits, fileColor);
                        break;

                    case 'TEE':
                    case 'OLET':
                        mesh = TeeGeometry.create(component, boreUnits, fileColor);
                        break;

                    case 'VALVE':
                        // Create background pipe for the valve segment
                        if (component.endPoints.length >= 2) {
                            const pipe = PipeGeometry.create(
                                component.endPoints[0].position,
                                component.endPoints[1].position,
                                component.endPoints[0].bore,
                                boreUnits,
                                fileColor
                            );
                            if (pipe) fileGroup.add(pipe);
                        }
                        mesh = ValveGeometry.create(component, boreUnits, fileColor);
                        break;

                    case 'REDUCER-CONCENTRIC':
                    case 'REDUCER-ECCENTRIC':
                    case 'REDUCER':
                        mesh = ReducerGeometry.create(component, boreUnits, fileColor);
                        break;

                    case 'FLANGE':
                        // Draw flange and ensure pipe is shown
                        if (component.endPoints.length >= 2) {
                            const pipe = PipeGeometry.create(
                                component.endPoints[0].position,
                                component.endPoints[1].position,
                                component.endPoints[0].bore,
                                boreUnits,
                                fileColor
                            );
                            if (pipe) fileGroup.add(pipe);
                        }
                        mesh = FlangeGeometry.create(component, boreUnits, fileColor);
                        break;

                    case 'SUPPORT':
                        // Draw shoe support and ensure pipe is shown
                        if (component.endPoints.length >= 2) {
                            const pipe = PipeGeometry.create(
                                component.endPoints[0].position,
                                component.endPoints[1].position,
                                component.endPoints[0].bore,
                                boreUnits,
                                fileColor
                            );
                            if (pipe) fileGroup.add(pipe);
                        }
                        mesh = SupportGeometry.create(component, fileColor);
                        break;

                    case 'GASKET':
                        // Gaskets just show the pipe
                        if (component.endPoints.length >= 2) {
                            mesh = PipeGeometry.create(
                                component.endPoints[0].position,
                                component.endPoints[1].position,
                                component.endPoints[0].bore,
                                boreUnits,
                                fileColor
                            );
                        }
                        break;

                    case 'BOLT':
                        // Skip or show marker
                        break;

                    default:
                        mesh = this.createMarker(component, fileColor);
                        break;
                }
            } catch (err) {
                console.warn(`Error creating geometry for ${component.type}:`, err);
            }

            // Fallback for failed specialized geometry or components with at least one point
            if (!mesh && component.endPoints && component.endPoints.length > 0) {
                mesh = this.createMarker(component, fileColor);
            }

            if (mesh) {
                mesh.userData.componentIndex = index;
                mesh.userData.component = component;
                mesh.userData.filename = filename;
                fileGroup.add(mesh);
                successCount++;
            }
        });

        // Store file metadata
        this.fileGroups.set(filename, {
            group: fileGroup,
            data: data,
            visible: true,
            color: fileColor
        });

        // Add to scene
        this.pipingGroup.add(fileGroup);

        console.log(`Successfully created ${successCount} meshes for ${filename}`);
        console.log('File group children:', fileGroup.children.length);
        console.log('Piping group children:', this.pipingGroup.children.length);

        // Log first component for debugging
        if (fileGroup.children.length > 0) {
            const firstMesh = fileGroup.children[0];
            console.log('First mesh position:', firstMesh.position);
            console.log('First mesh userData:', firstMesh.userData);
        }

        // Notify callback
        if (this.onFilesChanged) {
            this.onFilesChanged(Array.from(this.fileGroups.entries()));
        }

        // Fit camera to view all components
        this.fitCameraToSelection();
    }

    /**
     * Generate a distinct color for each file
     * User requested green for components
     */
    generateFileColor(index) {
        return 0x4ade80; // Vibrant Bright Green as requested
    }

    /**
     * Toggle file visibility
     */
    toggleFileVisibility(filename) {
        const fileData = this.fileGroups.get(filename);
        if (fileData) {
            fileData.visible = !fileData.visible;
            fileData.group.visible = fileData.visible;

            if (this.onFilesChanged) {
                this.onFilesChanged(Array.from(this.fileGroups.entries()));
            }
        }
    }

    /**
     * Remove a file
     */
    removeFile(filename) {
        const fileData = this.fileGroups.get(filename);
        if (fileData) {
            // Remove from scene
            this.pipingGroup.remove(fileData.group);

            // Dispose of geometries and materials
            fileData.group.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });

            // Remove from map
            this.fileGroups.delete(filename);

            if (this.onFilesChanged) {
                this.onFilesChanged(Array.from(this.fileGroups.entries()));
            }

            this.fitCameraToSelection();
        }
    }

    /**
     * Create a marker for unsupported component types
     */
    createMarker(component) {
        if (!component.endPoints || component.endPoints.length === 0) return null;

        const position = component.endPoints[0].position;
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            metalness: 0.5,
            roughness: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        mesh.userData = { type: component.type, ...component };

        return mesh;
    }

    /**
     * Clear all piping geometry
     */
    clearPiping() {
        while (this.pipingGroup.children.length > 0) {
            const child = this.pipingGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.pipingGroup.remove(child);
        }
        this.selectedObject = null;
    }

    /**
     * Fit camera to view all components
     */
    fitCameraToSelection() {
        const box = new THREE.Box3();
        box.setFromObject(this.pipingGroup);

        if (box.isEmpty()) {
            console.warn('Bounding box is empty - no geometry to fit camera to');
            return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        console.log('Bounding box:', {
            min: box.min,
            max: box.max,
            center: center,
            size: size,
            maxDim: maxDim
        });

        const fov = this.camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        const distance = cameraZ * 1.2; // Tighter zoom as requested (was 1.5)

        // Dynamic clipping plane adjustment for huge models
        if (distance * 2 > this.camera.far) {
            this.camera.far = distance * 5;
            this.camera.updateProjectionMatrix();
            if (this.scene.fog) {
                this.scene.fog.near = distance;
                this.scene.fog.far = distance * 5;
            }
        }

        // Position camera in isometric view
        const direction = new THREE.Vector3(1, -1, 1).normalize();
        this.camera.position.copy(center).add(direction.multiplyScalar(distance));
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }

    /**
     * Set camera view
     */
    setCameraView(view) {
        const box = new THREE.Box3();
        box.setFromObject(this.pipingGroup);
        const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
        const size = box.isEmpty() ? 2000 : box.getSize(new THREE.Vector3()).length() * 1.2;

        switch (view) {
            case 'iso':
                this.camera.position.set(center.x + size, center.y - size, center.z + size);
                break;
            case 'top':
                this.camera.position.set(center.x, center.y, center.z + size);
                break;
            case 'front':
                this.camera.position.set(center.x, center.y - size, center.z);
                break;
            case 'side':
                this.camera.position.set(center.x + size, center.y, center.z);
                break;
        }

        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.grid.visible = !this.grid.visible;
        this.axes.visible = !this.axes.visible;
    }

    /**
     * Mouse click handler
     */
    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.pipingGroup.children, true);

        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
        } else {
            this.deselectObject();
        }
    }

    /**
     * Mouse move handler (for hover effects)
     */
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.pipingGroup.children, true);

        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    /**
     * Select an object
     */
    selectObject(object) {
        // Deselect previous
        this.deselectObject();

        // Find the component-level object
        // Components are usually the direct children of a fileGroup, 
        // but some might be groups themselves. We look for the one with component data.
        let targetObject = object;
        while (targetObject.parent &&
            targetObject.parent !== this.pipingGroup &&
            !targetObject.userData.component &&
            targetObject.parent.parent !== this.pipingGroup) {
            targetObject = targetObject.parent;
        }

        this.selectedObject = targetObject;

        // Highlight selected object (Red highlight as requested)
        this.selectedObject.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.userData.originalColor === undefined) {
                    child.userData.originalColor = child.material.color.getHex();
                }
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.6;
            }
        });

        // Notify callback with full metadata for syncing
        if (this.onComponentSelected && this.selectedObject.userData) {
            this.onComponentSelected(this.selectedObject.userData);
        }
    }

    /**
     * Deselect current object
     */
    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.traverse((child) => {
                if (child.isMesh && child.material && child.userData.originalColor !== undefined) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
            this.selectedObject = null;

            if (this.onComponentSelected) {
                this.onComponentSelected(null);
            }
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.clearPiping();
        this.controls.dispose();
        this.renderer.dispose();
        window.removeEventListener('resize', () => this.onWindowResize());
    }
}
