🧰 Tool4Boxology
Tool4Boxology is a modular, visual toolkit designed to support the Boxology framework—an approach for modeling and validating AI and knowledge-based systems. It includes a Draw.io plugin, structured vocabulary libraries, and a set of elementary patterns that help users build valid and meaningful Boxology models.

##🌍 What is Boxology?
Boxology is a visual methodology for describing AI system architectures using interconnected conceptual components like:

Data

Symbols

Models

Processes (e.g. infer, transform, generate)

Each connection is subject to logic constraints, which this tool helps validate.


## 🖋️  [Elementary Pattern in DOT Language](https://github.com/SDM-TIB/Tool4Boxology/tree/990d1d8fe63f9c2451a199222345b4aa3a58c7ab/ElementaryPattern).

This repository also includes Boxology representations written in **DOT language**—a plain text graph description syntax used with Graphviz. These patterns are used **only for visualization purposes**, **not for validation**.

You can view and edit them using tools like the [Graphviz Visual Editor](https://magjac.com/graphviz-visual-editor/). Either insert shapes manually or copy code from the provided `Vocabulary` file. Each **elementary pattern** is implemented in its own file, reflecting the modular design philosophy of Boxology.

> 🔄 **Important Notes**:
> - **DOT is case-sensitive** (`Symbol` ≠ `symbol`)
> - Each node must have a **unique identifier**. For example, if you use two `Symbol` nodes, name them `Symbol1` and `Symbol2`; otherwise, Graphviz will merge them.
> - Use `rankdir=LR` or `rankdir=TB` to organize the layout direction of your diagrams.

Although DOT helps visualize Boxology structures clearly, it does **not** enforce logic validation. For pattern validation, use the plugin provided in `BoxologyValidation.js` within the Draw.io environment.

# 📦 [Boxology Plugin & Vocabulary Library](https://github.com/SDM-TIB/Tool4Boxology/tree/990d1d8fe63f9c2451a199222345b4aa3a58c7ab/BoxologyPlugin).

A plugin and validation tool for Hyberid AI System modeling using Boxology methodology. This library and plugin ensure the construction of valid design patterns by enforcing logic and flow rules in both **web** and **app** environments.

---

## 🔍 Overview

This repository contains:

- **Boxology Plugin**: A guided plugin integrated into diagramming environments (like Draw.io) for constructing Boxology patterns.
- **Vocabulary Library**: A modular vocabulary model (see `.drawio` file) for representing components and their relations in knowledge-based or AI systems.

---

## 🚀 Features

- ✅ Validates logical flow and component connectivity  
- 🔁 Prevents invalid or dangling edges  
- ♻️ Merges duplicate nodes automatically    
- 🛠️ Toolbar integration for quick validation and debugging  







