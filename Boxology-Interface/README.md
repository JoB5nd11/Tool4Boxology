# Boxology-Interface

This module contains a custom **web-based interface** for designing hybrid AI systems using **Boxology** principles. It is built with **React**, **TypeScript**, **Vite**, and **GoJS**, and provides an interactive diagramming environment for creating modular, validated AI system architectures.

⚠️ **Note:** This interface is under **active development**. New features and visual enhancements are being added frequently.

---

## ✨ Features

- 📦 **Drag-and-drop Boxology components** - Interactive shape library with custom shapes
- 🔗 **Connect components** with semantically meaningful edges
- 📑 **Multi-page support** - Create multiple diagram pages like Excel/Draw.io
- 🏗️ **Advanced hierarchical diagrams** - Multi-level super nodes with visual preview system
- 🔍 **Real-time preview and layout** - Live diagram editing and validation
- 💾 **Export diagrams** - Save/load projects with full hierarchy preservation
- 🎨 **Custom shape groups** - Create and save custom component collections
- ⚡ **Context-sensitive menus** - Right-click for quick actions and navigation

### 🆕 Advanced Hierarchical Design System

The interface now features a comprehensive **hierarchy management system** that enables complex, multi-level diagram architectures:

#### **Super Node Creation & Management**
- **One-Click Super Node Creation**: Right-click any node → "Mark as Super Node"
- **Visual Identification**: Super nodes display with distinctive green indicators and thicker borders
- **Automatic Sub-diagram Linking**: Each super node automatically creates its own dedicated canvas
- **Seamless Navigation**: Navigate between parent and child diagrams with dedicated navigation controls

#### **Interactive Preview System**
- **🖱️ Single-Click Preview**: Click on any super node to instantly view its sub-diagram in a modal preview window
- **📝 Double-Click Editing**: Double-click super nodes to enter full editing mode for the sub-diagram
- **🔍 Zoomable Preview**: Preview windows support zooming and panning for detailed inspection
- **📖 Read-Only Mode**: Preview maintains diagram integrity while allowing detailed examination

#### **Hierarchical Navigation**
- **Breadcrumb Navigation**: Always know your current location in the hierarchy
- **Back to Parent**: One-click return to parent diagrams with context preservation
- **Multi-Level Support**: Create hierarchies with unlimited depth (super nodes within super nodes)
- **Tab-Based Interface**: Each diagram level maintains its own tab for easy switching

#### **Data Persistence & Integrity**
- **Complete Hierarchy Preservation**: All relationships and sub-diagrams saved in project files
- **Real-Time Synchronization**: Changes in sub-diagrams automatically update parent references
- **Export Compatibility**: Full hierarchy support across all export formats (JSON, XML, Draw.io)
- **Undo/Redo Support**: History tracking works across all hierarchy levels

### 🎯 Workflow Example

1. **Create Main Architecture**: Design your top-level AI system components
2. **Mark Super Nodes**: Right-click complex components → "Mark as Super Node"
3. **Design Sub-systems**: Double-click super nodes to design detailed internal architectures
4. **Preview & Validate**: Single-click super nodes for quick previews without leaving context
5. **Navigate Seamlessly**: Use breadcrumbs and navigation controls to move between levels
6. **Export Complete System**: Save entire hierarchical architecture in one operation

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

### 3. Creating Your First Hierarchical Diagram
1. Drag components from the left sidebar to create your main diagram
2. Right-click any node and select "Mark as Super Node" 
3. Double-click the super node to design its internal architecture
4. Use single-click to preview sub-diagrams without losing your current context
5. Navigate back using the "Back to Parent" button or breadcrumb navigation

---

## 📂 Folder Structure

| Folder/File       | Purpose                          |
|------------------|----------------------------------|
| `src/`           | React components and diagram logic |
| `src/components/` | UI components including SubdiagramPreview |
| `public/`        | Static assets                    |
| `vite.config.ts` | Vite build configuration         |
| `tsconfig.json`  | TypeScript settings              |

---

## 🔧 Planned Improvements

- ⬜ **Validation Engine**: Add validation engine using Boxology grammar for hierarchical diagrams
- ⬜ **RDF/SHACL Export**: Enable semantic export of complete hierarchical structures
- ⬜ **Enhanced Preview**: Add thumbnail views and mini-maps for complex hierarchies
- ⬜ **Collaborative Features**: Multi-user editing support for hierarchical diagrams
- ⬜ **Auto-Layout**: Intelligent automatic layout algorithms for sub-diagrams
- ⬜ **Template System**: Pre-built hierarchical templates for common AI patterns

We are working continuously to improve the UI, stability, and functionality of the Boxology Interface. The new hierarchical system represents a major step forward in supporting complex AI system design workflows.

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

## 🙋 Contact & Support

**Developed by:** Mahsa Forghani Tehrani  
📧 **Email:** mahsa.forghani.tehrani@stud.uni-hannover.de  
📚 **Documentation:** [GitHub Repository](https://github.com/SDM-TIB/Tool4Boxology.git)

For questions, suggestions, or collaboration opportunities, please don't hesitate to reach out. We welcome feedback on the hierarchical design system and are always looking to improve the user experience.
