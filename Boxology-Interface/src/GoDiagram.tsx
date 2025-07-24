import React, { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import * as go from 'gojs';
import ContextMenu from './ContextMenu';
import { setupDiagramValidation, validateGoJSDiagram } from './plugin/GoJSBoxologyValidation';
import { mapShapeToGoJSFigure } from './utils/shapeMapping';

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface GoDiagramProps {
  diagramRef: React.RefObject<go.Diagram | null>;
  setSelectedData: Dispatch<SetStateAction<any>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuPosition | null>>;
  containers: string[]; // <-- Add containers prop
}

const GoDiagram: React.FC<GoDiagramProps> = ({
  diagramRef,
  setSelectedData,
  setContextMenu,
  containers // <-- Use containers from props
}) => {
  const diagramDivRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setLocalContextMenu] = React.useState<ContextMenuPosition | null>(null);
  const [selectedData, setLocalSelectedData] = React.useState<any>(null);

  const handleSidebarChange = (field: string, value: string) => {
    if (!diagramRef.current || !selectedData) return;

    const model = diagramRef.current.model;
    model.startTransaction('update');
    const nodeData = model.findNodeDataForKey(selectedData.key);
    if (nodeData) {
      model.setDataProperty(nodeData, field, value);
    }
    model.commitTransaction('update');
  };

  useEffect(() => {
    if (!diagramDivRef.current) return;

    const $ = go.GraphObject.make;

    if (diagramRef.current) {
      diagramRef.current.div = null;
      diagramRef.current.clear();
      diagramRef.current = null;
    }

    // Define custom figures for GoJS
    go.Shape.defineFigureGenerator("CustomHexagon", function(shape, w, h) {
      let param1 = shape ? shape.parameter1 : NaN;
      if (isNaN(param1)) param1 = 1; // default corner radius
      
      const geo = new go.Geometry();
      const fig = new go.PathFigure(w * 0.5, 0, true); // start point at top center
      
      // Create hexagon points
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.25));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.75));
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.5, h));
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.75));
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.25));
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.5, 0).close());
      
      geo.add(fig);
      return geo;
    });

    const diagram = $(go.Diagram, diagramDivRef.current, {
      'undoManager.isEnabled': true,
      allowDrop: true,
      grid: $(
        go.Panel,
        'Grid',
        { gridCellSize: new go.Size(20, 20) },
        $(go.Shape, 'LineH', { stroke: '#eee' }),
        $(go.Shape, 'LineV', { stroke: '#eee' })
      ),
    });

    diagram.toolManager.draggingTool.isGridSnapEnabled = true;
    diagram.toolManager.linkingTool.isEnabled = true;
    diagram.toolManager.relinkingTool.isEnabled = true;

    diagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        selectable: true,
        movable: true,
        cursor: 'move',
        contextClick: (e, obj) => {
          const node = obj.part;
          if (node instanceof go.Node) {
            setSelectedData(node.data);
            setContextMenu({ x: diagram.lastInput.viewPoint.x, y: diagram.lastInput.viewPoint.y });
          }
        },
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),        $(
        go.Shape,
        {
          strokeWidth: 1,
          stroke: '#999',
          portId: '',
          fromLinkable: true,
          toLinkable: true,
          width: 100,   // Add default width
          height: 60,   // Add default height
          minSize: new go.Size(60, 40),  // Add minimum size
          maxSize: new go.Size(200, 120), // Add maximum size
          // To round rectangle corners in GoJS, use parameter1 for the "Rectangle" shape:
          parameter1: 360, // Default border radius for rectangles
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'stroke'),
        new go.Binding('figure', 'shape', (shapeType) => {
          const figure = mapShapeToGoJSFigure(shapeType);
          
          // If the figure doesn't exist in GoJS, use the original figure name
          // and let GoJS handle the error (it will fall back to Rectangle)
          return figure;
        }),
        // Add size bindings for custom sizes per shape
        new go.Binding('width', 'width'),
        new go.Binding('height', 'height'),
        new go.Binding('parameter1', 'parameter1')
      ),
      $(
        go.TextBlock,
        {
          margin: 8,
          font: 'bold 12px sans-serif',
          stroke: '#333',
          maxLines: 2,
          overflow: go.TextBlock.OverflowEllipsis
        },
        new go.Binding('text', 'label').makeTwoWay()
      )
    );

    // Handle node selection
    diagram.addDiagramListener('ChangedSelection', () => {
      const node = diagram.selection.first();
      if (node instanceof go.Node) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          color: data.color || '#ffffff',
          stroke: data.stroke || '#999999',
          shape: data.shape || 'Rectangle',
        });
      } else {
        setSelectedData(null);
      }
    });

    // Handle node double-click to edit
    diagram.addDiagramListener('ObjectDoubleClicked', (e) => {
      const node = e.subject.part;
      if (node instanceof go.Node) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          color: data.color || '#ffffff',
          stroke: data.stroke || '#999999',
          shape: data.shape || 'Rectangle',
        });
      }
    });
    // Handle drag-and-drop from sidebar
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const shapeData = e.dataTransfer?.getData('application/gojs-shape');
      
      if (shapeData && diagramRef.current) {
        const shape = JSON.parse(shapeData);
        const diagram = diagramRef.current;
        
        // Get the diagram div's position to calculate correct coordinates
        const diagramDiv = diagram.div;
        if (!diagramDiv) return;
        
        const rect = diagramDiv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to diagram coordinates
        const point = diagram.transformViewToDoc(new go.Point(x, y));
        
        // Create node data with all necessary properties
        const nodeData: any = {
          key: `node_${Date.now()}`,
          label: shape.label,
          shape: shape.shape, // This is crucial for rendering
          color: shape.color,
          stroke: shape.stroke,
          loc: go.Point.stringify(point),
          ...(shape.width && { width: shape.width }),
          ...(shape.height && { height: shape.height }),
        };

        // Handle specific shape parameters
        if (shape.shape === 'RoundedRectangle' && shape.borderRadius) {
          nodeData.parameter1 = parseFloat(shape.borderRadius) || 8;
        }
        
        diagram.startTransaction("add node");
        diagram.model.addNodeData(nodeData);
        diagram.commitTransaction("add node");
      }
    };

    // Prevent browser context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // This prevents the browser context menu
      return false;
    };

    const diagramDiv = diagram.div;
    if (diagramDiv) {
      diagramDiv.addEventListener('dragover', handleDragOver);
      diagramDiv.addEventListener('drop', handleDrop);
      diagramDiv.addEventListener('contextmenu', handleContextMenu); // Add this line
    }

    diagramRef.current = diagram;

    // Setup validation listeners
    setupDiagramValidation(diagram);

    // Cleanup function
    return () => {
      if (diagramDiv) {
        diagramDiv.removeEventListener('dragover', handleDragOver);
        diagramDiv.removeEventListener('drop', handleDrop);
        diagramDiv.removeEventListener('contextmenu', handleContextMenu); // Add this line
      }
      if (diagramRef.current) {
        diagramRef.current.div = null;
        diagramRef.current = null;
      }
    };
  }, [diagramRef, setSelectedData, setContextMenu, containers]);
  
  const handleValidate = () => {
    if (!diagramRef.current) {
      alert('❌ Diagram not ready for validation.');
      return;
    }

    const diagram = diagramRef.current;
    const selection = diagram.selection;
    
    if (selection.count === 0) {
      // Offer to validate entire diagram
      const validateAll = confirm('No shapes selected.\n\nDo you want to:\n• OK: Validate entire diagram\n• Cancel: Select shapes first');
      
      if (validateAll) {
        // Select all nodes and links for validation
        diagram.nodes.each(node => diagram.select(node));
        diagram.links.each(link => diagram.select(link));
        validateGoJSDiagram(diagram);
        diagram.clearSelection(); // Clear selection after validation
      } else {
        alert('Please select the pattern you want to validate and try again.');
      }
    } else {
      // Validate selected pattern
      validateGoJSDiagram(diagram);
    }
  };

 return (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
    {/* Canvas wrapper (scrollable area) */}
    <div
      ref={diagramDivRef}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        height: '100vh',
        width: '100vh',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
      }}
    >
        {/* Use the imported ContextMenu */}
        <ContextMenu
          contextMenu={contextMenu}
          containers={containers}
          onMove={(container) => {
            // You may need to define selectedData in state as well, or lift it up
            setLocalContextMenu(null);
          }}
          onAddToGroup={(group, shape) => {
            // Implement your logic for adding a shape to a group here
            // For now, just close the context menu
            setLocalContextMenu(null);
          }}
        />
      </div>
    </div>
  );
};

export default GoDiagram;
