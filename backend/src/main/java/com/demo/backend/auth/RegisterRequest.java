package com.demo.backend.auth;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank(message = "请输入用户名")
        @Size(min = 4, max = 16, message = "用户名需为4–16位")
        @Pattern(regexp = "[\\p{L}\\p{N}_]+", message = "用户名只支持中文、英文、数字和下划线") String username,
        @NotBlank(message = "请输入密码")
        @Size(min = 8, max = 20, message = "密码需为8–20位") String password,
        @PastOrPresent(message = "生日不能晚于今天") LocalDate birthday,
        @Pattern(regexp = "男|女|其他|", message = "请选择有效性别") String gender,
        @NotNull(message = "请阅读并同意开发测试约定")
        @AssertTrue(message = "请阅读并同意开发测试约定") Boolean agreement,
        @NotBlank(message = "请重新阅读当前开发测试约定") String agreementVersion) {}
