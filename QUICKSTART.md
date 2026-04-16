# Quick Start Guide

## First Time Setup

1. **Open Command Prompt (NOT PowerShell):**

   ```
   Press Win+R, type "cmd", press Enter
   ```

2. **Navigate to the project:**

   ```cmd
   cd C:\Projects\pcf-idf-viewer
   ```

3. **Install dependencies:**

   ```cmd
   npm install
   ```

   This will install Three.js and Vite. Wait for it to complete.

4. **Start the development server:**

   ```cmd
   npm run dev
   ```

5. **Open your browser:**
   - The app should open automatically at `http://localhost:3000`
   - If not, manually navigate to that URL

6. **Load the sample file:**
   - Drag `C:\Projects\pcf-idf-viewer\public\samples\sample.pcf` into the upload zone
   - OR click the upload zone and select the file

## Troubleshooting

### If you see errors in the browser console

**Press F12** to open DevTools and check the Console tab for errors.

Common issues:

- **Module not found errors**: Run `npm install` again
- **OrbitControls error**: The import path was fixed, refresh the page (Ctrl+F5)
- **Empty scene**: Check console for "Successfully created X meshes" message

### If nothing renders

1. Check browser console (F12) for JavaScript errors
2. Look for the message "Loading piping data: X components"
3. Verify "Successfully created X meshes" appears

### Check if geometry is being created

Open browser console and type:

```javascript
// Should show the scene
window.scene = document.querySelector('canvas').__scene
console.log(window.scene)
```

## Expected Behavior

When you load `sample.pcf`:

- You should see "Loaded Files" section show "sample.pcf (9 components)"
- Component Tree should show PIPE, ELBOW, TEE, VALVE, REDUCER-CONCENTRIC groups
- 3D viewport should show colored pipes in isometric view
- You can orbit with left-click-drag, pan with right-click-drag, zoom with mouse wheel

## Still Having Issues?

Share the browser console output (F12 > Console tab) after loading a file.
