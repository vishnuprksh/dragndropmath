# Drag-and-Drop Math

A visual math platform that allows users to perform mathematical operations using a drag-and-drop interface. Built with Express, jsPlumb, and mathjs.

## Project Structure

- `public/`: Frontend assets
  - `index.html`: Main entry point
  - `css/`: Stylesheets
  - `js/`: JavaScript modules
    - `nodes/`: Node-specific logic (Matrix, Scalar, Vector, etc.)
- `server.js`: Express server configuration
- `package.json`: Project dependencies and scripts

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser at `http://localhost:3000`.

## Features

- Drag-and-drop nodes for scalars, vectors, and matrices.
- Connect nodes to perform operations.
- Real-time evaluation of mathematical expressions.
- Zoom and pan workspace.
