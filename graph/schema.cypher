// Idempotent constraints for synthetic appraisal graph.
CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (n:Employee) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT manager_id IF NOT EXISTS FOR (n:Manager) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT reviewer_id IF NOT EXISTS FOR (n:Reviewer) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT appraisal_id IF NOT EXISTS FOR (n:Appraisal) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT feedback_id IF NOT EXISTS FOR (n:Feedback) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT answer_id IF NOT EXISTS FOR (n:Answer) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT competency_id IF NOT EXISTS FOR (n:Competency) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT anchor_id IF NOT EXISTS FOR (n:RubricAnchor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (n:Evidence) REQUIRE n.id IS UNIQUE;

// Source Answer text is never overwritten by seed.
