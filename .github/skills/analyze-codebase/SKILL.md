---
name: analyze-codebase
description: Analyze codebase structure — map files, dependencies, data flows, and patterns for any project.
---

# Skill: Analyze Codebase Structure

## Purpose

Produce a comprehensive map of a code area including files, dependencies, data flows, and patterns.

## Steps

### 1. Broad Search
- Search for keywords related to the task (function names, module names, types)
- List all files in relevant directories
- Read module-level documentation, READMEs, and comments

### 2. Dependency Tracing
- Follow imports/use statements
- Map which modules depend on which
- Identify shared types, interfaces, and abstractions
- Note any circular dependencies

### 3. Pattern Discovery
- How are errors handled? (Result types, try/catch, custom errors)
- What naming conventions are used?
- Are there existing abstractions that should be reused?
- How is configuration accessed?

### 4. Data Flow Mapping
- What data enters this module?
- How is it transformed?
- What data leaves this module?
- Where is state stored?

## Output

Produce a structured report with:
- File inventory with purposes
- Dependency graph (text representation)
- Key patterns and conventions to follow
- Recommendations for the next agent
