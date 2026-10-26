---
id: question
effort: small
when: The creator asks how something works or what is possible, and wants an answer rather than a change.
surfaces: [ide, mcp]
opens: []
tools: [searchDocs, getDocSection, searchKnowledgeByTag, getKnowledgeById, checkGatherScriptExample, getSection]
roundBudget: 3
keywords: [how do, how does, how can, how would, what is, what's, what are, what does, why does, why is, explain, is there, is it possible, difference between, tell me about, help me understand, documentation, the docs]
---

# Answer a question

The creator wants to understand something, not change anything yet. Make no writes.

1. `searchDocs` with the question as they asked it, then `getDocSection` for the section it finds. For a technique, one `searchKnowledgeByTag`.
2. Answer from what you read, not from memory: GatherScript is not in your training data. Say which section or entry the answer came from.
3. Show an example only after `checkGatherScriptExample` passes it verbatim. Fix or drop one that fails. An example that uses the creator's own entities or collections is checked in the project (`project: <script ref>`); a standalone failure for those names says nothing about their project.
4. If the question is about their own game, read the section it is about with `getSection` and answer using their names.
5. End by offering the change, if there is one to make. Make it only when they say yes.
