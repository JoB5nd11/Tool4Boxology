# Super Node Removal Guide

This document provides a comprehensive guide for removing all super node functionality from the Tool4Boxology project.

## Files to Modify

### 1. **src/App.tsx** (MAJOR CHANGES)

#### Remove imports:
- Line 14: `import SubdiagramPreview from './components/SubdiagramPreview';`

#### Remove type definitions:
- Lines 36-41: Remove `parentNodeId`, `isSubDiagram`, and `SuperNodeMapping` type

#### Remove state variables:
- Line 56: `const [superNodeMap, setSuperNodeMap] = useState<SuperNodeMapping>({});`
- Line 137: `const isSubDiagram = currentPage?.isSubDiagram || false;`
- Line 910: `const [isSuperNodeSelected, setIsSuperNodeSelected] = useState(false);`
- Line 1087: `const [subDiagrams, setSubDiagrams] = useState<Map<string, go.Diagram>>(new Map());`
- Lines 1148-1149: `showSubdiagramPreview` and `previewSubdiagramData` states

#### Remove functions:
- Lines 783-831: `handleMarkAsSuperNode()`
- Lines 836-854: `handleEditLinkedDiagram()`
- Lines 857-879: `handleBackToParent()`
- Lines 965-1083: `handleValidateSuperNode()`
- Lines 1090-1101: `registerSubDiagram()` and `getSubDiagram()`

#### Remove from `updateCurrentPage`:
- Lines 64-84: Remove super node subdiagram data update logic

#### Remove from `handleFileOperation`:
- Line 312: Change `const { pages: newPages, superNodeMap: map } = buildPagesFromModel(...)` 
  to `const { pages: newPages } = buildPagesFromModel(...)`
- Line 314: Remove `setSuperNodeMap(map);`

#### Remove from `handleExport` (JSON case):
- Line 568: Change `generateMultiPageRMLExport(pages, superNodeMap)` 
  to `generateMultiPageRMLExport(pages)`

#### Remove from `handleContextMenuAction`:
- Lines 734-736: Remove `mark_as_super_node` and `edit_linked_diagram` cases

#### Remove from Toolbar props:
- Line 1203: Remove `onValidateSuperNode={handleValidateSuperNode}`
- Line 1220: Remove `isSuperNodeSelected={isSuperNodeSelected}`

#### Remove JSX elements:
- Lines 1223-1252: Remove "Back Button for Subdiagrams" section
- Lines 1265, 1294: Remove `.filter(page => !page.isSubDiagram)` from page mapping
- Lines 1468-1472: Remove `<SubdiagramPreview>` component

#### Remove from GoDiagram props:
- Lines 1412-1413: Remove `setShowSubdiagramPreview` and `setPreviewSubdiagramData`

#### Remove selection change listener:
- Lines 926-963: Remove super node selection tracking useEffect

---

### 2. **src/utils/exportHelpers.ts** (ALREADY CLEANED)

The file is already cleaned. Just verify it matches the provided clean version.

---

### 3. **src/GoDiagram.tsx**

#### Remove props:
- Lines 17-18: Remove `setShowSubdiagramPreview` and `setPreviewSubdiagramData` prop types
- Lines 27-28: Remove from destructured props

#### Remove click handlers:
- Lines 115-124: Remove super node click and double-click handlers

#### Update dependencies:
- Line 392: Remove `setShowSubdiagramPreview` and `setPreviewSubdiagramData` from useEffect dependencies

---

### 4. **src/ContextMenu.tsx**

#### Remove from interface:
- Line 12: Remove `isSuperNode?: boolean;`

#### Remove conditional rendering:
- Line 101: Remove `{!selectedData.isSuperNode ? (...)}`  
  Replace with direct rendering of the content

---

### 5. **src/components/Toolbar.tsx**

#### Remove props:
- Line 23: Remove `onValidateSuperNode: () => void;`
- Line 32: Remove `isSuperNodeSelected: boolean;`
- Lines 43, 52: Remove from destructured props

#### Remove button:
- Lines 478-491: Remove "Validate Sub" button completely

---

### 6. **src/utils/pageBuilder.ts**

#### Simplify interface:
- Lines 13-14: Remove `parentNodeId` and `isSubDiagram` from PageData
- Line 19: Remove `superNodeMap` from BuildPagesResult

#### Simplify buildPagesFromModel:
- Line 42: Remove `const superNodeMap: { [nodeKey: string]: string } = {};`
- Lines 22-30: Remove `normalizeSubdiagrams` function
- Lines 52-53: Remove `isSubDiagram` and `parentNodeId` from createPage
- Lines 58-65: Remove super node child page creation logic
- Line 71: Change return to `return { pages };`

---

### 7. **src/utils/validation.ts**

#### Update findUnclusteredNodes:
- Lines 167-183: Remove super node subdiagram exception
- Simplify to just check if node has a group:
```typescript
export function findUnclusteredNodes(model: any): any[] {
  const arr = model?.nodeDataArray ?? [];
  const groups = arr.filter((n: any) => n.isGroup).map((g: any) => g.key);
  const bad: any[] = [];
  
  for (const n of arr) {
    if (n.isGroup) continue;
    const inGroup = groups.includes(n.group);
    if (!inGroup) bad.push(n);
  }
  
  return bad;
}
```

---

### 8. **src/utils/dot.ts**

#### Remove super node DOT export:
- Line 46-48: Remove `getSubdiagramPayload` function
- Lines 133-134: Remove super node filtering
- Lines 182-213: Remove subdiagram cluster emission

---

### 9. **src/utils/dotImport.ts**

#### Simplify import:
- Lines 112-122: Remove super node creation for subgraphs
- Convert subgraphs to regular cluster groups instead

---

### 10. **src/components/SubdiagramPreview.tsx** (DELETE FILE)

This entire file should be deleted as it's only used for super node preview.

---

### 11. **src/components/SubDiagram.tsx** (DELETE FILE)

This entire file should be deleted as it's only used for super node editing.

---

## Testing After Removal

After making these changes, test the following:

1. ✅ **Page Management**: Creating, switching, and closing pages works
2. ✅ **Node Creation**: All node types can be created
3. ✅ **Clustering**: Nodes can be grouped into clusters
4. ✅ **Validation**: Validation checks that all nodes belong to clusters
5. ✅ **Export**: JSON export generates RML-compatible format
6. ✅ **Import**: DOT and JSON import works correctly
7. ✅ **Properties**: Node properties can be edited in right sidebar
8. ✅ **Context Menu**: Right-click menu shows appropriate options

## Summary

**Total files to modify**: 9  
**Files to delete**: 2  
**Lines to remove/modify**: ~500+

The main complexity is in `App.tsx` where super node functionality is deeply integrated. The key is to:
1. Remove all super node state and functions
2. Simplify page management (no parent-child relationships)
3. Update export to work without super node mapping
4. Clean up UI elements (buttons, previews, back navigation)

## Recommendation

Make these changes incrementally:
1. Start with deleting the two component files
2. Remove imports and unused props
3. Remove state variables and functions
4. Update JSX rendering
5. Test after each major change
