package com.demo.backend.user;

import com.demo.backend.auth.JsonRememberMeServices;
import com.demo.backend.auth.PageTokenService;
import com.demo.backend.auth.LoginThrottle;
import com.demo.backend.auth.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AccountController {
    public record SettingsView(LibraryDocument library) {}
    public record PasswordChange(@NotBlank @Size(max=128) String currentPassword, @NotBlank @Size(min=8,max=20) String password) {}
    public record DeleteAccount(@NotBlank @Size(max=128) String password, @NotBlank @Size(max=32) String confirmation) {}
    public record Remember(boolean remember) {}
    public record ExportView(Instant exportedAt, UserView account, LibraryDocument library) {}
    private final AccountSettingsService settings;
    private final AccountService accounts;
    private final PageTokenService tokens;
    private final JsonRememberMeServices remember;
    private final LoginThrottle throttle;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    public AccountController(AccountSettingsService settings, AccountService accounts, PageTokenService tokens, JsonRememberMeServices remember, LoginThrottle throttle, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.settings=settings; this.accounts=accounts; this.tokens=tokens; this.remember=remember; this.throttle=throttle; this.jdbc=jdbc;
    }
    @GetMapping("/account/settings") SettingsView get(Authentication auth) { return new SettingsView(settings.get(auth.getName())); }
    @PutMapping("/account/settings") SettingsView save(Authentication auth, @RequestBody LibraryDocument body) { return new SettingsView(settings.save(auth.getName(),body)); }
    @GetMapping("/account/devices") List<PageTokenService.Device> devices(Authentication auth, HttpServletRequest req) { return tokens.devices(auth.getName(),req.getHeader(PageTokenService.HEADER)); }
    private void remembered(Authentication auth, boolean enabled, HttpServletRequest req, HttpServletResponse res) {
        remember.logout(req,res,auth);
        if (enabled) { req.setAttribute(JsonRememberMeServices.REQUEST_ATTRIBUTE,true); remember.loginSuccess(req,res,auth); }
    }
    @PostMapping("/account/remember") @ResponseStatus(HttpStatus.NO_CONTENT)
    void remember(Authentication auth, @RequestBody Remember body, HttpServletRequest req, HttpServletResponse res) {
        synchronized (tokens) {
            remember.forgetCurrent(req,res,jdbc,auth.getName());
            if (body.remember()) { req.setAttribute(JsonRememberMeServices.REQUEST_ATTRIBUTE,true); remember.loginSuccess(req,res,auth); }
        }
    }
    @PostMapping("/account/devices/revoke-others") @ResponseStatus(HttpStatus.NO_CONTENT)
    void others(Authentication auth, @RequestBody Remember body, HttpServletRequest req, HttpServletResponse res) {
        synchronized (tokens) { tokens.revokeUser(auth.getName(),req.getHeader(PageTokenService.HEADER)); remembered(auth,body.remember(),req,res); }
    }
    @PostMapping("/account/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    void password(Authentication auth, @Valid @RequestBody PasswordChange body, HttpServletRequest req, HttpServletResponse res) {
        synchronized (tokens) {
            String key=AccountService.usernameKey(auth.getName()); throttle.check(key,req.getRemoteAddr());
            try { settings.password(auth.getName(),body.currentPassword(),body.password()); }
            catch (com.demo.backend.common.ApiException error) { if (error.code().equals("PASSWORD_INCORRECT")) throttle.failed(key,req.getRemoteAddr()); throw error; }
            throttle.succeeded(key); tokens.revokeUser(auth.getName(),null); logout(auth,req,res);
        }
    }
    @GetMapping("/account/export") ExportView export(Authentication auth) { return new ExportView(Instant.now(),accounts.view(auth.getName()),settings.get(auth.getName())); }
    @DeleteMapping("/account/history") @ResponseStatus(HttpStatus.NO_CONTENT) void history(Authentication auth) { settings.clearHistory(auth.getName()); }
    @DeleteMapping("/account") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @Valid @RequestBody DeleteAccount body, HttpServletRequest req, HttpServletResponse res) {
        synchronized (tokens) {
            String key=AccountService.usernameKey(auth.getName()); throttle.check(key,req.getRemoteAddr());
            try { settings.delete(auth.getName(),body.password(),body.confirmation()); }
            catch (com.demo.backend.common.ApiException error) { if (error.code().equals("PASSWORD_INCORRECT")) throttle.failed(key,req.getRemoteAddr()); throw error; }
            throttle.succeeded(key); tokens.revokeUser(auth.getName(),null); logout(auth,req,res);
        }
    }
    private void logout(Authentication auth, HttpServletRequest req, HttpServletResponse res) {
        new CookieClearingLogoutHandler("POETIC_REMEMBER","JSESSIONID").logout(req,res,auth);
        new SecurityContextLogoutHandler().logout(req,res,auth);
    }
    @GetMapping("/profiles/{username}") AccountSettingsService.PublicProfile profile(@PathVariable String username, Authentication auth) { return settings.publicProfile(username,auth.getName()); }
    @GetMapping("/profiles") List<AccountSettingsService.PublicProfile> search(@RequestParam String query, Authentication auth) { return settings.search(query,auth.getName()); }
}
