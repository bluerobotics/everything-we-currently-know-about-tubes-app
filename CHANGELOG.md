# Changelog

All notable changes to Everything We Currently Know About Tubes will be documented in this file.

## [1.2.0] - 2024-12-04

### Added
- **Result Pinning**: Pin tube designs to compare across different optimization runs
  - Pin button on each result row to save material + dimensions
  - Pinned results persist when changing depth, pressure, or box size
  - Shows original depth/pressure where result was pinned (e.g., "@30m")
  - Safety factor auto-recalculates for current operating conditions
  - Original SF shown in parentheses for reference (e.g., "4.0× (1.2)")
  - Pinned section with amber/gold styling at top of results table
  - Clear all pinned results with trash button
  - Pinned results saved with project files

## [1.1.2] - 2024-12-03

### Fixed
- App not launching on some Windows machines (window now shows after 5s fallback)
- Added startup logging for debugging launch issues
- Added crash and error handlers for renderer process

## [1.1.1] - 2024-12-02

### Fixed
- Build configuration improvements
- Simplified release artifacts (single universal macOS build)

## [1.1.0] - 2024-12-01

### Added
- File save/load functionality for tube configurations
- Menu bar with File operations

### Changed
- Improved UI layout and styling

## [1.0.0] - 2024-11-30

### Added
- Initial release
- Pressure vessel dimension optimizer for underwater applications
- Interactive 3D cylinder visualization
- Material selection (various metals and alloys)
- Parameter inputs for depth, safety factor, and dimensions
- Results table with optimized calculations
- VSCode-inspired dark theme UI

