import React, { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import * as go from 'gojs';
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
  containers: string[];
  customGroups: Record<string, any[]>;
  setShowSubdiagramPreview: Dispatch<SetStateAction<boolean>>; // Add this prop
  setPreviewSubdiagramData: Dispatch<SetStateAction<any>>; // Add this prop
}

const GoDiagram: React.FC<GoDiagramProps> = ({
  diagramRef,
  setSelectedData,
  setContextMenu,
  containers,
  customGroups,
  setShowSubdiagramPreview, // Add this prop
  setPreviewSubdiagramData // Add this prop
}) => {
  const diagramDivRef = useRef<HTMLDivElement>(null);

  const handleSidebarChange = (field: string, value: string) => {
    if (!diagramRef.current || !setSelectedData) return;

    const model = diagramRef.current.model;
    model.startTransaction('update');
    const selectedNode = diagramRef.current.selection.first();
    if (selectedNode instanceof go.Node) {
      const nodeData = selectedNode.data;
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
      const fig = new go.PathFigure(0, h * 0.5, true); // start point at left center
      
      // Create hexagon points - rotated 90 degrees to match sidebar
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.25, 0));      // top-left
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.75, 0));      // top-right  
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.5));       // right point
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.75, h));      // bottom-right
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.25, h));      // bottom-left
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.5).close()); // back to left point
      
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

    // Add visual indicator for super nodes in your node template
    diagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        selectable: true,
        movable: true,
        cursor: 'move',
        // Single click to view subdiagram for super nodes
        doubleClick: (e, obj) => {
          const node = obj.part;
          if (node instanceof go.Node && node.data.isSuperNode && node.data.subdiagramData) {
            // Show subdiagram preview
            setPreviewSubdiagramData(node.data.subdiagramData);
            setShowSubdiagramPreview(true);
          }
        },
        // Double-click to edit subdiagram for super nodes

        contextClick: (e, obj) => {
          const node = obj.part;
          if (node instanceof go.Node) {
            setSelectedData(node.data);
            setContextMenu({ x: diagram.lastInput.viewPoint.x, y: diagram.lastInput.viewPoint.y });
          }
        },
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      $(
        go.Shape,
        {
          strokeWidth: 1, // Default stroke width
          stroke: '#999',
          portId: '',
          fromLinkable: true,
          toLinkable: true,
          width: 100,
          height: 60,
          minSize: new go.Size(60, 40),
          maxSize: new go.Size(200, 120),
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'stroke'),
        new go.Binding('figure', 'shape', (shapeType) => {
          const figure = mapShapeToGoJSFigure(shapeType);
          return figure;
        }),
        new go.Binding('width', 'width'),
        new go.Binding('height', 'height'),
        new go.Binding('strokeWidth', 'strokeWidth'), // ← Add this binding for stroke width
        new go.Binding('parameter1', 'parameter1') // ← ADD THIS LINE
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
    diagram.linkTemplate = $(
      go.Link,
      { routing: go.Link.AvoidsNodes, corner: 5, selectable: true },
      $(go.Shape, { strokeWidth: 2, stroke: "#555" }), // the link line
      $(go.Shape, { toArrow: "Triangle", fill: "#555", stroke: null }) // the arrowhead
    );

    // ADD: Cluster group template (gray background with editable top-left label)
    diagram.groupTemplateMap.add('ClusterGroup',
      $(go.Group, 'Spot',
        {
          isSubGraphExpanded: true,
          layerName: 'Background',           // keep background box behind members
          selectable: true,
          movable: true,
          handlesDragDropForMembers: true,
          computesBoundsAfterDrag: true,
        },
        // Background panel with Placeholder that sizes to members
        $(go.Panel, 'Auto',
          $(go.Shape, 'RoundedRectangle', {
            name: 'CLUSTER_SHAPE',
            fill: '#e9ecef',                  // gray background
            stroke: '#adb5bd',
            strokeWidth: 1.5,
            parameter1: 6
          }),
          $(go.Placeholder, { padding: 20 })  // space around members inside the box
        ),
        // Editable label at top-left corner
        $(go.TextBlock,
          {
            alignment: go.Spot.TopLeft,
            alignmentFocus: go.Spot.TopLeft,
            margin: new go.Margin(6, 0, 0, 8),
            editable: true,
            font: 'bold 12px sans-serif',
            stroke: '#333',
            background: null
          },
          new go.Binding('text', 'label').makeTwoWay()
        )
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
      const patternData = e.dataTransfer?.getData('application/pattern');
      
      if (!diagramRef.current) return;
      
      const diagram = diagramRef.current;
      const diagramDiv = diagram.div;
      if (!diagramDiv) return;
      
      const rect = diagramDiv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = diagram.transformViewToDoc(new go.Point(x, y));
      
      if (patternData) {
        // Handle pattern drop
        const pattern = JSON.parse(patternData);
        diagram.startTransaction('drop pattern');
        
        const nodeKeyMap = new Map<string, string>();
        
        // Add all nodes first
        pattern.nodes.forEach((node: any) => {
          const newKey = `node_${Date.now()}_${node.id}`;
          nodeKeyMap.set(node.id, newKey);
          
          const nodeData: any = {
            key: newKey,
            name: node.name,
            label: node.label,
            shape: node.shape,
            color: node.color,
            stroke: node.stroke,
            loc: go.Point.stringify(new go.Point(point.x + node.x, point.y + node.y)),
          };

          if (node.shape === 'RoundedRectangle') {
            nodeData.parameter1 = 45;
          }

          (diagram.model as go.GraphLinksModel).addNodeData(nodeData);
        });
        
        // Add all links
        pattern.links.forEach((link: any) => {
          const fromKey = nodeKeyMap.get(link.from);
          const toKey = nodeKeyMap.get(link.to);
          
          if (fromKey && toKey) {
            const linkData = {
              key: `link_${Date.now()}_${link.from}_${link.to}`,
              from: fromKey,
              to: toKey
            };
            
            (diagram.model as go.GraphLinksModel).addLinkData(linkData);
          }
        });
        
        diagram.commitTransaction('drop pattern');
        return;
      }
      
      if (shapeData) {
        // Handle single shape drop (existing logic)
        const shape = JSON.parse(shapeData);
        
        const nodeData: any = {
          key: `node_${Date.now()}`,
          name: shape.name,
          label: shape.label,
          shape: shape.shape,
          color: shape.color,
          stroke: shape.stroke,
          loc: go.Point.stringify(point),
          ...(shape.width && { width: shape.width }),
          ...(shape.height && { height: shape.height }),
        };

        if (shape.shape === 'RoundedRectangle') {
          const radius = shape.borderRadius ? parseFloat(shape.borderRadius) : 15;
          nodeData.parameter1 = radius; // Must be a NUMBER, not a string
        }
        
        if (shape.shape === 'Hexagon') {
          nodeData.parameter1 = 1;
          console.log('📐 Adding Hexagon with shape:', shape.shape);
        }
        
        console.log('🎨 Adding node to diagram:', nodeData);
        
        diagram.startTransaction("add node");
        diagram.model.addNodeData(nodeData);
        diagram.commitTransaction("add node");
      }
    };

    // Prevent browser context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const diagramDiv = diagram.div;
    if (diagramDiv) {
      diagramDiv.addEventListener('dragover', handleDragOver);
      diagramDiv.addEventListener('drop', handleDrop);
      diagramDiv.addEventListener('contextmenu', handleContextMenu);
    }

    diagramRef.current = diagram;

    // Setup validation listeners
    setupDiagramValidation(diagram);

    // Cleanup function
    return () => {
      if (diagramDiv) {
        diagramDiv.removeEventListener('dragover', handleDragOver);
        diagramDiv.removeEventListener('drop', handleDrop);
        diagramDiv.removeEventListener('contextmenu', handleContextMenu);
      }
      if (diagramRef.current) {
        diagramRef.current.div = null;
        diagramRef.current = null;
      }
    };
  }, [diagramRef, setSelectedData, setContextMenu, containers, setShowSubdiagramPreview, setPreviewSubdiagramData]);
  
  const handleValidate = () => {
    if (!diagramRef.current) {
      alert('❌ Diagram not ready for validation.');
      return;
    }

    const diagram = diagramRef.current;
    const selection = diagram.selection;
    
    if (selection.count === 0) {
      const validateAll = confirm('No shapes selected.\n\nDo you want to:\n• OK: Validate entire diagram\n• Cancel: Select shapes first');
      
      if (validateAll) {
        diagram.nodes.each(node => diagram.select(node));
        diagram.links.each(link => diagram.select(link));
        validateGoJSDiagram(diagram);
        diagram.clearSelection();
      } else {
        alert('Please select the pattern you want to validate and try again.');
      }
    } else {
      validateGoJSDiagram(diagram);
    }
  };

  useEffect(() => {
    const diagramDiv = diagramRef.current?.div;
    if (!diagramDiv) return;

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer?.getData('application/custom-group-shape');
      if (data) {
        const { group, shapeId } = JSON.parse(data);
        const shape = customGroups[group]?.find((s: any) => s.id === shapeId);
        if (shape && diagramRef.current) {
          const diagram = diagramRef.current;
          const diagramDiv = diagram.div;
          if (!diagramDiv) return;

          const rect = diagramDiv.getBoundingClientRect();
          const pt = diagram.transformViewToDoc(
            new go.Point(e.clientX - rect.left, e.clientY - rect.top)
          );

          diagram.startTransaction('drop custom group shape');

          // Find min location for offset
          const minLoc = shape.nodeDataArray.reduce(
            (min: { x: number; y: number }, n: any) => {
              const [x, y] = (n.loc || "0 0").split(' ').map(Number);
              return {
                x: Math.min(min.x, x),
                y: Math.min(min.y, y)
              };
            },
            { x: Infinity, y: Infinity }
          );
          const offsetX = pt.x - minLoc.x;
          const offsetY = pt.y - minLoc.y;

          // Generate new keys and locations for nodes
          const keyMap: Record<string, string> = {};
          const newNodes = shape.nodeDataArray.map((n: any) => {
            const newKey = `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
            keyMap[n.key] = newKey;
            const [x, y] = (n.loc || "0 0").split(' ').map(Number);
            return {
              ...n,
              key: newKey,
              loc: `${x + offsetX} ${y + offsetY}`
            };
          });

          // Add all new nodes first
          newNodes.forEach((n: any) => diagram.model.addNodeData(n));

          // Now add links, using new keys
          const newLinks = shape.linkDataArray.map((l: any) => ({
            ...l,
            from: keyMap[l.from],
            to: keyMap[l.to]
          }));
          newLinks.forEach((l: any) => (diagram.model as go.GraphLinksModel).addLinkData(l));

          diagram.commitTransaction('drop custom group shape');
        }
      }
    };

    diagramDiv.addEventListener('dragover', e => e.preventDefault());
    diagramDiv.addEventListener('drop', handleDrop);

    return () => {
      diagramDiv.removeEventListener('dragover', e => e.preventDefault());
      diagramDiv.removeEventListener('drop', handleDrop);
    };
  }, [diagramRef, customGroups]);

  return (
    <div
      ref={diagramDivRef}
      style={{
        flex: 1,
        position: 'relative',
        height: '100%',
        width: '100%',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        overflowX: 'scroll',
        overflowY: 'scroll',

      }}
    />
  );
};

export default GoDiagram;
