package com.demo.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** Access belongs to a single browser tab; remember-me cookies never grant API access. */
@Service
public class PageTokenService {
    public static final String HEADER = "X-POETIC-TOKEN";
    public static final String LEASE_HEADER = "X-POETIC-LEASE";
    private static final long IDLE = Duration.ofMinutes(30).toMillis();
    private static final long RELOAD_GRACE = Duration.ofSeconds(15).toMillis();
    public record Issued(String token, String lease) {}
    public record Resumed(Authentication authentication, String token, String lease) {}
    public record Device(String id, String agent, Instant signedInAt, Instant lastSeenAt, boolean current) {}
    private record Entry(Authentication authentication, String lease, long expiresAt, boolean released, String id, String agent, long signedInAt, long lastSeenAt) {}
    private final ConcurrentHashMap<String, Entry> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;
    public PageTokenService() { this(Clock.systemUTC()); }
    PageTokenService(Clock clock) { this.clock = clock; }
    public synchronized Issued issue(Authentication authentication) {
        return issue(authentication, "Unknown browser");
    }
    public synchronized Issued issue(Authentication authentication, String agent) {
        long now = clock.millis();
        tokens.entrySet().removeIf(entry -> entry.getValue().expiresAt <= now);
        String token = secret(), lease = secret();
        tokens.put(hash(token), new Entry(authentication, lease, now + IDLE, false, secret(), agent == null ? "Unknown browser" : agent.substring(0, Math.min(agent.length(), 300)), now, now));
        return new Issued(token, lease);
    }
    public synchronized Authentication authenticate(String token) {
        if (!valid(token)) return null;
        Entry entry = tokens.get(hash(token));
        if (entry == null) return null;
        if (entry.expiresAt <= clock.millis()) { tokens.remove(hash(token), entry); return null; }
        return entry.released ? null : entry.authentication;
    }
    /** A reload obtains a fresh lease, so a delayed beacon from the old document is harmless. */
    public synchronized Resumed resume(String token, String previousLease) {
        return resume(token, previousLease, false);
    }
    public synchronized Resumed resume(String token, String previousLease, boolean newDocument) {
        if (!valid(token) || !valid(previousLease)) return null;
        Entry old = tokens.get(hash(token));
        if (old == null || old.expiresAt <= clock.millis() || !old.lease.equals(previousLease)) return null;
        boolean replace = old.released || newDocument;
        String access = replace ? secret() : token, lease = replace ? secret() : old.lease;
        if (replace) tokens.remove(hash(token));
        tokens.put(hash(access), new Entry(old.authentication, lease, clock.millis() + IDLE, false, old.id, old.agent, old.signedInAt, clock.millis()));
        return new Resumed(old.authentication, access, lease);
    }
    public synchronized void release(String token, String lease) {
        if (!valid(token) || !valid(lease)) return;
        tokens.computeIfPresent(hash(token), (key, old) -> old.lease.equals(lease)
                ? new Entry(old.authentication, old.lease, Math.min(old.expiresAt, clock.millis() + RELOAD_GRACE), true, old.id, old.agent, old.signedInAt, old.lastSeenAt) : old);
    }
    public synchronized void revoke(String token) { if (valid(token)) tokens.remove(hash(token)); }
    public synchronized void revokeUser(String name, String exceptToken) {
        String except = valid(exceptToken) ? hash(exceptToken) : "";
        tokens.entrySet().removeIf(e -> e.getValue().authentication.getName().equals(name) && !e.getKey().equals(except));
    }
    public synchronized List<Device> devices(String name, String currentToken) {
        tokens.entrySet().removeIf(e -> e.getValue().expiresAt <= clock.millis());
        String current = valid(currentToken) ? hash(currentToken) : "";
        return tokens.entrySet().stream().filter(e -> !e.getValue().released && e.getValue().authentication.getName().equals(name))
                .map(e -> new Device(e.getValue().id,e.getValue().agent,Instant.ofEpochMilli(e.getValue().signedInAt),
                        Instant.ofEpochMilli(e.getValue().lastSeenAt),e.getKey().equals(current)))
                .sorted(java.util.Comparator.comparing(Device::signedInAt).reversed()).toList();
    }
    private String secret() {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private static boolean valid(String token) { return token != null && token.matches("[A-Za-z0-9_-]{43}"); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}
