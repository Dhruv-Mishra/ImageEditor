# Skill: Map Dependencies

## Purpose
Trace all dependencies for a module/function/type to understand change impact.

## Dependency Types
- **Direct**: Explicit imports
- **Reverse**: What imports this module
- **Implicit**: Config values, env vars, file paths, network endpoints
- **Data**: Structs flowing through code, DB tables, shared state

## Impact Classification
| Level | Meaning |
|---|---|
| None | Dependents unaffected |
| Interface | Type signatures change |
| Behavioral | Logic changes, testing needed |
| Breaking | Incompatible, rewrite required |
