export const shapes: ShapeDefinition[] = [
  //Symbol and data - Information related shapes
  { name: 'symbol', label: 'Symbol', shape: 'Rectangle', color: '#ccffccff', stroke: '#218721ff', group: 'General' }, // Light green - represents symbols/variables
  { name: 'data', label: 'Data', shape: 'Rectangle', color: '#b7eaffff', stroke: '#1E5F8B', group: 'General' }, // Sky blue - represents data flow
  { name: 'datasymbol', label: 'Data/Symbol', shape: 'Rectangle', color: '#99e5e1ff', stroke: '#0D5F5C', group: 'General' }, // Light sea green - hybrid of data & symbol
  
  //Actor - Human/Agent related
  { name: 'actor', label: 'Actor', shape: 'Triangle', color: '#f8ce92ff', stroke: '#000000ff', group: 'General' }, // Peach/orange - represents human actors
  
  //Model - AI/Intelligence related
  { name: 'model', label: 'Model', shape: 'Hexagon', color: '#f4ccf4ff', stroke: '#8B4F8B', group: 'General' }, // Plum - represents AI models/intelligence
  
  //Process - Transformation/Action related
  { name: 'transform', label: 'Transform', shape: 'RoundedRectangle', borderRadius: '45px', color: '#fbf2a2ff', stroke: '#B8A600', group: 'General' }, // Khaki - represents transformation
  { name: 'infer:deduce', label: 'Infer:deduce', shape: 'RoundedRectangle', borderRadius: '45px', color: '#ff81f7ff', stroke: '#4c003bff', group: 'General' }, // Tan - represents reasoning/inference
  { name: 'generate:train', label: 'Generate:train', shape: 'RoundedRectangle', borderRadius: '45px', color: '#FFA07A', stroke: '#CD5C5C', group: 'General' }, // Light salmon - represents learning/training
  { name: 'generate:engineer', label: 'Generate:engineer', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'General' }, // Hot pink - represents engineering/creation
  
  //Text - Documentation related
  { name: 'comment', label: 'Comment', shape: 'Rectangle', color: '#F5F5DC', stroke: '#A9A9A9', group: 'Annotation' }, // Beige - neutral for comments
];

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

