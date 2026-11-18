import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import * as go from 'gojs';
import { setupDiagramValidation, validateGoJSDiagram } from './plugin/GoJSBoxologyValidation';
import { mapShapeToGoJSFigure } from './utils/shapeMapping';
import { shapeTypesTree , shapes } from './data/shape';
import { beamStyleMap } from './data/beamStyles';
import type { DiagramData } from './types';
import { inferLinkCategory } from './utils/linkCategory';
import DataPropertiesDialog from './components/dialogs/DataPropertiesDialog';
import {
  loadPropertySchema,
  schemaPropertiesFor,
  type DataProperty,
  type PropertySchema,
} from './utils/propertySchema';

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
  /** Style for newly drawn arrows — true = dashed (risk relation), false = solid flow. */
  arrowDash?: boolean;
  /** Fires after every committed user transaction, so App can keep `pages` in sync with the canvas. */
  onModelChange?: (nodeDataArray: DiagramData[], linkDataArray: DiagramData[]) => void;
  /**
   * Fires whenever a new go.Diagram instance is built (mount, StrictMode remount,
   * or a container/customGroup change re-running setup). The new instance starts
   * empty, so App must push the current page back into it.
   */
  onDiagramInit?: () => void;
}

const getRoundedRectParameter = (nodeName: string) => {
  const shapeDef = shapes.find((s) => s.name.toLowerCase() === nodeName.toLowerCase());
  if (!shapeDef?.borderRadius) return 15;
  const parsed = parseFloat(shapeDef.borderRadius);
  return Number.isFinite(parsed) ? parsed : 15;
};

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

  // Resolve the canonical root key from the tree in a case-insensitive way
  const desired = String(node.data.name || node.data.type || '').toLowerCase();
  let rootKey: string | null = null;
  for (const k of Object.keys(shapeTypesTree)) {
    if (k.toLowerCase() === desired) {
      rootKey = k;
      break;
    }
  }
  // fallback: if node.data.name is already a key, use it; otherwise use node.data.name as-is
  if (!rootKey && shapeTypesTree[String(node.data.name)]) rootKey = String(node.data.name);
  if (!rootKey) rootKey = String(node.data.name || node.data.type || '') || null;

  const typeTree: Record<string, any> | null = rootKey ? (shapeTypesTree[rootKey] || null) : null;
  // If no subtree found, still continue and present a single root option so user can set type to the root

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

  // Add a root option at the top so the parent type (e.g. "Model" / "Symbol") can always be selected
  if (rootKey) {
    const rootOption = document.createElement("div");
    rootOption.textContent = rootKey;
    rootOption.style.padding = "8px 12px";
    rootOption.style.cursor = "pointer";
    rootOption.style.fontSize = "12px";
    rootOption.style.fontWeight = (node.data.type === rootKey) ? "700" : "600";
    rootOption.style.background = (node.data.type === rootKey) ? "#e6f7ff" : "white";
    rootOption.onclick = (event) => {
      event.stopPropagation();
      diagram.model.startTransaction("change type");
      // prefer setDataProperty if available
      if (diagram.model.setDataProperty) diagram.model.setDataProperty(node.data, "type", rootKey);
      else diagram.model.set(node.data, "type", rootKey);
      diagram.model.commitTransaction("change type");
      let el: HTMLElement | null = dropdownContainer;
      while (el && el.parentElement) {
        el.remove();
        el = el.parentElement;
      }
    };
    dropdownContainer.appendChild(rootOption);
  }

  // Render subtree options (child types) below the root option, if any
  if (typeTree && Object.keys(typeTree).length > 0) {
    buildTypeMenu(diagram, node, typeTree, dropdownContainer);
  }

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

// Opens a dropdown just above a node and closes it on an outside click or
// Escape. `fill` puts the options into the container.
function openNodePopup(node: go.Node, fill: (diagram: go.Diagram, container: HTMLElement) => void) {
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

  fill(diagram, container);

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

function showRiskClassSelector(_e: go.InputEvent, node: go.Node) {
  openNodePopup(node, (diagram, container) => buildRiskMenu(diagram, node, riskClassTree, container));
}

// ── BEAM context types ───────────────────────────────────────────────────────
// A Context card stays a Context; its badge only sets the `contextType`
// subtype (beam v0.0.2: BusinessObjective / TechnicalObjective are subclasses
// of Context). Unlike the risk badge it never touches name, type or colours.
// Generic Context is stored as no `contextType` at all.
const CONTEXT_TYPES: { value: string; label: string; dot: string }[] = [
  { value: 'Context',            label: 'Context',             dot: '#757575' },
  { value: 'BusinessObjective',  label: 'Business Objective',  dot: '#2f5fb3' },
  { value: 'TechnicalObjective', label: 'Technical Objective', dot: '#2f7d5b' },
];
const CONTEXT_TYPE_LABEL: Record<string, string> =
  Object.fromEntries(CONTEXT_TYPES.map((c) => [c.value, c.label]));
const CONTEXT_TYPE_DOT: Record<string, string> =
  Object.fromEntries(CONTEXT_TYPES.map((c) => [c.value, c.dot]));

function showContextTypeSelector(_e: go.InputEvent, node: go.Node) {
  openNodePopup(node, (diagram, container) => {
    const current = node.data.contextType ?? 'Context';
    CONTEXT_TYPES.forEach(({ value, label }) => {
      const option = document.createElement('div');
      option.textContent = label;
      option.dataset.contextType = value;
      option.style.padding = '8px 12px';
      option.style.cursor = 'pointer';
      option.style.fontSize = '12px';
      option.style.color = 'black';
      option.style.whiteSpace = 'nowrap';
      option.style.background = value === current ? '#e0f2fe' : 'white';
      option.style.fontWeight = value === current ? '600' : 'normal';
      option.onclick = (event) => {
        event.stopPropagation();
        diagram.model.startTransaction('change context type');
        diagram.model.set(node.data, 'contextType', value === 'Context' ? undefined : value);
        diagram.model.commitTransaction('change context type');
        container.remove();
      };
      container.appendChild(option);
    });
  });
}

// Data-properties count pill (bottom-right of components and BEAM cards);
// hover lists the values. Bound to the whole data object because clearing
// `props` leaves it undefined, and GoJS skips Bindings on undefined sources.
function makePropsPill() {
  const $ = go.GraphObject.make;
  const count = (d: { props?: unknown }) => (Array.isArray(d.props) ? d.props.length : 0);
  return $(go.Panel, 'Auto',
    {
      name: 'PROPS_PILL',
      alignment: go.Spot.BottomRight,
      alignmentFocus: go.Spot.Center,
      visible: false,
      cursor: 'help',
      toolTip: $('ToolTip',
        $(go.TextBlock,
          { margin: 4, font: '10px system-ui, -apple-system, sans-serif' },
          new go.Binding('text', '', (d) =>
            (d.props ?? []).map((p: DataProperty) => `${p.label}: ${p.value}`).join('\n'))
        )
      ),
    },
    new go.Binding('visible', '', (d) => count(d) > 0),
    $(go.Shape, 'RoundedRectangle',
      { fill: '#eef2ff', stroke: '#6366f1', strokeWidth: 1, parameter1: 8 }
    ),
    $(go.TextBlock,
      {
        name: 'PROPS_PILL_TEXT',
        margin: new go.Margin(1, 6, 1, 6),
        font: 'bold 9px system-ui, -apple-system, sans-serif',
        stroke: '#3730a3',
      },
      new go.Binding('text', '', (d) => `${count(d)} prop${count(d) === 1 ? '' : 's'}`)
    )
  );
}

const GoDiagram: React.FC<GoDiagramProps> = ({
  diagramRef,
  setSelectedData,
  setContextMenu,
  containers,
  customGroups,
  beamViewActive,
  arrowDash,
  onModelChange,
  onDiagramInit,
}) => {
  const diagramDivRef = useRef<HTMLDivElement>(null);
  // Node whose data properties are being edited (double-click), and the
  // schema for the dialog: undefined while loading, null if unavailable.
  const [propsNode, setPropsNode] = useState<go.Node | null>(null);
  const [propsSchema, setPropsSchema] = useState<PropertySchema | null | undefined>(undefined);

  // Held in refs so a new callback identity never re-runs the setup effect,
  // which would tear down and rebuild the whole diagram.
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const onDiagramInitRef = useRef(onDiagramInit);
  onDiagramInitRef.current = onDiagramInit;
  const arrowDashRef = useRef(arrowDash);
  arrowDashRef.current = arrowDash;

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
        $(go.Shape, 'LineH', { stroke: '#eee' }),
        $(go.Shape, 'LineV', { stroke: '#eee' })
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
    diagram.toolManager.draggingTool.isGridSnapEnabled = false;
    diagram.toolManager.draggingTool.delay = 0;
    
    // 🔧 ADD: Custom cursor for linking tool
    diagram.toolManager.linkingTool.isEnabled = true;
    // Removed invalid property: portTargetingTool.cursorHot
    
    diagram.toolManager.relinkingTool.isEnabled = true;


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

// ── BEAM card sizing ──────────────────────────────────────────────────────────
// A card's stored `size` only pins its width. The height is always NaN so the
// card measures to its own content — a long description grows the card instead
// of being clipped or ellipsised. Legacy data ("220 100") still works: the
// stored height is read and discarded.
const DEFAULT_CARD_WIDTH = 220;

function cardSizeFromData(size: unknown): go.Size {
  const width = parseFloat(String(size ?? '').split(/\s+/)[0]);
  return new go.Size(isFinite(width) && width > 0 ? width : DEFAULT_CARD_WIDTH, NaN);
}

function cardSizeToData(size: go.Size): string {
  const width = isFinite(size.width) ? Math.round(size.width) : DEFAULT_CARD_WIDTH;
  return `${width} NaN`;
}

// Cards are resized horizontally only — the height belongs to the text.
function makeHorizontalResizeAdornment(): go.Adornment {
  const $ = go.GraphObject.make;
  const handle = (alignment: go.Spot) =>
    $(go.Shape, 'Rectangle', {
      alignment,
      cursor: 'col-resize',
      desiredSize: new go.Size(8, 8),
      fill: 'lightblue',
      stroke: 'deepskyblue',
    });
  return $(go.Adornment, 'Spot',
    $(go.Placeholder),
    handle(go.Spot.Left),
    handle(go.Spot.Right)
  );
}

    // UPDATED: Node template - shape as port with cursor differentiation
    diagram.nodeTemplate = $(
      go.Node,
      'Spot',
      {
        locationSpot: go.Spot.Center,
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
          const node = obj as go.Node;
          node.cursor = 'move';  // Default to move
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
      $(
        go.Panel,
        'Auto',
        {
          name: 'BODY'
        },
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
            fromSpot: go.Spot.AllSides,
            toSpot: go.Spot.AllSides,
            cursor: 'move',  // Default cursor
            minSize: new go.Size(100, 60),
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
          new go.Binding('fromSpot', 'shape', (shapeType) =>
            shapeType === 'Triangle' || shapeType === 'TriangleDown' ? go.Spot.None : go.Spot.AllSides
          ),
          new go.Binding('toSpot', 'shape', (shapeType) =>
            shapeType === 'Triangle' || shapeType === 'TriangleDown' ? go.Spot.None : go.Spot.AllSides
          ),
          new go.Binding('width', 'width', (w) => typeof w === 'number' ? w : NaN).makeTwoWay(),
          new go.Binding('height', 'height', (h) => typeof h === 'number' ? h : NaN).makeTwoWay(),
          new go.Binding('strokeWidth', 'strokeWidth'),
          new go.Binding('parameter1', 'parameter1'),
          new go.Binding('desiredSize', 'expanded', (exp, shape) => {
            const s = exp ? shape.part.data.expandedSize : shape.part.data.collapsedUserSize;
            return s ? go.Size.parse(s) : new go.Size(NaN, NaN);
          }),
        ),
      
        // Label (centered) - UPDATED: Make editable
        $(
          go.TextBlock,
          {
            alignment: go.Spot.Center,
            margin: 8,
            font: 'bold 12px sans-serif',
            stroke: '#333',
            editable: true,
            textAlign: 'center',
            wrap: go.TextBlock.WrapFit,
            overflow: go.TextBlock.OverflowClip,
            maxSize: new go.Size(240, NaN),
            textEditor: null
          },
          new go.Binding('text', 'label').makeTwoWay()
        )
      ),
      
      // 🔧 REMOVED: All separate port lines (TOP_PORT, BOTTOM_PORT, LEFT_PORT, RIGHT_PORT)
      
      makePropsPill(),

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
        selectable: true,
        reshapable: true,
        resegmentable: true,
        relinkableFrom: true,
        relinkableTo: true,
        click: (e, obj) => {
          const link = obj.part;
          if (link instanceof go.Link) {
            setSelectedData({ isLink: true, dash: !!link.data.dash });
          }
        },
        contextClick: (e, obj) => {
          const link = obj.part;
          if (link instanceof go.Link && e.diagram) {
            if (!link.isSelected) e.diagram.select(link);
            setSelectedData({ isLink: true, dash: !!link.data.dash });
            const mouseEvent = e.event as MouseEvent;
            setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY });
            e.handled = true;
          }
        },
      },
      // Wide transparent stroke first: a fat, invisible hit zone so thin
      // arrows are easy to click/select (the visible 2px path alone is a
      // near-impossible target).
      $(go.Shape, { isPanelMain: true, stroke: 'transparent', strokeWidth: 12 }),
      $(go.Shape, { isPanelMain: true, strokeWidth: 2, stroke: "#555" },
        new go.Binding('strokeDashArray', 'dash', (d) => (d ? [6, 4] : null))
      ),
      $(go.Shape, { toArrow: "Triangle", fill: "#555", stroke: null })
    );

    // Annotation connector — dotted line (Table 2 BEAM paper)
    diagram.linkTemplateMap.add('annotation',
      $(go.Link,
        {
          routing: go.Routing.Normal,
          selectable: true,
          reshapable: true,
          resegmentable: true,
          relinkableFrom: true,
          relinkableTo: true,
        },
        $(go.Shape, { isPanelMain: true, stroke: 'transparent', strokeWidth: 12 }),
        $(go.Shape, { isPanelMain: true, strokeWidth: 1.5, stroke: '#757575', strokeDashArray: [4, 3] }),
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
    
    // Refinement
    function stateMinSize(exp: boolean, d: any): go.Size {
      const parse = (s?: string) => (s ? go.Size.parse(s) : new go.Size(0, 0));
      if (exp) return parse(d.expandedSize);
      const anchor = parse(d.collapsedSize);
      const user = parse(d.collapsedUserSize);
      return new go.Size(Math.max(anchor.width, user.width), Math.max(anchor.height, user.height));
    }

    diagram.groupTemplateMap.add('RefinementGroup',
      new go.Group('Auto', {
        layerName: 'Background',
        selectable: true,
        movable: true,
        cursor: 'move',
        handlesDragDropForMembers: true,
        computesBoundsAfterDrag: true,
        computesBoundsIncludingLinks: true,
        fromLinkable: false,
        toLinkable: false,
        resizable: true,
        resizeObjectName: 'SHAPE', 
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
        },
        subGraphExpandedChanged: (grp: go.Group) => {
          const diagram = grp.diagram;
          if (!diagram || diagram.undoManager.isUndoingRedoing) return;
          const anchor = diagram.findNodeForKey(grp.data.anchorKey);
          if (!anchor) return;

          grp.ensureBounds();
          
          // Keeping the collapsed group at the same position the the orignal node.
          //! When `animationManager.isEnabled = true` it gets moved too much 
          if (!grp.isSubGraphExpanded) {
            // Collapsed: but the box's center on the anchor's center
            const c = grp.actualBounds.center;
            const dx = anchor.location.x - c.x;
            const dy = anchor.location.y - c.y;
            grp.move(new go.Point(grp.position.x + dx, grp.position.y + dy));
            diagram.model.set(grp.data, 'collapseOffset', {dx, dy});
          }else{
            // Expanded: Reverse the offset so the anchor sits where the box was
            const off = grp.data.collapseOffset;
            if (!off) return;
            grp.move(new go.Point(grp.position.x - off.dx, grp.position.y - off.dy));
            diagram.model.set(grp.data, 'collapseOffset', null);
          }
        },    
      })
      .bindTwoWay('isSubGraphExpanded', 'expanded')
      // add group label
      .add(
        new go.Shape('Rectangle', {
          fill: '#e3e9f7',
          stroke:'#aab8da',
          parameter1: 10,
        })
        .bind('fill', 'fill')
        .bind('stroke', 'stroke')
        // aligning size and shape to anchor element
        .bind('minSize', 'expanded', (exp, shape) =>
          stateMinSize(exp, shape.part.data))
        .bind('spot1', 'expanded', exp =>
          exp ? go.Spot.TopLeft : new go.Spot(0.15, 0.15))
        .bind('spot2', 'expanded', exp =>
          exp ? go.Spot.BottomRight : new go.Spot(0.85, 0.85))
        .bindObject('figure', 'isSubGraphExpanded', (exp, shape) => 
          exp ? 'Rectangle' : (shape.part.data.anchorFigure || 'Ellipse')
        ),
        new go.Panel('Table', { margin: 3 })
          .addRowColumnDefinition(
            new go.RowColumnDefinition({ row: 0, background: 'white' })
            .bind('background', 'headerColor'))
          .add(
            go.GraphObject.build('SubGraphExpanderButton', {margin: 4}),
            new go.TextBlock({
              column: 1,
              font: 'bold 14px sans-serif',
              stroke: 'black',
              textAlign: 'center',
              margin: 8,
              editable: true,
            }).bind('text'),
            new go.Placeholder({row: 1, columnSpan: 2, padding: 12}))
          .bind('alignment', 'expanded', exp => 
            exp ? go.Spot.Top : go.Spot.Center)
          .bind('stretch', 'expanded', exp => 
            exp ? go.Stretch.Horizontal : go.Stretch.None
          ),
        )
      );

    // ── BEAM Card template — two-section layout (header + description) ────────
    // Used for: System, Context, Note, Risk, Risk Source, Consequence, Impact, Risk Control
    // The card is width-driven, height-automatic: CARD_BODY carries the stored
    // width (so WrapFit has a real pixel budget) and leaves its height NaN, and
    // the enclosing Auto panel grows CARD_SHAPE around whatever the header and
    // description end up needing. That Auto panel is the Spot main element, so
    // it still sets the node bounds for the ports and the risk-class badge.
    // Fixing the height instead would clip long descriptions.
    diagram.nodeTemplateMap.add('beamCard',
      $(go.Node, 'Spot',
        {
          locationSpot: go.Spot.TopLeft,
          selectable: true,
          movable: true,
          resizable: true,
          resizeObjectName: 'CARD_BODY',
          resizeAdornmentTemplate: makeHorizontalResizeAdornment(),
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

        // Main Spot element: Auto panel that grows the border shape around the
        // content, so the node bounds always include the full description.
        $(go.Panel, 'Auto',
          { isPanelMain: true },

          // Border shape + default port
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
            },
            new go.Binding('stroke', 'stroke'),
            new go.Binding('strokeWidth', 'strokeWidth'),
          ),

          // Content — fixed width (from data), automatic height
          $(go.Panel, 'Vertical',
            {
              name: 'CARD_BODY',
              defaultAlignment: go.Spot.Left,
              minSize: new go.Size(160, 0),
              maxSize: new go.Size(800, Infinity),
            },
            // Only the width is honoured; the height stays NaN so the card
            // measures to its content instead of clipping it.
            new go.Binding('desiredSize', 'size', cardSizeFromData)
              .makeTwoWay(cardSizeToData),

            // Header: colored band + bold title
            $(go.Panel, 'Auto',
              { stretch: go.GraphObject.Horizontal, minSize: new go.Size(0, 34) },
              $(go.Shape, 'Rectangle',
                { strokeWidth: 0, stretch: go.GraphObject.Fill },
                new go.Binding('fill', 'color'),
              ),
              $(go.TextBlock, {
                name: 'CARD_TITLE',
                stretch: go.GraphObject.Horizontal,
                margin: new go.Margin(6, 10, 6, 10),
                font: 'bold 11px sans-serif',
                stroke: '#111',
                editable: true,
                isMultiline: true,
                wrap: go.TextBlock.WrapFit,
                alignment: go.Spot.Left,
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
            // Body: description — wraps within CARD_BODY width, no line cap
            $(go.TextBlock, {
              name: 'CARD_DESC',
              stretch: go.GraphObject.Horizontal,
              margin: new go.Margin(6, 10, 6, 10),
              font: '10px sans-serif',
              stroke: '#444',
              editable: true,
              isMultiline: true,
              wrap: go.TextBlock.WrapFit,
              alignment: go.Spot.TopLeft,
            },
            new go.Binding('text', 'subtext').makeTwoWay(),
            ),
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

        // Context-type badge — shown ONLY on Context cards. Click to pick the
        // subtype (Context / Business Objective / Technical Objective); the
        // card itself stays a Context. Text and dot bind to the whole data
        // object, because clearing `contextType` makes it undefined and GoJS
        // skips a Binding whose source property is undefined.
        $(go.Panel, 'Auto',
          {
            name: 'CONTEXT_TYPE_BADGE',
            alignment: go.Spot.Top,
            alignmentFocus: go.Spot.Bottom,
            margin: new go.Margin(-6, 0, 0, 0),
            cursor: 'pointer',
            click: (_e, obj) => showContextTypeSelector(_e, obj.part as go.Node),
            visible: false,
          },
          new go.Binding('visible', 'name', (n) => n === 'Context'),
          $(go.Shape, 'RoundedRectangle',
            { fill: 'white', stroke: '#d1d5db', strokeWidth: 1, parameter1: 10 }
          ),
          $(go.Panel, 'Horizontal',
            { margin: new go.Margin(3, 8, 3, 8) },
            $(go.Shape, 'Circle',
              { width: 6, height: 6, stroke: null, margin: new go.Margin(0, 4, 0, 0) },
              new go.Binding('fill', '', (d) => CONTEXT_TYPE_DOT[d.contextType ?? 'Context'] ?? '#9ca3af')
            ),
            $(go.TextBlock,
              { name: 'CONTEXT_TYPE_TEXT', font: '9px system-ui, -apple-system, sans-serif', stroke: '#374151' },
              new go.Binding('text', '', (d) => CONTEXT_TYPE_LABEL[d.contextType ?? 'Context'] ?? d.contextType)
            ),
            $(go.Shape, 'TriangleDown',
              { width: 5, height: 3, fill: '#9ca3af', stroke: null, margin: new go.Margin(0, 0, 0, 3) }
            )
          )
        ),

        makePropsPill(),

        // Port indicators (visible on hover via showSmallPorts)
        makePort('T', go.Spot.Top, true, true),
        makePort('L', go.Spot.Left, true, true),
        makePort('R', go.Spot.Right, true, true),
        makePort('B', go.Spot.Bottom, true, true),
      )
    );

    // The ResizingTool writes a concrete height into CARD_BODY even when only a
    // side handle was dragged, which would pin the card and clip later edits to
    // the description. Hand the height back to the content.
    diagram.addDiagramListener('PartResized', (e) => {
      const obj = e.subject as go.GraphObject;
      if (obj instanceof go.Panel && obj.name === 'CARD_BODY') {
        obj.height = NaN;
      }
    });

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

    diagram.addDiagramListener('LinkDrawn', (e) => {
      const link = e.subject;
      if (!(link instanceof go.Link)) return;
      const fromData = link.fromNode?.data;
      const toData = link.toNode?.data;
      const category = inferLinkCategory(fromData, toData);
      if (category) {
        (diagram.model as go.GraphLinksModel).setCategoryForLinkData(link.data, category);
      } else if (arrowDashRef.current) {
        // Left-bar arrow picker: draw new workflow arrows dashed (risk relation)
        diagram.model.setDataProperty(link.data, 'dash', true);
      }
    });

    diagram.addDiagramListener('LinkRelinked', (e) => {
      const link = e.subject;
      if (!(link instanceof go.Link)) return;
      const fromData = link.fromNode?.data;
      const toData = link.toNode?.data;
      const category = inferLinkCategory(fromData, toData);
      (diagram.model as go.GraphLinksModel).setCategoryForLinkData(link.data, category ?? '');
    });

    diagram.addDiagramListener('PartResized', e => {
      const obj = e.subject as go.GraphObject;
      const grp = obj.part;
      if (!(grp instanceof go.Group) || grp.category !== 'RefinementGroup') return;
      const prop = grp.isSubGraphExpanded ? 'expandedSize' : 'collapsedUserSize';
      e.diagram.model.set(grp.data, prop, go.Size.stringify(obj.desiredSize));
      obj.desiredSize = new go.Size(NaN, NaN);
      grp.updateTargetBindings('expanded');
    })

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
        const patternNodes: any[] = Array.isArray(pattern.nodes) ? pattern.nodes : [];

        // Pattern templates store absolute coordinates (~150-800px). Normalize them to
        // the pattern's own top-left so it drops under the cursor instead of hundreds of
        // pixels away, then relocate to open space if it would land on existing content.
        const xs = patternNodes.map((n) => (typeof n.x === 'number' ? n.x : 0));
        const ys = patternNodes.map((n) => (typeof n.y === 'number' ? n.y : 0));
        const minX = xs.length ? Math.min(...xs) : 0;
        const minY = ys.length ? Math.min(...ys) : 0;
        const spanX = (xs.length ? Math.max(...xs) : 0) - minX;
        const spanY = (ys.length ? Math.max(...ys) : 0) - minY;

        const NODE_W = 150;
        const NODE_H = 90;
        const GAP = 50;
        const patternW = spanX + NODE_W;
        const patternH = spanY + NODE_H;

        // Bounds of existing (non-group) content, for overlap detection.
        const existingRects: go.Rect[] = [];
        diagram.nodes.each((n) => {
          if (n.data?.isGroup) return;
          const b = n.actualBounds;
          if (b && b.isReal() && b.width > 0) existingRects.push(b.copy());
        });

        const wouldOverlap = (ax: number, ay: number) => {
          const r = new go.Rect(ax, ay, patternW, patternH);
          return existingRects.some((er) => r.intersectsRect(er.copy().inflate(GAP, GAP)));
        };

        const snap = (v: number) => Math.round(v / 10) * 10;

        // Honor a deliberate drop onto empty canvas so patterns can still be placed by
        // hand. Otherwise pack the pattern into the next free cell of a tidy left-to-right,
        // top-to-bottom grid (draw.io layout guidance: consistent row/column gaps, snapped
        // to the 10px grid) so repeated drops form a compact block, not a messy stack.
        let anchorX = snap(point.x);
        let anchorY = snap(point.y);

        if (wouldOverlap(anchorX, anchorY) && existingRects.length > 0) {
          let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
          existingRects.forEach((r) => {
            left = Math.min(left, r.x); top = Math.min(top, r.y);
            right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
          });

          const colStep = snap(patternW + GAP);
          const rowStep = snap(patternH + GAP);
          // Wrap a row once it grows past the existing content width (min 3 columns) so
          // patterns flow into a block rather than one long row or column.
          const maxRowRight = left + Math.max(right - left, colStep * 3);

          let placed = false;
          for (let row = 0; row < 500 && !placed; row++) {
            for (let col = 0; col < 500; col++) {
              const ax = snap(left + col * colStep);
              const ay = snap(top + row * rowStep);
              if (col > 0 && ax + patternW > maxRowRight) break; // wrap to next row
              if (!wouldOverlap(ax, ay)) { anchorX = ax; anchorY = ay; placed = true; break; }
            }
          }
          if (!placed) { anchorX = snap(left); anchorY = snap(bottom + GAP); }
        }

        diagram.startTransaction('drop pattern');

        const clusterKeyMap = new Map<string, string>();
        const nodeKeyMap = new Map<string, string>();

        // Create cluster group nodes first, then map pattern cluster ids to concrete GoJS keys.
        (pattern.clusters || []).forEach((cluster: any) => {
          const groupKey = `group_${Date.now()}_${cluster.id}`;
          clusterKeyMap.set(cluster.id, groupKey);

          const groupData: any = {
            key: groupKey,
            isGroup: true,
            category: cluster.category || 'ClusterGroup',
            label: cluster.label
          };

          (diagram.model as go.GraphLinksModel).addNodeData(groupData);
        });
        
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
            loc: go.Point.stringify(new go.Point(anchorX + ((node.x ?? 0) - minX), anchorY + ((node.y ?? 0) - minY))),
            type: node.type || node.name  // 🔧 FIX: Use pattern's type or default to name
          };

          if (node.group && clusterKeyMap.has(node.group)) {
            nodeData.group = clusterKeyMap.get(node.group);
          }

          if (Array.isArray(node.sharedGroups) && node.sharedGroups.length > 0) {
            const mappedSharedGroups = node.sharedGroups
              .map((groupId: string) => clusterKeyMap.get(groupId))
              .filter((groupKey: string | undefined): groupKey is string => Boolean(groupKey));

            if (mappedSharedGroups.length > 0) {
              nodeData.isShared = true;
              nodeData.sharedGroups = mappedSharedGroups;
              nodeData.group = undefined;
            }
          }

          if (typeof node.parameter1 === 'number') {
            nodeData.parameter1 = node.parameter1;
          } else if (node.shape === 'RoundedRectangle') {
            nodeData.parameter1 = getRoundedRectParameter(node.name);
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
          ...(shape.category === 'beamCard' && { size: `${DEFAULT_CARD_WIDTH} NaN`, subtext: 'Description' }),
          ...(shape.width && { width: shape.width }),
          ...(shape.height && { height: shape.height }),
        };

        if (shape.shape === 'RoundedRectangle') {
          nodeData.parameter1 = getRoundedRectParameter(shape.name);
          shape.height = shape.height || 60;

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

    // Double-click opens the Data properties dialog. Listened for on the DOM
    // rather than via ObjectDoubleClicked: a click on a selected node's text
    // starts in-place editing, the second click then lands in the text
    // editor and GoJS never reports the double-click. Such an edit is
    // cancelled and the dialog opens for the node being edited.
    const handleDoubleClick = (e: MouseEvent) => {
      const div = diagram.div;
      if (!div) return;
      const textTool = diagram.toolManager.textEditingTool;
      let part: go.Part | null = null;
      if (diagram.currentTool === textTool && textTool.textBlock) {
        part = textTool.textBlock.part;
        textTool.doCancel();
      } else {
        const rect = div.getBoundingClientRect();
        const doc = diagram.transformViewToDoc(new go.Point(e.clientX - rect.left, e.clientY - rect.top));
        part = diagram.findPartAt(doc, true);
      }
      if (!(part instanceof go.Node) || part instanceof go.Group) return;
      setPropsSchema(undefined);
      setPropsNode(part);
      loadPropertySchema().then(setPropsSchema);
    };

    const diagramDiv = diagram.div;
    if (diagramDiv) {
      diagramDiv.addEventListener('dragover', handleDragOver);
      diagramDiv.addEventListener('drop', handleDrop);
      diagramDiv.addEventListener('contextmenu', handleContextMenu);
      diagramDiv.addEventListener('dblclick', handleDoubleClick);
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
        diagramDiv.removeEventListener('dblclick', handleDoubleClick);
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

  const saveProps = (props: DataProperty[]) => {
    const node = propsNode;
    setPropsNode(null);
    if (!node?.diagram) return;
    node.diagram.model.commit((m) => {
      m.set(node.data, 'props', props.length ? props : undefined);
    }, 'edit data properties');
  };

  // Render the diagram container
  return (
    <>
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
    {propsNode && (
      <DataPropertiesDialog
        key={String(propsNode.data.key)}
        open
        title={propsNode.data.label || propsNode.data.name || 'Element'}
        schema={propsSchema ? schemaPropertiesFor(propsSchema, propsNode.data) : propsSchema}
        initial={propsNode.data.props ?? []}
        onSave={saveProps}
        onCancel={() => setPropsNode(null)}
      />
    )}
    </>
  );
};

// ADD: Export the component as default
export default GoDiagram;
