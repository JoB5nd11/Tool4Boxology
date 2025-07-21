import * as go from 'gojs';

// All valid shapes - exactly like original BoxologyValidation.js
const shapes = [
  "symbol",
  "data", 
  "symbol/data",
  "model",
  "actor",
  "generate",
  "generate:train",
  "generate:engineer",
  "infer:deduce",
  "model:semantic",
  "model:statistics",
  "infer",
  "deduce",
  "transform",
  "transform:embed",
  "text",
  "conditions",
  "description",
  "note",
  "pre-conditions",
  "post-condition",
  "group",
];

// List of all patterns - exactly like original BoxologyValidation.js
const allPatterns = [
  { name: "train_model (symbol)", edges: [["symbol", "generate:train"], ["generate:train", "model"]] },
  { name: "train_model (data)", edges: [["data", "generate:train"], ["generate:train", "model"]] },
  { name: "transform symbol", edges: [["symbol", "transform"], ["transform", "data"]] },
  { name: "transform symbol/data", edges: [["symbol/data", "transform"], ["transform", "data"]] },
  { name: "transform data", edges: [["data", "transform"], ["transform", "data"]] },
  { name: "generate_model from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "model"]] },
  { name: "infer_symbol (symbol → model → symbol)", edges: [["model", "infer:deduce"], ["symbol", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_symbol (symbol/data → model → symbol)", edges: [["model", "infer:deduce"], ["symbol/data", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_symbol (data → model → symbol)", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] },
  { name: "infer_model (symbol → model → model)", edges: [["model", "infer:deduce"], ["symbol", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "infer_model (symbol/data → model → model)", edges: [["model", "infer:deduce"], ["symbol/data", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "infer_model (data → model → model)", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "model"]] },
  { name: "embed transform", edges: [["symbol", "transform:embed"], ["data", "transform:embed"], ["transform:embed", "model:semantic"]] },
  { name: "transform data type", edges: [["data", "transform"], ["transform", "data"]] },
  { name: "generate_model from model and data", edges: [["model", "generate"], ["data", "generate"], ["generate", "model"]] },
  { name: "train_model (symbol)", edges: [["symbol", "generate"], ["generate", "model"]] },
  { name: "generate model (data → symbol → model)", edges: [["data", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "generate_symbol from actor", edges: [["actor", "generate:engineer"], ["generate:engineer", "symbol"]] },
  { name: "data-symbol transform", edges: [["symbol", "transform"], ["data", "transform"], ["transform", "data"]] },
  { name: "actor generate model", edges: [["actor", "generate"], ["symbol", "generate"], ["generate", "model"]] },
  { name: "infer symbol from more model", edges: [["model", "infer:deduce"], ["data", "infer:deduce"], ["infer:deduce", "symbol"]] },
];

// FIXED: Complete validNext with both cases and all node types
const validNext: { [key: string]: string[] } = {
  // Lowercase versions (original)
  "symbol": ["infer:deduce", "generate:train", "generate", "generate:engineer", "transform:embed", "transform", "symbol", "symbol/data"],
  "data": ["infer:deduce", "generate:train", "generate", "generate:engineer", "transform", "data", "transform:embed", "symbol/data"],
  "symbol/data": ["infer:deduce", "transform:embed", "generate", "transform", "symbol/data", "generate", "symbol", "data", "generate:train", "generate:engineer"],
  "infer:deduce": ["symbol", "model", "infer:deduce", "data", "symbol/data", "model:semantic", "model:statistics"],
  "model": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "generate:train": ["model", "generate:train", "model:semantic", "model:statistics"],
  "generate": ["model", "generate", "model:semantic", "model:statistics", "data", "symbol", "symbol/data"],
  "actor": ["generate:engineer", "actor"],
  "generate:engineer": ["model", "generate:engineer", "generate", "data", "symbol", "symbol/data"],
  "model:semantic": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "model:statistics": ["infer:deduce", "model", "generate", "generate:train", "generate:engineer", "model:statistics", "model:semantic", "transform:embed", "transform"],
  "transform:embed": ["data", "transform:embed", "symbol", "transform", "model:semantic", "model:statistics", "symbol/data", "model"],
  "transform": ["data", "symbol", "symbol/data", "transform", "transform:embed", "model", "model:semantic", "model:statistics"],
  "infer": ["symbol", "model", "data", "symbol/data"],
  "deduce": ["symbol", "model", "data", "symbol/data"],
  
  // Capitalized versions (for UI labels)
  "Symbol": ["Infer:deduce", "Generate:train", "Generate", "Generate:engineer", "Transform:embed", "Transform", "Symbol", "Symbol/data"],
  "Data": ["Infer:deduce", "Generate:train", "Generate", "Generate:engineer", "Transform", "Data", "Transform:embed", "Symbol/data"],
  "Symbol/data": ["Infer:deduce", "Transform:embed", "Generate", "Transform", "Symbol/data", "Generate", "Symbol", "Data", "Generate:train", "Generate:engineer"],
  "Infer:deduce": ["Symbol", "Model", "Infer:deduce", "Data", "Symbol/data", "Model:semantic", "Model:statistics"],
  "Model": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Generate:train": ["Model", "Generate:train", "Model:semantic", "Model:statistics"],
  "Generate": ["Model", "Generate", "Model:semantic", "Model:statistics", "Data", "Symbol", "Symbol/data"],
  "Actor": ["Generate:engineer", "Actor"],
  "Generate:engineer": ["Model", "Generate:engineer", "Generate", "Data", "Symbol", "Symbol/data"],
  "Model:semantic": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Model:statistics": ["Infer:deduce", "Model", "Generate", "Generate:train", "Generate:engineer", "Model:statistics", "Model:semantic", "Transform:embed", "Transform"],
  "Transform:embed": ["Data", "Transform:embed", "Symbol", "Transform", "Model:semantic", "Model:statistics", "Symbol/data", "Model"],
  "Transform": ["Data", "Symbol", "Symbol/data", "Transform", "Transform:embed", "Model", "Model:semantic", "Model:statistics"],
  "Infer": ["Symbol", "Model", "Data", "Symbol/data"],
  "Deduce": ["Symbol", "Model", "Data", "Symbol/data"],
};

// Check if a node should be ignored during validation - like original
function isIgnorable(nodeData: any): boolean {
  const ignoredNames = ["text", "conditions", "description", "note", "pre-conditions", "post-condition"];
  const ignoredTypes = ["group", "swimlane"];
  
  const label = (nodeData.label || nodeData.name || "").toLowerCase();
  const shape = (nodeData.shape || "").toLowerCase();
  
  return ignoredNames.includes(label) || ignoredTypes.includes(shape);
}

// FIXED: Get the correct node label with case normalization
function getNodeLabel(nodeData: any): string {
  return (nodeData.label || nodeData.name || "").trim();
}

// FIXED: Check if connection is valid (handle case variations)
function isValidConnection(source: string, target: string): boolean {
  // Try exact match first
  if (validNext[source] && validNext[source].includes(target)) {
    return true;
  }
  
  // Try lowercase match
  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();
  if (validNext[sourceLower] && validNext[sourceLower].includes(targetLower)) {
    return true;
  }
  
  // Try capitalized match
  const sourceCapital = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  const targetCapital = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  if (validNext[sourceCapital] && validNext[sourceCapital].includes(targetCapital)) {
    return true;
  }
  
  return false;
}

// FIXED: Merge identical nodes using correct GoJS methods
function mergeIdenticalNodes(diagram: go.Diagram, edge: go.Link): void {
  const source = edge.fromNode;
  const target = edge.toNode;
  
  if (!source || !target || source === target) return;
  
  const sourceName = getNodeLabel(source.data);
  const targetName = getNodeLabel(target.data);
  
  if (sourceName === targetName) {
    diagram.startTransaction("merge identical nodes");
    
    try {
      // Get all links connected to target node (excluding the connecting link)
      const targetLinks: go.Link[] = [];
      target.findLinksConnected().each(link => {
        if (link !== edge) targetLinks.push(link);
      });
      
      // FIXED: Use correct GoJS model property names
      targetLinks.forEach(link => {
        if (link.fromNode === target) {
          // Use the correct property name for GoJS links
          diagram.model.setDataProperty(link.data, "from", source.data.key);
        }
        if (link.toNode === target) {
          // Use the correct property name for GoJS links  
          diagram.model.setDataProperty(link.data, "to", source.data.key);
        }
      });
      
      // Remove the connecting link and target node
      diagram.remove(edge);
      diagram.remove(target);
      
      console.log(`✅ Merged identical nodes: "${sourceName}"`);
      
    } catch (error) {
      console.error("Error merging nodes:", error);
    } finally {
      diagram.commitTransaction("merge identical nodes");
    }
  }
}

// FIXED: Setup validation listeners with better error handling
export function setupDiagramValidation(diagram: go.Diagram): void {
  console.log("✅ GoJS Boxology Plugin Loading...");
  
  // Add listener for when links are drawn
  diagram.addDiagramListener("LinkDrawn", (e) => {
    const link = e.subject as go.Link;
    if (!link || !link.fromNode || !link.toNode) return;

    const source = getNodeLabel(link.fromNode.data);
    const target = getNodeLabel(link.toNode.data);
    
    console.log(`🔗 Attempting connection: "${source}" → "${target}"`);

    // Skip validation for ignorable nodes
    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      console.log("🔄 Skipping validation for ignorable nodes");
      return;
    }

    // FIXED: Use improved validation function
    if (!isValidConnection(source, target)) {
      console.log(`❌ Invalid connection blocked: "${source}" → "${target}"`);
      alert(`❌ Invalid connection! "${source}" → "${target}" will be removed.`);
      
      diagram.startTransaction("remove invalid link");
      try {
        diagram.remove(link);
      } catch (error) {
        console.error("Error removing link:", error);
        diagram.remove(link);
      }
      diagram.commitTransaction("remove invalid link");
      return;
    }

    console.log(`✅ Valid connection allowed: "${source}" → "${target}"`);

    // If same name nodes are connected, merge them
    if (source === target) {
      console.log(`🔄 Merging identical nodes: "${source}"`);
      mergeIdenticalNodes(diagram, link);
    }
  });

  // Add listener for link relinking
  diagram.addDiagramListener("LinkRelinked", (e) => {
    const link = e.subject as go.Link;
    if (!link || !link.fromNode || !link.toNode) return;

    const source = getNodeLabel(link.fromNode.data);
    const target = getNodeLabel(link.toNode.data);

    if (isIgnorable(link.fromNode.data) || isIgnorable(link.toNode.data)) {
      return;
    }

    if (!isValidConnection(source, target)) {
      alert(`❌ Invalid connection! "${source}" → "${target}" will be removed.`);
      diagram.startTransaction("remove invalid relink");
      try {
        diagram.remove(link);
      } catch (error) {
        diagram.remove(link);
      }
      diagram.commitTransaction("remove invalid relink");
    }
  });

  console.log("✅ GoJS Boxology Plugin Loaded Successfully");
}

// The function which checks validation for each pattern separately
export function validateGoJSDiagram(diagram: go.Diagram): string {
  const selectedCells = diagram.selection;
  if (selectedCells.count === 0) {
    return "⚠️ No selection made! Please select a pattern before validation.";
  }

  // Filter relevant nodes and edges
  const nodes: go.Node[] = [];
  const edges: go.Link[] = [];
  
  selectedCells.each(part => {
    if (part instanceof go.Node && !isIgnorable(part.data)) {
      nodes.push(part);
    } else if (part instanceof go.Link && part.fromNode && part.toNode) {
      edges.push(part);
    }
  });

  console.log(`🔍 Validating ${nodes.length} nodes and ${edges.length} edges`);

  // Extract edge names as [sourceName, targetName] - FIXED: normalize to lowercase
  const edgeNameList = edges.map(edge => {
    const source = getNodeLabel(edge.fromNode!.data).toLowerCase();
    const target = getNodeLabel(edge.toNode!.data).toLowerCase();
    return [source, target];
  });

  const matchedPatterns: { name: string }[] = [];
  const matchedNodeIds = new Set<string>();
  const matchedNodesByPattern: { [key: string]: Set<string> } = {};
  const usedEdgeIndices = new Set<number>();

  // Pattern matching logic - exactly like original
  allPatterns.forEach(pattern => {
    const required = [...pattern.edges];
    const tempEdges = edgeNameList.map((edge, i) => ({ edge, i }));

    while (true) {
      const currentMatchIndices: number[] = [];
      const involvedNodeIds = new Set<string>();
      let stillValid = true;

      for (const [from, to] of required) {
        const match = tempEdges.find(({ edge: [s, t], i }) => 
          s === from && t === to && !usedEdgeIndices.has(i)
        );

        if (!match) {
          stillValid = false;
          break;
        }

        currentMatchIndices.push(match.i);
        if (edges[match.i].fromNode) involvedNodeIds.add(edges[match.i].fromNode!.data.key);
        if (edges[match.i].toNode) involvedNodeIds.add(edges[match.i].toNode!.data.key);
      }

      if (!stillValid) break;

      // Record the matched pattern instance
      matchedPatterns.push({ name: pattern.name });
      matchedNodesByPattern[pattern.name] = matchedNodesByPattern[pattern.name] || new Set();
      currentMatchIndices.forEach(i => usedEdgeIndices.add(i));
      involvedNodeIds.forEach(id => {
        matchedNodeIds.add(id);
        matchedNodesByPattern[pattern.name].add(id);
      });
    }
  });

  // Build result summary
  const unmatchedNodes = nodes.filter(n => !matchedNodeIds.has(n.data.key));
  const isolatedNodes = nodes.filter(n => {
    let hasConnections = false;
    n.findLinksConnected().each(() => { hasConnections = true; });
    return !hasConnections;
  });

  if (matchedPatterns.length > 0 && unmatchedNodes.length === 0 && isolatedNodes.length === 0) {
    let summary = "✅ Valid pattern(s) detected:\n\n";
    for (const [pattern, nodeSet] of Object.entries(matchedNodesByPattern)) {
      summary += `• ${pattern}\n`;
    }
    return summary;
  } else {
    let summary = "❌ Invalid pattern: Issues detected.\n\n";
    if (matchedPatterns.length > 0) {
      summary += "✅ Partial matches found:\n";
      for (const [pattern, nodeSet] of Object.entries(matchedNodesByPattern)) {
        summary += `  • ${pattern} (${nodeSet.size} nodes)\n`;
      }
      summary += "\n";
    }
    
    if (unmatchedNodes.length > 0) {
      summary += `❌ ${unmatchedNodes.length} unmatched nodes\n`;
    }
    
    if (isolatedNodes.length > 0) {
      summary += `❌ ${isolatedNodes.length} isolated nodes\n`;
    }
    
    return summary;
  }
}

// Export validation shapes and patterns for external use
export { shapes as validationShapes, allPatterns as validationPatterns, validNext as validationRules };