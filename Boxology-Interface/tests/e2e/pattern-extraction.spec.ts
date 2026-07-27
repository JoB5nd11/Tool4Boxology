import { test, expect } from '@playwright/test';
import { openExamplesSection } from './helpers';
import { buildDesignPatternsFromModelData } from '../../src/utils/exportHelpers';

test.describe('buildDesignPatternsFromModelData — topology-based extraction', () => {
  test('unclustered process node still produces a DesignPattern (regression for the GraphRAG bug)', () => {
    const nodeDataArray = [
      { key: 'nlq', name: 'Data', type: 'Data', label: 'Natural Language Question' },
      { key: 'extraction', name: 'Infer', type: 'Infer', label: 'Event ID Extraction' },
      { key: 'event_id', name: 'Data', type: 'Data', label: 'Event ID' },
    ];
    const linkDataArray = [
      { from: 'nlq', to: 'extraction' },
      { from: 'extraction', to: 'event_id' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('extraction');
    expect(patterns[0].process.id).toBe('extraction');
    expect(patterns[0].input).toEqual([{ id: 'nlq', name: 'Data', label: 'Natural Language Question' }]);
    expect(patterns[0].output).toEqual([{ id: 'event_id', name: 'Data', label: 'Event ID' }]);
  });

  test('clustered process node keeps the cluster id/label (no regression for existing examples)', () => {
    const nodeDataArray = [
      { key: 'grp1', isGroup: true, category: 'ClusterGroup', label: 'My Cluster' },
      { key: 'a', name: 'Data', type: 'Data', label: 'A', group: 'grp1' },
      { key: 'p', name: 'Train', type: 'Train', label: 'P', group: 'grp1' },
      { key: 'b', name: 'Data', type: 'Data', label: 'B', group: 'grp1' },
    ];
    const linkDataArray = [
      { from: 'a', to: 'p' },
      { from: 'p', to: 'b' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('grp1');
    expect(patterns[0].label).toBe('My Cluster');
  });

  test('two process nodes sharing one cluster get distinct pattern ids (no collision)', () => {
    const nodeDataArray = [
      { key: 'grp1', isGroup: true, category: 'ClusterGroup', label: 'Shared Cluster' },
      { key: 'a', name: 'Data', type: 'Data', label: 'A', group: 'grp1' },
      { key: 'p1', name: 'Train', type: 'Train', label: 'P1', group: 'grp1' },
      { key: 'p2', name: 'Engineer', type: 'Engineer', label: 'P2', group: 'grp1' },
      { key: 'b', name: 'Data', type: 'Data', label: 'B', group: 'grp1' },
    ];
    const linkDataArray = [
      { from: 'a', to: 'p1' },
      { from: 'p1', to: 'b' },
      { from: 'a', to: 'p2' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(2);
    const ids = patterns.map((p: any) => p.id).sort();
    expect(ids).toEqual(['p1', 'p2']);
  });

  test('no ClusterGroup nodes at all still produces one pattern per process node', () => {
    const nodeDataArray = [
      { key: 'x', name: 'Data', type: 'Data', label: 'X' },
      { key: 'y', name: 'Transform', type: 'Transform', label: 'Y' },
      { key: 'z', name: 'Data', type: 'Data', label: 'Z' },
    ];
    const linkDataArray = [
      { from: 'x', to: 'y' },
      { from: 'y', to: 'z' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);
    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('y');
  });

  test('annotation-linked beamCard does not leak into process input/output (regression for annotation-bleed bug)', () => {
    const nodeDataArray = [
      { key: 'p', name: 'Train', type: 'Train', label: 'P' },
      { key: 'a', name: 'Data', type: 'Data', label: 'A' },
      { key: 'r', name: 'Risk', category: 'beamCard', label: 'R' },
    ];
    const linkDataArray = [
      { from: 'a', to: 'p' },
      { from: 'r', to: 'p', category: 'annotation' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(1);
    expect(patterns[0].input).toEqual([{ id: 'a', name: 'Data', label: 'A' }]);
  });
});
