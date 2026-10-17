package com.demo.backend;

import org.springframework.boot.SpringApplication;

/** Isolated browser-test server; this class and H2 are excluded from the production jar. */
public class AuthTestApplication {
    public static void main(String[] args) {
        System.setProperty("spring.devtools.restart.enabled", "false");
        var application = new SpringApplication(BackendApplication.class);
        application.setAdditionalProfiles("test");
        application.run(args);
    }
}
