# Boxology Webapp (React + TypeScript + Vite)

This webapp is an interactive diagram editor built with React, TypeScript, and Vite. It allows users to create, edit, and validate diagrams using the Boxology methodology, supporting custom shapes, patterns, and annotation.

## Features

- **Drag-and-drop diagram editor:** Build diagrams using a sidebar of shapes and patterns.
- **GoJS integration:** Render and manage diagram nodes and links with GoJS.
- **Pattern libraries:** Includes a PatternLib container for reusable Boxology patterns.
- **Validation:** Validate diagrams against Boxology rules and patterns using a custom plugin.
- **Context menu:** Right-click nodes to move them to groups or containers.
- **Sidebar editing:** Edit node properties in the right sidebar.
- **Custom groups:** Create your own groups and organize shapes.
- **Annotation:** Add comments and notes to your diagrams.

## Usage

1. **Add shapes:** Drag shapes from the left sidebar onto the canvas.
2. **Create groups:** Use the sidebar to add new groups and organize shapes.
3. **PatternLib:** Access predefined Boxology patterns in the PatternLib container.
4. **Edit nodes:** Select a node to edit its properties in the right sidebar.
5. **Validate:** Click "Validate Pattern" in the toolbar to check your diagram against Boxology rules.
6. **Context menu:** Right-click a node to move it to a group or container.

## Development

This project uses Vite for fast development and HMR.  
See below for ESLint and TypeScript configuration tips.

## ESLint Configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules.

## License

This webapp is for academic and research use.  
GoJS is licensed separately. Please refer to the GoJS license for usage terms.
