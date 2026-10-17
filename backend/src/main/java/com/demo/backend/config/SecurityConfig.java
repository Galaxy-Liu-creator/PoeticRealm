package com.demo.backend.config;

import com.demo.backend.auth.AccountService;
import com.demo.backend.auth.JsonRememberMeServices;
import com.demo.backend.auth.PageTokenService;
import com.demo.backend.auth.PageTokenFilter;
import com.demo.backend.common.ApiError;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.RememberMeAuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.authentication.session.*;
import org.springframework.security.web.savedrequest.NullRequestCache;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean SecurityContextRepository securityContextRepository() {
        return new NullSecurityContextRepository();
    }
    @Bean HttpSessionCsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }
    @Bean SessionAuthenticationStrategy sessionAuthenticationStrategy(HttpSessionCsrfTokenRepository csrf) {
        return new CompositeSessionAuthenticationStrategy(List.of(new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrf)));
    }
    @Bean JdbcTokenRepositoryImpl persistentTokens(DataSource dataSource) {
        var repository = new JdbcTokenRepositoryImpl();
        repository.setDataSource(dataSource);
        return repository;
    }
    @Bean JsonRememberMeServices rememberMeServices(AccountService accounts, JdbcTokenRepositoryImpl tokens,
            @Value("${app.auth.remember-me-key}") String key, @Value("${app.auth.secure-cookie}") boolean secure) {
        if (key.length() < 32) throw new IllegalArgumentException("REMEMBER_ME_KEY must contain at least 32 characters");
        var service = new JsonRememberMeServices(key, accounts, tokens);
        service.setTokenValiditySeconds(30 * 24 * 60 * 60);
        service.setUseSecureCookie(secure);
        service.setCookieName("POETIC_REMEMBER");
        service.setCookieCustomizer(cookie -> cookie.setAttribute("SameSite", "Lax"));
        return service;
    }
    @Bean AuthenticationManager authenticationManager(AccountService accounts, PasswordEncoder encoder,
            @Value("${app.auth.remember-me-key}") String key) {
        var dao = new DaoAuthenticationProvider(accounts);
        dao.setPasswordEncoder(encoder);
        return new ProviderManager(List.of(dao, new RememberMeAuthenticationProvider(key)));
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, AuthenticationManager manager,
            SecurityContextRepository contexts, HttpSessionCsrfTokenRepository csrf,
            SessionAuthenticationStrategy sessions, PageTokenService tokens,
            JsonMapper json) throws Exception {
        http.authenticationManager(manager)
                .securityContext(context -> context.securityContextRepository(contexts))
                .sessionManagement(session -> session.sessionAuthenticationStrategy(sessions))
                .csrf(config -> config.csrfTokenRepository(csrf).ignoringRequestMatchers("/api/v1/auth/release"))
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf", "/api/v1/auth/session", "/api/v1/auth/remembered", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/login-remembered", "/api/v1/auth/release").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) ->
                                writeError(json, response, 401, new ApiError("UNAUTHENTICATED", "请先登录")))
                        .accessDeniedHandler((request, response, exception) -> writeError(json, response, 403,
                                exception instanceof CsrfException
                                        ? new ApiError("CSRF_INVALID", "页面验证已失效，请重新提交")
                                        : new ApiError("FORBIDDEN", "无权执行此操作"))))
                .addFilterAfter(new PageTokenFilter(tokens), SecurityContextHolderFilter.class)
                .logout(logout -> logout.disable());
        return http.build();
    }
    private static void writeError(JsonMapper json, HttpServletResponse response, int status, ApiError error)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        json.writeValue(response.getWriter(), error);
    }
}
