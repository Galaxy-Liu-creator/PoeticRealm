package com.demo.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;

public class JsonRememberMeServices extends PersistentTokenBasedRememberMeServices {
    public static final String REQUEST_ATTRIBUTE = JsonRememberMeServices.class.getName() + ".remember";
    public JsonRememberMeServices(String key, UserDetailsService users, PersistentTokenRepository tokens) {
        super(key, users, tokens);
    }
    @Override
    protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
        return Boolean.TRUE.equals(request.getAttribute(REQUEST_ATTRIBUTE));
    }
    public void forgetCurrent(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response,
                              org.springframework.jdbc.core.JdbcTemplate jdbc, String username) {
        String cookie = extractRememberMeCookie(request);
        if (cookie != null) {
            try {
                String[] parts = decodeCookie(cookie);
                if (parts.length == 2) jdbc.update("DELETE FROM persistent_logins WHERE series=? AND username=?",parts[0],username);
            } catch (org.springframework.security.web.authentication.rememberme.InvalidCookieException ignored) { }
        }
        cancelCookie(request,response);
    }
}
