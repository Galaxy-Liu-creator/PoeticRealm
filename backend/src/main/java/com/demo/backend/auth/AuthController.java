package com.demo.backend.auth;

import com.demo.backend.user.UserView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    public record SessionView(boolean authenticated, UserView user) {}
    public record CsrfView(String headerName, String token) {}
    private final AccountService accounts;
    private final AuthenticationManager manager;
    private final SecurityContextRepository contexts;
    private final SessionAuthenticationStrategy sessions;
    private final JsonRememberMeServices remember;
    private final LoginThrottle throttle;
    public AuthController(AccountService accounts, AuthenticationManager manager, SecurityContextRepository contexts,
                          SessionAuthenticationStrategy sessions, JsonRememberMeServices remember, LoginThrottle throttle) {
        this.accounts = accounts; this.manager = manager; this.contexts = contexts;
        this.sessions = sessions; this.remember = remember; this.throttle = throttle;
    }
    @GetMapping("/auth/csrf")
    CsrfView csrf(CsrfToken token) { return new CsrfView(token.getHeaderName(), token.getToken()); }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    UserView register(@Valid @RequestBody RegisterRequest request) { return accounts.register(request); }
    @PostMapping("/auth/login")
    SessionView login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
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
        sessions.onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        request.setAttribute(JsonRememberMeServices.REQUEST_ATTRIBUTE, body.remember());
        remember.loginSuccess(request, response, authentication);
        return new SessionView(true, accounts.view(authentication.getName()));
    }
    @GetMapping("/auth/session")
    SessionView session(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)
                ? new SessionView(true, accounts.view(authentication.getName())) : new SessionView(false, null);
    }
    @GetMapping("/me")
    UserView me(Authentication authentication) { return accounts.view(authentication.getName()); }
}
