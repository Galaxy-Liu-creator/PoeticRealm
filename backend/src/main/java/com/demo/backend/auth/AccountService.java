package com.demo.backend.auth;

import com.demo.backend.common.ApiException;
import com.demo.backend.user.Account;
import com.demo.backend.user.AccountRepository;
import com.demo.backend.user.UserView;
import java.text.Normalizer;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AccountService implements UserDetailsService {
    public static final String AGREEMENT_VERSION = "2026-10-02-dev";
    private final AccountRepository accounts;
    private final PasswordEncoder encoder;
    public AccountService(AccountRepository accounts, PasswordEncoder encoder) {
        this.accounts = accounts;
        this.encoder = encoder;
    }
    public static String usernameKey(String username) {
        return Normalizer.normalize(username.strip(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    }
    public UserView register(RegisterRequest request) {
        if (!AGREEMENT_VERSION.equals(request.agreementVersion())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AGREEMENT_CHANGED", "开发测试约定已更新，请重新阅读");
        }
        String password = request.password();
        int types = (password.matches(".*[A-Za-z].*") ? 1 : 0)
                + (password.matches(".*[0-9].*") ? 1 : 0)
                + (password.matches("(?s).*[^A-Za-z0-9].*") ? 1 : 0);
        if (types < 2) throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD",
                "密码至少包含字母、数字和特殊字符中的两种");
        String key = usernameKey(request.username());
        try {
            Account account = accounts.saveAndFlush(new Account(request.username(), key,
                    encoder.encode(password), request.birthday(), request.gender() == null ? "" : request.gender(),
                    AGREEMENT_VERSION));
            return UserView.of(account);
        } catch (DataIntegrityViolationException error) {
            if (accounts.findByUsernameKey(key).isPresent()) {
                throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "这个用户名已被使用，请换一个");
            }
            throw error;
        }
    }
    @Override
    public UserDetails loadUserByUsername(String username) {
        Account account = accounts.findByUsernameKey(usernameKey(username))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
        return User.withUsername(account.getUsername()).password(account.getPasswordHash()).roles("USER").build();
    }
    public UserView view(String username) {
        return UserView.of(accounts.findByUsernameKey(usernameKey(username))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "登录已失效，请重新登录")));
    }
}
