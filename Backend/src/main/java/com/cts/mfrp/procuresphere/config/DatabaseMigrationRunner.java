package com.cts.mfrp.procuresphere.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Runs once at startup to clean up stale CHECK constraints that Hibernate 6
 * auto-generated for enum columns. Without this, adding a new enum value is
 * rejected by the old CHECK constraint even though the Java enum allows it
 * (ddl-auto=update does not drop/rewrite existing CHECK constraints).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    private static final List<String> TABLES = List.of(
            "users", "orders", "deliveries", "products", "notifications", "categories"
    );

    @Override
    public void run(String... args) {
        for (String table : TABLES) dropStaleCheckConstraints(table);
    }

    private void dropStaleCheckConstraints(String tableName) {
        try {
            List<String> constraintNames = jdbcTemplate.queryForList(
                    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS " +
                            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'",
                    String.class, tableName);

            for (String name : constraintNames) {
                try {
                    jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP CHECK `" + name + "`");
                    log.info("Dropped stale CHECK constraint on {}: {}", tableName, name);
                } catch (Exception e) {
                    log.debug("Could not drop check constraint {} on {}: {}", name, tableName, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("Skipping CHECK-constraint cleanup on {}: {}", tableName, e.getMessage());
        }
    }
}
