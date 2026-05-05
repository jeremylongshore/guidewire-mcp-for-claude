/**
 * Guidewire MCP — Cloud API Contract Tests (Karate / JUnit 5)
 *
 * This Gradle build is intentionally minimal. It is a contract-test scaffold,
 * not a Java application. No Spring Boot, Hibernate, Lombok, or other
 * application-server deps.
 *
 * Decision record: D-022 in 000-docs/004-DR-DEC-architecture-decisions.md
 *
 * Runtime requirements:
 *   JDK 11   — Guidewire's documented Cloud API runtime (D-022 § "Polyglot dev story")
 *   Gradle 8 — pinned via gradle-wrapper.properties
 *
 * Run:
 *   ./gradlew test              — run the full Karate suite (skips cleanly when creds absent)
 *   ./gradlew karateRecord      — run in no-fail recording mode (captures baseline payloads)
 *   ./gradlew clean test        — clean slate re-run
 */

plugins {
    java
}

group = "com.intentsolutions.guidewire"
version = "0.1.0"

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

repositories {
    mavenCentral()
}

val karateVersion = "1.5.0"
val junitVersion = "5.10.3"

dependencies {
    // Karate JUnit 5 runner — includes karate-core, karate-apache (HTTP), karate-gatling
    testImplementation("com.intuit.karate:karate-junit5:$karateVersion")

    // JUnit Jupiter — kept explicit so tooling picks up the version cleanly
    testImplementation("org.junit.jupiter:junit-jupiter-api:$junitVersion")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:$junitVersion")
}

// ---------------------------------------------------------------------------
// Test task — standard run; Karate skips @requiresCreds features cleanly when
// GUIDEWIRE_OAUTH_CLIENT_ID env var is absent (see karate-config.js).
// ---------------------------------------------------------------------------
tasks.test {
    useJUnitPlatform()

    // Karate forks per-feature by default when parallel() is set in the runner.
    // Pass heap headroom for the JVM that loads the Karate runtime + GraalJS.
    jvmArgs("-Xmx512m")

    // Surface test output in the Gradle console (useful in CI log tails)
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }

    // Make the 4 OAuth env vars available to the Karate JVM process.
    // Values are injected by CI (GitHub Actions secrets); locally they come
    // from the developer's shell environment.
    environment("GUIDEWIRE_OAUTH_CLIENT_ID",     System.getenv("GUIDEWIRE_OAUTH_CLIENT_ID")     ?: "")
    environment("GUIDEWIRE_OAUTH_CLIENT_SECRET", System.getenv("GUIDEWIRE_OAUTH_CLIENT_SECRET") ?: "")
    environment("GUIDEWIRE_TOKEN_ENDPOINT",      System.getenv("GUIDEWIRE_TOKEN_ENDPOINT")      ?: "")
    environment("GUIDEWIRE_PC_BASE_URL",         System.getenv("GUIDEWIRE_PC_BASE_URL")         ?: "")
}

// ---------------------------------------------------------------------------
// karateRecord task — runs in no-fail mode so partial results are written even
// when some scenarios fail (useful when capturing baseline payloads against a
// newly provisioned dev-tier tenant).
// ---------------------------------------------------------------------------
tasks.register<Test>("karateRecord") {
    group = "verification"
    description = "Run Karate in record mode (no-fail); captures baseline payloads in karate-recordings/."

    useJUnitPlatform()
    jvmArgs("-Xmx512m")

    // karate.options --no-fail allows all scenarios to run without aborting on
    // the first failure. The suite still writes results to karate-results/.
    systemProperty("karate.options", "--no-fail")

    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }

    environment("GUIDEWIRE_OAUTH_CLIENT_ID",     System.getenv("GUIDEWIRE_OAUTH_CLIENT_ID")     ?: "")
    environment("GUIDEWIRE_OAUTH_CLIENT_SECRET", System.getenv("GUIDEWIRE_OAUTH_CLIENT_SECRET") ?: "")
    environment("GUIDEWIRE_TOKEN_ENDPOINT",      System.getenv("GUIDEWIRE_TOKEN_ENDPOINT")      ?: "")
    environment("GUIDEWIRE_PC_BASE_URL",         System.getenv("GUIDEWIRE_PC_BASE_URL")         ?: "")
}
