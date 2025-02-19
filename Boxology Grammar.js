Draw.loadPlugin(function(ui) {
    console.log("✅ Boxology Grammar Plugin Loaded");

    var graph = ui.editor.graph;

    // Step 1: Define the Boxology Grammar Palette
    mxResources.parse('boxology=Boxology Grammar');

    Sidebar.prototype.addBoxologyPalette = function() {
        this.addPaletteFunctions(
            'boxology',
            'Boxology Grammar',
            true,
            [
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'data/symbol', 'Data/Symbol'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'symbol', 'Symbol'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:train', 'Generate: Train'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:engineer', 'Generate: Engineer'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'transform', 'Transform'),
                this.createVertexTemplateEntry('rhombus;strokeWidth=2;', 100, 50, 'infer:deduce', 'Infer: Deduce'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'model', 'Model'),
                this.createVertexTemplateEntry('triangle;strokeWidth=2;', 100, 50, 'actor', 'Actor')
            ]
        );
    };

    // Add the Boxology Grammar Palette to the Sidebar
    ui.sidebar.addBoxologyPalette();
    console.log("✅ Boxology Grammar Palette Added");

    // Step 2: Define Valid Boxology Patterns
    const validPatterns = [
        ["data/symbol", "generate:train", "model"],  // generate_model
        ["actor", "generate:engineer", "model"],     // generate_model
        ["data/symbol", "transform", "data/symbol"], // generate_model
        ["model", "infer:deduce", "symbol"],         // use_model
        ["model", "infer:deduce", "model"],          // use_model

        // Complex patterns
        ["model", "model", "infer:deduce", "data/symbol"],
        ["data/symbol", "data/symbol", "transform", "data/symbol", "data/symbol"],
        ["actor", "generate:engineer", "model", "model"]
    ];

    // Step 3: Track Connected Nodes
    let activePatterns = [];

    function addToPattern(source, target) {
        let newConnection = [source, target];

        // Allow incremental builds
        activePatterns.push(newConnection);
        console.log("🔍 Active Patterns:", activePatterns);
    }

    function validatePartialPattern(source, target) {
        let flatPattern = activePatterns.flat();

        // Allow partial patterns to exist as long as they don't break the rules
        return validPatterns.some(pattern => 
            pattern.includes(source) && pattern.includes(target)
        );
    }

    function validateCompletePattern() {
        let flatPattern = activePatterns.flat();
        return validPatterns.some(pattern => JSON.stringify(pattern) === JSON.stringify(flatPattern));
    }

    // Step 4: Listen for Edge Connections with Incremental Validation
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty("edge");
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let target = edge.target.value;

        console.log(`🔍 Checking incremental pattern: ${source} → ${target}`);

        addToPattern(source, target);

        // Allow if it's part of a correct pattern
        if (!validatePartialPattern(source, target)) {
            alert(`❌ Invalid connection: ${source} → ${target}`);
            console.error("❌ Invalid Incremental Pattern:", activePatterns);

            graph.getModel().beginUpdate();
            try {
                graph.getModel().remove(edge);
                activePatterns.pop(); // Remove last added connection
            } finally {
                graph.getModel().endUpdate();
            }
        } else {
            console.log("✅ Partial structure allowed:", activePatterns);
        }

        // Final validation when pattern is complete
        if (validateCompletePattern()) {
            console.log("✅ Full pattern completed successfully.");
            activePatterns = []; // Reset for next pattern
        }
    });

    console.log("✅ Incremental Grammar Validation Applied Successfully!");
});
