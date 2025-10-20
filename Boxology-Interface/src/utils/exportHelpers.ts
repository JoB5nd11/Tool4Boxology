import * as go from 'gojs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced JSON export that generates RML-compatible structure
 * with proper role definitions for components in design patterns
 */
export const generateRMLCompatibleJSON = (diagram: go.Diagram): any => {
  const model = diagram.model as go.GraphLinksModel;
  const nodes = model.nodeDataArray;
  const links = model.linkDataArray;

  // Define allowed types for each role
  const inputTypes = ['Symbol', 'Data', 'Model', 'Actor'];
  const outputTypes = ['Symbol', 'Data', 'Model'];
  const processTypes = [
    'Generate', 'Generate:Train', 'Generate:Engineer',
    'Transform', 'Infer:Deduce', 'Infer'
  ];

  // Find all cluster groups (Design Patterns)
  const designPatterns = nodes.filter((n: any) => n.isGroup && n.category === 'ClusterGroup');
  const boxologyId = `boxology_${uuidv4().slice(0, 8)}`;
  const boxologyLabel = diagram.model.modelData?.name || 'My Boxology';

  // Helper: build component object
  const buildComponent = (node: any) => ({
    id: node.key,
    type: node.shape || node.category || 'Data',
    label: node.label || node.text || node.name || 'Unnamed Component'
  });

  // Build DesignPatterns array
  const DesignPatterns = designPatterns.map((pattern: any) => {
    const patternId = pattern.key || `pattern_${uuidv4().slice(0, 8)}`;
    const patternLabel = pattern.label || pattern.text || pattern.name || 'Unnamed Pattern';
    const patternNodes = nodes.filter((n: any) => !n.isGroup && n.group === pattern.key);

    // Assign roles based on type
    const input: any[] = [];
    const output: any[] = [];
    let process: any = null;

    patternNodes.forEach((node: any) => {
      const comp = buildComponent(node);
      const type = (comp.type || '').toLowerCase();

      // Assign input
      if (inputTypes.some(t => t.toLowerCase() === type)) {
        input.push(comp);
      }
      // Assign output
      if (outputTypes.some(t => t.toLowerCase() === type)) {
        output.push(comp);
      }
      // Assign process (only one per pattern)
      if (
        processTypes.some(t => t.toLowerCase() === type) &&
        !process
      ) {
        process = comp;
      }
    });

    return {
      id: patternId,
      label: patternLabel,
      input,
      output: output.length === 1 ? output[0] : output,
      process
    };
  });

  return {
    id: boxologyId,
    label: boxologyLabel,
    DesignPatterns
  };
}

/**
 * Analyze node roles based on their connections within a pattern
 */
const analyzeNodeRoles = (patternNodes: any[], allLinks: any[]): { [nodeKey: string]: string } => {
  const roles: { [nodeKey: string]: string } = {};
  const nodeKeys = patternNodes.map((n: any) => n.key);

  patternNodes.forEach((node: any) => {
    const nodeKey = node.key;

    // Count incoming and outgoing links within this pattern
    const incomingLinks = allLinks.filter((l: any) => 
      l.to === nodeKey && nodeKeys.includes(l.from)
    );
    const outgoingLinks = allLinks.filter((l: any) => 
      l.from === nodeKey && nodeKeys.includes(l.to)
    );

    // Role detection heuristics
    const hasIncoming = incomingLinks.length > 0;
    const hasOutgoing = outgoingLinks.length > 0;

    // Check for explicit markers in node data
    if (node.role) {
      roles[nodeKey] = node.role;
      return;
    }

    // Heuristic-based role detection
    if (!hasIncoming && hasOutgoing) {
      roles[nodeKey] = 'input'; // Source nodes
    } else if (hasIncoming && !hasOutgoing) {
      roles[nodeKey] = 'output'; // Sink nodes
    } else if (hasIncoming && hasOutgoing) {
      // Middle nodes - check for process indicators
      const nodeName = (node.label || node.text || node.name || '').toLowerCase();
      if (nodeName.includes('train') || nodeName.includes('process') || 
          nodeName.includes('transform') || nodeName.includes('fine-tune') ||
          nodeName.includes('generate') || nodeName.includes('compute')) {
        roles[nodeKey] = 'process';
      } else {
        // Could be intermediate data or process
        roles[nodeKey] = 'process';
      }
    } else {
      // Isolated node - default to input
      roles[nodeKey] = 'input';
    }
  });

  return roles;
};

/**
 * Export all pages in RML-compatible format
 */
export const generateMultiPageRMLExport = (pages: any[]): any => {
  return {
    boxologies: pages.map(page => {
      const boxologyId = page.id.replace(/-/g, '_');
      
      return {
        id: boxologyId,
        label: page.name,
        DesignPattern: extractPatternsFromPage(page)
      };
    })
  };
};

/**
 * Extract patterns from a page
 */
const extractPatternsFromPage = (page: any): any[] => {
  const patterns: any[] = [];
  const nodes = page.nodeDataArray || [];
  const links = page.linkDataArray || [];

  // Find all cluster groups in this page
  const clusters = nodes.filter((n: any) => n.isGroup && n.category === 'ClusterGroup');

  clusters.forEach((cluster: any) => {
    const patternNodes = nodes.filter((n: any) => !n.isGroup && n.group === cluster.key);
    const nodeRoles = analyzeNodeRoles(patternNodes, links);

    const pattern: any = {
      id: cluster.key || `pattern_${uuidv4().slice(0, 8)}`,
      label: cluster.label || cluster.text || 'Unnamed Pattern',
      hasInput: [],
      hasOutput: [],
      hasProcess: []
    };

    patternNodes.forEach((node: any) => {
      const component = {
        id: node.key || `component_${uuidv4().slice(0, 8)}`,
        name: node.shape || node.category || 'Data',
        label: node.label || node.text || node.name || 'Unnamed Component',
        role: nodeRoles[node.key] || 'input'
      };

      // Categorize by role
      switch (nodeRoles[node.key]) {
        case 'input':
          pattern.hasInput.push(component);
          break;
        case 'output':
          pattern.hasOutput.push(component);
          break;
        case 'process':
          pattern.hasProcess.push(component);
          break;
        default:
          pattern.hasInput.push(component);
      }
    });

    patterns.push(pattern);
  });

  return patterns;
};