![Logo](images/Logo-tool4boxology.png)

# 🧰 Tool4Boxology — Hybrid AI Design Toolkit

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Docker](https://img.shields.io/badge/docker-image-blue)
![Status](https://img.shields.io/badge/status-beta-orange)
![Version](https://img.shields.io/badge/version-v0.2.0-blueviolet)
![Python](https://img.shields.io/badge/python-3.9%20%7C%203.10%20%7C%203.11-blue)
![React](https://img.shields.io/badge/library-react-61DAFB)
![GoJS](https://img.shields.io/badge/built%20with-GoJS-blue)
![TypeScript](https://img.shields.io/badge/language-typescript-3178c6)
![Docker Compose](https://img.shields.io/badge/DevOps-docker--compose-2496ED)

**Tool4Boxology** is a comprehensive toolkit for designing, validating, and exporting **hybrid AI system architectures** using the Boxology methodology.  
It provides:

- An **interactive editor** (React + GoJS)  
- **Validation rules** based on Boxology patterns  
- **Knowledge Graph generation** (RDF/RML)  
- **Virtuoso integration** for SPARQL queries  
- **Draw.io plugin** and vocabularies  
- A full **Dockerized environment**  

Inspired by:  
**Frank van Harmelen et al., Web Semantics (2023)**.

---

# 🔥 Highlights

- 🎨 Visual editor built with **React + GoJS**  
- 📦 Custom Boxology shapes & components  
- 📊 Real-time validation of hybrid AI systems  
- 🧠 Knowledge Graph export + RML/SDM-RDFizer  
- 🔗 Virtuoso integration (SPARQL endpoint)  
- 💾 Export formats: JSON, Styled JSON, PNG, DOT, RDF  
- 🆔 Stable component IDs for incremental KG updates  
- 🐳 Fully dockerized (frontend, backend, Virtuoso)

---

# 📂 Repository Structure

| Folder | Description |
|--------|-------------|
| **Boxology-interface** | React + GoJS diagram editor (main UI) |
| **Boxology-plugin** | Draw.io plugin + Boxology shape library |
| **Boxology-Docker** | Docker environment (frontend + backend + Virtuoso) |
| **kg_creation** | RML mappings, RDFizer integration, SPARQL utilities |
| **ElementaryPattern** | DOT definitions of elementary Boxology patterns |
| **Report** | Development notes, design documents |

---

# 🎨 Boxology Interface (Web Editor)

This module (React/TS + GoJS + Vite) enables you to design hybrid AI systems visually.

## ✨ Features

### Diagram Creation & Editing
- 📦 Drag-and-drop Boxology components  
- 🔗 Meaningful connectors between components  
- 🎯 Clustering & grouping for neural-symbolic systems  
- 🎨 Custom styling & reusable diagrams  

### Knowledge Graph Generation
- 🧠 Automatic KG creation (RML + RDFizer)  
- 🆔 Persistent IDs for stable semantic updates  
- 📄 Two types of JSON export:
  - **KG JSON** (semantic structure)
  - **Styled JSON** (complete layout)

### Virtuoso Integration
- 🔗 Upload RDF to Virtuoso automatically  
- 🚀 One-click navigation to SPARQL endpoint  
- 🔍 Query the generated KG immediately  

### Export Options
- 💾 PNG  
- 📄 JSON  
- 📝 Styled JSON  
- 🔷 DOT (Graphviz)  
- 🦾 RDF/Turtle  

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository
```bash
git clone https://github.com/SDM-TIB/Tool4Boxology.git
cd Tool4Boxology
