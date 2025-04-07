
# 🧰 Tool4Boxology

**Tool4Boxology** is a modular, visual toolkit designed to support the **Boxology framework**—an approach for modeling and validating AI and knowledge-based systems. It includes a **Draw.io plugin**, structured **vocabulary libraries**, and a set of **elementary patterns** that help users build valid and meaningful Boxology models.

---

## 🌍 What is Boxology?

Boxology is a visual methodology for describing AI system architectures using interconnected conceptual components such as:

- **Data**
- **Symbols**
- **Models**
- **Processes** (e.g. infer, transform, generate)

Each connection between components is subject to logic constraints. This toolkit helps enforce and validate those constraints.

---

## 📂 Repository Structure

| Folder | Description |
|--------|-------------|
| [ElementaryPattern](https://github.com/SDM-TIB/Tool4Boxology/tree/main/ElementaryPattern) | Elementary Boxology patterns written in DOT language for visualization |
| [BoxologyPlugin](https://github.com/SDM-TIB/Tool4Boxology/tree/main/BoxologyPlugin) | Validation plugin for Draw.io and vocabulary components for modeling |

👉 **Each folder includes its own README with specific instructions**—we recommend checking them out to understand how to use the contents effectively.

---

## 🖋️ [Elementary Patterns in DOT Language](https://github.com/SDM-TIB/Tool4Boxology/tree/main/ElementaryPattern)

This section includes Boxology representations written in **DOT language**—a plain text graph description syntax used with Graphviz. These are used **only for visualization**, not for validation.

You can view and edit them using tools like the [Graphviz Visual Editor](https://magjac.com/graphviz-visual-editor/). Either insert shapes manually or copy from the provided `Vocabulary` file. Each **elementary pattern** is stored separately to support modular design.

> 🔄 **Important Notes**:
> - DOT is **case-sensitive** (`Symbol` ≠ `symbol`)
> - Nodes must have **unique identifiers** (`Symbol1`, `Symbol2`, etc.)
> - Use `rankdir=LR` or `rankdir=TB` for organized layouts

📌 For logic validation, use the Draw.io plugin described below.

---

## 📦 [Boxology Plugin & Vocabulary Library](https://github.com/SDM-TIB/Tool4Boxology/tree/main/BoxologyPlugin)

A plugin and validation tool for hybrid AI system modeling using the Boxology methodology. This ensures the construction of valid design patterns by enforcing logical flows in both **web** and **desktop app** environments.

### 🔍 Overview

- **Boxology Plugin**: Extends Draw.io with validation logic for Boxology patterns
- **Vocabulary Library**: `.drawio` file containing reusable modular components

### 🚀 Features

- ✅ Validates logical flow and connectivity  
- 🔁 Prevents invalid or dangling edges  
- ♻️ Automatically merges duplicate nodes  
- 🛠️ Adds validation buttons directly into the Draw.io toolbar

📖 See the [BoxologyPlugin folder README](https://github.com/SDM-TIB/Tool4Boxology/tree/main/BoxologyPlugin) for setup instructions for both **browser-based** and **desktop** usage.

