"""
Per-class datatype-property schema for the "Data properties" dialog.

Reads the same ontology bundle as beam_enrichment plus beam_properties.ttl and
returns, for every class, the owl:DatatypeProperty entries whose rdfs:domain
is that class or one of its superclasses — so a property declared on
beam:Model is offered on every kind of Model component.
"""

from rdflib import Graph, URIRef
from rdflib.namespace import RDF, RDFS, OWL, XSD

try:
    from beam_enrichment import _ONTO_DIR, _BUNDLE_FILES, _transitive_closure
except ImportError:
    from .beam_enrichment import _ONTO_DIR, _BUNDLE_FILES, _transitive_closure

BEAM_NS = "http://w3id.org/beam/core#"
BEAMR_NS = "http://w3id.org/beam/risk#"

PROPERTY_FILES = _BUNDLE_FILES + ("beam_properties.ttl",)

SUPPORTED_DATATYPES = ("string", "integer", "decimal", "date", "boolean")

# Filled from the card's own fields (subtext) by the annotation export, so the
# dialog must not offer them a second time.
_TOOL_FILLED = {BEAM_NS + "description", BEAM_NS + "context"}

_cache = {"key": None, "value": None}


def _local(iri):
    return iri.rsplit("#", 1)[-1].rsplit("/", 1)[-1]


def _datatype(rng):
    """Map an rdfs:range to one of the supported xsd types (default string)."""
    if isinstance(rng, URIRef) and str(rng).startswith(str(XSD)):
        local = str(rng)[len(str(XSD)):]
        # beam_core.ttl writes xsd:String
        local = local[:1].lower() + local[1:]
        if local in SUPPORTED_DATATYPES:
            return "xsd:" + local
    return "xsd:string"


def _rank(iri):
    return 0 if iri.startswith(BEAM_NS) or iri.startswith(BEAMR_NS) else 1


def build_property_schema(graph):
    """Return {class local name: [{"iri", "label", "datatype"}]} for *graph*."""
    direct = {}

    def add(s, o):
        if isinstance(s, URIRef) and isinstance(o, URIRef):
            direct.setdefault(str(s), set()).add(str(o))

    for s, _, o in graph.triples((None, RDFS.subClassOf, None)):
        add(s, o)
    for s, _, o in graph.triples((None, OWL.equivalentClass, None)):
        add(s, o)
        add(o, s)
    closure = _transitive_closure(direct)

    by_domain = {}
    for prop in sorted(set(graph.subjects(RDF.type, OWL.DatatypeProperty)), key=str):
        if not isinstance(prop, URIRef) or str(prop) in _TOOL_FILLED:
            continue
        label = graph.value(prop, RDFS.label)
        entry = {
            "iri": str(prop),
            "label": str(label) if label is not None else _local(str(prop)),
            "datatype": _datatype(graph.value(prop, RDFS.range)),
        }
        for domain in graph.objects(prop, RDFS.domain):
            if isinstance(domain, URIRef):
                by_domain.setdefault(str(domain), []).append(entry)

    classes = set(closure) | set(by_domain)
    classes |= {str(c) for c in graph.subjects(RDF.type, OWL.Class) if isinstance(c, URIRef)}

    result, owner = {}, {}
    for cls in sorted(classes):
        props, seen = [], set()
        for domain in [cls, *sorted(closure.get(cls, ()))]:
            for entry in by_domain.get(domain, ()):
                if entry["iri"] not in seen:
                    seen.add(entry["iri"])
                    props.append(entry)
        if not props:
            continue
        key = _local(cls)
        if key in owner and _rank(cls) >= _rank(owner[key]):
            continue
        result[key] = props
        owner[key] = cls
    return result


def load_property_schema():
    """Schema for the bundled ontology files, re-read when any file changes."""
    files = [_ONTO_DIR / name for name in PROPERTY_FILES]
    key = tuple(f.stat().st_mtime_ns for f in files)
    if _cache["key"] != key:
        g = Graph()
        for f in files:
            g.parse(f, format="turtle")
        _cache["value"] = build_property_schema(g)
        _cache["key"] = key
    return _cache["value"]


def all_schema_property_iris():
    return {p["iri"] for props in load_property_schema().values() for p in props}
