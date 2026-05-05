@requiresCreds
Feature: pull-this-submission — deep single-resource read on a submission job

  # TS tool source:
  #   servers/policycenter-mcp/src/tools/pull-this-submission.ts
  #
  # Cloud API endpoint under test:
  #   GET {GUIDEWIRE_PC_BASE_URL}/job/v1/jobs/{jobId}
  #
  # Librarian KB reference (PolicyCenter apiref, Palisades 202503):
  #   https://docs.guidewire.com/cloud/pc/202503/apiref/
  #   Module: Job API — GET /job/v1/jobs/{id}
  #
  # Note: pull-this-submission and summarize-this-submission both read
  # GET /job/v1/jobs/{jobId}. The contract assertions here are deliberately
  # stricter — pull-this-submission returns the full attributes payload
  # (no projection), so we assert that attributes is a non-empty object
  # containing at least the documented Job fields.
  #
  # User journey: J-1 Underwriter Triage § "drill-down leaf step"
  #   (04-USER-JOURNEY.md) — mirrors pull-this-claim in planned ClaimCenter MCP
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md

  Background:
    * if (!karate.get('bearerToken')) karate.abort()
    * url pcBaseUrl
    * header Authorization = 'Bearer ' + bearerToken
    * header Accept = 'application/json'
    * def testJobId = karate.properties['test.jobId'] || 'JOB-PLACEHOLDER-001'

  # ---------------------------------------------------------------------------
  Scenario: Happy path — full attributes payload returned for a known submission
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/' + testJobId
    When method GET
    Then status 200

    # Single-resource envelope
    And match response == { data: { id: '#string', type: '#string', attributes: '#object', '#ignore': '#ignore' }, '#ignore': '#ignore' }

    # Attributes must be a non-empty object (pull-this-submission returns full payload)
    And assert Object.keys(response.data.attributes).length > 0

    # Documented Job fields (practitioner knowledge per 008 § 3.1;
    # sandbox-confirm with dev-tier creds per D-021)
    And match response.data.attributes.jobNumber == '#? _ == null || karate.typeOf(_) == "string"'
    And match response.data.attributes.jobStatus  == '#? _ == null || karate.typeOf(_) == "string"'

  # ---------------------------------------------------------------------------
  Scenario: Response for pull-this-submission contains more attributes than
            summarize-this-submission would surface (projection difference)
  # This scenario compares attribute count to assert the tool returns the full
  # payload. It does not assert specific field names beyond the minimums above
  # because carrier profiles alias and extend fields (field-aliases.yaml).
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/' + testJobId
    When method GET
    Then status 200
    # A full Job resource should have at least 5 attributes.
    # summarize-this-submission projects 4 (submissionNumber, status, assignedTo, kind).
    And assert Object.keys(response.data.attributes).length >= 5

  # ---------------------------------------------------------------------------
  Scenario: 401 Unauthorized — invalid bearer token
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/' + testJobId
    And header Authorization = 'Bearer invalid_token_for_contract_test'
    When method GET
    Then status 401

  # ---------------------------------------------------------------------------
  Scenario: 404 Not Found — unknown jobId returns a structured error, not 500
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/__no_such_job_pull__'
    When method GET
    Then status 404

    # Error response must be a well-formed object (exact shape is sandbox-confirm)
    And match response == '#object'
