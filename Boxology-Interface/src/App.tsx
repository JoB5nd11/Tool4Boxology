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

  const [pages, setPages] = useState<PageData[]>([
    {
      id: uuidv4(),
      name: "Main Page",
      nodeDataArray: [],
      linkDataArray: [],
    },
  ]);

  const [currentPageId, setCurrentPageId] = useState(pages[0].id);
  const [superNodeMap, setSuperNodeMap] = useState<SuperNodeMapping>({});

  // Update current page data
  const updateCurrentPage = (nodeDataArray: any[], linkDataArray: any[]) => {
    setPages(pages.map(p => 
      p.id === currentPageId ? { ...p, nodeDataArray, linkDataArray } : p
    ));
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

  // Consolidated export function
  const handleExport = (format: 'svg' | 'png' | 'jpg' | 'xml') => {
    if (!diagramRef.current) return;

    const diagram = diagramRef.current;
    const timestamp = new Date().toISOString().slice(0, 10);

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

      case 'xml':
        const json = diagram.model.toJson();
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<diagram>
  <metadata>
    <created>${new Date().toISOString()}</created>
    <tool>GoJS Diagram Editor</tool>
  </metadata>
  <data>
    ${json}
  </data>
</diagram>`;
        const xmlBlob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        downloadFile(xmlBlob, `diagram_${timestamp}.xml`);
        break;
    }
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
      case 'move':
        if (target) {
          console.log('Moving node to:', target);
        }
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
      default:
        if (target) {
          console.log('Adding to group:', target);
        }
    }
  };

  const handleAbout = () => {
    alert('Custom Diagram Editor using GoJS');
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

    // Update the node to show it's a super node with thicker stroke
    const diagram = diagramRef.current;
    const model = diagram.model;
    model.startTransaction('mark as super node');
    const nodeData = model.findNodeDataForKey(nodeId);
    if (nodeData) {
      model.setDataProperty(nodeData, 'isSuperNode', true);
      model.setDataProperty(nodeData, 'strokeWidth', 4); // ← Change stroke width instead
      // Keep the original label
      // model.setDataProperty(nodeData, 'label', selectedData.label); // Optional: keep original label
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
        onExportSVG={() => handleExport('svg')}
        onExportPNG={() => handleExport('png')}
        onExportJPG={() => handleExport('jpg')}
        onExportXML={() => handleExport('xml')}
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
        {/* Left Sidebar */}
        <div style={{ width: 300, minWidth: 180, maxWidth: 400, background: '#f9f9f9', borderRight: '1px solid #ddd', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, boxShadow: '0 0 5px rgba(0,0,0,0.1)', boxSizing: 'content-box', overflowX: 'hidden' }}>
          <LeftSidebar
            containers={containers}
            customContainerShapes={customContainerShapes}
            customGroups={customGroups}
            onAddContainer={handleAddContainer}
            onCustomGroupAction={handleCustomGroupAction}
          />
        </div>

        {/* Diagram Area */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', height: '100%', display: 'flex' }}>
          <GoDiagram
            diagramRef={diagramRef}
            setSelectedData={setSelectedData}
            setContextMenu={setContextMenu}
            containers={containers}
            customGroups={customGroups}
          />
          <ContextMenu 
            contextMenu={contextMenu} 
            containers={containers} 
            customGroups={[...Object.keys(customGroups), 'CREATE_NEW', 'SAVE_TO_GROUP']}
            onAction={handleContextMenuAction}
            selectedData={selectedData} // ✅ Make sure this is passed
          />
        </div>

        {/* Right Sidebar */}
        <div style={{ width: 280, minWidth: 200, maxWidth: 340, background: '#f9f9f9', borderLeft: '1px solid #ddd', height: '100%', overflowY: 'auto' }}>
          <RightSidebar
            selectedData={selectedData}
            diagramRef={diagramRef}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
