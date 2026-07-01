# BEAM↔T4B Alignment Direction — Conflict Resolution

**Date:** 2026-07-01
**Status:** Resolved, no code change

## Context

The locked 2026-05-30 design ([`BEAM-T4B Alignment Decisions.md`](../../../BEAM-T4B%20Alignment%20Decisions.md)) implemented `t4b:X rdfs:subClassOf beam:Y` for ~12 leaf class pairs plus one `owl:equivalentClass` anchor (`t4b:Boxology ≡ beam:System`), in `beam_t4b_alignment.ttl`. On 2026-07-01 a status note disputed this direction: "currently BEAM classes/properties are superclass of T4B, should be the other way around."

## Investigation

Asked the user what prompted the note. Root reasoning: "this is a T4B-first tool... BEAM Core is essentially T4B core... we should not add additional UI for BEAM, just use what's in T4B." This is a request that **T4B remain the primary, hand-authored vocabulary** with BEAM as a secondary/derived layer — not a considered request to change entailment semantics.

## Resolution

**Keep the current direction (`T4B ⊑ BEAM`), no ontology change.** This is what already achieves the user's actual goal:

- The pipeline emits **only T4B triples** today, unchanged.
- A reasoner derives the matching BEAM facts automatically from the `subClassOf` bridge — zero BEAM-specific authoring required.
- Reversing to `BEAM ⊑ T4B` would require BEAM facts to be asserted before T4B facts could be derived from them — the opposite of "T4B first," and since the pipeline never asserts bare BEAM types, that entailment path would never fire in practice. It would silently break the free-export property that was the entire point of the 2026-05-30 design.

**The real, separate issue surfaced during this conversation:** duplicate/parallel BEAM-specific UI (a second "BEAM Concepts" palette group duplicating existing T4B shape entries, a BEAM View toggle with a re-skinning effect) contradicts "just use what's in T4B." That's tracked as its own brainstorm item — see `2026-07-01-beam-ui-dedup-design.md` — not an ontology change.

## Outcome

- No changes to `beam_t4b_alignment.ttl` or `Boxology-Interface/src/kg_creation/beam_enrichment.py`.
- Memory `beam-t4b-alignment-decisions.md` conflict flag closed out (see memory update).
