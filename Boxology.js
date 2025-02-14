Draw.loadPlugin(function(ui) {
    console.log("Boxology Plugin Loaded");

    var graph = ui.editor.graph;  // Properly reference the graph object

    mxResources.parse('boxology=Boxology Patterns');

    Sidebar.prototype.addBoxologyPalette = function() {
        this.addPaletteFunctions(
            'boxology',
            'Boxology',
            true,
            [
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'data/symbol', 'Data/Symbol'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:train', 'Generate: Train'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'generate:engineer', 'Generate: Engineer'),
                this.createVertexTemplateEntry('ellipse;strokeWidth=2;', 100, 50, 'transform', 'Transform'),
                this.createVertexTemplateEntry('rhombus;strokeWidth=2;', 100, 50, 'infer:deduce', 'Infer: Deduce'),
                this.createVertexTemplateEntry('rectangle;strokeWidth=2;', 100, 50, 'model', 'Model'),
                this.createVertexTemplateEntry('triangle;strokeWidth=2;', 100, 50, 'actor', 'Actor')
            ]
        );
    };

    ui.sidebar.addBoxologyPalette();

    function isValidPattern(source, process, target) {
        const validPatterns = [
            ["data/symbol", "generate:train", "model"],
            ["actor", "generate:engineer", "model"],
            ["data/symbol", "transform", "data/symbol"],
            ["model", "infer:deduce", "symbol"],
            ["model", "infer:deduce", "model"]
        ];

        return validPatterns.some(pattern => 
            pattern[0] === source && pattern[1] === process && pattern[2] === target
        );
    }

    graph.addListener(mxEvent.CELL_CONNECTED, function(sender, evt) {
        let edge = evt.getProperty('edge');
        if (!edge || !edge.source || !edge.target) return;

        let source = edge.source.value;
        let process = edge.value;
        let target = edge.target.value;

        if (!isValidPattern(source, process, target)) {
            alert("Invalid pattern according to Boxology rules!");
            graph.getModel().remove(edge);
        } else {
            console.log(`Valid connection: ${source} → ${process} → ${target}`);
        }
    });

    console.log("Validation rules applied successfully!");
});
