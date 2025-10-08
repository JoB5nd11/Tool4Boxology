import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import Toolbar from './components/Toolbar';
import LeftSidebar from './components/LeftSidebar';
import GoDiagram from './GoDiagram';
import * as go from 'gojs';
import RightSidebar from './components/RightSidebar';
import ContextMenu from './ContextMenu';
import { validateGoJSDiagram, setupDiagramValidation } from './plugin/GoJSBoxologyValidation';
import { v4 as uuidv4 } from 'uuid';
import { validateDiagram } from './utils/validation';
import type { ValidationResult } from './utils/validation';
import { elementaryPatterns } from './data/patterns';
import SubdiagramPreview from './components/SubdiagramPreview';
import { modelToDOT } from './utils/dot';
import { findUnclusteredNodes } from './utils/validation';

function App() {
  const diagramRef = useRef<go.Diagram | null>(null);
  const [containers, setContainers] = useState<string[]>(['General', 'Annotation']);
  const [customContainerShapes, setCustomContainerShapes] = useState<{ [key: string]: any[] }>({});
  const [selectedData, setSelectedData] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [customGroups, setCustomGroups] = useState<{ [key: string]: any[] }>({});

  // Page management for GoJS diagrams
  type PageData = {
    id: string;
    name: string;
    nodeDataArray: any[];
    linkDataArray: any[];
    parentNodeId?: string; // For backtracking to parent page
    isSubDiagram?: boolean;
  };

  type SuperNodeMapping = {
    [nodeId: string]: string; // nodeId → pageId
  };

  const [pages, setPages] = useState<PageData[]>(
    [
      {
        id: uuidv4(),
        name: "Main Page",
        nodeDataArray: [],
        linkDataArray: [],
      },
    ]
  );

  const [currentPageId, setCurrentPageId] = useState(pages[0].id);
  const [superNodeMap, setSuperNodeMap] = useState<SuperNodeMapping>({});

  // Update current page data
  const updateCurrentPage = (nodeDataArray: any[], linkDataArray: any[]) => {
    setPages(pages.map(p => {
      if (p.id === currentPageId) {
        const updatedPage = { ...p, nodeDataArray, linkDataArray };
        
        // If this is a sub-page, also update the parent super node's subdiagram data
        if (p.isSubDiagram && p.parentNodeId) {
          // Find the parent page and update the super node's subdiagram data
          const parentPage = pages.find(parentP => 
            parentP.nodeDataArray.some(node => node.key === p.parentNodeId)
          );
          
          if (parentPage && diagramRef.current) {
            const diagram = diagramRef.current;
            const model = diagram.model;
            const superNodeData = model.findNodeDataForKey(p.parentNodeId);
            
            if (superNodeData && superNodeData.isSuperNode) {
              model.setDataProperty(superNodeData, 'subdiagramData', {
                nodeDataArray: updatedPage.nodeDataArray,
                linkDataArray: updatedPage.linkDataArray,
                pageId: p.id
              });
            }
          }
        }
        
        return updatedPage;
      }
      return p;
    }));
  };

  // Add new page function
  const handleAddNewPage = () => {
    // Save current diagram before switching
    if (diagramRef.current && currentPageId) {
      const model = diagramRef.current.model as go.GraphLinksModel;
      updateCurrentPage(model.nodeDataArray, model.linkDataArray);
    }

    const newPage: PageData = {
      id: uuidv4(),
      name: `Page ${pages.length + 1}`,
      nodeDataArray: [],
      linkDataArray: [],
    };
    
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
  };

  // Switch to different page
  const handlePageSwitch = (pageId: string) => {
    // Save current diagram data before switching
    if (diagramRef.current && currentPageId) {
      const model = diagramRef.current.model as go.GraphLinksModel;
      updateCurrentPage(model.nodeDataArray, model.linkDataArray);
    }
    
    setCurrentPageId(pageId);
  };

  // Close page
  const handleClosePage = (pageId: string) => {
    if (pages.length === 1) return; // Can't close last page
    
    setPages(prev => prev.filter(page => page.id !== pageId));
    
    // If closing current page, switch to first remaining page
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(page => page.id !== pageId);
      setCurrentPageId(remainingPages[0].id);
    }
  };

  // Removed duplicate declaration of currentPage

  // Removed duplicate declaration of currentPage

  // Get current page
  const currentPage = pages.find((p) => p.id === currentPageId);
  const isSubDiagram = currentPage?.isSubDiagram || false;

  // Load diagram data when page changes
  useEffect(() => {
    if (diagramRef.current && currentPage) {
      const diagram = diagramRef.current;
      diagram.model = new go.GraphLinksModel(
        currentPage.nodeDataArray,
        currentPage.linkDataArray
      );
    }
  }, [currentPageId, currentPage]);

  // Initialize elementary patterns in custom groups
  useEffect(() => {
    const patternsGroup = elementaryPatterns.map(pattern => ({
      id: pattern.id,
      name: pattern.name,
      description: pattern.description,
      type: 'pattern',
      pattern: pattern
    }));
    
    setCustomGroups(prev => ({
      ...prev,
      'Elementary Patterns': patternsGroup
    }));
  }, []); // Only run once on mount

  // Consolidated container management
  const handleAddContainer = (containerName: string) => {
    if (containerName && !containers.includes(containerName)) {
      setContainers(prev => [...prev, containerName]);
      alert(`Container "${containerName}" added!`);
    } else if (containerName) {
      alert('Container already exists!');
    }
  };

  // Consolidated custom group management
  const handleCustomGroupAction = (action: 'create' | 'save', groupName?: string) => {
    if (action === 'create') {
      const name = prompt('Enter a name for your new group:');
      if (!name) return;
      if (customGroups[name]) {
        alert('A group with this name already exists.');
        return;
      }
      setCustomGroups(prev => ({ ...prev, [name]: [] }));
      return;
    } else if (action === 'save' && groupName) {
      handleSaveToCustomGroup(groupName);
    }
  };

  // Consolidated save to custom group function
  const handleSaveToCustomGroup = (groupName: string) => {
    if (!diagramRef.current) {
      alert('No diagram available');
      return;
    }

    const diagram = diagramRef.current;
    const selectedNodes = diagram.selection.toArray();
    let dataToSave;

    let shapeName = prompt('Enter a name for this shape:', `Custom Shape ${Date.now()}`);
    if (!shapeName) shapeName = `Custom Shape ${Date.now()}`;

    if (selectedNodes.length > 0) {
      // Save selected nodes and their connections
      const selectedKeys = selectedNodes.map(node => node.key);
      const nodeData = selectedNodes.map(node => diagram.model.copyNodeData(node.data));
      const links = Array.from(diagram.links).filter(link => 
        selectedKeys.includes(link.fromNode?.key) && selectedKeys.includes(link.toNode?.key)
      );
      const linkData = links.map(link => ({ ...link.data }));

      dataToSave = {
        nodeDataArray: nodeData,
        linkDataArray: linkData,
        name: shapeName,
        type: 'selection',
        thumbnail: null as string | null
      };
    } else {
      // Save entire diagram
      const model = diagram.model;
      const json = JSON.parse(model.toJson());
      dataToSave = {
        nodeDataArray: model.nodeDataArray.map(node => model.copyNodeData(node)),
        linkDataArray: json.linkDataArray || [],
        name: shapeName,
        type: 'diagram',
        thumbnail: null as string | null
      };
    }

    // Generate thumbnail
    try {
      const img = diagram.makeImageData({
        scale: 0.3,
        background: 'white',
        parts: selectedNodes.length > 0 ? selectedNodes : undefined,
        type: 'image/png'
      });
      if (typeof img === 'string') {
        dataToSave.thumbnail = img;
      } else if (img instanceof HTMLImageElement) {
        dataToSave.thumbnail = img.src;
      } else {
        dataToSave.thumbnail = null;
      }
    } catch (error) {
      console.warn('Could not generate thumbnail:', error);
    }

    setCustomGroups(prev => ({
      ...prev,
      [groupName]: [...(prev[groupName] || []), dataToSave]
    }));

    alert(`${selectedNodes.length > 0 ? 'Selection' : 'Diagram'} saved as custom shape in "${groupName}" group!`);
  };

  // Consolidated file operations
  const handleFileOperation = (operation: 'save' | 'open') => {
    if (!diagramRef.current) return;

    if (operation === 'save') {
      const json = diagramRef.current.model.toJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Diagram saved!');
    } else if (operation === 'open') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && diagramRef.current) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const json = event.target?.result as string;
              diagramRef.current!.model = go.Model.fromJson(json);
              alert('Diagram loaded successfully!');
            } catch (error) {
              alert('Error loading diagram: Invalid file format');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  // Helper function to convert GoJS data to Graphviz DOT format
  const convertToDOT = (data: any): string => {
    const nodes = data.nodeDataArray || [];
    const links = data.linkDataArray || [];

    // Groups (clusters)
    const groups = nodes.filter((n: any) => n.isGroup);
    const membersByGroup: Record<string, any[]> = {};
    groups.forEach((g: any) => {
      membersByGroup[g.key] = nodes.filter((n: any) => !n.isGroup && n.group === g.key);
    });

    const topLevelNodes = nodes.filter((n: any) => !n.isGroup && !n.group);

    // Sanitize to a legal DOT ID and ensure it starts with a letter
    const dotId = (key: string) =>
      `n_${String(key).replace(/[^A-Za-z0-9_]/g, '_')}`;

    const esc = (s: string) => (s || '').replace(/"/g, '\\"');

    const mapShape = (shape: string) => {
      switch (shape) {
        case 'Rectangle': return 'box';
        case 'RoundedRectangle': return 'box';
        case 'Ellipse': return 'ellipse';
        case 'Diamond': return 'diamond';
        case 'Triangle': return 'triangle';
        case 'TriangleDown': return 'invtriangle';
        case 'Hexagon': return 'hexagon';
        default: return 'box';
      }
    };

    const nodeLine = (n: any, indent = '  ') => {
      const attrs: string[] = [];
      attrs.push(`label="${esc(n.label || n.name || n.key)}"`);
      attrs.push(`shape=${mapShape(n.shape)}`);
      // style: rounded only for RoundedRectangle, always filled if we have a fill color
      const styleParts = [];
      if (n.shape === 'RoundedRectangle') styleParts.push('rounded');
      styleParts.push('filled');
      attrs.push(`style="${styleParts.join(',')}"`);
      if (n.color) attrs.push(`fillcolor="${esc(n.color)}"`);
      if (n.stroke) attrs.push(`color="${esc(n.stroke)}"`);
      attrs.push(`fontname="Helvetica"`);

      return `${indent}${dotId(n.key)} [${attrs.join(', ')}];`;
    };

    const lines: string[] = [];
    lines.push('digraph Boxology {');
    lines.push('  graph [rankdir=TB, bgcolor="white"];');
    lines.push('  node [style="filled", fontname="Helvetica"];');
    lines.push('  edge [color="#555555"];');

    // Top-level nodes
    topLevelNodes.forEach((n: any) => lines.push(nodeLine(n)));

    // Clusters
    groups.forEach((g: any) => {
      const gid = dotId(g.key);
      lines.push(`  subgraph cluster_${gid} {`);
      lines.push(`    label="${esc(g.label || g.name || 'Cluster')}";`);
      lines.push('    style="filled";');
      lines.push('    color="#d3d3d3";');
      (membersByGroup[g.key] || []).forEach((n: any) => {
        lines.push(nodeLine(n, '    '));
      });
      lines.push('  }');
    });

    // Edges
    links.forEach((l: any) => {
      if (!l.from || !l.to) return;
      lines.push(`  ${dotId(l.from)} -> ${dotId(l.to)};`);
    });

    lines.push('}');
    return lines.join('\n');
  };

  // Gatekeeper: every node must be in a cluster (user group) or be a super node with a subdiagram
  const ensureExportPreconditions = (): { ok: boolean; error?: string } => {
    if (!diagramRef.current) return { ok: false, error: 'No diagram found.' };
    const raw = JSON.parse(diagramRef.current.model.toJson());
    const bad = findUnclusteredNodes(raw);
    if (bad.length) {
      const list = bad.slice(0, 10).map((n: any) => `- ${n.label ?? n.text ?? n.key}`).join('\n');
      return {
        ok: false,
        error:
`Export blocked: all nodes must belong to a cluster (or be a Super Node with a Subdiagram).

Unclustered nodes (${bad.length}):
${list}
Tip: select nodes → right-click → "Cluster Group".`
      };
    }
    return { ok: true };
  };

  const handleExport = async (
    format: 'svg' | 'png' | 'jpg' | 'xml' | 'json' | 'drawio' | 'dot'
  ) => {
    if (!diagramRef.current) return;

    const pre = ensureExportPreconditions();
    if (!pre.ok) {
      alert(pre.error);
      return;
    }

    const diagram = diagramRef.current;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    switch (format) {
      case 'svg':
        const svg = diagram.makeSvg({ scale: 1, background: 'white', document: document });
        if (!svg) {
          alert('Failed to export SVG: Diagram rendering failed.');
          return;
        }
        const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        downloadFile(svgBlob, `diagram_${timestamp}.svg`);
        break;

      case 'png':
        const pngImg = diagram.makeImage({ scale: 2, background: 'white', type: 'image/png', details: 0.05 });
        if (!pngImg) {
          alert('Failed to export PNG: Diagram rendering failed.');
          return;
        }
        downloadImageFile(pngImg.src, `diagram_${timestamp}.png`);
        break;

      case 'jpg':
        const jpgImg = diagram.makeImage({ scale: 2, background: 'white', type: 'image/jpeg', details: 0.05 });
        if (!jpgImg) {
          alert('Failed to export JPG: Diagram rendering failed.');
          return;
        }
        downloadImageFile(jpgImg.src, `diagram_${timestamp}.jpg`);
        break;

      case 'json': {
        // JSON already contains groups and nested subDiagram (if present).
        const json = diagram.model.toJson();
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        downloadFile(blob, `diagram_${timestamp}.json`);
        break;
      }

      case 'dot': {
        const data = JSON.parse(diagram.model.toJson());
        const dot = modelToDOT(data, { graphLabel: 'Boxology' });
        const blob = new Blob([dot], { type: 'text/vnd.graphviz;charset=utf-8' });
        downloadFile(blob, `diagram_${timestamp}.dot`);
        break;
      }

      case 'xml':
        const jsonData = diagram.model.toJson();
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<diagram>
  <metadata>
    <created>${new Date().toISOString()}</created>
    <tool>GoJS Diagram Editor</tool>
  </metadata>
  <data>
    ${jsonData}
  </data>
</diagram>`;
        const xmlBlob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        downloadFile(xmlBlob, `diagram_${timestamp}.xml`);
        break;

      case 'drawio':
        // Export in Draw.io compatible XML format
        const diagramData = diagram.model.toJson();
        const parsedData = JSON.parse(diagramData);
        
        // Convert GoJS data to Draw.io format
        const drawioXml = convertToDrawioXML(parsedData, timestamp);
        const drawioBlob = new Blob([drawioXml], { type: 'application/xml;charset=utf-8' });
        downloadFile(drawioBlob, `diagram_${timestamp}.drawio`);
        break;
    }
  };

  // Helper function to convert GoJS data to Draw.io XML format
  const convertToDrawioXML = (data: any, timestamp: string): string => {
    const nodes = data.nodeDataArray || [];
    const links = data.linkDataArray || [];
    
    let mxCells = '';
    let cellId = 2; // Start from 2 (0 and 1 are reserved)
    
    // Convert nodes
    nodes.forEach((node: any) => {
      const x = node.loc ? parseFloat(node.loc.split(' ')[0]) : 0;
      const y = node.loc ? parseFloat(node.loc.split(' ')[1]) : 0;
      const width = 120;
      const height = 80;
      
      // Determine shape style based on GoJS shape
      let style = 'rounded=0;whiteSpace=wrap;html=1;';
      if (node.shape === 'RoundedRectangle') {
        style = 'rounded=1;whiteSpace=wrap;html=1;';
      } else if (node.shape === 'Ellipse') {
        style = 'ellipse;whiteSpace=wrap;html=1;';
      } else if (node.shape === 'Diamond') {
        style = 'rhombus;whiteSpace=wrap;html=1;';
      } else if (node.shape === 'Triangle') {
        style = 'triangle;whiteSpace=wrap;html=1;';
      } else if (node.shape === 'Hexagon') {
        style = 'hexagon;whiteSpace=wrap;html=1;';
      }
      
      // Add fill color if available
      if (node.color) {
        style += `fillColor=${node.color};`;
      }
      if (node.stroke) {
        style += `strokeColor=${node.stroke};`;
      }
      
      mxCells += `
        <mxCell id="${cellId}" value="${node.text || node.label || ''}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
        </mxCell>`;
      
      // Store node ID mapping for links
      node._drawioId = cellId;
      cellId++;
    });
    
    // Convert links
    links.forEach((link: any) => {
      const fromNode = nodes.find((n: any) => n.key === link.from);
      const toNode = nodes.find((n: any) => n.key === link.to);
      
      if (fromNode && toNode) {
        mxCells += `
          <mxCell id="${cellId}" value="${link.text || ''}" style="endArrow=classic;html=1;" edge="1" parent="1" source="${fromNode._drawioId}" target="${toNode._drawioId}">
            <mxGeometry relative="1" as="geometry"/>
          </mxCell>`;
        cellId++;
      }
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="GoJS Diagram Editor" version="24.7.17" etag="exported">
  <diagram name="Diagram" id="diagram">
    <mxGraphModel dx="1422" dy="754" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${mxCells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  };

  // Helper functions for downloads
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadImageFile = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Diagram operations
  const handleDiagramOperation = (operation: 'undo' | 'redo' | 'validate') => {
    if (!diagramRef.current) return;

    switch (operation) {
      case 'undo':
        diagramRef.current.undoManager?.undo();
        break;
      case 'redo':
        diagramRef.current.undoManager?.redo();
        break;
      case 'validate':
        const result = validateGoJSDiagram(diagramRef.current);
        alert(result);
        break;
    }
  };

  // Context menu handler
  const handleContextMenuAction = (action: string, target?: string) => {
    setContextMenu(null);
  
    switch (action) {
      case 'mark_as_super_node':
        handleMarkAsSuperNode();
        break;
      case 'edit_linked_diagram':
        handleEditLinkedDiagram();
        break;
      case 'create_group':
        handleCustomGroupAction('create');
        break;
      case 'save_to_group':
        if (target) {
          handleCustomGroupAction('save', target);
          return;
        }
        break;
      // NEW: cluster selected nodes
      case 'cluster_group':
        handleClusterSelectedNodes();
        break;
      default:
        if (target) {
          console.log('Adding to group:', target);
        }
    }
  };
  // Add this state for the About modal
const [showAbout, setShowAbout] = useState(false);

// Replace the handleAbout function
const handleAbout = () => {
  setShowAbout(true);
};
// Add this function to copy email
const copyEmailToClipboard = () => {
  const email = 'mahsa.forghani.tehrani@stud.uni-hannover.de';
  navigator.clipboard.writeText(email).then(() => {
    alert('Email copied to clipboard!');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = email;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Email copied to clipboard!');
  });
};

  // Function to mark a node as super node
  const handleMarkAsSuperNode = () => {
    if (!selectedData || !diagramRef.current) return;

    const nodeId = selectedData.key;
    if (superNodeMap[nodeId]) {
      alert('This node is already a super node!');
      return;
    }

    // Create new sub-page
    const newPageId = uuidv4();
    const newSubPage: PageData = {
      id: newPageId,
      name: `${selectedData.label} - Subdiagram`,
      nodeDataArray: [],
      linkDataArray: [],
      parentNodeId: nodeId,
      isSubDiagram: true
    };

    setPages(prev => [...prev, newSubPage]);
    setSuperNodeMap(prev => ({
      ...prev,
      [nodeId]: newPageId
    }));

    // Update the node to show it's a super node with subdiagram data
    const diagram = diagramRef.current;
    const model = diagram.model;
    model.startTransaction('mark as super node');
    const nodeData = model.findNodeDataForKey(nodeId);
    if (nodeData) {
      model.setDataProperty(nodeData, 'isSuperNode', true);
      model.setDataProperty(nodeData, 'strokeWidth', 4);
      // Store the subdiagram data reference
      model.setDataProperty(nodeData, 'subdiagramData', {
        nodeDataArray: newSubPage.nodeDataArray,
        linkDataArray: newSubPage.linkDataArray,
        pageId: newPageId
      });
    }
    model.commitTransaction('mark as super node');

    alert('Node marked as super node with linked subdiagram!');
  };

  // Function to edit linked diagram
  const handleEditLinkedDiagram = () => {
    if (!selectedData) return;

    const nodeId = selectedData.key;
    const subPageId = superNodeMap[nodeId];
    
    if (subPageId) {
      // Save current page data before switching
      if (diagramRef.current && currentPageId) {
        const model = diagramRef.current.model as go.GraphLinksModel;
        updateCurrentPage(model.nodeDataArray, model.linkDataArray);
      }
      
      setCurrentPageId(subPageId);
    }
  };

  // Function to go back to parent page
  const handleBackToParent = () => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage?.parentNodeId) return;

    // Save current subdiagram data
    if (diagramRef.current) {
      const model = diagramRef.current.model as go.GraphLinksModel;
      updateCurrentPage(model.nodeDataArray, model.linkDataArray);
    }

    // Find parent page
    const parentPageId = Object.keys(superNodeMap).find(nodeId => 
      superNodeMap[nodeId] === currentPageId
    );
    
    if (parentPageId) {
      // Find which page contains this parent node
      const parentPage = pages.find(page => 
        page.nodeDataArray.some(node => node.key === parentPageId)
      );
      
      if (parentPage) {
        setCurrentPageId(parentPage.id);
      }
    }
  };

  // Prevent Ctrl+A from selecting all page elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+A (or Cmd+A on Mac) from selecting all page elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        
        // Optional: If you want Ctrl+A to work within the diagram only
        if (diagramRef.current && document.activeElement === diagramRef.current.div) {
          // Let GoJS handle Ctrl+A for selecting all diagram elements
          return;
        }
        
        // Prevent default browser "select all" behavior
        return false;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [isSuperNodeSelected, setIsSuperNodeSelected] = useState(false);

  // 🎯 ADD COLLAPSE STATE FOR SIDEBARS
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // 🎯 ADD TOGGLE FUNCTIONS
  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed(!leftSidebarCollapsed);
  };

  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  // Add selection change handler
  useEffect(() => {
    if (!diagramRef.current) return;

    const selectionChanged = () => {
      if (!diagramRef.current) return;
      
      const selection = diagramRef.current.selection;
      
      // Debug: log what's selected
      console.log('Selection changed. Selected items:');
      selection.each(part => {
        if (part instanceof go.Node) {
          console.log('Node data:', part.data);
        }
      });
      
      // Check for super nodes - using the correct property 'isSuperNode'
      let superNodeCount = 0;
      selection.each(part => {
        if (part instanceof go.Node && part.data.isSuperNode === true) {
          superNodeCount++;
          console.log('Found super node:', part.data);
        }
      });
      
      // Enable button only when exactly one super node is selected
      setIsSuperNodeSelected(superNodeCount === 1);
      console.log('Super node selected:', superNodeCount === 1);
    };

    diagramRef.current.addDiagramListener('ChangedSelection', selectionChanged);

    return () => {
      if (diagramRef.current) {
        diagramRef.current.removeDiagramListener('ChangedSelection', selectionChanged);
      }
    };
  }, [diagramRef.current]); // Changed dependency from diagram to diagramRef.current

  const handleValidateSuperNode = () => {
    if (!diagramRef.current) return;
    
    const selection = diagramRef.current.selection;
    let selectedSuperNode: go.Node | null = null;
    
    // Find the selected super node using the correct property
    selection.each((part: go.Part) => {
      if (part instanceof go.Node && part.data && part.data.isSuperNode === true) {
        selectedSuperNode = part as go.Node;
      }
    });
    
    if (!selectedSuperNode) {
      alert('Please select a super node');
      return;
    }
    
    console.log('Selected super node:', (selectedSuperNode as go.Node).data);
    
    // Get the sub-diagram page ID from the superNodeMap
    const nodeId = (selectedSuperNode as go.Node).data.key;
    const subPageId = superNodeMap[nodeId];
    
    if (!subPageId) {
      alert('No sub-diagram found for this super node');
      return;
    }
    
    // Find the sub-page
    const subPage = pages.find(page => page.id === subPageId);
    
    if (!subPage) {
      alert('Sub-diagram page not found');
      return;
    }
    
    // Create a temporary diagram to validate the sub-page data
    const tempDiagram = new go.Diagram();
    
    try {
      // Copy the templates from your main diagram
      if (diagramRef.current) {
        tempDiagram.nodeTemplate = diagramRef.current.nodeTemplate;
        tempDiagram.linkTemplate = diagramRef.current.linkTemplate;
      }
      
      // Load the sub-page data
      tempDiagram.model = new go.GraphLinksModel(
        subPage.nodeDataArray,
        subPage.linkDataArray
      );
      
      console.log('Validating sub-diagram:', {
        name: subPage.name,
        nodeCount: tempDiagram.nodes.count,
        linkCount: tempDiagram.links.count
      });
      
      // 🔧 USE THE COMPREHENSIVE VALIDATION UTILITY (not just the plugin)
      const validationResult: ValidationResult = validateDiagram(tempDiagram);
      
      console.log('Validation result:', validationResult);
      
      // Create comprehensive validation report
      let report = `🔍 VALIDATION REPORT FOR: "${subPage.name}"\n`;
      //report += `${'='.repeat(50)}\n\n`;
      
      // Status
      //const statusIcon = validationResult.status === 'valid' ? '✅' : 
      //                  validationResult.status === 'partial' ? '⚠️' : '❌';
      //report += `${statusIcon} STATUS: ${validationResult.status.toUpperCase()}\n\n`;

      // Boxology Plugin Results (now included in validationResult.pluginResult)
      if (validationResult.pluginResult) {
        report += `🔧 BOXOLOGY PLUGIN VALIDATION:\n`;
        report += `${'-'.repeat(30)}\n`;
        report += `${validationResult.pluginResult}\n\n`;
      }
      
      // Recommendations based on status
      report += `💡 RECOMMENDATIONS:\n`;
      report += `${'-'.repeat(30)}\n`;
      
      if (validationResult.status === 'valid') {
        report += `✨ Excellent! Your sub-diagram passes all validation checks.\n`;
        if (validationResult.warnings.length > 0) {
          report += `📈 Consider addressing warnings for optimal performance.\n`;
        }
      } else if (validationResult.status === 'partial') {
        report += `🔧 Good foundation, but needs improvement:\n`;
        report += `   • Address Boxology plugin issues first\n`;
        report += `   • Fix critical and major errors\n`;
        report += `   • Review connectivity and labeling\n`;
        report += `   • Consider simplifying complex areas\n`;
      } else {
        report += `🚨 Immediate attention required:\n`;
        report += `   • Fix Boxology validation issues\n`;
        report += `   • Address critical errors to ensure diagram functionality\n`;
        report += `   • Review overall structure and connectivity\n`;
        report += `   • Ensure all nodes are properly labeled\n`;
      }
      
      report += `\n${'='.repeat(50)}\n`;
      report += `📝 Validation completed at ${new Date().toLocaleTimeString()}`;
      
      // Show the comprehensive report
      alert(report);
      
      // Log detailed results for debugging
      console.log('Detailed validation result:', validationResult);
      
    } catch (error) {
      console.error('Error during sub-diagram validation:', error);
      alert(`Error validating sub-diagram: ${error}`);
    } finally {
      // Clean up temporary diagram
      tempDiagram.div = null;
    }
  };

  // State to store sub-diagrams
  const [subDiagrams, setSubDiagrams] = useState<Map<string, go.Diagram>>(new Map());

  // Function to register a sub-diagram (call this when creating/loading sub-diagrams)
  const registerSubDiagram = (id: string, subDiagram: go.Diagram) => {
    setSubDiagrams((prev: Map<string, go.Diagram>) => {
      const newMap = new Map(prev);
      newMap.set(id, subDiagram);
      return newMap;
    });
  };

  // Function to get sub-diagram by ID
  const getSubDiagram = (id: string): go.Diagram | undefined => {
    return subDiagrams.get(id);
  };

  // 🎯 COLLAPSE STATE (persisted in localStorage)
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('leftCollapsed') === 'true';
  });
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('rightCollapsed') === 'true';
  });

  // 💾 PERSIST STATE ON CHANGE
  useEffect(() => {
    localStorage.setItem('leftCollapsed', String(leftCollapsed));
  }, [leftCollapsed]);

  useEffect(() => {
    localStorage.setItem('rightCollapsed', String(rightCollapsed));
  }, [rightCollapsed]);

  // ⌨️ KEYBOARD SHORTCUTS: Ctrl+Alt+[ for left, Ctrl+Alt+] for right
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === '[') {
        e.preventDefault();
        setLeftCollapsed(v => !v);
      }
      if (e.ctrlKey && e.altKey && e.key === ']') {
        e.preventDefault();
        setRightCollapsed(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 📏 SIDEBAR WIDTHS for clean JSX
  const LEFT_W = leftCollapsed ? 44 : 300;   // 44px rail when collapsed
  const RIGHT_W = rightCollapsed ? 44 : 280; // 44px rail when collapsed

  // 🔄 OPTIONAL: Nudge diagram layout when sidebars change
  useEffect(() => {
    if (diagramRef.current) {
      diagramRef.current.requestUpdate(); // gentle layout refresh
    }
  }, [leftCollapsed, rightCollapsed]);

  // New state for subdiagram preview
  const [showSubdiagramPreview, setShowSubdiagramPreview] = useState(false);
  const [previewSubdiagramData, setPreviewSubdiagramData] = useState(null);

  // NEW: Cluster currently selected nodes into a gray labeled group
  const handleClusterSelectedNodes = () => {
    if (!diagramRef.current) {
      alert('No diagram available');
      return;
    }
    const diagram = diagramRef.current;

    // Collect selected non-group nodes
    const selectedNodes: go.Node[] = [];
    diagram.selection.each(part => {
      if (part instanceof go.Node && !part.data.isGroup) selectedNodes.push(part);
    });

    if (selectedNodes.length === 0) {
      alert('Select one or more nodes to cluster.');
      return;
    }

    const defaultLabel = 'Cluster';
    const label = prompt('Cluster label:', defaultLabel) || defaultLabel;

    diagram.startTransaction('cluster group');
    const key = `group_${Date.now()}`;

    const groupData: any = {
      key,
      isGroup: true,
      category: 'ClusterGroup',
      label
    };
    (diagram.model as go.GraphLinksModel).addNodeData(groupData);

    // Assign selected nodes to this group
    selectedNodes.forEach(n => {
      (diagram.model as go.GraphLinksModel).setDataProperty(n.data, 'group', key);
    });

    diagram.commitTransaction('cluster group');
  };

  return (
    <div className="app" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar
        diagram={diagramRef.current}
        onOpen={() => handleFileOperation('open')}
        onSave={() => handleFileOperation('save')}
        onUndo={() => handleDiagramOperation('undo')}
        onRedo={() => handleDiagramOperation('redo')}
        onAbout={handleAbout}
        onValidate={() => handleDiagramOperation('validate')}
        onValidateSuperNode={handleValidateSuperNode}
        onExportSVG={() => handleExport('svg')}
        onExportPNG={() => handleExport('png')}
        onExportJPG={() => handleExport('jpg')}
        onExportXML={() => handleExport('xml')}
        onExportJSON={() => handleExport('json')}
        onExportDrawio={() => handleExport('drawio')}
        onExportDOT={() => handleExport('dot')}  // NEW
        isSuperNodeSelected={isSuperNodeSelected}
      />

      {/* Back Button for Subdiagrams */}
      {isSubDiagram && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#e3f2fd',
          borderBottom: '1px solid #bbdefb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={handleBackToParent}
            style={{
              padding: '6px 12px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ⬅️ Back to Parent
          </button>
          <span style={{ fontSize: '14px', color: '#1976d2', fontWeight: '500' }}>
            Editing: {currentPage?.name}
          </span>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '10px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f8f9fa',
        alignItems: 'center'
      }}>
        {pages.filter(page => !page.isSubDiagram).map((page) => (
          <button
            key={page.id}
            onClick={() => handlePageSwitch(page.id)}
            style={{
              backgroundColor: page.id === currentPageId ? '#1976d2' : '#e0e0e0',
              color: page.id === currentPageId ? '#fff' : '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: page.id === currentPageId ? '600' : '400',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '100px',
              maxWidth: '200px'
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {page.name}
            </span>
            {pages.filter(p => !p.isSubDiagram).length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClosePage(page.id);
                }}
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '0 4px',
                  borderRadius: '2px',
                  opacity: 0.7,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = '1'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = '0.7'}
              >
                ×
              </span>
            )}
          </button>
        ))}
        
        {/* Add New Page Button */}
        <button
          onClick={handleAddNewPage}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: '4px',
            backgroundColor: '#4caf50',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#45a049'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#4caf50'}
          title="Add new page"
        >
          ➕ Add Page
        </button>
      </div>

      {/* Main Content */}
      <div className="main" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0, height: '100%', width: '100%' }}>
        {/* 🎯 COLLAPSIBLE LEFT SIDEBAR */}
        <div
          className="sidebar sidebar--left"
          style={{
            width: LEFT_W,
            minWidth: leftSidebarCollapsed ? 44 : 180,
            maxWidth: leftSidebarCollapsed ? 44 : 400,
            background: '#f9f9f9',
            borderRight: '1px solid #ddd',
            height: '100%',
            overflow: 'hidden',           // important to hide content when collapsing
            position: 'relative',
            boxShadow: '0 0 5px rgba(0,0,0,0.1)',
            transition: 'width 180ms ease' // smooth animation
          }}
        >
          {/* Collapse toggle button */}
          <button
            aria-label={leftSidebarCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
            title={leftSidebarCollapsed ? 'Expand Shapes Panel (Ctrl+Alt+[)' : 'Collapse Shapes Panel (Ctrl+Alt+['}
            onClick={() => setLeftSidebarCollapsed(v => !v)}
            className="collapse-btn collapse-btn--right"
          >
            {leftSidebarCollapsed ? '›' : '‹'}
          </button>

          {/* Rail label when collapsed */}
          {leftSidebarCollapsed ? (
            <div className="sidebar-rail">
              <div className="rail-title">Shapes</div>
              <div className="rail-icons">
                <div 
                  className="rail-icon" 
                  title="Click to expand"
                  onClick={() => setLeftSidebarCollapsed(false)}
                >
                  🔲
                </div>
                <div 
                  className="rail-icon" 
                  title="Click to expand"
                  onClick={() => setLeftSidebarCollapsed(false)}
                >
                  📁
                </div>
              </div>
            </div>
          ) : (
            <LeftSidebar
              containers={containers}
              customContainerShapes={customContainerShapes}
              customGroups={customGroups}
              onAddContainer={handleAddContainer}
              onCustomGroupAction={handleCustomGroupAction}
            />
          )}
        </div>

        {/* Diagram Area */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', height: '100%', display: 'flex' }}>
          <GoDiagram
            diagramRef={diagramRef}
            setSelectedData={setSelectedData}
            setContextMenu={setContextMenu}
            containers={containers}
            customGroups={customGroups}
            setShowSubdiagramPreview={setShowSubdiagramPreview}
            setPreviewSubdiagramData={setPreviewSubdiagramData}
          />
          <ContextMenu 
            contextMenu={contextMenu} 
            containers={containers} 
            customGroups={[...Object.keys(customGroups), 'CREATE_NEW', 'SAVE_TO_GROUP']}
            onAction={handleContextMenuAction}
            selectedData={selectedData} // ✅ Make sure this is passed
          />
        </div>

        {/* 🎯 COLLAPSIBLE RIGHT SIDEBAR */}
        <div
          className="sidebar sidebar--right"
          style={{
            width: RIGHT_W,
            minWidth: rightCollapsed ? 44 : 200,
            maxWidth: rightCollapsed ? 44 : 340,
            background: '#f9f9f9',
            borderLeft: '1px solid #ddd',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            transition: 'width 180ms ease'
          }}
        >
          {/* Collapse toggle button */}
          <button
            aria-label={rightCollapsed ? 'Expand right sidebar' : 'Collapse right sidebar'}
            title={rightCollapsed ? 'Expand Properties Panel (Ctrl+Alt+])' : 'Collapse Properties Panel (Ctrl+Alt+])'}
            onClick={() => setRightCollapsed(v => !v)}
            className="collapse-btn collapse-btn--left"
          >
            {rightCollapsed ? '‹' : '›'}
          </button>

          {rightCollapsed ? (
            <div className="sidebar-rail">
              <div className="rail-title">Props</div>
              <div className="rail-icons">
                <div 
                  className="rail-icon" 
                  title="Click to expand"
                  onClick={() => setRightCollapsed(false)}
                >
                  ⚙️
                </div>
              </div>
            </div>
          ) : (
            <RightSidebar selectedData={selectedData} diagramRef={diagramRef} />
          )}
        </div>
      </div>

      {/* Subdiagram Preview Component */}
      <SubdiagramPreview
        isOpen={showSubdiagramPreview}
        onClose={() => setShowSubdiagramPreview(false)}
        subdiagramData={previewSubdiagramData}
      />

      {/* Add the About modal HERE */}
      {showAbout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowAbout(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                paddingBottom: '15px',
                borderBottom: '2px solid #e3f2fd'
              }}
            >
              <h2 style={{ 
                margin: 0, 
                color: '#1976d2', 
                fontSize: '24px',
                fontWeight: '600'
              }}>
                About Tool4Boxology
              </h2>
              <button
                onClick={() => setShowAbout(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ lineHeight: '1.6', color: '#333' }}>
              {/* Development Status Notice */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #ffeaa7',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#856404' }}>
                      Active Development Notice
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                      This interface is under <strong>active development</strong>. New features and visual enhancements are being added frequently. 
                      Check our GitHub repository regularly for the latest updates and improvements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Description */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #bbdefb'
                }}>
                  <h3 style={{ 
                    margin: '0 0 15px 0', 
                    color: '#1976d2',
                    fontSize: '18px'
                  }}>
                    🤖 Hybrid AI System Design Tool
                  </h3>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    This web application assists you in creating <strong>Hybrid AI systems</strong> and 
                    validates them against established design patterns. Design, visualize, and validate 
                    your AI architecture with confidence.
                  </p>
                </div>
              </div>

              {/* GitHub Section - Updated with development notice */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ 
                  color: '#1976d2', 
                  margin: '0 0 10px 0',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📚 Documentation & Latest Updates
                </h4>
                <p style={{ margin: '0 0 10px 0' }}>
                  For detailed documentation, installation guides, source code, and <strong>the latest updates</strong>:
                </p>
                <a
                  href="https://github.com/SDM-TIB/Tool4Boxology.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#333',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#555';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#333';
                  }}
                >
                  🔗 Visit GitHub Repository
                </a>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '12px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  💡 Tip: Star the repository to get notified about new releases!
                </div>
              </div>

              {/* Contact Section */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ 
                  color: '#1976d2', 
                  margin: '0 0 15px 0',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💬 Need Help or Have Suggestions?
                </h4>
                <p style={{ margin: '0 0 15px 0' }}>
                  If you need assistance or have recommendations for improvements, 
                  feel free to reach out:
                </p>
                
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#666', 
                      marginBottom: '5px' 
                    }}>
                      Contact Email:
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '500',
                      color: '#333',
                      fontFamily: 'Monaco, Consolas, monospace'
                    }}>
                      mahsa.forghani.tehrani@stud.uni-hannover.de
                    </div>
                  </div>
                  <button
                    onClick={copyEmailToClipboard}
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.backgroundColor = '#45a049';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.backgroundColor = '#4caf50';
                    }}
                    title="Copy email to clipboard"
                  >
                    📋 Copy Email
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                borderTop: '1px solid #eee',
                paddingTop: '20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '12px'
              }}>
                <p style={{ margin: 0 }}>
                  Developed at TIB - SDM GROUP • Powered by GoJS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
