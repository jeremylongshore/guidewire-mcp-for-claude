/**
 * auth-grant.js — OAuth 2.0 client-credentials helper
 *
 * Called from karate-config.js via karate.call(). Returns the full token
 * response JSON so karate-config can extract access_token, expires_in, etc.
 *
 * This runs in Nashorn / GraalJS — not Node.js. No require(). All HTTP is
 * done via karate.http() (Karate's built-in HTTP client, available in JS
 * helper scripts).
 *
 * Input (args injected by karate.call):
 *   args.tokenEndpoint  — full token URL
 *   args.clientId       — OAuth client ID
 *   args.clientSecret   — OAuth client secret
 *
 * Returns: parsed JSON from the token endpoint (access_token, token_type,
 *          expires_in, scope — per RFC 6749 § 5.1).
 *
 * Guidewire Hub OAuth reference:
 *   https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html
 *   (Palisades release — 202603)
 */
function fn(args) {
  var http = karate.http(args.tokenEndpoint);

  http.header('Content-Type', 'application/x-www-form-urlencoded');

  // RFC 6749 client-credentials grant — no PKCE needed for server-to-server
  var body = 'grant_type=client_credentials'
    + '&client_id='     + encodeURIComponent(args.clientId)
    + '&client_secret=' + encodeURIComponent(args.clientSecret);

  var response = http.post(body);

  if (response.status !== 200) {
    karate.log('auth-grant: token request failed — HTTP ' + response.status);
    return null;
  }

  return response.body;
}
