import { v4 as uuidv4 } from 'uuid';

export type BoxologyModel = {
  nodeDataArray: any[];
  linkDataArray: any[];
};

export type PageData = {
  id: string;
  name: string;
  nodeDataArray: any[];
  linkDataArray: any[];
  parentNodeId?: string;
  isSubDiagram?: boolean;
};

export type PagesBuildResult = {
  pages: PageData[];
  superNodeMap: { [nodeKey: string]: string };
};

// Normalize: accept either subDiagram or subdiagramData; keep as subdiagramData
function normalizeModel(model: any): BoxologyModel {
  const clone = JSON.parse(JSON.stringify(model || { nodeDataArray: [], linkDataArray: [] }));
  (clone.nodeDataArray || []).forEach((n: any) => {
    if (n.subDiagram && !n.subdiagramData) n.subdiagramData = n.subDiagram;
    delete n.subDiagram;
    if (n.subdiagramData) {
      n.subdiagramData = normalizeModel(n.subdiagramData);
    }
  });
  return clone;
}

// Recursively build VS Code "pages" from a hierarchical model
export function buildPagesFromModel(
  model: BoxologyModel,
  mainName = 'Main Page'
): PagesBuildResult {
  const normalized = normalizeModel(model);
  const pages: PageData[] = [];
  const superNodeMap: { [nodeKey: string]: string } = {};

  function walk(m: BoxologyModel, pageName: string, parentNodeKey?: string): string {
    const pageId = uuidv4();
    // Keep original node data (already normalized)
    const page: PageData = {
      id: pageId,
      name: pageName,
      nodeDataArray: m.nodeDataArray || [],
      linkDataArray: m.linkDataArray || [],
      isSubDiagram: !!parentNodeKey,
      parentNodeId: parentNodeKey,
    };
    pages.push(page);

    // For each super node create a child page recursively and record mapping
    (m.nodeDataArray || []).forEach((n: any) => {
      const child = n.subdiagramData;
      if (child && child.nodeDataArray) {
        const childName = `${n.label || n.text || n.key || 'Subdiagram'}`;
        const childPageId = walk(child, childName, String(n.key));
        superNodeMap[String(n.key)] = childPageId;
      }
    });

    return pageId;
  }

  walk(normalized, mainName, undefined);
  return { pages, superNodeMap };
}