package com.demo.backend;

import com.demo.backend.auth.AccountService;
import com.demo.backend.auth.RegisterRequest;
import com.demo.backend.user.Account;
import com.demo.backend.user.AccountRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountServiceTests {
    @Test
    void unrelatedDatabaseFailureIsNotReportedAsDuplicateUsername() {
        AccountRepository accounts = mock(AccountRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode("Testpass123!")).thenReturn("test-hash");
        DataIntegrityViolationException failure = new DataIntegrityViolationException("different constraint");
        when(accounts.saveAndFlush(any(Account.class))).thenThrow(failure);
        when(accounts.findByUsernameKey("测试旅人")).thenReturn(Optional.empty());
        AccountService service = new AccountService(accounts, encoder);
        RegisterRequest request = new RegisterRequest("测试旅人", "Testpass123!", null, "", true,
                AccountService.AGREEMENT_VERSION);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.register(request)));
    }
}
