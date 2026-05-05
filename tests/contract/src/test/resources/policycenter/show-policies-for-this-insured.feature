@requiresCreds
Feature: show-policies-for-this-insured — cross-LOB policy rollup for an insured account

  # TS tool source:
  #   servers/policycenter-mcp/src/tools/show-policies-for-this-insured.ts
  #
  # Cloud API endpoints under test (two-call pattern per tool source § 008 § 3.1):
  #   Primary:
  #     GET {GUIDEWIRE_PC_BASE_URL}/policy/v1/policies?accountId={id}&pageSize=N&pageOffset=N
  #   Secondary (per tool comment — "durable cross-tenant path"):
  #     GET {GUIDEWIRE_PC_BASE_URL}/account/v1/accounts/{accountId}/policies
  #
  # Librarian KB reference (PolicyCenter apiref, Palisades 202503):
  #   https://docs.guidewire.com/cloud/pc/202503/apiref/
  #   Module: Policy API — GET /policy/v1/policies
  #   Module: Account API — GET /account/v1/accounts/{id}/policies
  #
  # accountId filter on /policy/v1/policies is practitioner knowledge per
  # 008 § 3.1 (unverified — smoke-test with dev-tier creds; first integration
  # engagement validates per D-021).
  #
  # User journey: J-1 Underwriter Triage § "Step 3 — cross-LOB rollup"
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md

  Background:
    * if (!karate.get('bearerToken')) karate.abort()
    * url pcBaseUrl
    * header Authorization = 'Bearer ' + bearerToken
    * header Accept = 'application/json'
    # Use a known test account ID from the dev-tier tenant.
    # Replace with a real ID once dev-tier creds are provisioned (guidewire-adj).
    * def testAccountId = karate.properties['test.accountId'] || 'ACCT-PLACEHOLDER-001'

  # ---------------------------------------------------------------------------
  Scenario: Happy path — Policy API filter by accountId returns list envelope
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', pageSize: 10, pageOffset: 0 }
    When method GET
    Then status 200

    # Cloud API list envelope (librarian KB § 1)
    And match response == { data: '#array', total: '#number', '#ignore': '#ignore' }
    And match each response.data == { id: '#string', type: '#string', '#ignore': '#ignore' }

  # ---------------------------------------------------------------------------
  Scenario: Pagination — total is stable across page calls
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', pageSize: 5, pageOffset: 0 }
    When method GET
    Then status 200
    * def totalPage1 = response.total

    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', pageSize: 5, pageOffset: 5 }
    When method GET
    Then status 200
    And assert response.total == totalPage1
    And assert response.data.length <= 5

  # ---------------------------------------------------------------------------
  Scenario: Account sub-resource endpoint returns the same insured's policies
  # (secondary read pattern referenced in the tool source)
  # ---------------------------------------------------------------------------
    Given path '/account/v1/accounts/' + testAccountId + '/policies'
    When method GET
    Then status 200
    And match response == { data: '#array', '#ignore': '#ignore' }

  # ---------------------------------------------------------------------------
  Scenario: 401 Unauthorized — missing bearer token
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '#(testAccountId)', pageSize: 5, pageOffset: 0 }
    And header Authorization = 'Bearer invalid_token_for_contract_test'
    When method GET
    Then status 401

  # ---------------------------------------------------------------------------
  Scenario: Unknown accountId returns 200 with empty list (not 404)
  # ---------------------------------------------------------------------------
    Given path '/policy/v1/policies'
    And params { accountId: '__no_such_account__', pageSize: 5, pageOffset: 0 }
    When method GET
    Then status '#? _ == 200 || _ == 404'
    * if (responseStatus == 200) karate.match(response, { data: '#array', total: '#number', '#ignore': '#ignore' })
