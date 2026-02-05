# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IconMaker is a tool for generating icon SVG and PNG files using the Iconify library.

## Project Status

This is a new project in the initialization phase. The technology stack and project structure have not yet been established.

## Intended Functionality

- 🔍 Search and browse 275,000+ icons from Iconify API
- ⭐ Favorite and cache icons for quick access
- 📥 Export icons as SVG or PNG files
- ⚙️ Pre-configure export settings and default save folder
- ⚡ Quick export with a single click

## Technology Stack

- **Frontend**: Tauri 2.0 + React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Virtualization**: TanStack Virtual
- **Backend**: Rust + resvg (SVG→PNG conversion)
- **Data Persistence**: Tauri Store Plugin
