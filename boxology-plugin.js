Draw.loadPlugin(function (ui) {
    console.log("Boxology Plugin Loaded");

    // Get the Graph
    let graph = ui.editor.graph;
    let parent = graph.getDefaultParent();

    graph.getModel().beginUpdate();
    try {
        // Define Nodes
        let dataNode = graph.insertVertex(
            parent, null, "Data", 50, 50, 100, 50,
            "shape=rectangle;fillColor=white;strokeColor=green;"
        );

        let mlTrainingNode = graph.insertVertex(
            parent, null, "ML_Training", 200, 50, 120, 50,
            "shape=rectangle;fillColor=white;strokeColor=blue2;"
        );

        let mlModelNode = graph.insertVertex(
            parent, null, "ML_Model", 350, 50, 120, 50,
            "shape=hexagon;fillColor=white;strokeColor=blue;"
        );

        // Define Edges
        graph.insertEdge(parent, null, "", dataNode, mlTrainingNode);
        graph.insertEdge(parent, null, "", mlTrainingNode, mlModelNode);

    } finally {
        graph.getModel().endUpdate();
    }

    console.log("Boxology Graph Loaded");
});
