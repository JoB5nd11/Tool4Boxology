// Example: in a data file
export const patternLibShapes = [
  {
    label: 'actor',
    shape: 'Triangle',
    color: '#ffe6cc',
    stroke: '#d79b00',
    loc: '0 0',
    width: 100,
    height: 50,
  },
  {
    label: 'generate:engineer',
    shape: 'RoundedRectangle',
    color: '#e1d5e7',
    stroke: '#9673a6',
    loc: '150 0',
    width: 100,
    height: 50,
  },
  {
    label: 'model',
    shape: 'Hexagon',
    color: '#b0e3e6',
    stroke: '#0e8088',
    loc: '320 0',
    width: 120,
    height: 50,
  },
];

export const patternLibLinks = [
  { from: 'actor', to: 'generate:engineer' },
  { from: 'generate:engineer', to: 'model' },
<<<<<<< HEAD
];

// New pattern: Data → Generate:train → Model
export const dataTrainModelPattern = {
  name: 'Data-Train-Model Pipeline',
  description: 'A complete machine learning pipeline from data to trained model',
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
};

// Export all patterns for easy access
export const boxologyPatterns = [
  {
    name: 'Actor-Engineer-Model',
    description: 'Human actor engineering a model',
    shapes: patternLibShapes,
    links: patternLibLinks,
    dimensions: { width: 440, height: 50 }
  },
  dataTrainModelPattern
=======
>>>>>>> 3e663fba2bac71f2cce0bf0e263fc66b0855dfec
];