import { shapes } from './shape';

// Helper function to find shape definition and get its colors
const getShapeColors = (name: string) => {
  // Capitalize first letter to match shape.ts definitions
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  const shape = shapes.find(s => s.name === normalizedName);
  if (!shape) {
    console.warn(`Shape ${normalizedName} not found, using defaults`);
    return { color: '#FFFFFF', stroke: '#000000' };
  }
  return { color: shape.color, stroke: shape.stroke };
};

// Update all pattern node definitions to use capitalized shape names
function normalizePatternNodes(nodes: PatternNode[]): PatternNode[] {
  return nodes.map(node => ({
    ...node,
    name: node.name.charAt(0).toUpperCase() + node.name.slice(1),
    label: node.label,
    shape: node.shape, // shape type (e.g. 'Rectangle', 'Hexagon') should match shape.ts
    ...getShapeColors(node.name.charAt(0).toUpperCase() + node.name.slice(1)),
    x: node.x,
    y: node.y
  }));
}

// Pattern definitions based on your Boxology validation patterns
export interface PatternNode {
  id: string;
  name: string;
  label: string;
  shape: string;
  color: string;
  stroke: string;
  x: number;
  y: number;
}

export interface PatternLink {
  from: string;
  to: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  nodes: PatternNode[];
  links: PatternLink[];
  thumbnail?: string;
}

// Elementary patterns based on allPatterns from GoJSBoxologyValidation
export const elementaryPatterns: Pattern[] = [
  // Train model patterns
  {
    id: 'train_model_symbol',
    name: 'Use Symbol to Train a Model',
    description: 'Train a model from symbol data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'Symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'Train',
        label: 'id-Train',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'Model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },
  
  {
    id: 'train_model_data',
    name: 'Use Data to Train a Model',
    description: 'Train a model from data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'Data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'Train',
        label: 'id-Train',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'Model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

    // Generate model patterns
  {
    id: 'generate_model_data',
    name: 'Generate Model from Model and Data',
    description: 'Generate model from existing model and data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'Model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'Train',
        label: 'id-Train',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'generate_model_symbol',
    name: 'Generate Model from Model and Symbol',
    description: 'Generate model from existing model and symbol',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'Train',
        label: 'id-Train',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },


  // Transform patterns
  {
    id: 'transform_symbol_to_data',
    name: 'Transform Symbol to Data',
    description: 'Transform symbol to data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },
  {
    id: 'transform_data_to_data',
    name: 'Transform Data to Data',
    description: 'Transform data to data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_data_to_symbol',
    name: 'Transform Data to Symbol',
    description: 'Transform data to symbol',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_symbol_to_symbol',
    name: 'Transform Symbol to Symbol',
    description: 'Transform symbol to symbol',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },
  {
    id: 'transform_model',
    name: 'Transform Model',
    description: 'Transform model to model',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  // Engineer patterns
  {
    id: 'actor_engineer_model',
    name: 'Actor Engineer a Model',
    description: 'Actor engineers a model',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'Engineer',
        label: 'id-Engineer',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_symbol',
    name: 'Actor Engineer a Symbol',
    description: 'Actor engineers a symbol',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'Engineer',
        label: 'id-Engineer',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_data',
    name: 'Actor Engineer a Data',
    description: 'Actor engineers data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'Engineer',
        label: 'id-Engineer',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 0
      }
    ]),
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  // Inference patterns
  {
    id: 'infer_symbol_from_symbol',
    name: 'Infer Symbol (Symbol + Model)',
    description: 'Infer symbol from model and symbol input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_symbol_from_data',
    name: 'Infer Symbol (Data + Model)',
    description: 'Infer symbol from model and data input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_model_from_symbol',
    name: 'Infer Model (Symbol + Model)',
    description: 'Infer model from symbol and model input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_model_from_data',
    name: 'Infer Model (Data + Model)',
    description: 'Infer model from data and model input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_data_from_data',
    name: 'Infer Data (Data + Model)',
    description: 'Infer data from data and model input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_data_from_symbol',
    name: 'Infer Data (Symbol + Model)',
    description: 'Infer data from symbol and model input',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },
  {
    id: 'data_symbol_transform',
    name: 'Data-Symbol Transform',
    description: 'Transform symbol and data to data',
    nodes: normalizePatternNodes([
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 0
      },
      {
        id: '2',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 0, y: 80
      },
      {
        id: '3',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '', stroke: '', x: 150, y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '', stroke: '', x: 300, y: 40
      }
    ]),
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  }
];

// Export patterns for use in components
export const patterns = elementaryPatterns;
