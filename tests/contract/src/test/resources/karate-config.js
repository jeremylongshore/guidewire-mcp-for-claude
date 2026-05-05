/**
 * karate-config.js — Guidewire MCP Cloud API Contract Suite
 *
 * This file runs once before ANY feature. It is executed by Karate's built-in
 * Nashorn / GraalJS JavaScript engine — NOT Node.js. Do not use Node-only APIs
 * (require, process, Buffer, etc.). Use karate.properties[] for JVM system
 * properties and java.lang.System.getenv() for environment variables.
 *
 * Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md
 *
 * -------------------------------------------------------------------------
 * Environment variables expected
 * -------------------------------------------------------------------------
 * GUIDEWIRE_OAUTH_CLIENT_ID     — OAuth 2.0 client ID from Guidewire Hub
 * GUIDEWIRE_OAUTH_CLIENT_SECRET — OAuth 2.0 client secret
 * GUIDEWIRE_TOKEN_ENDPOINT      — Full token URL, e.g.:
 *                                  https://<tenant>.guidewire.net/oauth2/v1/token
 * GUIDEWIRE_PC_BASE_URL         — PolicyCenter Cloud API base, e.g.:
 *                                  https://<tenant>.guidewire.net/pc
 *
 * When any of the above is absent the config sets skipReason and every
 * @requiresCreds feature aborts cleanly via its Background: step. Per D-022:
 * "skip cleanly when creds not present, never silently degrade to a green check".
 * -------------------------------------------------------------------------
 */
function fn() {

  // ---------------------------------------------------------------------------
  // 1. Read the 4 required env vars via the Nashorn-safe Java call
  // ---------------------------------------------------------------------------
  var Env = java.lang.System;

  var clientId     = Env.getenv('GUIDEWIRE_OAUTH_CLIENT_ID')     || '';
  var clientSecret = Env.getenv('GUIDEWIRE_OAUTH_CLIENT_SECRET') || '';
  var tokenEndpoint = Env.getenv('GUIDEWIRE_TOKEN_ENDPOINT')     || '';
  var pcBaseUrl    = Env.getenv('GUIDEWIRE_PC_BASE_URL')         || '';

  // ---------------------------------------------------------------------------
  // 2. Build the config object — all features read from karate.config.*
  // ---------------------------------------------------------------------------
  var config = {
    clientId:      clientId,
    clientSecret:  clientSecret,
    tokenEndpoint: tokenEndpoint,
    pcBaseUrl:     pcBaseUrl,
    bearerToken:   null,    // populated below when creds are present
    skipReason:    null     // populated below when creds are absent
  };

  // ---------------------------------------------------------------------------
  // 3. Guard: if any required var is missing, mark skipReason and return early.
  //    Feature files tagged @requiresCreds check this via Background:
  //      * if (!karate.get('bearerToken')) karate.abort()
  // ---------------------------------------------------------------------------
  if (!clientId || !clientSecret || !tokenEndpoint || !pcBaseUrl) {
    config.skipReason = [
      'SKIP — one or more required env vars are unset.',
      '  GUIDEWIRE_OAUTH_CLIENT_ID:     ' + (clientId     ? 'set' : 'MISSING'),
      '  GUIDEWIRE_OAUTH_CLIENT_SECRET: ' + (clientSecret ? 'set' : 'MISSING'),
      '  GUIDEWIRE_TOKEN_ENDPOINT:      ' + (tokenEndpoint ? 'set' : 'MISSING'),
      '  GUIDEWIRE_PC_BASE_URL:         ' + (pcBaseUrl    ? 'set' : 'MISSING'),
      'Set the 4 GUIDEWIRE_* env vars to run @requiresCreds features.',
    ].join('\n');

    karate.log(config.skipReason);
    // Return immediately — no HTTP call attempted
    return config;
  }

  // ---------------------------------------------------------------------------
  // 4. Perform the OAuth 2.0 client-credentials grant ONCE.
  //    The bearer token is cached in config.bearerToken so every feature
  //    reuses the same access token for the lifetime of the test run.
  //    This avoids per-feature token requests and reduces rate-limit risk.
  //
  //    Per D-022 and the librarian KB (005-DR-REF § OAuth + Hub):
  //      POST {tokenEndpoint}
  //      Content-Type: application/x-www-form-urlencoded
  //      Body: grant_type=client_credentials
  //            &client_id={clientId}
  //            &client_secret={clientSecret}
  // ---------------------------------------------------------------------------
  var tokenResponse = karate.call('classpath:policycenter/auth-grant.js', {
    tokenEndpoint: tokenEndpoint,
    clientId:      clientId,
    clientSecret:  clientSecret
  });

  if (tokenResponse && tokenResponse.access_token) {
    config.bearerToken = tokenResponse.access_token;
    karate.log('karate-config: OAuth grant succeeded; token cached for test run.');
  } else {
    config.skipReason = 'karate-config: OAuth grant returned no access_token — check creds and token endpoint.';
    config.bearerToken = null;
    karate.log(config.skipReason);
  }

  return config;
}
