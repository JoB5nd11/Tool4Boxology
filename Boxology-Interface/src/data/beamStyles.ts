export interface BeamStyle {
  color: string;
  stroke: string;
  shape: string;
  beamClass: string;
}

export const beamStyleMap: Record<string, BeamStyle> = {
  // --- Base types ---
  Data:             { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle',        beamClass: 'beam:Data' },
  Symbol:           { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle',        beamClass: 'beam:Symbol' },
  Model:            { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon',          beamClass: 'beam:Model' },
  StatisticalModel: { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon',          beamClass: 'beam:StatisticalModel' },
  SemanticModel:    { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon',          beamClass: 'beam:SemanticModel' },
  Train:            { color: '#dda0dd', stroke: '#8b008b', shape: 'RoundedRectangle', beamClass: 'beam:Train' },
  Engineer:         { color: '#ffb6c1', stroke: '#c1307a', shape: 'RoundedRectangle', beamClass: 'beam:Engineer' },
  Infer:            { color: '#fffacd', stroke: '#b8860b', shape: 'RoundedRectangle', beamClass: 'beam:Infer' },
  Transform:        { color: '#ffb6c1', stroke: '#cd5c5c', shape: 'RoundedRectangle', beamClass: 'beam:Transform' },
  Actor:            { color: '#ffd700', stroke: '#b8860b', shape: 'Triangle',          beamClass: 'beam:Agent' },

  // --- Data leaf subtypes ---
  Dataset:    { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Tensor:     { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Text:       { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Image:      { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Audio:      { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Video:      { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  Number:     { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },
  TimeSeries: { color: '#90ee90', stroke: '#2d7a2d', shape: 'Rectangle', beamClass: 'beam:Data' },

  // --- Symbol leaf subtypes ---
  DB:    { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle', beamClass: 'beam:Symbol' },
  KG:    { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle', beamClass: 'beam:Symbol' },
  Label: { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle', beamClass: 'beam:Symbol' },
  Trace: { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle', beamClass: 'beam:Symbol' },
  Rules: { color: '#d0d0d0', stroke: '#808080', shape: 'Rectangle', beamClass: 'beam:Symbol' },

  // --- Statistical model leaf subtypes ---
  NeuralModel:         { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  InductiveModel:      { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  NeuralNetwork:       { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  CNN:                 { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  RNN:                 { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  LSTM:                { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  GRU:                 { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  Transformer:         { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  LLM:                 { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  GNN:                 { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  RegressionModel:     { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  ClassificationModel: { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  ClusteringModel:     { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },
  FuzzyModel:          { color: '#add8e6', stroke: '#1c6ea4', shape: 'Hexagon', beamClass: 'beam:StatisticalModel' },

  // --- Semantic model leaf subtypes ---
  OWLOntology:      { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon', beamClass: 'beam:SemanticModel' },
  RDFModel:         { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon', beamClass: 'beam:SemanticModel' },
  RDFSModel:        { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon', beamClass: 'beam:SemanticModel' },
  RuleBasedModel:   { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon', beamClass: 'beam:SemanticModel' },
  SHACLShapesModel: { color: '#00ced1', stroke: '#008b8b', shape: 'Hexagon', beamClass: 'beam:SemanticModel' },

  // --- Actor leaf subtypes ---
  Human: { color: '#ffd700', stroke: '#b8860b', shape: 'Triangle', beamClass: 'beam:Agent' },
  Robot: { color: '#ffd700', stroke: '#b8860b', shape: 'Triangle', beamClass: 'beam:Agent' },

  // --- Train subtypes ---
  'Symbolic Learning':     { color: '#dda0dd', stroke: '#8b008b', shape: 'RoundedRectangle', beamClass: 'beam:Train' },
  'Statistical Learning':  { color: '#dda0dd', stroke: '#8b008b', shape: 'RoundedRectangle', beamClass: 'beam:Train' },
  'Deep Learning':         { color: '#dda0dd', stroke: '#8b008b', shape: 'RoundedRectangle', beamClass: 'beam:Train' },
  'Reinforcement Learning':{ color: '#dda0dd', stroke: '#8b008b', shape: 'RoundedRectangle', beamClass: 'beam:Train' },

  // --- Transform subtypes ---
  embed:     { color: '#ffb6c1', stroke: '#cd5c5c', shape: 'RoundedRectangle', beamClass: 'beam:Transform' },
  Normalize: { color: '#ffb6c1', stroke: '#cd5c5c', shape: 'RoundedRectangle', beamClass: 'beam:Transform' },
  aggregate: { color: '#ffb6c1', stroke: '#cd5c5c', shape: 'RoundedRectangle', beamClass: 'beam:Transform' },

  // --- BEAM Annotation elements (Table 2) ---
  System:      { color: '#e8f5e9', stroke: '#388e3c', shape: 'Rectangle', beamClass: 'beam:System' },
  Context:     { color: '#f5f5f5', stroke: '#757575', shape: 'Rectangle', beamClass: 'beam:Context' },
  Note:        { color: '#fffde7', stroke: '#9e9e9e', shape: 'Note',      beamClass: 'beam:Note' },

  // --- BEAM Risk elements (Table 3) ---
  Risk:        { color: '#fff3e0', stroke: '#fb8c00', shape: 'Rectangle', beamClass: 'beam:Risk' },
  RiskSource:  { color: '#fffde7', stroke: '#f9a825', shape: 'Rectangle', beamClass: 'beam:RiskSource' },
  Consequence: { color: '#fce4ec', stroke: '#e91e63', shape: 'Rectangle', beamClass: 'beam:Consequence' },
  Impact:      { color: '#ef9a9a', stroke: '#c62828', shape: 'Rectangle', beamClass: 'beam:Impact' },
  RiskControl: { color: '#e8f5e9', stroke: '#388e3c', shape: 'Rectangle', beamClass: 'beam:RiskControl' },
};
