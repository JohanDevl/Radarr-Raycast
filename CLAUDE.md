# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for Radarr integration. Raycast is a productivity launcher for macOS that allows users to create custom commands and workflows.

## Architecture

- **Extension Entry Point**: `src/radarr.ts` - Main command implementation
- **Configuration**: Follows Raycast extension standards with `package.json` defining extension metadata and commands
- **Single Command Extension**: Currently implements one "no-view" command that runs in the background

## Development Commands

### Build and Development
- `npm run dev` - Start development mode with hot reloading
- `npm run build` - Build the extension for production
- `ray develop` - Raycast CLI development command (alias for npm run dev)
- `ray build` - Raycast CLI build command (alias for npm run build)

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Automatically fix linting issues where possible
- `ray lint` - Raycast CLI linting (alias for npm run lint)
- `ray lint --fix` - Auto-fix linting issues (alias for npm run fix-lint)

### Publishing
- `npm run publish` - Publish extension to Raycast Store
- Note: Regular npm publish is blocked by prepublishOnly script

## Framework and Dependencies

- **Core Framework**: Raycast API (`@raycast/api`, `@raycast/utils`)
- **Language**: TypeScript with strict mode enabled
- **Linting**: ESLint with Raycast's official configuration
- **Formatting**: Prettier for code formatting

## Development Notes

- Extension follows Raycast's "no-view" command pattern
- TypeScript configuration targets ES2023 with CommonJS modules
- ESLint configuration extends `@raycast/eslint-config`
- All source code is located in the `src/` directory