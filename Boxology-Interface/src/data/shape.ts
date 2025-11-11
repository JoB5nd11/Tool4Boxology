export const shapes: ShapeDefinition[] = [
  // Data & Information
  { name: 'symbol', label: 'id-symbol', shape: 'Rectangle', color: '#ccffccff', stroke: '#218721ff', group: 'Data & Information' },
  { name: 'data', label: 'id-data', shape: 'Rectangle', color: '#b7eaffff', stroke: '#1E5F8B', group: 'Data & Information' },
  { name: 'artifact', label: 'id-artifact', shape: 'Rectangle', color: '#99e5e1ff', stroke: '#0D5F5C', group: 'Data & Information' },

  // Actors & Entities
  { name: 'actor', label: 'id-actor', shape: 'Triangle', color: '#f8ce92ff', stroke: '#000000ff', group: 'Actors & Entities' },

  // AI & Models
  { name: 'model', label: 'id-model', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },
  { name: 'SemanticModel', label: 'id-SemanticModel', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },
  { name: 'StatisticalModel', label: 'id-StatisticalModel', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'AI & Models' },

  // Processes & Actions
  { name: 'transform', label: 'id-transform', shape: 'RoundedRectangle', borderRadius: '45px', color: '#fbf2a2ff', stroke: '#B8A600', group: 'Processes & Actions' },
  { name: 'deduce', label: 'id-deduce', shape: 'RoundedRectangle', borderRadius: '45px', color: '#ff81f7ff', stroke: '#4c003bff', group: 'Processes & Actions' },
  { name: 'training', label: 'id-training', shape: 'RoundedRectangle', borderRadius: '45px', color: '#FFA07A', stroke: '#CD5C5C', group: 'Processes & Actions' },
  { name: 'engineering', label: 'id-engineering', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'Processes & Actions' },
  //{ name: 'generate', label: 'id-generate', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'Processes & Actions' },
  //{ name: 'embedding', label: 'id-embedding', shape: 'RoundedRectangle', borderRadius: '45px', color: '#fbf2a2ff', stroke: '#B8A600', group: 'Processes & Actions' },

  // Documentation
  { name: 'comment', label: 'id-comment', shape: 'Rectangle', color: '#F5F5DC', stroke: '#A9A9A9', group: 'Documentation' },
];

// ADD: Type definitions for each shape
export const shapeTypes: Record<string, string[]> = {
  "symbol": ["symbol", "Trace", "Label", "Knowledge Graph"," Ontology","Rules"],
  "data": ["data", "Number","Dataset", "Tensor", "Text", "Image", "Audio", "Video", "Table", "Time Series"],
  //"artifact": ["artifact", "data", "symbol"],
  "model": ["model", "StatisticModel", "SemanticModel", "NeuralModel"],
  "SemanticModel": ["SemanticModel", "Embedding Model", "Knowledge Graph Embedding"],
  "StatisticalModel": ["StatisticalModel", "Regression", "Classification", "Clustering"],
  "NeuralModel": ["NeuralModel", "CNN", "RNN", "Transformer","LLM"],
  "actor": ["actor", "Human", "System", "Organization", "Agent"],
  //"generate": ["generate", "train", "engineer"],
  "training": ["training","Symbolic Learning", "Statistical Learning", "Deep Learning", "Reinforcement Learning"],
  "engineering": ["engineering"],
  "deduce": ["deduce", "classification", "prediction"],
  //"infer": ["infer", "deduce", "induction"],
  "induction": ["induction"],
  "transform": ["transform", "embed", "Normalize", "aggregate"],
  "embed": ["embed"],
  "comment": ["comment"]
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

