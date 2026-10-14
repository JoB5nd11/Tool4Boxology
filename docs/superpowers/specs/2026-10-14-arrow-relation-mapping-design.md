# Every arrow maps to a relation — design

Date: 2026-10-14 · Branch: `feature/data-properties` · Request: "make sure semua relasi panah
terpetakan" (every arrow relation must be mapped). The user follows the recommendation at each
decision.

## Problem

Several arrow kinds produced no triple, or a wrong one:

- Card connectors: anything touching Context; element ↔ Consequence/Impact; Note ↔ card; System
  card ↔ anything (pointed at an `Annotation/` IRI that is never emitted); most card ↔ card pairs
  outside the risk chain.
- Workflow arrows: resource → resource, agent ↔ resource, agent ↔ agent; agent ↔ process used the
  resource-only `t4b:inputRoleParticipatesInProcess` (⊑ `beam:usedBy`, domain Resource).
- The dashed "Risk" arrow (`dash: true`) was dropped before export and treated as a flow arrow.
- The KG upload (`create_kg`) never exported workflow arrows outside a design pattern; only the BEAM
  file export did.

## Rule: most specific BEAM property, else a draft t4b property

Draft properties (new `ontologies/t4b_relations.ttl`), all `rdfs:subPropertyOf t4b:relatedTo`:

| Property | Used for |
|---|---|
| `t4b:relatedTo` | Any connector with no more specific mapping |
| `t4b:flowsTo` | Solid workflow arrow with no BEAM counterpart |
| `t4b:hasRiskRelation` | Dashed "Risk" arrow between workflow elements |
| `t4b:hasRiskConcept` | Element ↔ Consequence / Impact card |

Draft BEAM v0.0.2 terms (added to `beam_properties.ttl`): class `beam:Context`, object property
`beam:hasContext` (Element → Context), as in the design note.

### Card connectors (dotted grey)

"E" = a workflow element, or the System card, whose IRI is the boxology. First matching rule wins;
direction of drawing never matters except for rule 10.

| # | Ends | Triple |
|---|---|---|
| 1 | X ↔ Note (X not Note) | `X beam:note Note` |
| 2 | X ↔ Context (X not Context) | `X beam:hasContext Context` |
| 3 | E ↔ Risk | `E beamr:hasRisk Risk` |
| 4 | E ↔ RiskSource | `RiskSource beamr:originatedFrom E` |
| 5 | E ↔ RiskControl | `RiskControl beamr:associatedTo E` |
| 6 | E ↔ Consequence/Impact | `E t4b:hasRiskConcept X` |
| 7 | System card ↔ workflow element | `box beam:hasResource/hasProcess/hasAgent E` by the element's BEAM class |
| 8 | Risk chain (RiskSource→Risk, Risk→Consequence, Risk→Impact, Consequence→Impact) | `beamr:isRiskSourceFor` / `hasConsequence` / `hasConsequence` / `hasImpact` |
| 9 | RiskControl ↔ RiskSource/Risk/Consequence/Impact | `RiskControl beamr:modifiesRiskConcept X` |
| 10 | anything else (incl. unknown future cards) | `from t4b:relatedTo to` |

Context cards therefore become nodes: `Annotation/<box>/<key> a beam:Context`, with `rdfs:label`
and `beam:description`. The `beam:context` literal on the boxology is still emitted, which is the
design note's transition option, so existing queries keep working. Their data properties are now
exported too. `contextType` stays unexported, as decided earlier.

### Workflow arrows (solid or dashed)

| Ends | Triple |
|---|---|
| dashed, any ends | `from t4b:hasRiskRelation to` (no flow triple) |
| Process → Process | `beam:inform` |
| Agent ↔ Process | `Agent beam:participatedIn Process` |
| other → Process | `t4b:inputRoleParticipatesInProcess` |
| Process → other | `t4b:outputRoleParticipatesInProcess` |
| anything else | `from t4b:flowsTo to` |

Dashed arrows are no longer used to build design patterns, so they no longer create input/output
roles through the RML step.

## Export paths

- Frontend: `workflowLinks` carry `dash: true` when set; pattern building ignores dashed links.
- `generate_workflow_link_triples(source)` holds the workflow mapping; `generate_component_triples`
  uses it, and `create_kg` now appends it, so the KG upload has every arrow.
- BEAM file export keeps lines whose predicate is a draft `t4b:` relation. The beam-only filter
  would otherwise drop them.
- KG re-upload: a cleanup deletes relation triples among this boxology's components (and the
  boxology itself) for the predicates above, before the fresh triples are inserted.

## Testing

An exhaustive Python test enumerates every pair of endpoint kinds — the 8 card types plus an unknown
card, process / agent / resource elements, both drawing directions, solid and dashed — and asserts
each produces at least one triple whose subject and object are the two ends. Plus targeted tests for
each rule above, and an e2e check that `dash` reaches `workflowLinks`.
