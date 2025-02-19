Draw.loadPlugin(function(ui) {
    console.log("✅ Boxology Guided Plugin Loaded");

    var graph = ui.editor.graph;
    var currentPattern = [];
    var separateComponents = [];

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

    // Step 2: Define Valid Next Components
    const validNext = {
        "symbol": ["infer:deduce", "generate:train"],
        "infer:deduce": ["symbol", "model"],
        "generate:train": ["model"],
        "actor": ["generate:engineer"],
        "generate:engineer": ["model"],
        "model:semantic": ["infer:deduce"],
        "transform": ["data"]
    };

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

    // Step 3: Allow User to Choose Next or Separate Component
    function promptNextComponent(lastComponent) {
        let options = validNext[lastComponent] || [];
        let message = "What would you like to do?\n1️⃣ Next Component\n2️⃣ Separate Component";

        if (options.length > 0) {
            message += "\nValid Next Options: " + options.join(", ");
        } else {
            message += "\n(No valid next options, only separate components allowed)";
        }

        let choice = prompt(message, "1 or 2");

        if (choice === "1") {
            let selected = prompt("Choose next component:", options.join(", "));
            if (options.includes(selected)) {
                currentPattern.push(selected);
                console.log("✅ Added as Next:", selected);
            } else {
                alert("❌ Invalid next component choice!");
            }
        } else if (choice === "2") {
            let separate = prompt("Choose a separate component:", Object.keys(validNext).join(", "));
            separateComponents.push(separate);
            console.log("➕ Added as Separate Component:", separate);
        }
    }

    // Step 4: Ensure Connections Follow Rules
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty('edge');
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let target = edge.target.value;

        if (!validNext[source] || !validNext[source].includes(target)) {
            alert("❌ Invalid connection! Edge will be removed.");
            graph.getModel().remove(edge);
            console.warn("❌ Invalid Edge Found:", source, "→", target);
        } else {
            console.log("✅ Valid Connection:", source, "→", target);
        }
    });

    // Step 5: Validate Entire Pattern
    function validatePattern() {
        let edges = Object.values(graph.getModel().cells);
        let extractedPattern = [];

        edges.forEach(cell => {
            if (cell.edge && cell.source && cell.target) {
                extractedPattern.push(cell.source.value, cell.target.value);
            }
        });

        extractedPattern = [...new Set(extractedPattern)]; // Remove duplicates

        let isValid = validPatterns.some(valid => JSON.stringify(valid) === JSON.stringify(extractedPattern));

        if (isValid) {
            alert("✅ Pattern is valid!");
            console.log("✅ Full Pattern:", extractedPattern);
        } else {
            alert("❌ Invalid pattern detected!");
            console.warn("❌ Invalid Pattern:", extractedPattern);
        }
    }

    // Step 6: Reset or Undo Last Action
    function resetPattern() {
        currentPattern = [];
        separateComponents = [];
        console.log("🔄 Pattern reset.");
    }

    function undoLastAction() {
        if (currentPattern.length > 0) {
            let removed = currentPattern.pop();
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

    console.log("✅ Guided Pattern Validation Applied Successfully!");
});
