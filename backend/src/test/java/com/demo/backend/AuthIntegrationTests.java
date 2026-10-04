package com.demo.backend;

import com.demo.backend.user.AccountRepository;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTests {
    private static final AtomicInteger IDS = new AtomicInteger();
    private static final String PASSWORD = "Testpass123!";
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired AccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    private record Csrf(MockHttpSession session, String token) {}
    private String username() { return "testuser_" + IDS.incrementAndGet(); }
    private Csrf csrf(MockHttpSession session) throws Exception {
        var request = get("/api/v1/auth/csrf");
        if (session != null) request.session(session);
        MvcResult result = mvc.perform(request).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate")).andReturn();
        return new Csrf((MockHttpSession) result.getRequest().getSession(),
                json.readTree(result.getResponse().getContentAsString()).get("token").asString());
    }
    private MvcResult register(String username, Csrf csrf) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").session(csrf.session()).header("X-CSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "username", username, "password", PASSWORD, "agreement", true,
                        "agreementVersion", "2026-10-02-dev", "gender", "")))).andReturn();
    }
    private MvcResult login(String username, String password, boolean remember, Csrf csrf) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").session(csrf.session()).header("X-CSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "username", username, "password", password, "remember", remember)))).andReturn();
    }
    private Cookie persistentCookie(MvcResult result) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(cookie -> cookie.getName().equals("POETIC_REMEMBER") && cookie.getMaxAge() > 0)
                .reduce((first, last) -> last).orElseThrow();
    }
    @Test void registrationHashesPasswordsAndDoesNotAutomaticallyLogIn() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        MvcResult result = register(username, csrf);
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        assertThat(result.getResponse().getContentAsString()).doesNotContain(PASSWORD, "passwordHash", "password_hash");
        var account = accounts.findByUsernameKey(username).orElseThrow();
        assertThat(account.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(encoder.matches(PASSWORD, account.getPasswordHash())).isTrue();
        mvc.perform(get("/api/v1/auth/session").session(csrf.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void usernamesAreUniqueIgnoringCaseAndCompatibilityCharacters() throws Exception {
        Csrf csrf = csrf(null);
        String username = "CaseUser" + IDS.incrementAndGet();
        assertThat(register(username, csrf).getResponse().getStatus()).isEqualTo(201);
        assertThat(register(username.toLowerCase(), csrf).getResponse().getStatus()).isEqualTo(409);
        String fullWidth = username.chars().mapToObj(value -> String.valueOf((char) (value + 0xFEE0)))
                .reduce("", String::concat);
        assertThat(register(fullWidth, csrf).getResponse().getStatus()).isEqualTo(409);
    }
    @Test void invalidRegistrationIsRejectedWithoutCreatingAnAccount() throws Exception {
        Csrf csrf = csrf(null);
        long before = accounts.count();
        mvc.perform(post("/api/v1/auth/register").session(csrf.session()).header("X-CSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "username", username(), "password", "abcdefgh", "agreement", true,
                        "agreementVersion", "2026-10-02-dev"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
        mvc.perform(post("/api/v1/auth/register").session(csrf.session()).header("X-CSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "username", username(), "password", PASSWORD, "agreement", false,
                        "agreementVersion", "2026-10-02-dev"))))
                .andExpect(status().isBadRequest());
        assertThat(accounts.count()).isEqualTo(before);
    }
    @Test void mutationsRequireCsrfAndProtectedResponsesAreJson() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(header().doesNotExist("Location"));
    }
    @Test void loginChangesSessionIdRestoresIdentityAndRotatesCsrf() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        String originalId = csrf.session().getId();
        MvcResult login = login(username, PASSWORD, false, csrf);
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession();
        assertThat(session.getId()).isNotEqualTo(originalId);
        mvc.perform(get("/api/v1/auth/session").session(session))
                .andExpect(jsonPath("$.authenticated").value(true)).andExpect(jsonPath("$.user.username").value(username));
        mvc.perform(get("/api/v1/me?userId=99999").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(post("/api/v1/auth/logout").session(session).header("X-CSRF-TOKEN", csrf.token()))
                .andExpect(status().isForbidden());
        Csrf fresh = csrf(session);
        mvc.perform(post("/api/v1/auth/logout").session(session).header("X-CSRF-TOKEN", fresh.token()))
                .andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
    }
    @Test void badCredentialsUseTheSameErrorAndDoNotCreateAuthentication() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        MvcResult wrong = login(username, "wrongpass1", false, csrf);
        MvcResult missing = login("unknown_" + IDS.incrementAndGet(), "wrongpass1", false, csrf);
        assertThat(wrong.getResponse().getStatus()).isEqualTo(401);
        assertThat(missing.getResponse().getContentAsString()).isEqualTo(wrong.getResponse().getContentAsString());
        mvc.perform(get("/api/v1/auth/session").session(csrf.session()))
                .andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void rememberedLoginWorksWithoutTheSessionAndLogoutRevokesItsTokens() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        MvcResult logged = login(username, PASSWORD, true, csrf);
        Cookie cookie = persistentCookie(logged);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getMaxAge()).isEqualTo(30 * 24 * 60 * 60);
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        MvcResult restored = mvc.perform(get("/api/v1/auth/session").cookie(cookie))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.username").value(username)).andReturn();
        Cookie renewed = persistentCookie(restored);
        assertThat(renewed.getValue()).isNotEqualTo(cookie.getValue());
        Csrf fresh = csrf((MockHttpSession) restored.getRequest().getSession());
        mvc.perform(post("/api/v1/auth/logout").session(fresh.session()).cookie(renewed)
                .header("X-CSRF-TOKEN", fresh.token())).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username = ?", Integer.class, username)).isZero();
        mvc.perform(get("/api/v1/auth/session").cookie(renewed))
                .andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void unrememberedLoginDoesNotIssueAPersistentCredential() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        MvcResult logged = login(username, PASSWORD, false, csrf);
        assertThat(Arrays.stream(logged.getResponse().getCookies())
                .noneMatch(cookie -> cookie.getName().equals("POETIC_REMEMBER") && cookie.getMaxAge() > 0)).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username = ?", Integer.class, username)).isZero();
    }
    @Test void expiredRememberedCredentialsAreRejected() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        Cookie cookie = persistentCookie(login(username, PASSWORD, true, csrf));
        jdbc.update("UPDATE persistent_logins SET last_used = ? WHERE username = ?",
                Timestamp.from(Instant.now().minus(31, ChronoUnit.DAYS)), username);
        mvc.perform(get("/api/v1/auth/session").cookie(cookie))
                .andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void repeatedFailuresAreThrottledBeforeMorePasswordChecks() throws Exception {
        Csrf csrf = csrf(null);
        String username = username();
        register(username, csrf);
        for (int attempt = 0; attempt < 8; attempt++) {
            assertThat(login(username, "wrongpass1", false, csrf).getResponse().getStatus()).isEqualTo(401);
        }
        MvcResult limited = login(username, "wrongpass1", false, csrf);
        assertThat(limited.getResponse().getStatus()).isEqualTo(429);
        assertThat(limited.getResponse().getContentAsString()).contains("LOGIN_THROTTLED");
    }
}
