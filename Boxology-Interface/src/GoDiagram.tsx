import React, { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import * as go from 'gojs';
import { setupDiagramValidation, validateGoJSDiagram } from './plugin/GoJSBoxologyValidation';
import { mapShapeToGoJSFigure } from './utils/shapeMapping';
import { shapeTypesTree , shapes } from './data/shape';
import { beamStyleMap } from './data/beamStyles';
import type { DiagramData } from './types';

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
  beamViewActive: boolean;
  /** Fires after every committed user transaction, so App can keep `pages` in sync with the canvas. */
  onModelChange?: (nodeDataArray: DiagramData[], linkDataArray: DiagramData[]) => void;
  /**
   * Fires whenever a new go.Diagram instance is built (mount, StrictMode remount,
   * or a container/customGroup change re-running setup). The new instance starts
   * empty, so App must push the current page back into it.
   */
  onDiagramInit?: () => void;
}

// Helper: Recursively build menu
function buildTypeMenu(
  diagram: go.Diagram,
  node: go.Node,
  typeTree: Record<string, any> | null,
  container: HTMLElement,
  level: number = 0
) {
  if (!typeTree) return;
  Object.entries(typeTree).forEach(([type, subTree]) => {
    const option = document.createElement("div");
    option.textContent = type;
    option.style.padding = "8px 12px";
    option.style.cursor = "pointer";
    option.style.fontSize = "12px";
    option.style.color = "black";
    option.style.marginLeft = `${level * 16}px`;
    option.style.position = "relative";
    option.style.background = type === node.data.type ? "#e0f2fe" : "white";
    option.style.fontWeight = type === node.data.type ? "600" : "normal";

    // If has subtypes, show arrow and submenu
    if (subTree && Object.keys(subTree).length > 0) {
      const arrow = document.createElement("span");
      arrow.textContent = "▶";
      arrow.style.float = "right";
      arrow.style.fontSize = "10px";
      option.appendChild(arrow);

      let submenu: HTMLElement | null = null;
      option.onmouseenter = () => {
        if (!submenu) {
          submenu = document.createElement("div");
          submenu.style.position = "absolute";
          submenu.style.left = "100%";
          submenu.style.top = "0";
          submenu.style.background = "white";
          submenu.style.border = "1px solid #d1d5db";
          submenu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
          submenu.style.minWidth = "120px";
          submenu.style.zIndex = "10001";
          buildTypeMenu(diagram, node, subTree, submenu, level + 1);
          option.appendChild(submenu);
        }
        if (submenu) submenu.style.display = "block";
      };
      option.onmouseleave = () => {
        if (submenu) submenu.style.display = "none";
      };
    }

    // Click: set type and close all menus
    option.onclick = (event) => {
      event.stopPropagation();
      diagram.model.startTransaction("change type");
      diagram.model.set(node.data, "type", type);
      diagram.model.commitTransaction("change type");
      let el: HTMLElement | null = container;
      while (el && el.parentElement) {
        el.remove();
        el = el.parentElement;
      }
    };

    container.appendChild(option);
  });
}

function showTypeSelector(e: go.InputEvent, node: go.Node) {
  const diagram = node.diagram;
  if (!diagram) return;

  // Use node.data.type or node.data.name to get the correct subtree
  const rootType = node.data.name; // or whatever property is your root type, e.g. "model"
  let typeTree: Record<string, any> | null = shapeTypesTree[rootType] || null;
  if (!typeTree) return; // fallback to full tree if not found

  // Positioning
  const diagramDiv = diagram.div;
  if (!diagramDiv) return;
  const diagramRect = diagramDiv.getBoundingClientRect();
  const viewPoint = diagram.transformDocToView(node.location);
  const screenX = diagramRect.left + viewPoint.x + window.scrollX;
  const screenY = diagramRect.top + viewPoint.y + window.scrollY - 40;

  // Main container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.style.position = "absolute";
  dropdownContainer.style.left = screenX + "px";
  dropdownContainer.style.top = screenY + "px";
  dropdownContainer.style.zIndex = "10000";
  dropdownContainer.style.backgroundColor = "white";
  dropdownContainer.style.border = "1px solid #d1d5db";
  dropdownContainer.style.borderRadius = "4px";
  dropdownContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
  dropdownContainer.style.minWidth = "120px";
  dropdownContainer.style.overflow = "visible";
  dropdownContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";

  buildTypeMenu(diagram, node, typeTree, dropdownContainer);

  // Close on click outside or escape
  const closeHandler = (event: MouseEvent | KeyboardEvent) => {
    if (
      event instanceof MouseEvent &&
      !dropdownContainer.contains(event.target as Node)
    ) {
      dropdownContainer.remove();
      document.removeEventListener("click", closeHandler);
      document.removeEventListener("keydown", closeHandler);
    }
    if (
      event instanceof KeyboardEvent &&
      event.key === "Escape"
    ) {
      dropdownContainer.remove();
      document.removeEventListener("click", closeHandler);
      document.removeEventListener("keydown", closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener("click", closeHandler);
    document.addEventListener("keydown", closeHandler);
  }, 0);

  document.body.appendChild(dropdownContainer);
}

// ── BEAM risk classes ────────────────────────────────────────────────────────
// The five risk elements carry a subtype badge (like a component's type badge)
// that reclassifies the card among these classes. Colours mirror data/shape.ts.
const RISK_CLASSES: { value: string; label: string; color: string; stroke: string }[] = [
  { value: 'RiskSource',  label: 'Risk Source',  color: '#fffde7', stroke: '#f9a825' },
  { value: 'Risk',        label: 'Risk',         color: '#fff3e0', stroke: '#fb8c00' },
  { value: 'Consequence', label: 'Consequence',  color: '#fce4ec', stroke: '#e91e63' },
  { value: 'Impact',      label: 'Impact',       color: '#ef9a9a', stroke: '#c62828' },
  { value: 'RiskControl', label: 'Risk Control', color: '#e8f5e9', stroke: '#388e3c' },
];
const RISK_CLASS_SET = new Set(RISK_CLASSES.map((r) => r.value));
const RISK_CLASS_LABEL: Record<string, string> =
  Object.fromEntries(RISK_CLASSES.map((r) => [r.value, r.label]));
const RISK_CLASS_STYLE: Record<string, { color: string; stroke: string }> =
  Object.fromEntries(RISK_CLASSES.map((r) => [r.value, { color: r.color, stroke: r.stroke }]));

// Cascading subtype tree, following the beamr ontology hierarchy
// (Consequence ▸ Impact); the rest are top-level.
const riskClassTree: Record<string, any> = {
  RiskSource: null,
  Risk: null,
  Consequence: { Impact: null },
  RiskControl: null,
};

// Recursive cascading menu for the risk-class badge. Selecting a class
// reclassifies the card: updates name/type and restyles colour + stroke.
function buildRiskMenu(
  diagram: go.Diagram,
  node: go.Node,
  tree: Record<string, any> | null,
  container: HTMLElement,
  level = 0
) {
  if (!tree) return;
  Object.entries(tree).forEach(([cls, subTree]) => {
    const option = document.createElement('div');
    option.textContent = RISK_CLASS_LABEL[cls] ?? cls;
    option.style.padding = '8px 12px';
    option.style.cursor = 'pointer';
    option.style.fontSize = '12px';
    option.style.color = 'black';
    option.style.marginLeft = `${level * 16}px`;
    option.style.position = 'relative';
    option.style.whiteSpace = 'nowrap';
    option.style.background = cls === node.data.name ? '#e0f2fe' : 'white';
    option.style.fontWeight = cls === node.data.name ? '600' : 'normal';

    if (subTree && Object.keys(subTree).length > 0) {
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.float = 'right';
      arrow.style.fontSize = '10px';
      arrow.style.marginLeft = '8px';
      option.appendChild(arrow);

      let submenu: HTMLElement | null = null;
      option.onmouseenter = () => {
        if (!submenu) {
          submenu = document.createElement('div');
          submenu.style.position = 'absolute';
          submenu.style.left = '100%';
          submenu.style.top = '0';
          submenu.style.background = 'white';
          submenu.style.border = '1px solid #d1d5db';
          submenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          submenu.style.minWidth = '120px';
          submenu.style.zIndex = '10001';
          buildRiskMenu(diagram, node, subTree, submenu, 0);
          option.appendChild(submenu);
        }
        if (submenu) submenu.style.display = 'block';
      };
      option.onmouseleave = () => {
        if (submenu) submenu.style.display = 'none';
      };
    }

    option.onclick = (event) => {
      event.stopPropagation();
      const style = RISK_CLASS_STYLE[cls];
      diagram.model.startTransaction('change risk class');
      diagram.model.set(node.data, 'name', cls);
      diagram.model.set(node.data, 'type', cls);
      if (style) {
        diagram.model.set(node.data, 'color', style.color);
        diagram.model.set(node.data, 'stroke', style.stroke);
      }
      diagram.model.commitTransaction('change risk class');
      let el: HTMLElement | null = container;
      while (el && el.parentElement) {
        el.remove();
        el = el.parentElement;
      }
    };

    container.appendChild(option);
  });
}

function showRiskClassSelector(_e: go.InputEvent, node: go.Node) {
  const diagram = node.diagram;
  const diagramDiv = diagram?.div;
  if (!diagram || !diagramDiv) return;

  const diagramRect = diagramDiv.getBoundingClientRect();
  const viewPoint = diagram.transformDocToView(node.location);
  const screenX = diagramRect.left + viewPoint.x + window.scrollX;
  const screenY = diagramRect.top + viewPoint.y + window.scrollY - 40;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = screenX + 'px';
  container.style.top = screenY + 'px';
  container.style.zIndex = '10000';
  container.style.backgroundColor = 'white';
  container.style.border = '1px solid #d1d5db';
  container.style.borderRadius = '4px';
  container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
  container.style.minWidth = '130px';
  container.style.overflow = 'visible';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  buildRiskMenu(diagram, node, riskClassTree, container);

  const closeHandler = (event: MouseEvent | KeyboardEvent) => {
    if (event instanceof MouseEvent && container.contains(event.target as Node)) return;
    if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
    container.remove();
    document.removeEventListener('click', closeHandler);
    document.removeEventListener('keydown', closeHandler);
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
    document.addEventListener('keydown', closeHandler);
  }, 0);

  document.body.appendChild(container);
}

const GoDiagram: React.FC<GoDiagramProps> = ({
  diagramRef,
  setSelectedData,
  setContextMenu,
  containers,
  customGroups,
  beamViewActive,
  onModelChange,
  onDiagramInit,
}) => {
  const diagramDivRef = useRef<HTMLDivElement>(null);

  // Held in refs so a new callback identity never re-runs the setup effect,
  // which would tear down and rebuild the whole diagram.
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const onDiagramInitRef = useRef(onDiagramInit);
  onDiagramInitRef.current = onDiagramInit;

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

  // REMOVED: Effect to update type badge visibility - badges are now always visible

  useEffect(() => {
    if (!diagramRef.current) return;
    
    const diagram = diagramRef.current;
    
    // Update all nodes to show/hide type badges
    diagram.nodes.each((node) => {
      const typeBadge = node.findObject('TYPE_BADGE');
      if (typeBadge) {
        typeBadge.visible = true;
      }
    });
    
  }, [diagramRef]);

  useEffect(() => {
    if (!diagramDivRef.current) return;
    const $ = go.GraphObject.make;

    if (diagramRef.current) {
      diagramRef.current.div = null;
      diagramRef.current.clear();
      diagramRef.current = null;
    }

    // Define custom figures for GoJS
    go.Shape.defineFigureGenerator("NoteShape", function(_shape, w, h) {
      const fold = Math.min(w * 0.22, h * 0.22);
      const geo = new go.Geometry();
      const body = new go.PathFigure(0, 0, true);
      body.add(new go.PathSegment(go.PathSegment.Line, w - fold, 0));
      body.add(new go.PathSegment(go.PathSegment.Line, w, fold));
      body.add(new go.PathSegment(go.PathSegment.Line, w, h));
      body.add(new go.PathSegment(go.PathSegment.Line, 0, h).close());
      geo.add(body);
      // Fold crease line
      const crease = new go.PathFigure(w - fold, 0, false);
      crease.add(new go.PathSegment(go.PathSegment.Line, w - fold, fold));
      crease.add(new go.PathSegment(go.PathSegment.Line, w, fold));
      geo.add(crease);
      return geo;
    });

    go.Shape.defineFigureGenerator("CustomHexagon", function(shape, w, h) {
      let param1 = shape ? shape.parameter1 : NaN;
      if (isNaN(param1)) param1 = 1;
      
      const geo = new go.Geometry();
      const fig = new go.PathFigure(0, h * 0.5, true);
      
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.25, 0));
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.75, 0));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h * 0.5));
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.75, h));
      fig.add(new go.PathSegment(go.PathSegment.Line, w * 0.25, h));
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h * 0.5).close());
      
      geo.add(fig);
      return geo;
    });

    const diagram = $(go.Diagram, diagramDivRef.current, {
      'undoManager.isEnabled': true,
      allowDrop: true,
      padding: new go.Margin(40),               // << -- add space around content
      initialContentAlignment: go.Spot.TopLeft, // keep content origin at top-left
      'animationManager.isEnabled': false,  // 🔧 ADD: Disable animations
      grid: $(
        go.Panel,
        'Grid',
        { gridCellSize: new go.Size(20, 20) },
        $(go.Shape, 'LineH', { stroke: '#f5f5f5' }),
        $(go.Shape, 'LineV', { stroke: '#f5f5f5' })
      ),
    });

    diagram.commandHandler.archetypeGroupData = {
      isGroup: true,
      category: 'ClusterGroup',
      name: 'cluster',
      label: 'Cluster',
      color: '#e9ecef',
      stroke: '#adb5bd',
      strokeWidth: 1.5,
      parameter1: 6
    };

    // 🔧 ADD: Configure tools with custom cursors
    diagram.toolManager.draggingTool.isGridSnapEnabled = true;
    // diagram.toolManager.draggingTool.dragsLink = true;
    diagram.toolManager.draggingTool.delay = 0;
    diagram.toolManager.resizingTool.isGridSnapEnabled = true;
    
    // 🔧 ADD: Custom cursor for linking tool
    diagram.toolManager.linkingTool.isEnabled = true;
    diagram.toolManager.linkingTool.portGravity = 20;
    // Removed invalid property: portTargetingTool.cursorHot
    diagram.toolManager.relinkingTool.isEnabled = true;
    diagram.toolManager.relinkingTool.portGravity = 20;
    diagram.toolManager.relinkingTool.fromHandleArchetype = new go.Shape('Diamond', {
      segmentIndex: 0,
      cursor: 'pointer',
      desiredSize: new go.Size(8, 8),
      fill: 'tomato',
      stroke: 'darkred'
    });
    diagram.toolManager.relinkingTool.toHandleArchetype = new go.Shape('Diamond', {
      segmentIndex: -1,
      cursor: 'pointer',
      desiredSize: new go.Size(8, 8),
      fill: 'darkred',
      stroke: 'tomato'
    });

 function makePort(name: string, spot: go.Spot, output: boolean, input: boolean) {
  return new go.Shape('Circle', {
    fill: null,
    stroke: null,
    desiredSize: new go.Size(7, 7),
    alignment: spot,
    alignmentFocus: spot,
    portId: name,
    fromSpot: spot,
    toSpot: spot,
    fromLinkable: output,
    toLinkable: input,
    cursor: 'pointer'
  });
}

function showSmallPorts(node: any, show: any) {
  node.ports.each((port: go.Shape) => {
    if (port.portId !== '') {
      port.fill = show ? 'rgba(0,0,0,.3)' : null;
    }
  });
}

    // UPDATED: Node template - shape as port with cursor differentiation
    diagram.nodeTemplate = $(
      go.Node,
      'Spot',
      {
        locationSpot: go.Spot.TopLeft,
        selectable: true,
        movable: true,
        resizable: true,
        resizeObjectName: 'SHAPE',
        // 🔧 REMOVED: cursor from node level - let shape handle it
        contextClick: (e, obj) => {
          const node = obj.part;
          if (node instanceof go.Node) {
            setSelectedData(node.data);
            const mouseEvent = e.event as MouseEvent;
            setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY });
          }
        },
        // 🔧 ADD: Dynamic cursor based on mouse position
        mouseEnter: (e, obj) => {
          // const node = obj as go.Node;
          // node.cursor = 'move';  // Default to move
          showSmallPorts(obj, true);
        },
        mouseLeave: (e, obj) => {
          showSmallPorts(obj, false);
        },
        mouseDragEnter: (e, obj) => {
          const node = obj as go.Node;
          // Check if we're dragging from a port (starting a link)
          if (e.diagram?.currentTool.name === 'Linking') {
            node.cursor = 'pointer';
          } else {
            node.cursor = 'move';
          }
        }
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      
      // 🔧 UPDATED: Main shape IS the port - no separate port areas needed
      $(
        go.Shape,
        {
          name: 'SHAPE',
          strokeWidth: 1,
          stroke: '#999',
          portId: '',  // Empty string = default port
          fromLinkable: true,
          toLinkable: true,
          fromSpot: go.Spot.AllSides,  // Links connect at actual shape boundary
          toSpot: go.Spot.AllSides,
          cursor: 'move',  // Default cursor
          width: 100,
          height: 60,
          minSize: new go.Size(30, 30),
          maxSize: new go.Size(300, 300),
          // 🔧 ADD: Mouse handlers to change cursor dynamically
          mouseEnter: (e, shape) => {
            const sh = shape as go.Shape;
            const diagram = sh.part?.diagram;
            if (!diagram) return;
            
            // Get mouse position relative to shape
            const shapeCenter = sh.getDocumentPoint(go.Spot.Center);
            const mousePoint = diagram.lastInput.documentPoint;
            const bounds = sh.actualBounds;
            
            // Calculate if mouse is near edge (within 15px of boundary)
            const distFromCenterX = Math.abs(mousePoint.x - shapeCenter.x);
            const distFromCenterY = Math.abs(mousePoint.y - shapeCenter.y);
            const isNearHorizontalEdge = distFromCenterX > (bounds.width / 2) - 15;
            const isNearVerticalEdge = distFromCenterY > (bounds.height / 2) - 15;
            
            if (isNearHorizontalEdge || isNearVerticalEdge) {
              sh.cursor = 'pointer';  // Near edge = link cursor
            } else {
              sh.cursor = 'move';     // Center = move cursor
            }
          },
          mouseLeave: (e, shape) => {
            (shape as go.Shape).cursor = 'move';
          }
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'stroke'),
        new go.Binding('strokeDashArray', 'isShared', (isShared) =>
          isShared ? [4, 3] : null
        ),
        new go.Binding('figure', 'shape', (shapeType) => {
          const figure = mapShapeToGoJSFigure(shapeType);
          return figure;
        }),
        new go.Binding('width', 'width').makeTwoWay(),
        new go.Binding('height', 'height').makeTwoWay(),
        new go.Binding('strokeWidth', 'strokeWidth'),
        new go.Binding('parameter1', 'parameter1')
      ),
      
      // 🔧 REMOVED: All separate port lines (TOP_PORT, BOTTOM_PORT, LEFT_PORT, RIGHT_PORT)
      makePort('T', go.Spot.Top, true, true),
      makePort('L', go.Spot.Left, true, true),
      makePort('R', go.Spot.Right, true, true),
      makePort('B', go.Spot.Bottom, true, true),

      // Label (centered) - UPDATED: Make editable
      $(
        go.TextBlock,
        {
          alignment: go.Spot.Center,
          margin: 8,
          font: 'bold 12px sans-serif',
          stroke: '#333',
          maxLines: 2,
          overflow: go.TextBlock.OverflowEllipsis,
          editable: true,
          textEditor: null
        },
        new go.Binding('text', 'label').makeTwoWay()
      ),
      
      // Type selector - Always visible
      $(go.Panel, 'Auto',
        {
          name: 'TYPE_BADGE',
          alignment: go.Spot.Top,
          alignmentFocus: go.Spot.Bottom,
          margin: new go.Margin(-8, 0, 0, 0),
          cursor: 'pointer',
          visible: true  // CHANGED: Always visible
        },
        $(go.Shape, 'RoundedRectangle',
          {
            fill: 'white',
            stroke: '#d1d5db',
            strokeWidth: 1,
            parameter1: 10
          }
        ),
        $(go.Panel, 'Horizontal',
          { margin: new go.Margin(3, 8, 3, 8) },
          // Small colored dot indicator
          $(go.Shape, 'Circle',
            {
              width: 5,
              height: 5,
              stroke: null,
              margin: new go.Margin(0, 4, 0, 0)
            },
            new go.Binding('fill', 'type', (type) => {
              if (!type || type === 'No Type') return '#9ca3af';
              return '#3b82f6';
            })
          ),
          // Type text
          $(go.TextBlock,
            {
              font: '9px system-ui, -apple-system, sans-serif',
              stroke: '#6b7280'
            },
            new go.Binding('text', 'type', (type) => type || 'No Type'),
            new go.Binding('stroke', 'type', (type) => {
              if (!type || type === 'No Type') return '#9ca3af';
              return '#3b82f6';
            })
          ),
          // Dropdown arrow
          $(go.Shape, 'TriangleDown',
            {
              width: 5,
              height: 3,
              fill: '#9ca3af',
              stroke: null,
              margin: new go.Margin(0, 0, 0, 3)
            }
          )
        ),
        {
          click: (e, obj) => {
            const node = obj.part as go.Node;
            showTypeSelector(e, node);
          }
        }
      )
    );

    diagram.linkTemplate = $(
      go.Link,
      {
        routing: go.Routing.AvoidsNodes,
        curve: go.Curve.JumpOver,
        corner: 5,
        toShortLength: 4,
        reshapable: true,
        resegmentable: true,
        relinkableFrom: true,
        relinkableTo: true,
      },
      $(go.Shape, { strokeWidth: 2, stroke: "#555" }),
      $(go.Shape, { toArrow: "Triangle", fill: "#555", stroke: null })
    );

    // Annotation connector — dotted line (Table 2 BEAM paper)
    diagram.linkTemplateMap.add('annotation',
      $(go.Link,
        {
          routing: go.Routing.Normal,
          reshapable: true,
          resegmentable: true,
          relinkableFrom: true,
          relinkableTo: true,
        },
        $(go.Shape, { strokeWidth: 1.5, stroke: '#757575', strokeDashArray: [4, 3] }),
        $(go.Shape, { toArrow: 'OpenTriangle', stroke: '#757575', scale: 0.8 })
      )
    );

    diagram.groupTemplateMap.add('ClusterGroup',
      $(go.Group, 'Auto',
        {
          isSubGraphExpanded: true,
          layerName: 'Background',
          selectable: true,
          movable: true,
          cursor: 'move',
          handlesDragDropForMembers: true,
          computesBoundsAfterDrag: true,
          computesBoundsIncludingLinks: true,
          fromLinkable: false,
          toLinkable: false,
          minSize: new go.Size(120, 60),
          resizable: true,
          // 🔧 ADD: Prevent default context menu for clusters
          contextClick: (e, obj) => {
            const group = obj.part;
            if (group instanceof go.Group) {
              setSelectedData({
                key: group.data.key,
                label: group.data.label || '',
                isCluster: true
              });
              const mouseEvent = e.event as MouseEvent;
              setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY });
            }
            e.handled = true;  // Prevent browser context menu
          }
        },
        // The Shape that will resize to fit the inner Panel (label + placeholder)
        $(go.Shape, 'RoundedRectangle', {
            name: 'CLUSTER_SHAPE',
            fill: '#e9ecef',
            stroke: '#adb5bd',
            strokeWidth: 1.5,
            parameter1: 6
          },
          new go.Binding('fill', 'color').makeTwoWay(),
          new go.Binding('stroke', 'stroke').makeTwoWay(),
          new go.Binding('strokeWidth', 'strokeWidth').makeTwoWay(),
          new go.Binding('parameter1', 'parameter1').makeTwoWay()
        ),
        // Put label and placeholder into a Vertical panel so the Shape's bounds include both
        $(go.Panel, 'Vertical',
          { defaultStretch: go.GraphObject.Horizontal },
          $(go.TextBlock,
            {
              name: 'G_LABEL',
              margin: new go.Margin(6, 8, 0, 8),
              editable: true,
              font: 'bold 12px sans-serif',
              stroke: '#333',
              background: null,
              maxSize: new go.Size(200, NaN), // constrain width so long labels wrap
              wrap: go.TextBlock.WrapFit,
              overflow: go.TextBlock.OverflowEllipsis,
              alignment: go.Spot.TopLeft
            },
            new go.Binding('text', 'label').makeTwoWay()
          ),
          $(go.Placeholder, { padding: 12 })
        )
      )
    );

    // ── BEAM Card template — two-section layout (header + description) ────────
    // Used for: System, Context, Note, Risk, Risk Source, Consequence, Impact, Risk Control
    // CARD_SHAPE is the Spot main element so it sets the node bounds.
    // The Vertical content panel uses stretch:Fill to inherit that width,
    // giving TextBlocks a real pixel budget so WrapFit actually wraps.
    diagram.nodeTemplateMap.add('beamCard',
      $(go.Node, 'Spot',
        {
          locationSpot: go.Spot.TopLeft,
          selectable: true,
          movable: true,
          resizable: true,
          resizeObjectName: 'CARD_SHAPE',
          contextClick: (e, obj) => {
            const node = obj.part;
            if (node instanceof go.Node) {
              setSelectedData(node.data);
              const mouseEvent = e.event as MouseEvent;
              setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY });
            }
          },
          mouseEnter: (_e, obj) => showSmallPorts(obj, true),
          mouseLeave: (_e, obj) => showSmallPorts(obj, false),
        },
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),

        // Main Spot element: border shape drives node bounds + default port
        $(go.Shape, 'Rectangle',
          {
            name: 'CARD_SHAPE',
            fill: 'white',
            strokeWidth: 2,
            portId: '',
            fromLinkable: true,
            toLinkable: true,
            fromSpot: go.Spot.AllSides,
            toSpot: go.Spot.AllSides,
            cursor: 'move',
            minSize: new go.Size(160, 80),
            maxSize: new go.Size(800, 600),
          },
          new go.Binding('stroke', 'stroke'),
          new go.Binding('strokeWidth', 'strokeWidth'),
          new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify),
        ),

        // Content overlay — stretch:Fill constrains width to CARD_SHAPE so WrapFit works
        $(go.Panel, 'Vertical',
          {
            alignment: go.Spot.Center,
            stretch: go.GraphObject.Fill,
            defaultAlignment: go.Spot.Left,
          },
          // Header: colored band + bold title
          $(go.Panel, 'Auto',
            { stretch: go.GraphObject.Horizontal, minSize: new go.Size(0, 34) },
            $(go.Shape, 'Rectangle',
              { strokeWidth: 0, stretch: go.GraphObject.Fill },
              new go.Binding('fill', 'color'),
            ),
            $(go.TextBlock, {
              stretch: go.GraphObject.Horizontal,
              margin: new go.Margin(6, 10, 6, 10),
              font: 'bold 11px sans-serif',
              stroke: '#111',
              editable: true,
              wrap: go.TextBlock.WrapFit,
              alignment: go.Spot.Left,
              maxLines: 3,
              overflow: go.TextBlock.OverflowEllipsis,
            },
            new go.Binding('text', 'label').makeTwoWay(),
            ),
          ),
          // Separator line
          $(go.Shape, 'LineH', {
            stroke: '#aaa',
            strokeWidth: 1,
            stretch: go.GraphObject.Horizontal,
            height: 1,
          }),
          // Body: description — wraps within CARD_SHAPE width
          $(go.TextBlock, {
            stretch: go.GraphObject.Horizontal,
            margin: new go.Margin(6, 10, 6, 10),
            font: '10px sans-serif',
            stroke: '#444',
            editable: true,
            isMultiline: true,
            wrap: go.TextBlock.WrapFit,
            maxLines: 10,
            overflow: go.TextBlock.OverflowEllipsis,
            alignment: go.Spot.TopLeft,
          },
          new go.Binding('text', 'subtext').makeTwoWay(),
          ),
        ),

        // Risk-class subtype badge — shown ONLY on the five BEAM risk elements.
        // Click to reclassify the card among Risk / Risk Source / Consequence ▸
        // Impact / Risk Control (mirrors the type badge on regular components).
        $(go.Panel, 'Auto',
          {
            name: 'RISK_CLASS_BADGE',
            alignment: go.Spot.Top,
            alignmentFocus: go.Spot.Bottom,
            margin: new go.Margin(-6, 0, 0, 0),
            cursor: 'pointer',
            click: (_e, obj) => showRiskClassSelector(_e, obj.part as go.Node),
            // Default hidden: GoJS skips a Binding whose source property is
            // undefined, so a card with no `name` would otherwise keep the
            // panel's defaults (visible, black dot, empty text).
            visible: false,
          },
          new go.Binding('visible', 'name', (n) => RISK_CLASS_SET.has(n)),
          $(go.Shape, 'RoundedRectangle',
            { fill: 'white', stroke: '#d1d5db', strokeWidth: 1, parameter1: 10 }
          ),
          $(go.Panel, 'Horizontal',
            { margin: new go.Margin(3, 8, 3, 8) },
            $(go.Shape, 'Circle',
              { width: 6, height: 6, stroke: null, margin: new go.Margin(0, 4, 0, 0) },
              new go.Binding('fill', 'name', (n) => RISK_CLASS_STYLE[n]?.stroke ?? '#9ca3af')
            ),
            $(go.TextBlock,
              { font: '9px system-ui, -apple-system, sans-serif', stroke: '#374151' },
              new go.Binding('text', 'name', (n) => RISK_CLASS_LABEL[n] ?? n ?? 'Risk')
            ),
            $(go.Shape, 'TriangleDown',
              { width: 5, height: 3, fill: '#9ca3af', stroke: null, margin: new go.Margin(0, 0, 0, 3) }
            )
          )
        ),

        // Port indicators (visible on hover via showSmallPorts)
        makePort('T', go.Spot.Top, true, true),
        makePort('L', go.Spot.Left, true, true),
        makePort('R', go.Spot.Right, true, true),
        makePort('B', go.Spot.Bottom, true, true),
      )
    );

    diagram.addDiagramListener('ChangedSelection', () => {
      const node = diagram.selection.first();
      if (node instanceof go.Group) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          isCluster: true
        });
      } else if (node instanceof go.Node) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          color: data.color || '#ffffff',
          stroke: data.stroke || '#999999',
          shape: data.shape || 'Rectangle',
          isCluster: false
        });
      } else {
        setSelectedData(null);
      }
    });

    diagram.addDiagramListener('ObjectDoubleClicked', (e) => {
      const node = e.subject.part;
      if (node instanceof go.Group) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          isCluster: true
        });
      } else if (node instanceof go.Node) {
        const data = node.data;
        setSelectedData({
          key: data.key,
          label: data.label || '',
          color: data.color || '#ffffff',
          stroke: data.stroke || '#999999',
          shape: data.shape || 'Rectangle',
          isCluster: false
        });
      }
    });

    diagram.addDiagramListener('ExternalObjectsDropped', (e) => {
      const droppedParts = e.subject;
      droppedParts.each((part: go.Part) => {
        if (part instanceof go.Node && !part.data.isGroup) {
          const nodeData = part.data;
          
          // 🔧 FIX: Set default type to the shape's name if not already set
          if (!nodeData.type && nodeData.name) {
            diagram.model.setDataProperty(nodeData, 'type', nodeData.name);
          }
          
          // Update label to include type
          const currentLabel = nodeData.label || nodeData.text || nodeData.name || 'Node';
          const displayLabel = currentLabel.charAt(0).toUpperCase() + currentLabel.slice(1);
          diagram.model.setDataProperty(nodeData, 'label', displayLabel);
          diagram.model.setDataProperty(nodeData, 'text', displayLabel);
        }
      });
    });

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
        const pattern = JSON.parse(patternData);
        diagram.startTransaction('drop pattern');
        
        const nodeKeyMap = new Map<string, string>();
        
        pattern.nodes.forEach((node: any) => {
          const newKey = `node_${Date.now()}${node.id}`;
          nodeKeyMap.set(node.id, newKey);
          
          const nodeData: any = {
            key: newKey,
            name: node.name,
            label: node.label,
            shape: node.shape,
            color: node.color,
            stroke: node.stroke,
            loc: go.Point.stringify(new go.Point(point.x + node.x, point.y + node.y)),
            type: node.type || node.name  // 🔧 FIX: Use pattern's type or default to name
          };

          if (node.shape === 'RoundedRectangle') {
            nodeData.parameter1 = 45;
          }

          (diagram.model as go.GraphLinksModel).addNodeData(nodeData);
        });
        
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
        const shape = JSON.parse(shapeData);
        
        const nodeData: any = {
          key: `node_${Date.now()}`,
          name: shape.name,
          label: shape.label,
          shape: shape.shape,
          color: shape.color,
          stroke: shape.stroke,
          loc: go.Point.stringify(point),
          type: shape.name,
          ...(shape.category && { category: shape.category }),
          ...(shape.category === 'beamCard' && { size: '220 100', subtext: 'Description' }),
          ...(shape.width && { width: shape.width }),
          ...(shape.height && { height: shape.height }),
        };

        if (shape.shape === 'RoundedRectangle') {
          const radius = shape.borderRadius ? parseFloat(shape.borderRadius) : 15;
          nodeData.parameter1 = radius;
        }

        if (shape.shape === 'Hexagon') {
          nodeData.parameter1 = 1;
        }
        
        diagram.startTransaction("add node");
        diagram.model.addNodeData(nodeData);
        diagram.commitTransaction("add node");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();  // 🔧 ADD: Stop propagation
      return false;
    };

    const diagramDiv = diagram.div;
    if (diagramDiv) {
      diagramDiv.addEventListener('dragover', handleDragOver);
      diagramDiv.addEventListener('drop', handleDrop);
      diagramDiv.addEventListener('contextmenu', handleContextMenu);
    }

    diagramRef.current = diagram;
    (window as any).__gojs_diagram = diagram;
    setupDiagramValidation(diagram);

    // Keep App's `pages` state in step with the canvas. Without this, `pages`
    // only catches up on page switch / export, and anything autosaved between
    // those moments would be stale.
    const modelListener = (e: go.ChangedEvent) => {
      if (!e.isTransactionFinished) return;

      const txn = e.object as go.Transaction | null;
      if (!txn) return;
      // Layout runs its own transaction when a model is loaded; not a user edit.
      if (txn.name === 'Layout' || txn.name === 'Initial Layout') return;
      // A transaction can close having touched only Diagram properties and no
      // model data at all — GoJS setup (padding, nodeTemplate, grid, ...) lands
      // in the first committed transaction, and model.commit() commits even when
      // its body changed nothing. Only model changes are real edits.
      const touchedModel = txn.changes.toArray().some((c) => c.model !== null);
      if (!touchedModel) return;

      const model = e.model as go.GraphLinksModel;
      onModelChangeRef.current?.(
        model.nodeDataArray as DiagramData[],
        model.linkDataArray as DiagramData[]
      );
    };
    diagram.addModelChangedListener(modelListener);

    // The new instance is empty; tell App to load the current page into it.
    onDiagramInitRef.current?.();

    return () => {
      diagram.removeModelChangedListener(modelListener);
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
  }, [diagramRef, setSelectedData, setContextMenu, containers, customGroups]);

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

  // BEAM view re-skin effect
  useEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram) return;
    diagram.model.commit((m: go.Model) => {
      (m.nodeDataArray as any[]).forEach((nodeData) => {
        if (beamViewActive) {
          const style = beamStyleMap[nodeData.type as string] ?? beamStyleMap[nodeData.name as string];
          if (!style) return;
          m.setDataProperty(nodeData, '_t4bStyle', { color: nodeData.color, stroke: nodeData.stroke, shape: nodeData.shape });
          m.setDataProperty(nodeData, 'color', style.color);
          m.setDataProperty(nodeData, 'stroke', style.stroke);
          m.setDataProperty(nodeData, 'shape', style.shape);
        } else {
          if (!nodeData._t4bStyle) return;
          m.setDataProperty(nodeData, 'color', (nodeData._t4bStyle as any).color);
          m.setDataProperty(nodeData, 'stroke', (nodeData._t4bStyle as any).stroke);
          m.setDataProperty(nodeData, 'shape', (nodeData._t4bStyle as any).shape);
          m.setDataProperty(nodeData, '_t4bStyle', undefined);
        }
      });
    }, beamViewActive ? 'apply beam view' : 'restore t4b view');
  }, [beamViewActive]);

  // ADD: Handle custom group drops
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

          const keyMap: Record<string, string> = {};
          const newNodes = shape.nodeDataArray.map((n: any) => {
            const newKey = `node_${Date.now()}${Math.floor(Math.random() * 1000000)}`;
            keyMap[n.key] = newKey;
            const [x, y] = (n.loc || "0 0").split(' ').map(Number);
            return {
              ...n,
              key: newKey,
              loc: `${x + offsetX} ${y + offsetY}`,
              type: n.type || n.name  // 🔧 FIX: Preserve type or default to name
            };
          });

          newNodes.forEach((n: any) => diagram.model.addNodeData(n));

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

  // Render the diagram container
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
        overflowX: 'visible',
        overflowY: 'visible',
      }}
    />
  );
};

// ADD: Export the component as default
export default GoDiagram;
