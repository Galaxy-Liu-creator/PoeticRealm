package com.demo.backend.auth;

import com.demo.backend.user.UserView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    public record SessionView(boolean authenticated, UserView user, String token, String lease) {}
    public record RememberedView(boolean remembered, String username) {}
    public record RememberedLogin(boolean remember) {}
    public record ReleaseRequest(String token, String lease) {}
    public record CsrfView(String headerName, String token) {}
    private final AccountService accounts;
    private final AuthenticationManager manager;
    private final SecurityContextRepository contexts;
    private final SessionAuthenticationStrategy sessions;
    private final JsonRememberMeServices remember;
    private final LoginThrottle throttle;
    private final PageTokenService tokens;
    public AuthController(AccountService accounts, AuthenticationManager manager, SecurityContextRepository contexts,
                          SessionAuthenticationStrategy sessions, JsonRememberMeServices remember, LoginThrottle throttle, PageTokenService tokens) {
        this.accounts = accounts; this.manager = manager; this.contexts = contexts;
        this.sessions = sessions; this.remember = remember; this.throttle = throttle;
        this.tokens = tokens;
    }
    @GetMapping("/auth/csrf")
    CsrfView csrf(CsrfToken token) { return new CsrfView(token.getHeaderName(), token.getToken()); }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    UserView register(@Valid @RequestBody RegisterRequest request) { return accounts.register(request); }
    @PostMapping("/auth/login")
    SessionView login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        synchronized (tokens) {
        String key = AccountService.usernameKey(body.username());
        throttle.check(key, request.getRemoteAddr());
        Authentication authentication;
        try {
            authentication = manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(body.username(), body.password()));
        } catch (AuthenticationException error) {
            throttle.failed(key, request.getRemoteAddr());
            throw error;
        }
        throttle.succeeded(key);
        // Clear an older persistent login before issuing the requested new one.
        remember.logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        var result = begin(authentication, request, response);
        request.setAttribute(JsonRememberMeServices.REQUEST_ATTRIBUTE, body.remember());
        remember.loginSuccess(request, response, authentication);
        return result;
        }
    }
    private SessionView begin(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        tokens.revoke(request.getHeader(PageTokenService.HEADER));
        sessions.onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        var issued = tokens.issue(authentication, request.getHeader("User-Agent"));
        return new SessionView(true, accounts.view(authentication.getName()), issued.token(), issued.lease());
    }
    @GetMapping("/auth/session")
    SessionView session(HttpServletRequest request) {
        var resumed = tokens.resume(request.getHeader(PageTokenService.HEADER), request.getHeader(PageTokenService.LEASE_HEADER),
                "1".equals(request.getHeader("X-POETIC-RELOAD")));
        return resumed != null ? new SessionView(true, accounts.view(resumed.authentication().getName()), resumed.token(), resumed.lease())
                : new SessionView(false, null, null, null);
    }
    @GetMapping("/auth/remembered")
    RememberedView remembered(HttpServletRequest request, HttpServletResponse response) {
        var authentication = rememberedAuthentication(request, response);
        return new RememberedView(authentication != null, authentication == null ? null : accounts.view(authentication.getName()).username());
    }
    private Authentication rememberedAuthentication(HttpServletRequest request, HttpServletResponse response) {
        var authentication = remember.autoLogin(request, response);
        if (authentication == null) return null;
        try { return manager.authenticate(authentication); }
        catch (AuthenticationException error) { remember.logout(request, response, authentication); return null; }
    }
    @PostMapping("/auth/login-remembered")
    SessionView loginRemembered(@RequestBody RememberedLogin body, HttpServletRequest request, HttpServletResponse response) {
        synchronized (tokens) {
        var authentication = rememberedAuthentication(request, response);
        if (authentication == null) throw new BadCredentialsException("Remembered credentials expired");
        var result = begin(authentication, request, response);
        if (!body.remember()) remember.logout(request, response, authentication);
        return result;
        }
    }
    @PostMapping("/auth/release") @ResponseStatus(HttpStatus.NO_CONTENT)
    void release(@RequestBody ReleaseRequest body) { tokens.release(body.token(), body.lease()); }
    @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        tokens.revoke(request.getHeader(PageTokenService.HEADER));
        remember.logout(request, response, authentication);
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        new CookieClearingLogoutHandler("JSESSIONID").logout(request, response, authentication);
    }
    @GetMapping("/me")
    UserView me(Authentication authentication) { return accounts.view(authentication.getName()); }
}
