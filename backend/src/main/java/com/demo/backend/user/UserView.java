package com.demo.backend.user;

import java.time.Instant;
import java.time.LocalDate;

public record UserView(Long id, String username, LocalDate birthday, String gender, Instant createdAt) {
    public static UserView of(Account account) {
        return new UserView(account.getId(), account.getUsername(), account.getBirthday(),
                account.getGender(), account.getCreatedAt());
    }
}
