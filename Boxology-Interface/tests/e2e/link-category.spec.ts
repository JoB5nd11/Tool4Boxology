import { test, expect } from '@playwright/test';
import { inferLinkCategory } from '../../src/utils/linkCategory';

test.describe('inferLinkCategory', () => {
  test('returns annotation when the "to" node is a beamCard', () => {
    expect(inferLinkCategory({ category: undefined }, { category: 'beamCard' })).toBe('annotation');
  });

  test('returns annotation when the "from" node is a beamCard', () => {
    expect(inferLinkCategory({ category: 'beamCard' }, { category: undefined })).toBe('annotation');
  });

  test('returns undefined when neither endpoint is a beamCard', () => {
    expect(inferLinkCategory({ category: undefined }, { category: undefined })).toBeUndefined();
  });

  test('returns annotation when both endpoints are beamCard', () => {
    expect(inferLinkCategory({ category: 'beamCard' }, { category: 'beamCard' })).toBe('annotation');
  });

  test('handles missing/undefined data gracefully', () => {
    expect(inferLinkCategory(undefined, undefined)).toBeUndefined();
  });
});
