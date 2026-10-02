# Synthetic CSV fixtures

All rows MUST use `synthetic=true`. Import validates every row before graph writes; stable IDs make repeat imports idempotent. Existing `Answer` and `Feedback` source text is never replaced.

Template:
```csv
record_type,record_id,employee_id,appraisal_id,reviewer_id,reviewer_type,feedback_id,answer_id,answer_text,competency_id,rating_level,synthetic
feedback,fb-001,employee-001,appraisal-001,reviewer-001,peer,fb-001,answer-001,"Example source statement",competency-problem-solving,,true
```

Required columns: `record_type`, `record_id`, `synthetic`. Feedback additionally requires employee/appraisal/reviewer/feedback/answer IDs, reviewer type, and non-empty `answer_text`. Supported record types: `feedback`, `answer`. IDs must be stable non-empty strings; references must point to same-file or existing synthetic entities. CSV parser must support quoted commas, escaped quotes, UTF-8, blank lines, and header-only files. Invalid input yields row errors and zero writes.

Fixture manifest contains 1 employee, 1 manager, 4 peer reviewers, 8 feedback records (7 peer plus 1 self-review Answer), 1 competency, and 5 rubric anchors. Cases cover support, contradiction, irrelevant, duplicate, and insufficient evidence.
