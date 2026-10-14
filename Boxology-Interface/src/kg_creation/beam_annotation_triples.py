"""
Generate BEAM / BEAMR triples for annotation and risk nodes.

beamCard nodes (System, Context, Note, Risk, RiskSource, Consequence, Impact,
RiskControl) are BEAM-native — they map directly to beam: / beamr: classes,
not through the T4B bridge.  This module takes the annotation data that the
frontend includes in the export JSON and emits the corresponding RDF triples.
"""

BEAM = "http://w3id.org/beam/core#"
BEAMR = "http://w3id.org/beam/risk#"
T4B = "http://tool4boxology.org/"
RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"

# beamCard name → RDF class IRI
_TYPE_MAP = {
    "System":      BEAM + "System",
    "Context":     BEAM + "Context",  # draft v0.0.2 class; text also stays a beam:context literal
    "Note":        BEAM + "Note",
    "Risk":        BEAMR + "Risk",
    "RiskSource":  BEAMR + "RiskSource",
    "Consequence": BEAMR + "Consequence",
    "Impact":      BEAMR + "Impact",
    "RiskControl": BEAMR + "RiskControl",
}

_RISK_TYPES = {"Risk", "RiskSource", "Consequence", "Impact", "RiskControl"}
_RISK_CONCEPTS = {"RiskSource", "Risk", "Consequence", "Impact"}

# Draft relations for arrows the ontologies have no property for
# (ontologies/t4b_relations.ttl); all are sub-properties of t4b:relatedTo.
T4B_RELATED_TO = T4B + "relatedTo"
T4B_FLOWS_TO = T4B + "flowsTo"
T4B_HAS_RISK_RELATION = T4B + "hasRiskRelation"
T4B_HAS_RISK_CONCEPT = T4B + "hasRiskConcept"
DRAFT_RELATIONS = (T4B_RELATED_TO, T4B_FLOWS_TO, T4B_HAS_RISK_RELATION, T4B_HAS_RISK_CONCEPT)

# Risk-chain links between two cards: (from_type, to_type) → predicate IRI.
# Looked up in both directions so the drawing direction doesn't matter.
_CHAIN_RULES = {
    ("RiskSource", "Risk"):        BEAMR + "isRiskSourceFor",
    ("Risk", "Consequence"):       BEAMR + "hasConsequence",
    ("Consequence", "Impact"):     BEAMR + "hasImpact",
    # Risk → Impact direct shortcut (paper allows it)
    ("Risk", "Impact"):            BEAMR + "hasConsequence",
}


def _iri(uri):
    return f"<{uri}>"


def _lit(text):
    escaped = text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def _annotation_iri(boxology_id, node_key):
    return f"{T4B}Annotation/{boxology_id}/{node_key}"


def _component_iri(node_key):
    return f"{T4B}Component/{node_key}"


def _resolve_link_property(from_type, to_type, from_is_annotation, to_is_annotation):
    """Pick the property for an annotation link (a connector touching a card).

    Returns (property IRI, reversed) — with reversed=True the triple is
    emitted as `to property from`.  Every pair of ends maps to something:
    the most specific BEAM/BEAMR property when one exists, otherwise a draft
    t4b: relation, and t4b:relatedTo (in drawing direction) as the last
    resort.  See docs/superpowers/specs/2026-10-14-arrow-relation-mapping-design.md.
    """
    # A workflow element and the System card (whose IRI is the boxology)
    # both play the beam:Element role; every other card is known by its type.
    def kind(name, is_card):
        return name if is_card and name != "System" else "E"

    a = kind(from_type, from_is_annotation)
    b = kind(to_type, to_is_annotation)

    def sym(is_subject, is_object):
        if is_subject(a) and is_object(b):
            return False
        if is_subject(b) and is_object(a):
            return True
        return None

    rules = (
        (lambda x: x != "Note", lambda y: y == "Note", BEAM + "note"),
        (lambda x: x != "Context", lambda y: y == "Context", BEAM + "hasContext"),
        (lambda x: x == "E", lambda y: y == "Risk", BEAMR + "hasRisk"),
        (lambda x: x == "RiskSource", lambda y: y == "E", BEAMR + "originatedFrom"),
        (lambda x: x == "RiskControl", lambda y: y == "E", BEAMR + "associatedTo"),
        (lambda x: x == "E", lambda y: y in ("Consequence", "Impact"), T4B_HAS_RISK_CONCEPT),
    )
    for is_subject, is_object, prop in rules:
        reversed_dir = sym(is_subject, is_object)
        if reversed_dir is not None:
            return prop, reversed_dir

    # System card <-> workflow element: the boxology has that element.
    from_system = from_is_annotation and from_type == "System"
    to_system = to_is_annotation and to_type == "System"
    if from_system != to_system:
        element = to_type if from_system else from_type
        prop = _system_link_property(element)
        if prop:
            return prop, to_system

    # Card <-> card: risk chain, either drawing direction
    if (a, b) in _CHAIN_RULES:
        return _CHAIN_RULES[(a, b)], False
    if (b, a) in _CHAIN_RULES:
        return _CHAIN_RULES[(b, a)], True
    # Risk controls modify any risk concept
    reversed_dir = sym(lambda x: x == "RiskControl", lambda y: y in _RISK_CONCEPTS)
    if reversed_dir is not None:
        return BEAMR + "modifiesRiskConcept", reversed_dir

    return T4B_RELATED_TO, False


def generate_annotation_triples(source):
    """Return a string of N-Triple lines for all annotation/risk nodes in source."""
    lines = []

    for boxology in source.get("boxologies", []):
        box_id = boxology.get("id", "")
        box_iri = f"{T4B}Boxology/{box_id}"
        annotations = boxology.get("annotations", [])
        annotation_links = boxology.get("annotationLinks", [])

        if not annotations:
            continue

        # Risk cards already attached to a concrete element get their
        # beamr:hasRisk triple from that link; only dangling ones fall back
        # to a system-level hasRisk so they stay reachable in the graph.
        element_linked = set()
        for link in annotation_links:
            if link.get("fromIsAnnotation") and not link.get("toIsAnnotation"):
                element_linked.add(str(link["from"]))
            elif link.get("toIsAnnotation") and not link.get("fromIsAnnotation"):
                element_linked.add(str(link["to"]))

        node_map = {}  # key → { iri, name, is_annotation }

        for ann in annotations:
            key = ann["key"]
            name = ann.get("name", "")
            label = ann.get("label", "")
            subtext = ann.get("subtext", "")
            rdf_type = _TYPE_MAP.get(name)
            ann_iri = _annotation_iri(box_id, key)
            node_map[key] = {"iri": ann_iri, "name": name, "is_annotation": True}

            if name == "Context" and subtext:
                # Kept alongside the Context node (transition: existing
                # queries read the literal on the boxology).
                lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'context')} {_lit(subtext)} .")

            if name == "System":
                # The System card stands for the boxology itself: it adds the
                # description, and connectors to it resolve to the boxology.
                node_map[key]["iri"] = box_iri
                if subtext:
                    lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'description')} {_lit(subtext)} .")
                continue

            if rdf_type:
                lines.append(f"{_iri(ann_iri)} {_iri(RDF_TYPE)} {_iri(rdf_type)} .")

            if label:
                lines.append(f"{_iri(ann_iri)} {_iri(RDFS_LABEL)} {_lit(label)} .")

            if subtext:
                lines.append(f"{_iri(ann_iri)} {_iri(BEAM + 'description')} {_lit(subtext)} .")

            # beamr:hasRisk ranges over beamr:Risk only, so no box-level
            # hasRisk for the other risk-perspective cards; they hang off the
            # risk chain instead.
            if name == "Risk" and str(key) not in element_linked:
                lines.append(f"{_iri(box_iri)} {_iri(BEAMR + 'hasRisk')} {_iri(ann_iri)} .")
            elif name == "Note":
                lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'note')} {_iri(ann_iri)} .")

        # Process annotation links
        for link in annotation_links:
            from_key = link["from"]
            to_key = link["to"]
            from_type = link.get("fromType", "")
            to_type = link.get("toType", "")
            from_is_ann = link.get("fromIsAnnotation", False)
            to_is_ann = link.get("toIsAnnotation", False)

            # Resolve IRIs — annotation nodes use Annotation/ prefix, workflow nodes use Component/
            if from_key in node_map:
                from_iri = node_map[from_key]["iri"]
            else:
                from_iri = _component_iri(from_key)
                node_map[from_key] = {"iri": from_iri, "name": from_type, "is_annotation": False}

            if to_key in node_map:
                to_iri = node_map[to_key]["iri"]
            else:
                to_iri = _component_iri(to_key)
                node_map[to_key] = {"iri": to_iri, "name": to_type, "is_annotation": False}

            prop, reversed_dir = _resolve_link_property(
                from_type, to_type, from_is_ann, to_is_ann
            )

            if reversed_dir:
                lines.append(f"{_iri(to_iri)} {_iri(prop)} {_iri(from_iri)} .")
            else:
                lines.append(f"{_iri(from_iri)} {_iri(prop)} {_iri(to_iri)} .")

    # A risk tied only to the System card gets box hasRisk both from the
    # fallback and from its connector; keep one.
    lines = list(dict.fromkeys(lines))
    return "\n".join(lines) + "\n" if lines else ""


_BASE_PROCESS_TYPES = {"Train", "Engineer", "Infer", "Transform", "Generate", "Deduce", "Embed"}


def _is_process_type(name):
    """True when t4b:{name} sits under beam:Process in the ontology bundle."""
    if not name:
        return False
    if name in _BASE_PROCESS_TYPES:
        return True
    try:
        from kg_creation.beam_enrichment import _load_schema
    except ImportError:
        from beam_enrichment import _load_schema
    return BEAM + "Process" in _load_schema().subclass_closure.get(T4B + name, ())


# beam_core.ttl defines no generic System<->Element property — only the three
# type-specific ones below (each domain beam:System). hasElement doesn't exist
# in the bundle, so the System-level link is chosen by the node's BEAM class.
_SYSTEM_LINK_PROPERTIES = (
    (BEAM + "Resource", BEAM + "hasResource"),
    (BEAM + "Process",  BEAM + "hasProcess"),
    (BEAM + "Agent",    BEAM + "hasAgent"),
)


def _is_agent_type(name):
    """True when t4b:{name} sits under beam:Agent in the ontology bundle."""
    if not name:
        return False
    try:
        from kg_creation.beam_enrichment import _load_schema
    except ImportError:
        from beam_enrichment import _load_schema
    return BEAM + "Agent" in _load_schema().subclass_closure.get(T4B + name, ())


def _system_link_property(name):
    """beam:hasResource / hasProcess / hasAgent for t4b:{name}, or None if the
    type doesn't resolve to any of the three (nothing conformant to emit)."""
    if not name:
        return None
    try:
        from kg_creation.beam_enrichment import _load_schema
    except ImportError:
        from beam_enrichment import _load_schema
    closure = _load_schema().subclass_closure.get(T4B + name, ())
    for beam_class, prop in _SYSTEM_LINK_PROPERTIES:
        if beam_class in closure:
            return prop
    return None


def generate_component_triples(source):
    """T4B triples for every workflow node and workflow link in the export.

    The RML pipeline only rdfizes components that participate in a design
    pattern (wired to a recognised process node), so anything outside a
    pattern was silently missing from the BEAM export.  This walks
    nodeDataArray / workflowLinks directly, giving every diagram element a
    typed, labelled Component IRI; beam_enrichment then lifts these to the
    corresponding beam: classes and properties.
    """
    lines = []
    for boxology in source.get("boxologies", []):
        box_id = boxology.get("id", "")
        box_iri = f"{T4B}Boxology/{box_id}"
        node_type = {}

        for node in boxology.get("nodeDataArray", []) or []:
            key = str(node.get("key"))
            name = node.get("type") or node.get("name") or ""
            label = node.get("label") or node.get("text") or ""
            comp_iri = _component_iri(key)
            node_type[key] = name
            lines.append(f"{_iri(comp_iri)} {_iri(RDF_TYPE)} {_iri(T4B + 'Component')} .")
            if name and " " not in name:
                lines.append(f"{_iri(comp_iri)} {_iri(RDF_TYPE)} {_iri(T4B + name)} .")
            if label:
                lines.append(f"{_iri(comp_iri)} {_iri(RDFS_LABEL)} {_lit(label)} .")
            system_prop = _system_link_property(name)
            if system_prop:
                lines.append(f"{_iri(box_iri)} {_iri(system_prop)} {_iri(comp_iri)} .")

        lines += _workflow_link_lines(boxology)

    return "\n".join(lines) + "\n" if lines else ""


def _workflow_link_lines(boxology):
    """One triple per workflow arrow (an arrow between two non-card nodes).

    Dashed arrows are the "Risk" arrow style: a risk relation, not a flow.
    Solid arrows map by the ends' BEAM classes, with t4b:flowsTo where BEAM
    has no property (e.g. resource -> resource).
    """
    node_type = {
        str(n.get("key")): n.get("type") or n.get("name") or ""
        for n in boxology.get("nodeDataArray", []) or []
    }
    lines = []
    for link in boxology.get("workflowLinks", []) or []:
        from_key = str(link.get("from"))
        to_key = str(link.get("to"))
        if from_key not in node_type or to_key not in node_type:
            continue
        from_iri = _component_iri(from_key)
        to_iri = _component_iri(to_key)
        from_proc = _is_process_type(node_type[from_key])
        to_proc = _is_process_type(node_type[to_key])
        if link.get("dash"):
            s, p, o = from_iri, T4B_HAS_RISK_RELATION, to_iri
        elif from_proc and to_proc:
            s, p, o = from_iri, BEAM + "inform", to_iri
        elif to_proc and _is_agent_type(node_type[from_key]):
            s, p, o = from_iri, BEAM + "participatedIn", to_iri
        elif from_proc and _is_agent_type(node_type[to_key]):
            s, p, o = to_iri, BEAM + "participatedIn", from_iri
        elif to_proc:
            s, p, o = from_iri, T4B + "inputRoleParticipatesInProcess", to_iri
        elif from_proc:
            s, p, o = from_iri, T4B + "outputRoleParticipatesInProcess", to_iri
        else:
            s, p, o = from_iri, T4B_FLOWS_TO, to_iri
        lines.append(f"{_iri(s)} {_iri(p)} {_iri(o)} .")
    return lines


def generate_workflow_link_triples(source):
    """Workflow-arrow triples only, for the KG upload: its RML step covers
    arrows inside design patterns but not the rest."""
    lines = []
    for boxology in source.get("boxologies", []):
        lines += _workflow_link_lines(boxology)
    return "\n".join(lines) + "\n" if lines else ""


# Relations among workflow elements (and the boxology) that an export emits;
# on a KG re-upload they are deleted first, then inserted fresh, so redrawn
# or restyled arrows leave nothing stale behind.
_ELEMENT_RELATIONS = (
    BEAM + "inform", BEAM + "participatedIn",
    BEAM + "use", BEAM + "usedBy", BEAM + "produce", BEAM + "producedBy",
    BEAM + "hasResource", BEAM + "hasProcess", BEAM + "hasAgent",
    T4B + "inputRoleParticipatesInProcess", T4B + "outputRoleParticipatesInProcess",
) + DRAFT_RELATIONS


def stale_relation_delete_query(box_iri, component_keys):
    nodes = " ".join([_iri(box_iri)] + [_iri(_component_iri(k)) for k in component_keys])
    predicates = ", ".join(_iri(p) for p in _ELEMENT_RELATIONS)
    return (
        "DELETE { ?s ?p ?o } WHERE { "
        f"VALUES ?s {{ {nodes} }} VALUES ?o {{ {nodes} }} "
        "?s ?p ?o . "
        f"FILTER(?p IN ({predicates})) "
        "}"
    )
