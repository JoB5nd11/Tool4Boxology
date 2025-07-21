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
<<<<<<< HEAD
    console.log('🚀 DIAGRAM INITIALIZING:', {
      action: 'GoDiagram component starting up',
      timestamp: new Date().toISOString()
    });
    
=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
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

<<<<<<< HEAD
    // Initialize with GraphLinksModel to support links
    diagram.model = new go.GraphLinksModel();

=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
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

<<<<<<< HEAD
    // Add link template for connections
    diagram.linkTemplate = $(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        toShortLength: 4,
        relinkableFrom: true,
        relinkableTo: true,
        selectable: true,
        resegmentable: true
      },
      new go.Binding('points').makeTwoWay(),
      $(
        go.Shape,
        { isPanelMain: true, strokeWidth: 2, stroke: '#333' }
      ),
      $(
        go.Shape,
        { toArrow: 'standard', strokeWidth: 0, fill: '#333' }
      )
    );

=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
    // Handle node selection
    diagram.addDiagramListener('ChangedSelection', () => {
      const node = diagram.selection.first();
      if (node instanceof go.Node) {
        const data = node.data;
<<<<<<< HEAD
        console.log('🎯 SELECTION CHANGED:', {
          action: 'Node selected',
          timestamp: new Date().toISOString(),
          nodeKey: data.key,
          label: data.label,
          shape: data.shape,
          selectionCount: diagram.selection.count
        });
=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
        setSelectedData({
          key: data.key,
          label: data.label || '',
          color: data.color || '#ffffff',
          stroke: data.stroke || '#999999',
          shape: data.shape || 'Rectangle',
        });
      } else {
<<<<<<< HEAD
        if (diagram.selection.count > 0) {
          console.log('🎯 SELECTION CHANGED:', {
            action: 'Multiple items or non-node selected',
            timestamp: new Date().toISOString(),
            selectionCount: diagram.selection.count,
            selectedTypes: Array.from(diagram.selection).map(part => part.constructor.name)
          });
        }
=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
        setSelectedData(null);
      }
    });

<<<<<<< HEAD
    // Add model change listeners for comprehensive tracking
    diagram.addModelChangedListener((e) => {
      if (e.change === go.ChangedEvent.Insert) {
        if (e.modelChange === 'nodeDataArray') {
          console.log('🎯 NODE INSERTED:', {
            action: 'Node added to model',
            timestamp: new Date().toISOString(),
            nodeData: e.newValue,
            totalNodes: diagram.nodes.count
          });
        } else if (e.modelChange === 'linkDataArray') {
          console.log('🔗 LINK CREATED:', {
            action: 'Link created between nodes',
            timestamp: new Date().toISOString(),
            linkData: e.newValue,
            from: e.newValue.from,
            to: e.newValue.to,
            totalLinks: diagram.links.count
          });
        }
      } else if (e.change === go.ChangedEvent.Remove) {
        if (e.modelChange === 'nodeDataArray') {
          console.log('🗑️ NODE REMOVED:', {
            action: 'Node removed from model',
            timestamp: new Date().toISOString(),
            nodeData: e.oldValue,
            totalNodes: diagram.nodes.count
          });
        } else if (e.modelChange === 'linkDataArray') {
          console.log('🗑️ LINK REMOVED:', {
            action: 'Link removed from model',
            timestamp: new Date().toISOString(),
            linkData: e.oldValue,
            totalLinks: diagram.links.count
          });
        }
      } else if (e.change === go.ChangedEvent.Property) {
        if (e.modelChange === 'nodeDataArray' && e.object) {
          console.log('✏️ NODE MODIFIED:', {
            action: 'Node property changed',
            timestamp: new Date().toISOString(),
            nodeKey: (e.object as any).key,
            property: e.propertyName,
            oldValue: e.oldValue,
            newValue: e.newValue
          });
        }
      }
    });

    // Add additional logging for link-related events
    diagram.toolManager.linkingTool.doActivate = function() {
      console.log('🔗 LINK TOOL ACTIVATED:', {
        action: 'User started creating a link',
        timestamp: new Date().toISOString()
      });
      go.LinkingTool.prototype.doActivate.call(this);
    };

    diagram.toolManager.linkingTool.insertLink = function(fromnode, fromport, tonode, toport) {
      console.log('🔗 LINK CONNECTING:', {
        action: 'Link being created between nodes',
        timestamp: new Date().toISOString(),
        fromNode: fromnode?.data?.key || 'unknown',
        toNode: tonode?.data?.key || 'unknown'
      });
      return go.LinkingTool.prototype.insertLink.call(this, fromnode, fromport, tonode, toport);
    };

=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
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
<<<<<<< HEAD
        const item = JSON.parse(shapeData);
=======
        const shape = JSON.parse(shapeData);
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
        const diagram = diagramRef.current;
        
        // Get the diagram div's position to calculate correct coordinates
        const diagramDiv = diagram.div;
        if (!diagramDiv) return;
        
        const rect = diagramDiv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to diagram coordinates
        const point = diagram.transformViewToDoc(new go.Point(x, y));
        
<<<<<<< HEAD
        // Check if it's a pattern
        if (item.isPattern && item.shapes && item.links) {
          // Handle pattern drop
          console.log('📊 PATTERN ADDED:', {
            action: 'Pattern dropped and added to diagram',
            timestamp: new Date().toISOString(),
            patternName: item.name,
            position: { x: point.x, y: point.y },
            shapeCount: item.shapes.length,
            linkCount: item.links.length
          });
          
          diagram.startTransaction("add pattern");
          
          // Create nodes for the pattern
          const nodeMap = new Map();
          item.shapes.forEach((patternShape: any, index: number) => {
            const loc = go.Point.parse(patternShape.loc);
            const adjustedLoc = new go.Point(point.x + loc.x, point.y + loc.y);
            
            const nodeKey = `${item.name}_${patternShape.key}_${Date.now()}_${index}`;
            const nodeData = {
              key: nodeKey,
              label: patternShape.label,
              shape: patternShape.shape,
              color: patternShape.color,
              stroke: patternShape.stroke,
              loc: go.Point.stringify(adjustedLoc),
              width: patternShape.width,
              height: patternShape.height,
            };
            
            // Map old key to new key for link creation
            nodeMap.set(patternShape.key, nodeKey);
            diagram.model.addNodeData(nodeData);
          });
          
          // Create links for the pattern
          item.links.forEach((patternLink: any) => {
            const fromKey = nodeMap.get(patternLink.from);
            const toKey = nodeMap.get(patternLink.to);
            
            if (fromKey && toKey) {
              const linkData = {
                from: fromKey,
                to: toKey,
              };
              (diagram.model as go.GraphLinksModel).addLinkData(linkData);
            }
          });
          
          diagram.commitTransaction("add pattern");
        } else {
          // Handle individual shape drop
          const nodeData: any = {
            key: `node_${Date.now()}`,
            label: item.label,
            shape: item.shape, // This is crucial for rendering
            color: item.color,
            stroke: item.stroke,
            loc: go.Point.stringify(point),
            ...(item.width && { width: item.width }),
            ...(item.height && { height: item.height }),
          };

          // Handle specific shape parameters
          if (item.shape === 'RoundedRectangle' && item.borderRadius) {
            nodeData.parameter1 = parseFloat(item.borderRadius) || 8;
          }
          
          // Console log when shape is being added
          console.log('🎯 SHAPE ADDED:', {
            action: 'Shape dropped and added to diagram',
            timestamp: new Date().toISOString(),
            nodeKey: nodeData.key,
            shapeType: nodeData.shape,
            label: nodeData.label,
            position: { x: point.x, y: point.y },
            color: nodeData.color,
            properties: nodeData
          });
          
          diagram.startTransaction("add node");
          diagram.model.addNodeData(nodeData);
          diagram.commitTransaction("add node");
        }
=======
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
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
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
