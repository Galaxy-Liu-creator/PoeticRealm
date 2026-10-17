package com.demo.backend.user;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "app_users")
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 32)
    private String username;
    @Column(name = "username_key", nullable = false, unique = true, length = 64)
    private String usernameKey;
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;
    private LocalDate birthday;
    @Column(nullable = false, length = 8)
    private String gender;
    @Column(name = "agreement_version", nullable = false, length = 32)
    private String agreementVersion;
    @JdbcTypeCode(SqlTypes.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Account() {}
    public Account(String username, String usernameKey, String passwordHash,
                   LocalDate birthday, String gender, String agreementVersion) {
        this.username = username;
        this.usernameKey = usernameKey;
        this.passwordHash = passwordHash;
        this.birthday = birthday;
        this.gender = gender;
        this.agreementVersion = agreementVersion;
        this.createdAt = Instant.now();
    }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public LocalDate getBirthday() { return birthday; }
    public String getGender() { return gender; }
    public Instant getCreatedAt() { return createdAt; }
    public void updateDetails(LocalDate birthday, String gender) { this.birthday = birthday; this.gender = gender; }
    public void changePassword(String hash) { this.passwordHash = hash; }
}
