# Thruster Viewer

A desktop application for visualizing and analyzing thruster performance data.

## Features

- **Data Analysis**: Run optimizations and view results in a sortable, filterable table
- **Multi-tab Support**: Work with multiple projects simultaneously
- **Pinned Results**: Pin important results for comparison across different configurations
- **Export**: Export results to CSV for further analysis
- **Dark Theme**: VS Code-inspired dark interface

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the web development server:
```bash
npm run dev
```

Run with Electron:
```bash
npm run electron:dev
```

### Build

Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/     # React components
│   ├── sidebar/    # Sidebar views (parameters, materials, info)
│   ├── MenuBar.tsx
│   ├── TabBar.tsx
│   ├── ActivityBar.tsx
│   ├── Sidebar.tsx
│   ├── ResultsTable.tsx
│   ├── DetailsPanel.tsx
│   └── StatusBar.tsx
├── lib/            # Core logic
│   └── optimizer.ts
├── stores/         # Zustand state management
│   └── appStore.ts
├── App.tsx
└── main.tsx
```

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New project
- `Ctrl/Cmd + O` - Open project
- `Ctrl/Cmd + S` - Save project
- `Ctrl/Cmd + Shift + S` - Save As
- `Ctrl/Cmd + E` - Export results
- `Ctrl/Cmd + B` - Toggle sidebar

## License

MIT
