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

// Elementary patterns based on allPatterns from GoJSBoxologyValidation
export const elementaryPatterns: Pattern[] = [
  // Train model patterns
  {
    id: 'train_model_symbol',
    name: 'Train Model (Symbol)',
    description: 'Train a model from symbol data',
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },
  
  {
    id: 'train_model_data',
    name: 'Train Model (Data)',
    description: 'Train a model from data',
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'train_model_artifacts',
    name: 'Train Model (Artifacts)',
    description: 'Train a model from artifacts',
    nodes: [
      {
        id: '1',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  // Generate model patterns
  {
    id: 'generate_model_data',
    name: 'Generate Model (Model + Data)',
    description: 'Generate model from existing model and data',
    nodes: [
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'generate_model_symbol',
    name: 'Generate Model (Model + Symbol)',
    description: 'Generate model from existing model and symbol',
    nodes: [
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'generate_model_artifacts',
    name: 'Generate Model (Model + Artifacts)',
    description: 'Generate model from existing model and artifacts',
    nodes: [
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'training',
        label: 'id-training',
        shape: 'RoundedRectangle',
        color: '#FFA07A',
        stroke: '#CD5C5C',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  // Transform patterns
  {
    id: 'transform_symbol_to_data',
    name: 'Transform Symbol → Data',
    description: 'Transform symbol to data',
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_artifacts_to_data',
    name: 'Transform Artifacts → Data',
    description: 'Transform artifacts to data',
    nodes: [
      {
        id: '1',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_data_to_data',
    name: 'Transform Data → Data',
    description: 'Transform data to data',
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_data_to_symbol',
    name: 'Transform Data → Symbol',
    description: 'Transform data to symbol',
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_symbol_to_symbol',
    name: 'Transform Symbol → Symbol',
    description: 'Transform symbol to symbol',
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_artifacts_to_symbol',
    name: 'Transform Artifacts → Symbol',
    description: 'Transform artifacts to symbol',
    nodes: [
      {
        id: '1',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'transform_model',
    name: 'Transform Model',
    description: 'Transform model to model',
    nodes: [
      {
        id: '1',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  // Engineering patterns
  {
    id: 'actor_engineer_model',
    name: 'Actor Engineer Model',
    description: 'Actor engineers a model',
    nodes: [
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'engineering',
        label: 'id-engineering',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_semantic_model',
    name: 'Actor Engineer Semantic Model',
    description: 'Actor engineers a semantic model',
    nodes: [
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'engineering',
        label: 'id-engineering',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'SemanticModel',
        label: 'id-SemanticModel',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_statistical_model',
    name: 'Actor Engineer Statistical Model',
    description: 'Actor engineers a statistical model',
    nodes: [
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'engineering',
        label: 'id-engineering',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'StatisticalModel',
        label: 'id-StatisticalModel',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_symbol',
    name: 'Actor Engineer Symbol',
    description: 'Actor engineers a symbol',
    nodes: [
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'engineering',
        label: 'id-engineering',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 0
      }
    ],
    links: [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ]
  },

  {
    id: 'actor_engineer_data',
    name: 'Actor Engineer Data',
    description: 'Actor engineers data',
    nodes: [
      {
        id: '1',
        name: 'actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#000000ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'engineering',
        label: 'id-engineering',
        shape: 'RoundedRectangle',
        color: '#f067acff',
        stroke: '#C1307A',
        x: 150,
        y: 0
      },
      {
        id: '3',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 0
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_symbol_from_artifacts',
    name: 'Infer Symbol (Artifacts + Model)',
    description: 'Infer symbol from model and artifacts input',
    nodes: [
      {
        id: '1',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  {
    id: 'infer_model_from_artifacts',
    name: 'Infer Model (Artifacts + Model)',
    description: 'Infer model from artifacts and model input',
    nodes: [
      {
        id: '1',
        name: 'artifact',
        label: 'id-artifact',
        shape: 'Rectangle',
        color: '#99e5e1ff',
        stroke: '#0D5F5C',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'model',
        label: 'id-model',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'deduce',
        label: 'id-deduce',
        shape: 'RoundedRectangle',
        color: '#ff81f7ff',
        stroke: '#4c003bff',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  },

  // Embedding patterns
  {
    id: 'embed_transform',
    name: 'Embed Transform',
    description: 'Embed symbol and data to semantic model',
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'SemanticModel',
        label: 'id-SemanticModel',
        shape: 'Hexagon',
        color: '#f4ccf4ff',
        stroke: '#8B4F8B',
        x: 300,
        y: 40
      }
    ],
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
    nodes: [
      {
        id: '1',
        name: 'symbol',
        label: 'id-symbol',
        shape: 'Rectangle',
        color: '#ccffccff',
        stroke: '#218721ff',
        x: 0,
        y: 0
      },
      {
        id: '2',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 0,
        y: 80
      },
      {
        id: '3',
        name: 'transform',
        label: 'id-transform',
        shape: 'RoundedRectangle',
        color: '#fbf2a2ff',
        stroke: '#B8A600',
        x: 150,
        y: 40
      },
      {
        id: '4',
        name: 'data',
        label: 'id-data',
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
        x: 300,
        y: 40
      }
    ],
    links: [
      { from: '1', to: '3' },
      { from: '2', to: '3' },
      { from: '3', to: '4' }
    ]
  }
];

// Export patterns for use in components
export const patterns = elementaryPatterns;
