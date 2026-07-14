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

export type PageData = {
  id: string;
  name: string;
  nodeDataArray: DiagramData[];
  linkDataArray: DiagramData[];
  // optional stable identifiers/labels used by Boxology exports/imports
  boxologyId?: string;
  boxologyLabel?: string;
};
