package com.demo.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "请输入用户名") @Size(max = 64) String username,
        @NotBlank(message = "请输入密码") @Size(max = 20) String password,
        boolean remember) {}
