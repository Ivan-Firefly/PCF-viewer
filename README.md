# PCF/IDF Viewer

A modern WebGL-based 3D viewer for PCF (Piping Component File) and IDF (Isometric Data File) formats used in piping design.

![PCF/IDF Viewer](https://img.shields.io/badge/Three.js-v0.160-blue)
![Vite](https://img.shields.io/badge/Vite-v5.0-purple)

## Features

✨ **3D Visualization**

- Interactive 3D rendering of piping components
- Support for pipes, elbows, tees, valves, reducers, and more
- Realistic materials with PBR rendering
- Orbit, pan, and zoom controls

📁 **File Support**

- PCF (Piping Component File) format
- IDF (Isometric Data File) format
- Drag-and-drop file loading
- File browser support

🎨 **Modern UI**

- Premium dark theme with glassmorphism
- Component tree view
- Properties panel with detailed component information
- Camera preset views (isometric, top, front, side)
- Grid and axes helpers

🔍 **Interactive Selection**

- Click to select components in 3D view
- Highlight selected components
- Synchronized selection between 3D view and component tree
- Detailed property inspection

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Navigate to the project directory:**

   ```powershell
   cd C:\Projects\pcf-idf-viewer
   ```

2. **Install dependencies:**

   If you encounter PowerShell execution policy errors, you have two options:

   **Option A: Use cmd instead of PowerShell**

   ```cmd
   npm install
   ```

   **Option B: Temporarily bypass PowerShell restriction**

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   npm install
   ```

3. **Start the development server:**

   ```cmd
   npm run dev
   ```

4. **Open your browser:**
   The application should automatically open at `http://localhost:3000`

## Usage

### Loading a File

1. **Drag and Drop:**
   - Drag a PCF or IDF file from your file explorer
   - Drop it onto the upload zone in the sidebar

2. **File Browser:**
   - Click on the upload zone
   - Select a PCF or IDF file from the file dialog

### Sample File

A sample PCF file is included at:

```
C:\Projects\pcf-idf-viewer\public\samples\sample.pcf
```

This file contains:

- Multiple pipe segments
- An elbow (90° bend)
- A tee fitting with branch
- A gate valve with actuator
- A concentric reducer

### Navigation

- **Orbit:** Left-click and drag
- **Pan:** Right-click and drag (or Shift + left-click)
- **Zoom:** Mouse wheel
- **Preset Views:** Use toolbar buttons for isometric, top, front, and side views
- **Fit View:** Click the fit-to-view button to frame all components

### Component Selection

- **3D View:** Click on any component to select it
- **Component Tree:** Click on components in the tree view
- **Properties Panel:** View detailed information about the selected component

## Project Structure

```
pcf-idf-viewer/
├── public/
│   └── samples/
│       └── sample.pcf          # Sample PCF file
├── src/
│   ├── geometry/               # 3D geometry generators
│   │   ├── PipeGeometry.js
│   │   ├── ElbowGeometry.js
│   │   ├── TeeGeometry.js
│   │   ├── ValveGeometry.js
│   │   └── ReducerGeometry.js
│   ├── parsers/                # File parsers
│   │   ├── PcfParser.js
│   │   └── IdfParser.js
│   ├── ui/                     # UI components
│   │   ├── FileUploader.js
│   │   ├── ComponentTree.js
│   │   └── PropertiesPanel.js
│   ├── viewer/                 # 3D scene management
│   │   └── Scene.js
│   ├── main.js                 # Application entry point
│   └── style.css               # Styles
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.js              # Vite configuration
└── README.md                   # This file
```

## Supported Component Types

- **PIPE** - Straight pipe segments
- **ELBOW** - 90° and 45° elbows
- **TEE** - Tee fittings with branches
- **VALVE** - Valves with actuators
- **REDUCER-CONCENTRIC** - Concentric reducers
- **REDUCER-ECCENTRIC** - Eccentric reducers
- **FLANGE** - Flanges (rendered as markers)
- **OLET** - Branch connections

## PCF File Format

PCF files are text-based files with the following structure:

```
UNITS-BORE   MM
UNITS-CO-ORDS   MM
PIPELINE-REFERENCE   LINE-001
    PIPING-SPEC   CS-150
PIPE
    END-POINT    0 0 0 100
    END-POINT    1000 0 0 100
    ITEM-CODE   PA100
    ITEM-DESCRIPTION   PIPE SCH80
ELBOW
    END-POINT    1000 0 0 100
    END-POINT    1000 0 1000 100
    CENTRE-POINT   1000 0 0
    ITEM-CODE   EL100
```

## Building for Production

To create a production build:

```cmd
npm run build
```

The output will be in the `dist/` directory.

## Troubleshooting

### PowerShell Execution Policy Error

If you see an error like "running scripts is disabled on this system":

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned`
3. Or use `cmd` instead of PowerShell

### Components Not Rendering

- Check the browser console for errors
- Ensure the PCF file format is correct
- Verify that coordinates are in millimeters

### Performance Issues

- Large files with thousands of components may be slow
- Consider optimizing the PCF file or splitting into separate files

## Technologies Used

- **Three.js** - 3D graphics library
- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with custom properties

## License

This viewer is based on the PipeCAD open-source project and references IsoAlgo3D.

## Acknowledgments

- Inspired by IsoAlgo3D (<https://eryar.github.io/PipeCAD/>)
- Based on PipeCAD source code analysis
- Thanks to the Three.js community

## Support

For issues or questions:

1. Check the browser console for errors
2. Verify your PCF/IDF file format
3. Refer to the PipeCAD documentation

---

**Built with ❤️ for the piping engineering community**
