Draw.loadPlugin(function(ui) {
    console.log("✅ Boxology Plugin Loaded");

    var graph = ui.editor.graph;

    // Step 1: Define the Boxology Palette
    mxResources.parse('boxology=Boxology Patterns');

    Sidebar.prototype.addBoxologyPalette = function() {
        this.addPaletteFunctions(
            'boxology',
            'Boxology',
            true,
            [
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'data', 'Data'),
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

    // Add the Boxology Palette to the Sidebar
    ui.sidebar.addBoxologyPalette();
    console.log("✅ Boxology Palette Added");

    // Step 2: Define Valid Boxology Patterns
    const validPatterns = [
        ["actor", "generate:engineer", "model"],
        ["data", "generate:train", "model"],
        ["data", "transform", "symbol"],
        ["model", "infer:deduce", "symbol"],
        ["model", "infer:deduce", "model"]
    ];

    function isValidConnection(source, target) {
        // A valid edge must be part of a valid pattern (but only checking direct source-target connection)
        return validPatterns.some(pattern =>
            (pattern[0] === source && pattern[1] === target) ||  // First node to process
            (pattern[1] === source && pattern[2] === target)     // Process to final node
        );
    }

    // Step 3: Validate Each Edge Correctly
    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty("edge");
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let target = edge.target.value;

        console.log(`🔍 Checking connection: ${source} → ${target}`);

        // Check if the connection is valid according to the pattern structure
        if (!isValidConnection(source, target)) {
            alert(`❌ Invalid connection: ${source} → ${target}`);
            console.error("❌ Invalid Connection Found:", [source, target]);

            graph.getModel().beginUpdate();
            try {
                graph.getModel().remove(edge);
            } finally {
                graph.getModel().endUpdate();
            }
        } else {
            console.log("✅ Valid connection added:", [source, target]);
        }
    });

    console.log("✅ Validation Rules Applied Successfully!");
});
