"""
Turn the `props` the user adds in the Data properties dialog into triples.

Each prop is {"iri", "label", "datatype", "value"}. Schema props carry their
ontology IRI; custom props have iri None and get one under t4b:prop/.
Subjects follow the IRIs the rest of the export already uses: components are
t4b:Component/<key>, cards t4b:Annotation/<box>/<key>, and the System card is
the boxology itself. Context cards have no node of their own yet (their text
is a beam:context literal on the boxology), so their props are not exported.
"""

import re
from datetime import date

try:
    from beam_annotation_triples import _iri, _lit
except ImportError:
    from .beam_annotation_triples import _iri, _lit

T4B = "http://tool4boxology.org/"
XSD = "http://www.w3.org/2001/XMLSchema#"
CUSTOM_NS = T4B + "prop/"

_INTEGER = re.compile(r"^[+-]?\d+$")
_DECIMAL = re.compile(r"^[+-]?(\d+(\.\d*)?|\.\d+)$")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def custom_property_iri(label):
    slug = re.sub(r"[^A-Za-z0-9_-]+", "_", (label or "").strip()).strip("_")
    return CUSTOM_NS + slug if slug else None


def typed_literal(value, datatype):
    """Turtle literal for *value*, or None when it is empty or not valid for
    *datatype*. Unsupported datatypes are treated as xsd:string."""
    v = "" if value is None else str(value).strip()
    if not v:
        return None
    if datatype == "xsd:integer":
        ok = bool(_INTEGER.match(v))
    elif datatype == "xsd:decimal":
        ok = bool(_DECIMAL.match(v))
    elif datatype == "xsd:date":
        try:
            ok = bool(_DATE.match(v)) and date.fromisoformat(v) is not None
        except ValueError:
            ok = False
    elif datatype == "xsd:boolean":
        v = v.lower()
        ok = v in ("true", "false")
    else:
        return _lit(v)
    if not ok:
        return None
    return f'"{v}"^^<{XSD}{datatype[4:]}>'


def _prop_lines(subject, props):
    lines = []
    for prop in props or ():
        predicate = prop.get("iri") or custom_property_iri(prop.get("label"))
        literal = typed_literal(prop.get("value"), prop.get("datatype"))
        if predicate and literal:
            lines.append(f"{_iri(subject)} {_iri(predicate)} {literal} .")
    return lines


def generate_property_triples(source):
    lines = []
    for boxology in source.get("boxologies", []):
        box_id = boxology.get("id", "")
        box_iri = f"{T4B}Boxology/{box_id}"

        for ann in boxology.get("annotations", []):
            name = ann.get("name", "")
            if name == "Context":
                continue
            subject = box_iri if name == "System" else f"{T4B}Annotation/{box_id}/{ann['key']}"
            lines += _prop_lines(subject, ann.get("props"))

        for node in boxology.get("nodeDataArray", []):
            if node.get("isGroup") or node.get("category") == "beamCard":
                continue
            lines += _prop_lines(f"{T4B}Component/{node['key']}", node.get("props"))

    return "\n".join(lines) + "\n" if lines else ""


def stale_property_delete_query(box_iri, component_keys, schema_iris):
    """SPARQL update removing previously exported data-property literals from
    the boxology and the given components, before the new ones are inserted.
    Annotation cards are already covered by the Annotation/<box>/ cleanup."""
    subjects = " ".join(
        [_iri(box_iri)] + [_iri(f"{T4B}Component/{key}") for key in component_keys]
    )
    predicate_test = f'STRSTARTS(STR(?p), "{CUSTOM_NS}")'
    if schema_iris:
        predicate_test += " || ?p IN (" + ", ".join(_iri(i) for i in sorted(schema_iris)) + ")"
    return (
        "DELETE { ?s ?p ?o } WHERE { "
        f"VALUES ?s {{ {subjects} }} "
        "?s ?p ?o . "
        f"FILTER(isLiteral(?o) && ({predicate_test})) "
        "}"
    )
