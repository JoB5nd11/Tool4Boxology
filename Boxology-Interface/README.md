# Boxology-Interface

This module contains a custom **web-based interface** for designing hybrid AI systems using **Boxology** principles. It is built with **React**, **TypeScript**, **Vite**, and **GoJS**, and provides an interactive diagramming environment for creating modular, validated AI system architectures.

⚠️ **Note:** This interface is under **active development**. New features and visual enhancements are being added frequently.

---

## ✨ Features

- 📦 **Drag-and-drop Boxology components** - Interactive shape library with custom shapes
- 🔗 **Connect components** with semantically meaningful edges
- 📑 **Multi-page support** - Create multiple diagram pages like Excel/Draw.io
- 🏗️ **Hierarchical diagrams** - Mark nodes as "super nodes" with linked sub-diagrams
- 🔍 **Real-time preview and layout** - Live diagram editing and validation
- 💾 **Export diagrams** - Save/load projects with full hierarchy preservation
- 🎨 **Custom shape groups** - Create and save custom component collections
- ⚡ **Context-sensitive menus** - Right-click for quick actions and navigation

### 🆕 Hierarchical Design Features

- **Super Nodes**: Right-click any node → "Mark as Super Node" to create detailed sub-diagrams
- **Sub-diagram Navigation**: Edit linked diagrams with seamless back-and-forth navigation
- **Visual Indicators**: Super nodes are highlighted with thicker borders for easy identification
- **Hierarchy Management**: Each super node maintains its own independent diagram canvas
- **Data Persistence**: All hierarchical relationships and sub-diagrams are preserved during save/load

---

## 🧰 Built With

- [React](https://reactjs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool and development server
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [GoJS](https://gojs.net/) - Interactive diagramming library
- [HTML5/CSS3](https://developer.mozilla.org/en-US/docs/Web) - Web standards

---

## 🚀 Getting Started

### 1. Clone and Install
```bash
git clone https://github.com/SDM-TIB/Tool4Boxology.git
cd Tool4Boxology/Boxology-Interface
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Folder Structure

| Folder/File       | Purpose                          |
|------------------|----------------------------------|
| `src/`           | React components and diagram logic |
| `public/`        | Static assets                    |
| `vite.config.ts` | Vite build configuration         |
| `tsconfig.json`  | TypeScript settings              |

---

## 🔧 Planned Improvements

- ⬜ Add validation engine using Boxology grammar
- ⬜ Enable RDF/SHACL export of diagrams
- ⬜ UI/UX refinements and theme integration
- ⬜ Dynamic shape library loading and categorization

We are working continuously to improve the UI, stability, and functionality of the Boxology Interface. Contributions and feedback are welcome!

---

## 📄 License

- Code is licensed under the [MIT License](../LICENSE)
- UI diagrams and Boxology shapes are under [CC BY 4.0 License](../LICENSE-CC-BY-4.0)

---

## 🧠 Acknowledgments

This project uses [GoJS](https://gojs.net/) for diagram rendering.  
We currently use the **evaluation version**, which includes a watermark, in compliance with the GoJS [license agreement](https://gojs.net/latest/license.html).

For commercial use or removal of the watermark, a license from [Northwoods Software](https://nwoods.com/) is required.

---

## 🙋 Contact

Developed by: **Mahsa Forghani Tehrani**  
📧 mahsa.forghani.tehrani@stud.uni-hannover.de
