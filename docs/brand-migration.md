# Brand migration

## Approved hierarchy

- **Aigenikz Technologies LLC** - parent company and legal entity
- **Aigenikz Intelligence OS** - primary intelligence platform
- **Nature’s Elixirz OS** - wellness platform in the Aigenikz product family

## Presentation migration

User-facing references to AstraMind have been migrated to Aigenikz. Product interfaces should use **Aigenikz Intelligence OS** when naming the platform and **Aigenikz Technologies LLC** when naming the company.

## Compatibility policy

Legacy technical identifiers remain supported during this migration. This includes identifiers containing `AstraMind`, lowercase `astramind` keys and paths, `ASTRAMIND_*` environment variables, `X-AstraMind-*` HTTP headers, database filenames, and persisted browser storage keys. Rename these only after new aliases exist and stored data, integrations, and deployments have a tested migration path.

New user-facing work must use the approved Aigenikz names. New technical identifiers should use `aigenikz` unless they extend a legacy interface that still requires compatibility.