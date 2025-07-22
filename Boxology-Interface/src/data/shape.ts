import type { ShapeDefinition, PatternDefinition, LibraryItem } from '../types/types';

export const shapes: ShapeDefinition[] = [
  //Symbol and data - Information related shapes
  { name: 'symbol', label: 'Symbol', shape: 'Rectangle', color: '#90EE90', stroke: '#2E7D2E', group: 'General' }, // Light green - represents symbols/variables
  { name: 'data', label: 'Data', shape: 'Rectangle', color: '#87CEEB', stroke: '#1E5F8B', group: 'General' }, // Sky blue - represents data flow
  { name: 'datasymbol', label: 'Data/Symbol', shape: 'Rectangle', color: '#20B2AA', stroke: '#0D5F5C', group: 'General' }, // Light sea green - hybrid of data & symbol
  
  //Actor - Human/Agent related
  { name: 'actor', label: 'Actor', shape: 'Triangle', color: '#FFB347', stroke: '#000000ff', group: 'General' }, // Peach/orange - represents human actors
  
  //Model - AI/Intelligence related
  { name: 'model', label: 'Model', shape: 'Hexagon', color: '#DDA0DD', stroke: '#8B4F8B', group: 'General' }, // Plum - represents AI models/intelligence
  
  //Process - Transformation/Action related
  { name: 'transform', label: 'Transform', shape: 'RoundedRectangle', borderRadius: '45px', color: '#F0E68C', stroke: '#B8A600', group: 'General' }, // Khaki - represents transformation
  { name: 'infer:deduce', label: 'Infer:deduce', shape: 'RoundedRectangle', borderRadius: '45px', color: '#ff81f7ff', stroke: '#4c003bff', group: 'General' }, // Tan - represents reasoning/inference
  { name: 'generate:train', label: 'Generate:train', shape: 'RoundedRectangle', borderRadius: '45px', color: '#FFA07A', stroke: '#CD5C5C', group: 'General' }, // Light salmon - represents learning/training
  { name: 'generate:engineer', label: 'Generate:engineer', shape: 'RoundedRectangle', color: '#f067acff', stroke: '#C1307A', group: 'General' }, // Hot pink - represents engineering/creation
  
  //Text - Documentation related
  { name: 'comment', label: 'Comment', shape: 'Rectangle', color: '#F5F5DC', stroke: '#A9A9A9', group: 'Annotation' }, // Beige - neutral for comments
];

// Define patterns
export const patterns: PatternDefinition[] = [
  {
    name: 'Data-Train-Model Pipeline',
    description: 'A complete machine learning pipeline from data to trained model',
    isPattern: true,
    group: 'General',
    shapes: [
      {
        key: 'data_node',
        label: 'data',
        shape: 'Rectangle',
        color: '#fff2cc',
        stroke: '#d6b656',
        loc: '0 0',
        width: 100,
        height: 50,
      },
      {
        key: 'train_node',
        label: 'generate:train',
        shape: 'RoundedRectangle',
        color: '#e1d5e7',
        stroke: '#9673a6',
        loc: '160 0',
        width: 100,
        height: 50,
      },
      {
        key: 'model_node',
        label: 'model',
        shape: 'Hexagon',
        color: '#b0e3e6',
        stroke: '#0e8088',
        loc: '325 0',
        width: 120,
        height: 50,
      },
    ],
    links: [
      { from: 'data_node', to: 'train_node' },
      { from: 'train_node', to: 'model_node' },
    ],
    dimensions: {
      width: 445,
      height: 50
    }
  }
];

// Combine shapes and patterns for the library
export const libraryItems: LibraryItem[] = [...shapes, ...patterns];

