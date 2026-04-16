/**
 * File Manager UI Component
 * Manages multiple loaded files
 */

export class FileManager {
    constructor(containerElement, onFileToggle, onFileRemove) {
        this.container = containerElement;
        this.onFileToggle = onFileToggle;
        this.onFileRemove = onFileRemove;
        this.files = [];
    }

    /**
     * Update file list
     */
    update(files) {
        this.files = files;
        this.render();
    }

    /**
     * Render the file list
     */
    render() {
        if (!this.files || this.files.length === 0) {
            this.container.innerHTML = '<p class="empty-state">No files loaded</p>';
            return;
        }

        let html = '<div class="file-list">';

        this.files.forEach(([filename, fileData]) => {
            const visibleClass = fileData.visible ? 'visible' : 'hidden';
            const colorStyle = `background-color: #${fileData.color.toString(16).padStart(6, '0')}`;

            html += `
        <div class="file-item ${visibleClass}" data-filename="${filename}">
          <div class="file-color" style="${colorStyle}"></div>
          <div class="file-info">
            <div class="file-name">${this.truncateFilename(filename)}</div>
            <div class="file-stats">${fileData.data.components.length} components</div>
          </div>
          <button class="file-toggle-btn" title="Toggle visibility">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              ${fileData.visible
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>'
                }
            </svg>
          </button>
          <button class="file-remove-btn" title="Remove file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
        });

        html += '</div>';
        this.container.innerHTML = html;

        // Add event listeners
        this.container.querySelectorAll('.file-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filename = e.currentTarget.closest('.file-item').dataset.filename;
                if (this.onFileToggle) {
                    this.onFileToggle(filename);
                }
            });
        });

        this.container.querySelectorAll('.file-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filename = e.currentTarget.closest('.file-item').dataset.filename;
                if (this.onFileRemove) {
                    this.onFileRemove(filename);
                }
            });
        });
    }

    /**
     * Truncate long filenames
     */
    truncateFilename(filename) {
        if (filename.length > 25) {
            return filename.substring(0, 22) + '...';
        }
        return filename;
    }

    /**
     * Clear file list
     */
    clear() {
        this.files = [];
        this.container.innerHTML = '<p class="empty-state">No files loaded</p>';
    }
}
