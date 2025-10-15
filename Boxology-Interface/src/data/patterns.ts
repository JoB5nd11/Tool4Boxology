import { shapes } from './shape';

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

// Helper function to find shape definition
const findShape = (name: string) => shapes.find(s => s.name === name);

// Elementary patterns based on your allPatterns from validation
export const elementaryPatterns: Pattern[] = [
  {
    id: 'train_model_symbol',
    name: 'Train Model (Symbol)',
    description: 'Train a model from symbol data',
    nodes: [
      {
        id: 'n1',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'generate:train',
        label: 'Generate:train',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 0
      },
      {
        id: 'n3',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },
  
  {
    id: 'train_model_data',
    name: 'Train Model (Data)',
    description: 'Train a model from data',
    nodes: [
      {
        id: 'n1',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'generate:train',
        label: 'Generate:train',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 0
      },
      {
        id: 'n3',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },

  {
    id: 'transform_symbol',
    name: 'Transform Symbol',
    description: 'Transform symbol to data',
    nodes: [
      {
        id: 'n1',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'transform',
        label: 'Transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: 'n3',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },

  {
    id: 'transform_data',
    name: 'Transform Data',
    description: 'Transform data to data',
    nodes: [
      {
        id: 'n1',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'transform',
        label: 'Transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: 'n3',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },

  {
    id: 'actor_generate_model',
    name: 'Actor Generate Model',
    description: 'Actor generates a model through engineering',
    nodes: [
      {
        id: 'n1',
        name: 'actor',
        label: 'Actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'generate:engineer',
        label: 'Generate:engineer',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: 'n3',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' }
    ]
  },

  {
    id: 'infer_symbol_simple',
    name: 'Infer Symbol (Simple)',
    description: 'Infer symbol from model and symbol input',
    nodes: [
      {
        id: 'n1',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: 'n3',
        name: 'infer:deduce',
        label: 'Infer:deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: 'n4',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }
    ]
  },
  {
    id: 'infer_symbol',
    name: 'Infer Symbol from Data',
    description: 'Infer symbol from model and data input',
    nodes: [
      {
        id: 'n1',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: 'n3',
        name: 'infer:deduce',
        label: 'Infer:deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: 'n4',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }
    ]
  },

  {
    id: 'infer_model',
    name: 'Infer Model from Symbol',
    description: 'Infer model from symbol and model input',
    nodes: [
      {
        id: 'n1',
        name: 'symbol',
        label: 'Symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: 'n3',
        name: 'infer:deduce',
        label: 'Infer:deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: 'n4',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }
    ]
  },
{
    id: 'infer_model',
    name: 'Infer Model from Data',
    description: 'Infer model from data and model input',
    nodes: [
      {
        id: 'n1',
        name: 'data',
        label: 'Data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: 'n2',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: 'n3',
        name: 'infer:deduce',
        label: 'Infer:deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: 'n4',
        name: 'model',
        label: 'Model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' }
    ]
  },

];

// Export patterns for use in components
export const patterns = elementaryPatterns;
