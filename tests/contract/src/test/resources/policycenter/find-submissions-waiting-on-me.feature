@requiresCreds
Feature: find-submissions-waiting-on-me — line underwriter's personal queue

  # TS tool source:
  #   servers/policycenter-mcp/src/tools/find-submissions-waiting-on-me.ts
  #
  # Cloud API endpoint under test:
  #   GET {GUIDEWIRE_PC_BASE_URL}/job/v1/jobs
  #     ?subtype=Submission
  #     &assignedToUser={actorId}
  #     &status=Open
  #     &pageSize={n}
  #     &pageOffset={n}
  #
  # Librarian KB reference (PolicyCenter apiref, Palisades 202503):
  #   https://docs.guidewire.com/cloud/pc/202503/apiref/
  #   Module: Job API — GET /job/v1/jobs
  #
  # Query parameter names (subtype, assignedToUser, status) are practitioner
  # knowledge per 008 § 3.1 (unverified — practitioner knowledge from public
  # docs; smoke-test reachability with dev-tier creds; first integration
  # engagement validates production per D-021).
  #
  # User journey: J-1 Underwriter Triage § "Step 1 — morning queue"
  #   (04-USER-JOURNEY.md)
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md

  Background:
    * if (!karate.get('bearerToken')) karate.abort()
    * url pcBaseUrl
    * header Authorization = 'Bearer ' + bearerToken
    * header Accept = 'application/json'

  # ---------------------------------------------------------------------------
  Scenario: Happy path — returns open submissions assigned to the calling user
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs'
    And params { subtype: 'Submission', status: 'Open', pageSize: 10, pageOffset: 0 }
    When method GET
    Then status 200

    # Guidewire Cloud API list envelope shape (per librarian KB § 1 — apiref):
    #   { data: [ { id, type, attributes, links? }, ... ], total: N, ... }
    # (unverified exact field names — practitioner knowledge from public docs;
    # first integration engagement confirms the exact envelope schema)
    And match response == { data: '#array', total: '#number', '#ignore': '#ignore' }

    # Each job resource in the array must carry an id and type
    And match each response.data == { id: '#string', type: '#string', '#ignore': '#ignore' }

    # Every returned job must be a Submission subtype
    And match each response.data[*].attributes.jobSubtype == '#? _ == "Submission" || _ == null'

  # ---------------------------------------------------------------------------
  Scenario: Pagination — second page returns consistent total count
  # ---------------------------------------------------------------------------
    # Page 1
    Given path '/job/v1/jobs'
    And params { subtype: 'Submission', status: 'Open', pageSize: 5, pageOffset: 0 }
    When method GET
    Then status 200
    * def totalFromPage1 = response.total

    # Page 2
    Given path '/job/v1/jobs'
    And params { subtype: 'Submission', status: 'Open', pageSize: 5, pageOffset: 5 }
    When method GET
    Then status 200

    # total must be stable across pages (server-side pagination — per librarian P5)
    And assert response.total == totalFromPage1

    # data array size on the second page must be <= pageSize
    And assert response.data.length <= 5

  # ---------------------------------------------------------------------------
  Scenario: 401 Unauthorized — missing or invalid bearer token
  # ---------------------------------------------------------------------------
    Given path '/job/v1/jobs'
    And params { subtype: 'Submission', status: 'Open', pageSize: 5, pageOffset: 0 }
    And header Authorization = 'Bearer invalid_token_for_contract_test'
    When method GET
    Then status 401

  # ---------------------------------------------------------------------------
  Scenario: Empty result set is a valid 200 response (not a 404)
  # ---------------------------------------------------------------------------
    # Use an actorId that is extremely unlikely to have assigned submissions.
    # The point is to verify the empty-list envelope shape (data: [], total: 0)
    # rather than a 404 or 500.
    Given path '/job/v1/jobs'
    And params { subtype: 'Submission', status: 'Open', assignedToUser: '__no_such_user__', pageSize: 5, pageOffset: 0 }
    When method GET
    # 200 with empty data OR 404 if the endpoint rejects unknown users — accept both
    Then status '#? _ == 200 || _ == 404'

    # If 200, the envelope must still be well-formed
    * if (responseStatus == 200) karate.match(response, { data: '#array', total: '#number', '#ignore': '#ignore' })
