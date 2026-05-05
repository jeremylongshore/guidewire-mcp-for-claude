package com.intentsolutions.guidewire.contract;

import com.intuit.karate.junit5.Karate;

/**
 * JUnit 5 entry point for the Guidewire Cloud API contract suite.
 *
 * <p>Karate discovers all {@code .feature} files on the classpath relative to
 * this class (i.e., everything under {@code src/test/resources/}) and runs them
 * in parallel by feature file. Parallelism is controlled by {@code parallelScenarios}
 * in the runner; the default here is {@code false} — scenarios within a feature run
 * sequentially so the OAuth token obtained in {@code auth.feature} is warmed first.
 *
 * <p>Run via Gradle: {@code ./gradlew test}
 * <p>Decision record: D-022 in {@code 000-docs/004-DR-DEC-architecture-decisions.md}
 */
class KarateRunner {

    @Karate.Test
    Karate testAll() {
        return Karate.run().relativeTo(getClass());
    }
}
