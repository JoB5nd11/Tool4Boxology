"""
BEAM enrichment for the Tool4Boxology KG pipeline.

After the RML step produces T4B triples for a diagram, this module derives the
equivalent BEAM facts and returns them appended to the triple string, so the
stored graph is queryable in *both* vocabularies.

It is a small, dependency-light reasoner (rdflib only — no OWL-RL engine). It
applies exactly the four entailment rules the BEAM<->T4B bridge relies on:

  1. rdfs:subClassOf      — transitive; an instance of a T4B class is also an
                            instance of every BEAM superclass on its chain
                            (e.g. t4b:CNN -> ... -> t4b:Model -> beam:Model).
  2. owl:equivalentClass  — treated as subClassOf both ways
                            (t4b:Boxology == beam:System).
  3. rdfs:subPropertyOf   — a triple using a T4B role property also counts as the
                            BEAM property it specialises
                            (inputRole... -> beam:usedBy, outputRole... -> beam:produce).
  4. owl:inverseOf        — BEAM's own inverses then fill in the reverse links
                            (beam:use, beam:producedBy).

Only NEW, instance-level BEAM triples are returned — never ontology/schema
triples — so the triple store stays clean. The semantics were cross-checked
against a full OWL-RL run (see BEAM-T4B-Alignment-Docs Section 4).
"""

from pathlib import Path

import rdflib
from rdflib import Graph, URIRef
from rdflib.namespace import RDF, RDFS, OWL

BEAM_NS = "http://w3id.org/beam/core#"
BEAMR_NS = "http://w3id.org/beam/risk#"
T4B_NS = "http://tool4boxology.org/"

_ONTO_DIR = Path(__file__).resolve().parent / "ontologies"
_BUNDLE_FILES = ("beam_core.ttl", "beam_risk.ttl", "Tool4BoxologyOntology.ttl", "beam_t4b_alignment.ttl")

# cached schema (per process / per module load)
_SCHEMA = None


class _Schema:
    """Pre-computed closures over the reasoning bundle."""

    def __init__(self, subclass_closure, subprop_closure, inverses):
        self.subclass_closure = subclass_closure  # class IRI (str) -> set[str] of superclasses
        self.subprop_closure = subprop_closure     # prop IRI (str) -> set[str] of superproperties
        self.inverses = inverses                    # prop IRI (str) -> set[str] of inverse props


def _transitive_closure(direct):
    """direct: dict[str, set[str]] of immediate edges -> full transitive closure."""
    closure = {}
    for node in direct:
        seen = set()
        stack = list(direct[node])
        while stack:
            nxt = stack.pop()
            if nxt not in seen:
                seen.add(nxt)
                stack.extend(direct.get(nxt, ()))
        closure[node] = seen
    return closure


def _build_schema(g):
    direct_super = {}   # class -> immediate superclasses
    direct_sprop = {}   # prop -> immediate superproperties
    inverses = {}       # prop -> inverse props

    def add(d, k, v):
        d.setdefault(str(k), set()).add(str(v))

    for s, _, o in g.triples((None, RDFS.subClassOf, None)):
        if isinstance(o, URIRef):
            add(direct_super, s, o)

    # equivalentClass == subClassOf in both directions
    for s, _, o in g.triples((None, OWL.equivalentClass, None)):
        if isinstance(s, URIRef) and isinstance(o, URIRef):
            add(direct_super, s, o)
            add(direct_super, o, s)

    for s, _, o in g.triples((None, RDFS.subPropertyOf, None)):
        if isinstance(o, URIRef):
            add(direct_sprop, s, o)

    for s, _, o in g.triples((None, OWL.inverseOf, None)):
        if isinstance(s, URIRef) and isinstance(o, URIRef):
            add(inverses, s, o)
            add(inverses, o, s)

    return _Schema(
        _transitive_closure(direct_super),
        _transitive_closure(direct_sprop),
        inverses,
    )


def _load_schema():
    global _SCHEMA
    if _SCHEMA is None:
        g = Graph()
        for fname in _BUNDLE_FILES:
            g.parse(_ONTO_DIR / fname, format="turtle")
        _SCHEMA = _build_schema(g)
    return _SCHEMA


def _beam(uri):
    return uri.startswith(BEAM_NS) or uri.startswith(BEAMR_NS)


def _nt(triple):
    s, p, o = triple
    return f"<{s}> <{p}> <{o}> .\n"


def derive_beam_triples(t4b_triples):
    """Return a set of new (s, p, o) BEAM triples entailed by the T4B triples."""
    schema = _load_schema()

    data = Graph()
    if t4b_triples and t4b_triples.strip():
        # the pipeline emits full-IRI triples ending in '.'; Turtle parses this
        data.parse(data=t4b_triples, format="turtle")

    new = set()

    # rule 1 + 2: type propagation to BEAM superclasses
    for s, _, c in data.triples((None, RDF.type, None)):
        if not isinstance(c, URIRef):
            continue
        for sup in schema.subclass_closure.get(str(c), ()):
            if _beam(sup):
                new.add((s, RDF.type, URIRef(sup)))

    # rule 3 + 4: property propagation to BEAM superproperties + their inverses
    for s, p, o in data:
        if p == RDF.type:
            continue
        for sup in schema.subprop_closure.get(str(p), ()):
            if not _beam(sup):
                continue
            new.add((s, URIRef(sup), o))
            for inv in schema.inverses.get(sup, ()):
                if _beam(inv):
                    new.add((o, URIRef(inv), s))

    # never re-emit something already stated
    return {t for t in new if t not in data}


def enrich_with_beam(t4b_triples):
    """Append the entailed BEAM triples to the T4B triple string and return it."""
    derived = derive_beam_triples(t4b_triples)
    if not derived:
        return t4b_triples
    suffix = "".join(_nt(t) for t in sorted(derived, key=lambda t: (str(t[0]), str(t[1]), str(t[2]))))
    return t4b_triples + suffix
