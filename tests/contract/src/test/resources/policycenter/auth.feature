@requiresCreds
Feature: auth — OAuth 2.0 client-credentials grant against Guidewire Hub

  # TS tool source: (no single tool — this is the foundation all tools depend on)
  #
  # Endpoint under test:
  #   POST {GUIDEWIRE_TOKEN_ENDPOINT}
  #   Content-Type: application/x-www-form-urlencoded
  #   Body: grant_type=client_credentials&client_id=...&client_secret=...
  #
  # Guidewire Hub OAuth reference (Palisades release 202603):
  #   https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html
  #
  # Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md
  # Per D-021: dev-tier credentials validate reachability; first integration
  # engagement validates production tenant behaviour.

  Background:
    # Skip the entire feature cleanly when creds are absent (D-022 requirement).
    # karate-config.js sets bearerToken=null and skipReason when any env var is missing.
    * if (!karate.get('bearerToken')) karate.abort()
    * url tokenEndpoint

  # ---------------------------------------------------------------------------
  Scenario: OAuth grant returns a valid JWT access token
  # ---------------------------------------------------------------------------
    Given path ''
    And header Content-Type = 'application/x-www-form-urlencoded'
    And request 'grant_type=client_credentials&client_id=' + clientId + '&client_secret=' + clientSecret
    When method POST
    Then status 200

    # Response envelope shape — RFC 6749 § 5.1
    And match response.token_type == '#string'
    And match response.access_token == '#string'
    And match response.expires_in == '#number'

    # Access token must be non-empty
    And assert response.access_token.length > 0

    # Lifetime must be at least 60 seconds (D-022: "lifetime >= 60 seconds")
    And assert response.expires_in >= 60

    # token_type is always Bearer for Guidewire Hub (case-insensitive per RFC 6749)
    And assert response.token_type.toLowerCase() == 'bearer'

  # ---------------------------------------------------------------------------
  Scenario: OAuth grant fails gracefully with invalid credentials (401 / 400)
  # ---------------------------------------------------------------------------
    Given path ''
    And header Content-Type = 'application/x-www-form-urlencoded'
    And request 'grant_type=client_credentials&client_id=invalid_client&client_secret=invalid_secret'
    When method POST
    # Guidewire Hub returns 401 Unauthorized for bad creds per RFC 6749 § 5.2;
    # some IdP implementations return 400 Bad Request — accept either.
    Then status '#? _ == 400 || _ == 401'

    # Error response shape — RFC 6749 § 5.2
    And match response.error == '#string'

  # ---------------------------------------------------------------------------
  Scenario: OAuth grant fails when grant_type is missing (400)
  # ---------------------------------------------------------------------------
    Given path ''
    And header Content-Type = 'application/x-www-form-urlencoded'
    And request 'client_id=' + clientId + '&client_secret=' + clientSecret
    When method POST
    Then status 400
    And match response.error == '#string'
