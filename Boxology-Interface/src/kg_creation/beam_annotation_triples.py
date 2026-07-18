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
    "Context":     None,  # metadata on the boxology, not a standalone instance
    "Note":        BEAM + "Note",
    "Risk":        BEAMR + "Risk",
    "RiskSource":  BEAMR + "RiskSource",
    "Consequence": BEAMR + "Consequence",
    "Impact":      BEAMR + "Impact",
    "RiskControl": BEAMR + "RiskControl",
}

_RISK_TYPES = {"Risk", "RiskSource", "Consequence", "Impact", "RiskControl"}

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
    """Pick the BEAM/BEAMR property for an annotation link.

    Returns (property IRI, reversed) — with reversed=True the triple is
    emitted as `to property from`.  Both drawing directions of a connector
    resolve to the same triple, since the visual notation does not force one.
    """
    # Card ↔ workflow element: the property depends only on the card type.
    # Any concrete node counts as an element (beamr:associatedTo /
    # beamr:originatedFrom range over beam:Unit), so no whitelist of
    # workflow type names — subtypes like KG, Dataset or CNN qualify too.
    if from_is_annotation != to_is_annotation:
        card = from_type if from_is_annotation else to_type
        card_is_from = from_is_annotation
        if card == "Risk":
            return BEAMR + "hasRisk", card_is_from       # element hasRisk risk
        if card == "RiskSource":
            return BEAMR + "originatedFrom", not card_is_from
        if card == "RiskControl":
            return BEAMR + "associatedTo", not card_is_from
        if card in ("Note", "System"):
            return BEAM + "note", card_is_from           # element beam:note note
        return None, False

    # Card ↔ card: risk chain, either drawing direction
    if (from_type, to_type) in _CHAIN_RULES:
        return _CHAIN_RULES[(from_type, to_type)], False
    if (to_type, from_type) in _CHAIN_RULES:
        return _CHAIN_RULES[(to_type, from_type)], True
    # Risk controls modify any risk concept
    if from_type == "RiskControl" and to_type in _RISK_TYPES:
        return BEAMR + "modifiesRiskConcept", False
    if to_type == "RiskControl" and from_type in _RISK_TYPES:
        return BEAMR + "modifiesRiskConcept", True

    return None, False


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

            if name == "Context":
                # Context is metadata on the boxology, not a standalone node
                if subtext:
                    lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'context')} {_lit(subtext)} .")
                continue

            if name == "System":
                # System card adds description to the boxology
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
            if prop is None:
                continue

            if reversed_dir:
                lines.append(f"{_iri(to_iri)} {_iri(prop)} {_iri(from_iri)} .")
            else:
                lines.append(f"{_iri(from_iri)} {_iri(prop)} {_iri(to_iri)} .")

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
            lines.append(f"{_iri(box_iri)} {_iri(BEAM + 'hasElement')} {_iri(comp_iri)} .")

        for link in boxology.get("workflowLinks", []) or []:
            from_key = str(link.get("from"))
            to_key = str(link.get("to"))
            if from_key not in node_type or to_key not in node_type:
                continue
            from_iri = _component_iri(from_key)
            to_iri = _component_iri(to_key)
            from_proc = _is_process_type(node_type[from_key])
            to_proc = _is_process_type(node_type[to_key])
            if from_proc and to_proc:
                lines.append(f"{_iri(from_iri)} {_iri(BEAM + 'inform')} {_iri(to_iri)} .")
            elif to_proc:
                lines.append(
                    f"{_iri(from_iri)} {_iri(T4B + 'inputRoleParticipatesInProcess')} {_iri(to_iri)} .")
            elif from_proc:
                lines.append(
                    f"{_iri(from_iri)} {_iri(T4B + 'outputRoleParticipatesInProcess')} {_iri(to_iri)} .")
            # resource → resource arrows have no counterpart in T4B/BEAM

    return "\n".join(lines) + "\n" if lines else ""


_VALID_RISK_MARKERS = {"Risk", "RiskControl"}


def generate_risk_marker_triples(node_data_array):
    """Return N-Triple lines for workflow nodes tagged with a riskMarker badge.

    Additive to generate_annotation_triples: multi-types the SAME
    Component/{id} IRI the main T4B pipeline already assigns each
    workflow node, rather than creating a new resource.
    """
    lines = []
    for node in node_data_array or []:
        marker = node.get("riskMarker")
        if marker not in _VALID_RISK_MARKERS:
            continue
        component_iri = _component_iri(node["key"])
        lines.append(f"{_iri(component_iri)} {_iri(RDF_TYPE)} {_iri(BEAMR + marker)} .")
    return "\n".join(lines) + "\n" if lines else ""
