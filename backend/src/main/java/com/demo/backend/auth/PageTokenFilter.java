package com.demo.backend.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public final class PageTokenFilter extends OncePerRequestFilter {
    private final PageTokenService tokens;
    public PageTokenFilter(PageTokenService tokens) { this.tokens = tokens; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = tokens.authenticate(request.getHeader(PageTokenService.HEADER));
        if (authentication != null) {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
        }
        chain.doFilter(request, response);
    }
}
