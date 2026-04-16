/**
 * File Uploader UI Component
 * Handles file upload via drag-and-drop or file browser - supports multiple files
 */

export class FileUploader {
    constructor(dropzoneElement, fileInputElement, onFileLoaded) {
        this.dropzone = dropzoneElement;
        this.fileInput = fileInputElement;
        this.onFileLoaded = onFileLoaded;

        this.init();
    }

    init() {
        // Click to browse
        this.dropzone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change - supports multiple files
        this.fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => this.handleFile(file));
        });

        // Drag and drop
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');

            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => this.handleFile(file));
        });
    }

    handleFile(file) {
        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension !== 'pcf' && extension !== 'idf') {
            alert(`Skipping ${file.name}: Please select a PCF or IDF file`);
            return;
        }

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (this.onFileLoaded) {
                this.onFileLoaded(content, file.name, extension);
            }
        };
        reader.readAsText(file);
    }
}
