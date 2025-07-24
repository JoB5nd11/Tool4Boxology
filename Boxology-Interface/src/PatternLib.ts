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
];