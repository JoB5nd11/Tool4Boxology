Draw.loadPlugin(function(ui) {
    console.log("✅ Boxology Guided Plugin Loaded");

    var graph = ui.editor.graph;
    var extractedPatterns = []; // Stores all patterns with connections

    // Step 1: Define the Boxology Grammar Palette
    mxResources.parse('boxology=Boxology Grammar');

    Sidebar.prototype.addBoxologyPalette = function() {
        this.addPaletteFunctions(
            'boxology',
            'Boxology Grammar',
            true,
            [
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'symbol', 'Symbol'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'data', 'Data'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'symbol/data', 'Symbol/Data'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:train', 'Generate: Train'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:engineer', 'Generate: Engineer'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'transform', 'Transform'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'transform:embed', 'Transform: Embed'),
                this.createVertexTemplateEntry('rhombus;strokeWidth=2;', 100, 50, 'infer:deduce', 'Infer: Deduce'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'model', 'Model'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'model:semantic', 'Model: Semantic'),
                this.createVertexTemplateEntry('triangle;strokeWidth=2;', 100, 50, 'actor', 'Actor')
            ]
        );
    };

    ui.sidebar.addBoxologyPalette();
    console.log("✅ Boxology Grammar Palette Added");

    // Step 2: Define Valid Patterns
    const validPatterns = [
        ["symbol", "infer:deduce", "model:semantic", "symbol"],
        ["symbol", "generate:train", "model"],
        ["data", "generate:train", "model"],
        ["symbol/data", "transform", "data"],
        ["actor", "generate:engineer", "model"],
        ["model:semantic", "infer:deduce", "symbol"],
        ["model", "infer:deduce", "symbol"],
        ["model", "infer:deduce", "model"],
        ["model:semantic", "transform:embed", "data"],
        ["model", "model", "infer:deduce", "data/symbol"]
    ];

    // Step 3: Extract Patterns with Connections
    function extractPatterns() {
        let edges = Object.values(graph.getModel().cells);
        let connectedPatterns = new Set();
        let visitedNodes = new Set();

        function dfs(node, pattern) {
            if (!node || visitedNodes.has(node.id)) return;
            visitedNodes.add(node.id);
            pattern.push(node.value);

            edges.forEach(cell => {
                if (cell.edge && cell.source && cell.target) {
                    let nextNode = cell.source === node ? cell.target : cell.source;
                    if (nextNode && !visitedNodes.has(nextNode.id)) {
                        dfs(nextNode, pattern);
                    }
                }
            });
        }

        edges.forEach(cell => {
            if (cell.vertex && !visitedNodes.has(cell.id)) {
                let pattern = [];
                dfs(cell, pattern);
                if (pattern.length > 1) connectedPatterns.add(JSON.stringify(pattern));
            }
        });

        extractedPatterns = Array.from(connectedPatterns).map(pattern => JSON.parse(pattern));
        console.log("🔍 Extracted Full Graph Patterns:", extractedPatterns);
        return extractedPatterns;
    }

    // Step 4: Full Graph Validation
    function validatePattern() {
        extractPatterns(); // Get the latest graph structure

        let allValid = extractedPatterns.every(pattern => 
            validPatterns.some(valid => JSON.stringify(valid) === JSON.stringify(pattern))
        );

        if (allValid) {
            alert("✅ All patterns are valid!");
            console.log("✅ Full Graph Patterns are valid:", extractedPatterns);
        } else {
            alert("❌ Invalid pattern detected!");
            console.warn("❌ Invalid Graph Patterns:", extractedPatterns);
        }
    }

    // Step 5: Ensure Connections Follow Rules
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty('edge');
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let target = edge.target.value;

        let validConnection = validPatterns.some(pattern =>
            pattern.includes(source) && pattern.includes(target)
        );

        if (!validConnection) {
            alert("❌ Invalid connection! Edge will be removed.");
            graph.getModel().remove(edge);
            console.warn("❌ Invalid Edge Found:", source, "→", target);
        } else {
            console.log("✅ Valid Connection:", source, "→", target);
        }
    });

    // Step 6: Reset or Undo Last Action
    function resetPattern() {
        extractedPatterns = [];
        console.log("🔄 Pattern reset.");
    }

    function undoLastAction() {
        if (extractedPatterns.length > 0) {
            let removed = extractedPatterns.pop();
            console.log("🔄 Removed Last Action:", removed);
        } else {
            console.warn("⚠️ No actions to undo.");
        }
    }

    // Step 7: Add Toolbar Buttons
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
        createButton("Undo Last Action", "#FFA500", undoLastAction);
        createButton("Reset Pattern", "#FF0000", resetPattern);

        console.log("✅ Toolbar Buttons Added");
    }

    addToolbarButtons();

    console.log("✅ Full Graph-Based Validation Applied Successfully!");
});
