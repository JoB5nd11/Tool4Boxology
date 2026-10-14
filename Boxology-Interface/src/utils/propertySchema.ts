// Data properties: the per-class schema served by /api/schema/properties,
// plus the value rules shared by the dialog. The rules mirror
// kg_creation/data_property_triples.py, which re-checks them at export.
import { API_BASE } from '../config';
import { beamStyleMap } from '../data/beamStyles';

export type XsdType = 'xsd:string' | 'xsd:integer' | 'xsd:decimal' | 'xsd:date' | 'xsd:boolean';

export const XSD_TYPES: { value: XsdType; label: string }[] = [
  { value: 'xsd:string', label: 'Text' },
  { value: 'xsd:integer', label: 'Integer' },
  { value: 'xsd:decimal', label: 'Decimal' },
  { value: 'xsd:date', label: 'Date' },
  { value: 'xsd:boolean', label: 'True / false' },
];

export interface SchemaProperty { iri: string; label: string; datatype: XsdType }
/** Stored on node data as `props`. `iri` is null for custom properties. */
export interface DataProperty { iri: string | null; label: string; datatype: XsdType; value: string }
export type PropertySchema = Record<string, SchemaProperty[]>;

let pending: Promise<PropertySchema | null> | null = null;

/** Fetches the schema once; resolves null when the backend can't be reached
 *  (and lets the next call retry). */
export function loadPropertySchema(): Promise<PropertySchema | null> {
  if (!pending) {
    pending = fetch(`${API_BASE}/api/schema/properties`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body) => (body?.classes ?? {}) as PropertySchema)
      .catch(() => {
        pending = null;
        return null;
      });
  }
  return pending;
}

/** Schema properties for a node: a Context card's subtype first, then the
 *  BEAM class of its type, then its name. The first key with entries wins. */
export function schemaPropertiesFor(
  schema: PropertySchema,
  node: { name?: string; type?: string; contextType?: string },
): SchemaProperty[] {
  const style = beamStyleMap[node?.type ?? ''] ?? beamStyleMap[node?.name ?? ''];
  const keys = [
    node?.name === 'Context' ? node?.contextType : undefined,
    style?.beamClass.split(':').pop(),
    String(node?.name ?? node?.type ?? '').replace(/\s+/g, ''),
  ];
  for (const key of keys) {
    if (key && schema[key]?.length) return schema[key];
  }
  return [];
}

const INTEGER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function valueError(datatype: XsdType, value: string): string | null {
  const v = (value ?? '').trim();
  if (!v) return 'Enter a value';
  switch (datatype) {
    case 'xsd:integer':
      return INTEGER.test(v) ? null : 'Whole number expected';
    case 'xsd:decimal':
      return DECIMAL.test(v) ? null : 'Number expected, e.g. 0.87';
    case 'xsd:date': {
      const d = new Date(`${v}T00:00:00Z`);
      return DATE.test(v) && !isNaN(d.getTime()) && d.toISOString().startsWith(v)
        ? null
        : 'Date expected (YYYY-MM-DD)';
    }
    case 'xsd:boolean':
      return /^(true|false)$/i.test(v) ? null : 'true or false expected';
    default:
      return null;
  }
}

/** Same slug the export uses for a custom property's IRI (t4b:prop/<slug>). */
export function customSlug(label: string): string {
  return (label ?? '').trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}
