Draw.loadPlugin(function(editorUi) {


    var graph = editorUi.editor.graph;
    graph.setDisconnectOnMove(false); // Ensure edges stay connected when moving
    graph.setCellsDisconnectable(false); // Prevent accidental disconnection
    graph.setCellsDeletable(true); // Allow deleting nodes
    graph.setAllowDanglingEdges(false); // Prevent edges from being left behind



    // Step 2: Define Valid Next Components Based on Arrow Alignment
    const validNext = {
        "symbol": ["infer:deduce", "generate:train", "transform:embed", "transform", "symbol"],
        "data": ["infer:deduce", "generate:train", "transform", "data"],
        "symbol/data": ["infer:deduce", "transform:embed", "transform", "symbol/data"],
        "infer:deduce": ["symbol", "model", "infer:deduce", ],
        "model": ["infer:deduce", "model", "model:statistics", "model:semantic"],
        "generate:train": ["model", "generate:train", "model:semantic", "model:statistics"],
        "actor": ["generate:engineer", "actor"],
        "generate:engineer": ["model", "generate:engineer"],
        "model:semantic": ["infer:deduce", "transform:embed", "model:semantic", "model"],
        "model:statistics": ["infer:deduce", "transform:embed", "model:statistics", "model"],
        "transform:embed": ["data", "transform:embed"],
        "transform": ["data", "symbol", "symbol/data", "transform"]
    };

    // Step 3: Define Elementary and Full Patterns
    const elementaryPatterns = [
        ["symbol", "generate:train", "model"],
        ["data", "generate:train", "model"],
        ["symbol/data", "transform", "data"],
        ["symbol", "transform", "data"],
        ["data", "transform", "data"],
        ["actor", "generate:engineer", "model"]
    ];

    const fullPatterns = [
        ["model:semantic", "infer:deduce", "symbol", "symbol"],
        ["data", "infer:deduce", "symbol", "model"],
        ["symbol/data", "infer:deduce", "model", "model"],
        ["symbol", "infer:deduce", "model", "model"],
        ["data", "infer:deduce", "model", "model"],
        ["symbol", "transform:embed", "data", "model:semantic"]
    ];

    // Step 4: Merging Identical Nodes
    function mergeIdenticalNodes(edge) {
        let source = edge.source;
        let target = edge.target;

        if (!source || !target) return;

        if (source.value === target.value) {
            alert(`⚠️ Merging identical nodes: ${source.value}`);

            let model = graph.getModel();
            let incomingEdges = model.getEdges(target, true, false);
            let outgoingEdges = model.getEdges(target, false, true);

            model.beginUpdate();
            try {
                // Redirect all incoming edges to the source node
                incomingEdges.forEach(e => {
                    if (e !== edge) {
                        e.target = source;
                    }
                });

                // Redirect all outgoing edges to the source node
                outgoingEdges.forEach(e => {
                    if (e !== edge) {
                        e.source = source;
                    }
                });

                // Remove the target node and its edges
                model.remove(target);
                model.remove(edge);
            } finally {
                model.endUpdate();
            }

            console.log(`✅ Nodes merged: ${source.value}`);
        }
    }

    function handleNodeDeletion() {
        graph.removeCells = function(cells, includeEdges) {
            let model = this.getModel();

            model.beginUpdate();
            try {
                cells.forEach(cell => {
                    if (!cell.edge) { // Ensure it's a node, not an edge
                        let connectedEdges = model.getEdges(cell, true, true); // Get all connected edges

                        // **Remove all edges before removing the node**
                        connectedEdges.forEach(edge => {
                            model.remove(edge);
                        });

                        console.log(`✅ Node "${cell.value}" and all connected edges removed.`);
                    }
                });

                // **Now, remove the actual node**
                mxGraph.prototype.removeCells.call(this, cells, includeEdges);
            } finally {
                model.endUpdate();
            }
        };
    }


    // Step 5: Validate Selected Pattern
    function validatePattern() {
        let selectedCells = graph.getSelectionCells();
        if (selectedCells.length === 0) {
            alert("⚠️ No selection made! Please select a pattern before validation.");
            return;
        }

        let missingConnections = validateProcessComponents(selectedCells);
        if (missingConnections.length > 0) {
            alert(`❌ Pattern Invalid: The following process components are missing inputs or outputs: ${missingConnections.join(", ")}`);
            console.warn("❌ Missing Connections:", missingConnections);
            return; // **Stop validation if process validation fails**
        }

        let validatedPatterns = [];
        let inputCounts = {};

        let disconnectedComponents = [];
        let isValid = true;

        selectedCells.forEach(cell => {
            if (cell.edge && cell.source && cell.target) {
                function stripHtml(html) {
                    let doc = new DOMParser()
                        .parseFromString(html, "text/html");
                    return doc.body.textContent || "";
                }

                let edgeString = `${stripHtml(cell.source.name)},${stripHtml(cell.target.name)}`;

                validatedPatterns.push(edgeString);
                inputCounts[cell.target.name] = (inputCounts[cell.target.name] || 0) + 1;
            }
        });
        // Check for disconnected components
        selectedCells.forEach(cell => {
            if (!cell.edge && cell.name !== "text") {
                let edges = graph.getModel()
                    .getEdges(cell);
                if (edges.length === 0) {
                    disconnectedComponents.push(cell);
                }
            }
        });

        if (disconnectedComponents.length > 0) {
            alert("❌ Some components are disconnected! Please remove or connect them before validation.");
            console.warn("❌ Disconnected Components:", disconnectedComponents.map(c => c.name));
            return;
        }

        let extractedSequence = validatedPatterns.map(e => e.split(","))
            .flat();
        let isValidElementary = elementaryPatterns.some(pattern => pattern.every(node => extractedSequence.includes(node)));
        let isValidFull = fullPatterns.some(pattern => pattern.every(node => extractedSequence.includes(node)));

        if (isValidFull && (inputCounts["infer:deduce"] >= 2 || inputCounts["transform:embed"] >= 2)) {
            alert("✅ Valid full pattern!");
            console.log("✅ Valid Full Pattern:", extractedSequence);
        } else if (isValidElementary) {
            alert("✅ Valid elementary pattern!");
            console.log("✅ Valid Elementary Pattern:", extractedSequence);
        } else {
            alert("❌ Invalid pattern detected!");
            console.warn("❌ Invalid Pattern:", extractedSequence);
        }
    }

    function validateProcessComponents(selectedCells) {
        // Define the list of process components
        const processComponents = ["infer:deduce", "transform", "generate:train"];

        let missingConnections = [];

        selectedCells.forEach(cell => {
            if (!cell.edge && processComponents.includes(cell.name)) {
                let incomingEdges = graph.getModel()
                    .getEdges(cell, true, false); // Incoming edges
                let outgoingEdges = graph.getModel()
                    .getEdges(cell, false, true); // Outgoing edges

                if (incomingEdges.length === 0 || outgoingEdges.length === 0) {
                    missingConnections.push(cell.name);
                }
            }
        });

        return missingConnections; // **Return the list of missing components**
    }




    // Step 6: Ensure Invalid Next Component is Removed
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty('edge');
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.name;
        let target = edge.target.name;

        if (!validNext[source] || !validNext[source].includes(target)) {
            alert("❌ Invalid connection! Edge will be removed.");
            graph.getModel()
                .remove(edge);
            console.warn("❌ Invalid Edge Removed:", source, "→", target);
        } else {
            console.log("✅ Valid Connection:", source, "→", target);
            mergeIdenticalNodes(edge);
        }

        let allEdges = graph.getModel()
            .getEdges(source, true, false);
        let duplicateInputs = allEdges.filter(e => e.target.name === target.name);

        if (duplicateInputs.length > 1) {
            alert(`❌ Duplicate inputs found with the same name: ${target.name}`);
            graph.getModel()
                .remove(edge); // Remove the invalid edge
            console.warn("❌ Duplicate Edge Removed:", source, "→", target);
        }

    });


    // Step 7: Add Validation Button to Toolbar
    function addToolbarButtons() {
        let toolbar = editorUi.toolbar.container;

        function createButton(text, color, callback) {
            let button = document.createElement("button");
            button.textContent = text;
            button.style.padding = "5px 10px";
            button.style.marginLeft = "10px";
            button.style.border = "1px solid #000";
            button.style.background = color;
            button.style.color = "white";
            button.style.cursor = "pointer";
            button.style.fontWeight = "bold";
            button.onclick = callback;
            toolbar.appendChild(button);
        }

        createButton("Validate Pattern", "#4CAF50", validatePattern);
        console.log("✅ Toolbar Buttons Added");
    }

    editorUi.actions.addAction('boxologyValidation', function() {
        validatePattern();
    });

    var menu = editorUi.menus.get('extras');
    var oldFunct = menu.funct;

    menu.funct = function(menu, parent) {
        oldFunct.apply(this, arguments);
        editorUi.menus.addMenuItems(menu, ['-', 'boxologyValidation'], parent);
    };

    addToolbarButtons();
    handleNodeDeletion();

    console.log("✅ Guided Pattern Validation Applied Successfully!");
});
