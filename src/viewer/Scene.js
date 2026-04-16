/**
 * Three.js Scene Manager
 * Handles 3D scene setup, rendering, and component visualization
 * Includes box-selection (rubber-band) mode
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
        this.onFilesChanged = null;
        this.onBoxSelectionComplete = null;

        // Box selection state
        this.boxSelectMode = false;
        this.boxSelectActive = false;
        this.boxSelectStart = { x: 0, y: 0 };
        this.boxSelectEnd = { x: 0, y: 0 };
        this._boxSelectEl = null;
        this._boxSelectedObjects = [];

        // Bound event handlers (for removal)
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseMoveSel = this._handleMouseMoveSel.bind(this);
        this._onMouseUp = this._handleMouseUp.bind(this);

        this.init();
    }

    /**
     * Initialize the scene
     */
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Light blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 1000000, 500000000);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 100, 1000000000);
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
        this.controls.maxDistance = 2000000000;

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
        this.grid.rotateX(Math.PI / 2);
        this.grid.material.opacity = 0.1;
        this.grid.material.transparent = true;
        this.scene.add(this.grid);

        // Axes
        this.axes = new THREE.AxesHelper(1000);
        this.scene.add(this.axes);

        // Add piping group
        this.scene.add(this.pipingGroup);

        // Selection box DOM element
        this._boxSelectEl = document.getElementById('selectionBox');

        // Standard event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Start animation loop
        this.animate();
    }

    // ===================================================================
    // BOX SELECTION
    // ===================================================================

    /**
     * Toggle box-select mode on/off.
     * Returns true if now active, false if deactivated.
     */
    toggleBoxSelectMode() {
        this.boxSelectMode = !this.boxSelectMode;

        if (this.boxSelectMode) {
            // Disable orbit while in box-select mode
            this.controls.enabled = false;
            this.renderer.domElement.addEventListener('mousedown', this._onMouseDown);
            this.renderer.domElement.addEventListener('mousemove', this._onMouseMoveSel);
            this.renderer.domElement.addEventListener('mouseup', this._onMouseUp);
            this.renderer.domElement.style.cursor = 'crosshair';
        } else {
            this._exitBoxSelectMode();
        }

        return this.boxSelectMode;
    }

    _exitBoxSelectMode() {
        this.boxSelectMode = false;
        this.boxSelectActive = false;
        this.controls.enabled = true;
        this.renderer.domElement.removeEventListener('mousedown', this._onMouseDown);
        this.renderer.domElement.removeEventListener('mousemove', this._onMouseMoveSel);
        this.renderer.domElement.removeEventListener('mouseup', this._onMouseUp);
        this.renderer.domElement.style.cursor = 'default';
        if (this._boxSelectEl) this._boxSelectEl.classList.add('hidden');
    }

    _handleMouseDown(e) {
        if (e.button !== 0) return; // left button only
        this.boxSelectActive = true;
        const rect = this.container.getBoundingClientRect();
        this.boxSelectStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.boxSelectEnd = { ...this.boxSelectStart };
        this._updateSelectionBoxDOM();
    }

    _handleMouseMoveSel(e) {
        if (!this.boxSelectActive) return;
        const rect = this.container.getBoundingClientRect();
        this.boxSelectEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this._updateSelectionBoxDOM();
    }

    _handleMouseUp(e) {
        if (!this.boxSelectActive) return;
        this.boxSelectActive = false;

        const rect = this.container.getBoundingClientRect();
        this.boxSelectEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (this._boxSelectEl) this._boxSelectEl.classList.add('hidden');

        // Perform the selection
        this._performBoxSelection();
    }

    _updateSelectionBoxDOM() {
        if (!this._boxSelectEl) return;
        const x = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const y = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const w = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
        const h = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);

        this._boxSelectEl.style.left = x + 'px';
        this._boxSelectEl.style.top = y + 'px';
        this._boxSelectEl.style.width = w + 'px';
        this._boxSelectEl.style.height = h + 'px';
        this._boxSelectEl.classList.remove('hidden');
    }

    /**
     * Find all meshes whose projected screen position falls inside the selection box.
     * Uses bounding sphere center projected to screen.
     */
    _performBoxSelection() {
        const rect = this.container.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;

        const x0 = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const x1 = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const y0 = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const y1 = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);

        // Minimum box size to avoid accidental zero-area click
        if ((x1 - x0) < 3 && (y1 - y0) < 3) return;

        // Normalize box to NDC range [-1, 1]
        const ndcX0 = (x0 / cw) * 2 - 1;
        const ndcX1 = (x1 / cw) * 2 - 1;
        const ndcY0 = -((y1 / ch) * 2 - 1); // flip Y
        const ndcY1 = -((y0 / ch) * 2 - 1);

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);

        // Build a selection frustum from the box NDC corners
        // We use a simpler approach: project each mesh center to screen space
        const selectedComponents = [];
        const seenKeys = new Set();

        // Collect all top-level mesh objects
        this.pipingGroup.traverse((obj) => {
            if (!obj.isMesh && !obj.isGroup) return;

            // Only process direct component objects (have componentIndex)
            if (obj.userData.componentIndex === undefined) return;

            // Get world position of object center
            const worldPos = new THREE.Vector3();
            obj.getWorldPosition(worldPos);

            // Project to NDC
            const ndc = worldPos.clone().project(this.camera);

            // Check if inside box
            if (ndc.x >= ndcX0 && ndc.x <= ndcX1 && ndc.y >= ndcY0 && ndc.y <= ndcY1) {
                const compIdx = obj.userData.componentIndex;
                const fname = obj.userData.filename;
                const key = `${fname}::${compIdx}`;

                if (!seenKeys.has(key)) {
                    seenKeys.add(key);

                    // Get the actual component data
                    const fileData = this.fileGroups.get(fname);
                    if (fileData && fileData.data.components[compIdx]) {
                        const comp = fileData.data.components[compIdx];
                        selectedComponents.push({
                            ...comp,
                            index: compIdx,
                            sourceFile: fname
                        });
                    }
                }
            }
        });

        // Highlight selected objects in 3D
        this._highlightBoxSelection(seenKeys);

        // Notify callback
        if (this.onBoxSelectionComplete) {
            this.onBoxSelectionComplete(selectedComponents);
        }
    }

    _highlightBoxSelection(keySet) {
        // Clear all highlights first
        this.pipingGroup.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                obj.material.emissive = new THREE.Color(0x000000);
                obj.material.emissiveIntensity = 0;
            }
        });

        // Apply selection highlight
        this.pipingGroup.traverse((obj) => {
            if (!obj.isMesh) return;
            const compIdx = obj.userData.componentIndex;
            const fname = obj.userData.filename;
            if (compIdx === undefined) return;
            const key = `${fname}::${compIdx}`;
            if (keySet.has(key)) {
                obj.material.emissive = new THREE.Color(0x0ea5e9);
                obj.material.emissiveIntensity = 0.5;
            }
        });
    }

    // ===================================================================
    // LOAD PIPING DATA
    // ===================================================================

    /**
     * Load piping data for a single file
     */
    loadPipingData(data, filename, clearExisting = true) {
        if (clearExisting) {
            this.clearPiping();
        }

        console.log('Loading piping data:', data.components.length, 'components from', filename);

        const fileGroup = new THREE.Group();
        fileGroup.name = filename;

        const fileColor = this.generateFileColor(this.fileGroups.size);

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
                        break;

                    default:
                        mesh = this.createMarker(component, fileColor);
                        break;
                }
            } catch (err) {
                console.warn(`Error creating geometry for ${component.type}:`, err);
            }

            if (!mesh && component.endPoints && component.endPoints.length > 0) {
                mesh = this.createMarker(component, fileColor);
            }

            if (mesh) {
                mesh.userData.componentIndex = index;
                mesh.userData.component = component;
                mesh.userData.filename = filename;
                // Propagate userData to children (Groups)
                if (mesh.isGroup) {
                    mesh.traverse(child => {
                        if (child !== mesh) {
                            child.userData.componentIndex = index;
                            child.userData.filename = filename;
                        }
                    });
                }
                fileGroup.add(mesh);
                successCount++;
            }
        });

        this.fileGroups.set(filename, {
            group: fileGroup,
            data: data,
            visible: true,
            color: fileColor
        });

        this.pipingGroup.add(fileGroup);

        console.log(`Successfully created ${successCount} meshes for ${filename}`);

        if (this.onFilesChanged) {
            this.onFilesChanged(Array.from(this.fileGroups.entries()));
        }

        this.fitCameraToSelection();
    }

    /**
     * Generate a distinct color for each file
     */
    generateFileColor(index) {
        return 0x4ade80; // Vibrant Bright Green
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
            this.pipingGroup.remove(fileData.group);

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

        const fov = this.camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        const distance = cameraZ * 1.2;

        if (distance * 2 > this.camera.far) {
            this.camera.far = distance * 5;
            this.camera.updateProjectionMatrix();
            if (this.scene.fog) {
                this.scene.fog.near = distance;
                this.scene.fog.far = distance * 5;
            }
        }

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
     * Mouse click handler (only fires outside box-select mode)
     */
    onMouseClick(event) {
        if (this.boxSelectMode) return; // handled by box-select
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
        if (this.boxSelectMode) return;
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
        this.deselectObject();

        let targetObject = object;
        while (targetObject.parent &&
            targetObject.parent !== this.pipingGroup &&
            !targetObject.userData.component &&
            targetObject.parent.parent !== this.pipingGroup) {
            targetObject = targetObject.parent;
        }

        this.selectedObject = targetObject;

        this.selectedObject.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.userData.originalColor === undefined) {
                    child.userData.originalColor = child.material.color.getHex();
                }
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.6;
            }
        });

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
