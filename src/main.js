/**
 * Main Application Entry Point
 * PCF/IDF Viewer with Multi-file Support
 */

import './style.css';
import { PcfParser } from './parsers/PcfParser.js';
import { IdfParser } from './parsers/IdfParser.js';
import { Scene } from './viewer/Scene.js';
import { FileUploader } from './ui/FileUploader.js';
import { ComponentTree } from './ui/ComponentTree.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { FileManager } from './ui/FileManager.js';

class App {
    constructor() {
        this.scene = null;
        this.fileUploader = null;
        this.componentTree = null;
        this.propertiesPanel = null;
        this.fileManager = null;
        this.globalOffset = null;

        this.init();
    }

    init() {
        // Initialize 3D Scene
        const canvasContainer = document.getElementById('canvas-container');
        this.scene = new Scene(canvasContainer);

        // Initialize UI Components
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');
        this.fileUploader = new FileUploader(dropzone, fileInput, (content, filename, extension) => {
            this.loadFile(content, filename, extension);
        });

        const componentTreeEl = document.getElementById('componentTree');
        this.componentTree = new ComponentTree(componentTreeEl, (component, index) => {
            this.onComponentSelected(component, index);
        });

        const propertiesPanelEl = document.getElementById('propertiesPanel');
        this.propertiesPanel = new PropertiesPanel(propertiesPanelEl);

        const fileManagerEl = document.getElementById('fileManager');
        this.fileManager = new FileManager(
            fileManagerEl,
            (filename) => this.scene.toggleFileVisibility(filename),
            (filename) => this.removeFile(filename)
        );

        // Scene callbacks
        this.scene.onComponentSelected = (userData) => {
            if (userData && userData.component) {
                this.propertiesPanel.update(userData.component);

                // Find global index in allComponents for tree selection
                const globalIndex = this.findGlobalIndex(userData.filename, userData.componentIndex);
                if (globalIndex !== -1) {
                    this.componentTree.selectItem(globalIndex);
                }
            } else {
                this.propertiesPanel.clear();
                this.componentTree.clearSelection();
            }
        };

        this.scene.onFilesChanged = (files) => {
            this.fileManager.update(files);
            this.updateComponentTree();
        };

        // Toolbar buttons
        document.getElementById('viewIso').addEventListener('click', () => {
            this.setActiveButton('viewIso');
            this.scene.setCameraView('iso');
        });

        document.getElementById('viewTop').addEventListener('click', () => {
            this.setActiveButton('viewTop');
            this.scene.setCameraView('top');
        });

        document.getElementById('viewFront').addEventListener('click', () => {
            this.setActiveButton('viewFront');
            this.scene.setCameraView('front');
        });

        document.getElementById('viewSide').addEventListener('click', () => {
            this.setActiveButton('viewSide');
            this.scene.setCameraView('side');
        });

        document.getElementById('fitView').addEventListener('click', () => {
            this.scene.fitCameraToSelection();
        });

        document.getElementById('toggleGrid').addEventListener('click', () => {
            this.scene.toggleGrid();
        });
    }

    /**
     * Load and parse file
     */
    async loadFile(content, filename, extension) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('hidden');

        try {
            // Small delay to show loading animation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Parse file
            let parser;
            if (extension === 'pcf') {
                parser = new PcfParser();
            } else {
                parser = new IdfParser();
            }

            // Pass the global offset if it exists to maintain relative positioning
            const data = parser.parse(content, this.globalOffset);

            // If this is the first file with an offset, store it as global for future files
            if (!this.globalOffset && data.offset) {
                this.globalOffset = data.offset;
                console.log('Established global project offset:', this.globalOffset);
            }

            // Load into 3D scene (don't clear existing - multi-file support)
            this.scene.loadPipingData(data, filename, false);

            // Log statistics
            const stats = parser.getStatistics();
            console.log('Loaded:', filename);
            console.log('Total components:', stats.totalComponents);
            console.log('By type:', stats.byType);

        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Error loading ${filename}: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Update component tree with all visible files
     */
    updateComponentTree() {
        const allComponents = [];
        this.scene.fileGroups.forEach((fileData, filename) => {
            if (fileData.visible) {
                fileData.data.components.forEach((comp, localIdx) => {
                    allComponents.push({
                        ...comp,
                        index: localIdx, // Store local index for mapped selection
                        sourceFile: filename
                    });
                });
            }
        });

        this.componentTree.update(allComponents);
    }

    /**
     * Remove a file
     */
    removeFile(filename) {
        if (confirm(`Remove ${filename}?`)) {
            this.scene.removeFile(filename);
        }
    }

    /**
     * Handle component selection from tree
     */
    onComponentSelected(component, index) {
        this.propertiesPanel.update(component);

        // Find and select in 3D scene using source file and local index
        if (component.sourceFile !== undefined && component.index !== undefined) {
            const fileData = this.scene.fileGroups.get(component.sourceFile);
            if (fileData && fileData.visible) {
                // Find the mesh that matches this local index
                const targetMesh = fileData.group.children.find(
                    child => child.userData.componentIndex === component.index
                );

                if (targetMesh) {
                    this.scene.selectObject(targetMesh);
                }
            }
        }
    }

    /**
     * Find the global index in the flattened component list
     * given a source filename and local component index
     */
    findGlobalIndex(filename, localIndex) {
        let globalIndex = -1;
        let counter = 0;

        // This must match the logic in updateComponentTree
        this.scene.fileGroups.forEach((fileData, fname) => {
            if (fileData.visible) {
                fileData.data.components.forEach((comp, idx) => {
                    if (fname === filename && idx === localIndex) {
                        globalIndex = counter;
                    }
                    counter++;
                });
            }
        });

        return globalIndex;
    }

    /**
     * Set active toolbar button
     */
    setActiveButton(buttonId) {
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(buttonId).classList.add('active');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
