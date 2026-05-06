# Data Import Report

Source items CSV: docs/info2update_items.csv
Source facilities CSV: docs/info2update_facilities.csv

Imported items: 95
Imported facilities: 40

## Errors
No blocking data errors found.

## Warnings / Manual Review
- [Spelling] FittingUhit looks like a typo of Fitting Unit
- [Spelling] Puritication Unit looks like a typo of Purification Unit
- [Spelling] Mouldling Unit may be intentional, but spelling is unusual
- [Spelling] Inert Xirconn Effluent uses Xirconn while related items use Xircon
- [Spelling] Anhethyst Fiber may be intentional, but spelling is unusual

## Notes
- Facility item and pipe ports were merged into the existing `inputs` / `outputs` structure because the app currently has a single port model.
- `allowedItems` is populated from the new `ITEMS` list for every facility. Legacy `allowedMaterials` is kept as a type-level compatibility field but is no longer emitted in new facility data.
- `RECIPES` are not generated here because the facility CSV does not contain recipe rows.
