export const shapes: ShapeDefinition[] = [
  // Data & Information
  { name: 'symbol', label: 'Symbol', shape: 'Rectangle', color: '#ccffccff', stroke: '#218721ff', group: 'Data & Information' },
  { name: 'data', label: 'Data', shape: 'Rectangle', color: '#b7eaffff', stroke: '#1E5F8B', group: 'Data & Information' },
  { name: 'artifact', label: 'Artifact', shape: 'Rectangle', color: '#99e5e1ff', stroke: '#0D5F5C', group: 'Data & Information' },
  
  // Actors & Entities
  { name: 'actor', label: 'Actor', shape: 'Triangle', color: '#f8ce92ff', stroke: '#000000ff', group: 'Actors & Entities' },
  
  // AI & Models
  { name: 'model', label: 'Model', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },
  { name: 'model:semantic', label: 'Model:semantic', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },
  { name: 'model:statistics', label: 'Model:statistics', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },
  
  // Processes & Actions
  { name: 'transform', label: 'Transform', shape: 'RoundedRectangle', borderRadius: '45px', color: '#fbf2a2ff', stroke: '#B8A600', group: 'Processes & Actions' },
  { name: 'infer:deduce', label: 'Infer:deduce', shape: 'RoundedRectangle', borderRadius: '45px', color: '#ff81f7ff', stroke: '#4c003bff', group: 'Processes & Actions' },
  { name: 'generate:train', label: 'Generate:train', shape: 'RoundedRectangle', borderRadius: '45px', color: '#FFA07A', stroke: '#CD5C5C', group: 'Processes & Actions' },
  { name: 'generate:engineer', label: 'Generate:engineer', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'Processes & Actions' },
  { name: 'generate', label: 'Generate', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'Processes & Actions' },
  { name: 'transform:embed', label: 'Transform:embed', shape: 'RoundedRectangle', borderRadius: '45px', color: '#fbf2a2ff', stroke: '#B8A600', group: 'Processes & Actions' },
  
  // Documentation
  { name: 'comment', label: 'Comment', shape: 'Rectangle', color: '#F5F5DC', stroke: '#A9A9A9', group: 'Documentation' },
];

// ADD: Type definitions for each shape
export const shapeTypes: Record<string, string[]> = {
  "symbol": ["No Type", "Trace", "Label"],
  "data": ["No Type", "Number", "Tensor", "Text", "Image", "Audio", "Video", "Table", "Graph", "Time Series"],
  "artifact": ["No Type", "data", "symbol"],
  "model": ["No Type"," Statistical", "Semantic", "Hybrid"],
  "model:semantic": ["No Type"],
  "model:statistics": ["No Type"],
  "actor": ["No Type", "Human", "System", "Organization", "Agent"],
  "generate": ["No Type","train","engineer"],
  "generate:train": ["No Type"],
  "generate:engineer": ["No Type"],
  "infer:deduce": ["No Type","classification","prediction"],
  "infer": ["No Type","deduce","induction"],
  "transform": ["No Type","embed","Normalize","aggregate"],
  "transform:embed": ["No Type"],
  "comment": ["No Type"]
};

export type GoShape =
  | 'Rectangle'
  | 'RoundedRectangle'
  | 'Diamond'
  | 'Ellipse'
  | 'Triangle'
  | 'TriangleDown'
  | 'Hexagon';

export interface ShapeDefinition {
  name: string;
  label: string;
  shape: GoShape;
  color: string;
  stroke: string;
  group: string;
  borderRadius?: '45px';
}

