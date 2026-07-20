# Changelog

## 1.0.0 (2026-07-20)

Initial release. Defines:

- `ModelCatalogEntry` — per-model catalog entry written by worker handler's `describe()`
- `WorkerCatalogEntry` — worker endpoint metadata written by BFF
- `ParamSchema` — discriminated union with 5 types: enum / number / text / boolean / file
- `CreditCostRule` — fixed or perUnit (no perResolution variant; perUnit covers it)

Aligned with docs/架构.md v1.6 appendix B (§13) and 6-frontend-contract negotiation outcome.
