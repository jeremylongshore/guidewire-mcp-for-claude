@requiresCreds
Feature: summarize-this-submission — elevator-pitch read on a single submission

  # TS tool source:
  #   servers/policycenter-mcp/src/tools/summarize-this-submission.ts
  #
  # Cloud API endpoints under test:
  #   Primary (E2 base read):
  #     GET {GUIDEWIRE_PC_BASE_URL}/job/v1/jobs/{jobId}
  #   Secondary (Composite API fan-out — planned post-guidewire-adj smoke):
  #     POST {GUIDEWIRE_PC_BASE_URL}/composite/v1/composite  (batch: contacts, locations, coverages)
  #
  # Librarian KB reference (PolicyCenter apiref, Palisades 202503):
  #   https://docs.guidewire.com/cloud/pc/202503/apiref/
  #   Module: Job API — GET /job/v1/jobs/{id}
  #   Module: Composite API — PC has both Composite + Graph (CC has Composite only; per KB § 1)
  #
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md
  # Per D-021: first integration engagement validates production per sandbox confirm.

  Background:
    * if (!karate.get('bearerToken')) karate.abort()
    * url pcBaseUrl
    * header Authorization = 'Bearer ' + bearerToken
    * header Accept = 'application/json'
    # Replace with a real submission Job ID from the dev-tier tenant (guidewire-adj)
    * def testJobId = karate.properties['test.jobId'] || 'JOB-PLACEHOLDER-001'

  # ---------------------------------------------------------------------------
  Scenario: Happy path — Job API single-resource read returns submission attributes
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/' + testJobId
    When method GET
    Then status 200

    # Cloud API single-resource envelope (librarian KB § 1):
    #   { data: { id, type, attributes, links? } }
    And match response == { data: { id: '#string', type: '#string', attributes: '#object', '#ignore': '#ignore' }, '#ignore': '#ignore' }

    # Submissions are a Job subtype — jobSubtype should be 'Submission'
    # (practitioner knowledge per 008 § 3.1 — sandbox-confirm)
    And match response.data.attributes.jobSubtype == '#? _ == "Submission" || _ == null'

  # ---------------------------------------------------------------------------
  Scenario: 401 Unauthorized — invalid bearer token on single-resource read
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/' + testJobId
    And header Authorization = 'Bearer invalid_token_for_contract_test'
    When method GET
    Then status 401

  # ---------------------------------------------------------------------------
  Scenario: 404 Not Found — unknown jobId returns 404, not 500
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs/__no_such_job__'
    When method GET
    Then status 404

    # 404 envelope must carry an error indicator (exact shape is sandbox-confirm)
    And match response == '#object'

  # ---------------------------------------------------------------------------
  Scenario: Composite API endpoint is reachable (smoke — no payload assertion)
  # The Composite read fan-out (contacts, locations, coverages) lands in a
  # post-guidewire-adj revision; this scenario confirms the endpoint accepts
  # POST before that implementation ships.
  # ---------------------------------------------------------------------------
    Given path '/composite/v1/composite'
    And header Content-Type = 'application/json'
    # Minimal valid Composite request body — empty requests list
    And request { requests: [] }
    When method POST
    # 200 OK with empty responses array, or 400 if the API rejects empty requests
    Then status '#? _ == 200 || _ == 400'
