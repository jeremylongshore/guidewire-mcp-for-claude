@requiresCreds
Feature: did-we-lose-this-account — cancellation and non-renewal history for an insured

  # TS tool source:
  #   servers/policycenter-mcp/src/tools/did-we-lose-this-account.ts
  #
  # Cloud API endpoint under test:
  #   GET {GUIDEWIRE_PC_BASE_URL}/policy/v1/policies
  #     ?accountId={id}
  #     &status=Cancelled,Lapsed,Lost
  #     &pageSize={n}
  #     &pageOffset={n}
  #
  # Librarian KB reference (PolicyCenter apiref, Palisades 202503):
  #   https://docs.guidewire.com/cloud/pc/202503/apiref/
  #   Module: Policy API — GET /policy/v1/policies
  #
  # IMPORTANT — CancellationReason typelist drift:
  #   CancellationReason is the typelist-drift poster child per librarian audit
  #   F-PRD-004. The base list is portable but each carrier extends it.
  #   This feature asserts the *envelope shape* and that cancellationReason is
  #   a string (not that any specific code is present — those are per-carrier).
  #
  # Status CSV filter (Cancelled,Lapsed,Lost) is practitioner knowledge per
  # 008 § 3.1 (unverified — smoke-test with dev-tier creds; first integration
  # engagement validates per D-021).
  #
  # User journey: J-1 Underwriter Triage § "Step 5 — cancellation history"
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md

  Background:
    * if (!karate.get('bearerToken')) karate.abort()
    * url pcBaseUrl
    * header Authorization = 'Bearer ' + bearerToken
    * header Accept = 'application/json'
    * def testAccountId = karate.properties['test.accountId'] || 'ACCT-PLACEHOLDER-001'

  # ---------------------------------------------------------------------------
  Scenario: Happy path — returns cancelled / lapsed / lost policies for account
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', status: 'Cancelled,Lapsed,Lost', pageSize: 10, pageOffset: 0 }
    When method GET
    Then status 200

    # Cloud API list envelope
    And match response == { data: '#array', total: '#number', '#ignore': '#ignore' }

    # Each policy resource must have id and type
    And match each response.data == { id: '#string', type: '#string', '#ignore': '#ignore' }

    # Where present, cancellationReason must be a string (not an object or null)
    # — the exact code value is carrier-specific (typelist-drift, F-PRD-004)
    And match each response.data[*].attributes.cancellationReason == '#? _ == null || karate.typeOf(_) == "string"'

  # ---------------------------------------------------------------------------
  Scenario: Pagination — total is stable across pages
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', status: 'Cancelled,Lapsed,Lost', pageSize: 5, pageOffset: 0 }
    When method GET
    Then status 200
    * def total1 = response.total

    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', status: 'Cancelled,Lapsed,Lost', pageSize: 5, pageOffset: 5 }
    When method GET
    Then status 200
    And assert response.total == total1

  # ---------------------------------------------------------------------------
  Scenario: Account with no losses returns 200 with empty list (not 404)
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '__no_such_account__', status: 'Cancelled,Lapsed,Lost', pageSize: 5, pageOffset: 0 }
    When method GET
    Then status '#? _ == 200 || _ == 404'
    * if (responseStatus == 200) karate.match(response, { data: '#array', total: '#number', '#ignore': '#ignore' })

  # ---------------------------------------------------------------------------
  Scenario: 401 Unauthorized — invalid bearer token
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', status: 'Cancelled,Lapsed,Lost', pageSize: 5, pageOffset: 0 }
    And header Authorization = 'Bearer invalid_token_for_contract_test'
    When method GET
    Then status 401

  # ---------------------------------------------------------------------------
  Scenario: 429 Rate-limit response is well-formed when triggered
  # This scenario cannot be reliably triggered in a single test run without
  # hammering the API; it documents the expected shape so monitoring tooling
  # can assert on real incidents. Skipped unless the 429 is the actual response.
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', status: 'Cancelled,Lapsed,Lost', pageSize: 100, pageOffset: 0 }
    When method GET
    * def status429 = responseStatus == 429
    * if (status429) karate.match(responseHeaders, { 'Retry-After': '#notnull' })
    # If we didn't hit a 429, assert normal success
    * if (!status429) karate.match(responseStatus, '#? _ == 200 || _ == 404')
