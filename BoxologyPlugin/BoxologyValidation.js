Draw.loadPlugin(function(ui) {
    console.log("✅ Boxology Guided Plugin Loaded");

    var graph = ui.editor.graph;


    // Step 2: Define Valid Next Components Based on Arrow Alignment
    const validNext = {
        "symbol": ["infer:deduce","generate:train","transform:embed","transform","symbol"],
        "data": ["infer:deduce","generate:train","transform","data"],
        "symbol/data": ["infer:deduce","transform:embed","transform","symbol/data"],
        "infer:deduce": ["symbol", "model","infer:deduce"],
        "model": ["infer:deduce", "model"],
        "generate:train": ["model","generate:train","model:semantic","model:statistics"],
        "actor": ["generate:engineer","actor"],
        "generate:engineer": ["model","generate:engineer"],
        "model:semantic": ["infer:deduce","transform:embed","model:semantic"],
		"model:statistics": ["infer:deduce","transform:embed","model:statistics"],
        "transform:embed": ["data","transform:embed"],
		"transform": ["data","symbol","symbol/data","transform"]
    };

    // Step 3: Define Elementary and Full Patterns
    const elementaryPatterns = [
        ["symbol", "generate:train", "model:semantic"],
        ["data", "generate:train", "model:statistics"],
        ["symbol/data", "transform", "data"],
        ["actor", "generate:engineer", "model"]
    ];

    const fullPatterns = [
        ["model:semantic", "infer:deduce", "symbol", "symbol"],
        ["data", "infer:deduce", "symbol", "model"],
        ["symbol/data", "infer:deduce", "model", "model"],
        ["symbol","transform:embed", "data","model:semantic" ]
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

    // Step 5: Validate Selected Pattern
    function validatePattern() {
        let selectedCells = graph.getSelectionCells();
        if (selectedCells.length === 0) {
            alert("⚠️ No selection made! Please select a pattern before validation.");
            return;
        }

        let validatedPatterns = [];
        let inputCounts = {};

        selectedCells.forEach(cell => {
            if (cell.edge && cell.source && cell.target) {
                let edgeString = `${cell.source.value},${cell.target.value}`;
                validatedPatterns.push(edgeString);
                inputCounts[cell.target.value] = (inputCounts[cell.target.value] || 0) + 1;
            }
        });

        let extractedSequence = validatedPatterns.map(e => e.split(",")).flat();
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

    // Step 6: Ensure Invalid Next Component is Removed
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty('edge');
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let target = edge.target.value;

        if (!validNext[source] || !validNext[source].includes(target)) {
            alert("❌ Invalid connection! Edge will be removed.");
            graph.getModel().remove(edge);
            console.warn("❌ Invalid Edge Removed:", source, "→", target);
        } else {
            console.log("✅ Valid Connection:", source, "→", target);
            mergeIdenticalNodes(edge);
        }
    });

    // Step 7: Add Validation Button to Toolbar
    function addToolbarButtons() {
        let toolbar = ui.toolbar.container;

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

    addToolbarButtons();
    console.log("✅ Guided Pattern Validation Applied Successfully!");
});
