package com.demo.backend.auth;

import com.demo.backend.common.ApiException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class LoginThrottle {
    private static final long WINDOW = Duration.ofMinutes(15).toMillis();
    private record Counter(long until, int failures) {}
    private final Map<String, Counter> failures = new HashMap<>();

    public synchronized void check(String username, String address) {
        long now = System.currentTimeMillis();
        failures.entrySet().removeIf(entry -> entry.getValue().until() <= now);
        if (failures.size() >= 10_000 || count("user:" + username) >= 8 || count("ip:" + address) >= 30) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LOGIN_THROTTLED", "尝试次数过多，请15分钟后重试");
        }
    }
    private int count(String key) { return failures.getOrDefault(key, new Counter(0, 0)).failures(); }
    public synchronized void failed(String username, String address) {
        increment("user:" + username);
        increment("ip:" + address);
    }
    private void increment(String key) {
        Counter old = failures.get(key);
        failures.put(key, new Counter(old == null ? System.currentTimeMillis() + WINDOW : old.until(), count(key) + 1));
    }
    public synchronized void succeeded(String username) { failures.remove("user:" + username); }
}
