export interface ShapeDefinition {
  name?: string; // Optional for shapes that don't have a specific name
  label: string;
  shape: string;
  color: string;
  group: string;
  stroke: string; // Optional stroke color
}

/** GoJS node/link data: an untyped bag of properties (`go.ObjectData`). */
export type DiagramData = Record<string, unknown>;

/** The three BEAM risk classes that attach directly to a workflow component. */
export type RiskClass = 'Risk' | 'RiskSource' | 'RiskControl';

/**
 * An inline risk marker on a component. Rendered as a small badge on top of the
 * node and, at KG export, desugared into a BEAM annotation + annotation link so
 * the existing backend emits `beamr:hasRisk` / `originatedFrom` / `associatedTo`.
 */
export interface RiskTag {
  /** Stable key, e.g. `risktag_<ts>_<rand>`; becomes the annotation node key. */
  id: string;
  riskClass: RiskClass;
  /** Short, editable label for the risk; may be empty. */
  name: string;
}

export type PageData = {
  id: string;
  name: string;
  nodeDataArray: DiagramData[];
  linkDataArray: DiagramData[];
  // optional stable identifiers/labels used by Boxology exports/imports
  boxologyId?: string;
  boxologyLabel?: string;
};
