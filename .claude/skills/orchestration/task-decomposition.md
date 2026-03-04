# Skill: Task Decomposition

## Purpose
Break complex feature requests into ordered, independently-verifiable subtasks.

## Decomposition Framework

### Step 1: Identify Components
- Which modules/files does this touch?
- What are the data flow boundaries?
- Are there independent parts that could be parallelized?

### Step 2: Order by Dependencies
- Data structures and interfaces first
- Implementation depends on types
- Tests depend on implementation

### Step 3: Size Each Subtask
- Completable in one agent session
- Touches ≤5 files (split if more)
- Has clear acceptance criteria

### Step 4: Assign Agents
- Data gathering → Explorer
- Decision points → Oracle
- Implementation → Programmer
- Validation → Tester
- Quality gate → Reviewer
