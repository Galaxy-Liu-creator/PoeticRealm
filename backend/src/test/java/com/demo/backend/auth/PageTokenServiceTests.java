package com.demo.backend.auth;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static org.assertj.core.api.Assertions.assertThat;

class PageTokenServiceTests {
    private static class Time extends Clock {
        long now = 1000;
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return Instant.ofEpochMilli(now); }
    }
    @Test void closedPageExpiresAndRememberedCookiesCannotReviveIt() {
        var time = new Time(); var tokens = new PageTokenService(time);
        var issued = tokens.issue(UsernamePasswordAuthenticationToken.authenticated("alice", null, java.util.List.of()));
        assertThat(tokens.authenticate(issued.token()).getName()).isEqualTo("alice");
        tokens.release(issued.token(), issued.lease());
        assertThat(tokens.authenticate(issued.token())).isNull();
        time.now += 15001;
        assertThat(tokens.authenticate(issued.token())).isNull();
        assertThat(tokens.resume(issued.token(), issued.lease())).isNull();
    }
    @Test void reloadRenewsTheLeaseAndIgnoresAnOldDocumentsDelayedClose() {
        var time = new Time(); var tokens = new PageTokenService(time);
        var issued = tokens.issue(UsernamePasswordAuthenticationToken.authenticated("alice", null, java.util.List.of()));
        tokens.release(issued.token(), issued.lease()); time.now += 1000;
        var resumed = tokens.resume(issued.token(), issued.lease());
        assertThat(resumed.lease()).isNotEqualTo(issued.lease());
        assertThat(resumed.token()).isNotEqualTo(issued.token());
        tokens.release(issued.token(), issued.lease()); time.now += 20000;
        assertThat(tokens.authenticate(resumed.token())).isNotNull();
        tokens.release(resumed.token(), resumed.lease());
        assertThat(tokens.authenticate(resumed.token())).isNull();
        assertThat(tokens.resume(resumed.token(), issued.lease())).isNull();
        time.now += 15001;
        assertThat(tokens.resume(resumed.token(), resumed.lease())).isNull();
    }
    @Test void unknownTokensWrongLeasesIdleTimeoutAndExplicitLogoutAreRejected() {
        var time = new Time(); var tokens = new PageTokenService(time);
        var auth = UsernamePasswordAuthenticationToken.authenticated("alice", null, java.util.List.of());
        var first = tokens.issue(auth); var second = tokens.issue(auth);
        tokens.release(first.token(), second.lease()); time.now += 16000;
        assertThat(tokens.authenticate(first.token())).isNotNull();
        assertThat(tokens.authenticate("bogus")).isNull();
        tokens.revoke(first.token()); assertThat(tokens.authenticate(first.token())).isNull();
        assertThat(tokens.authenticate(second.token())).isNotNull();
        time.now += 30 * 60 * 1000;
        assertThat(tokens.authenticate(second.token())).isNull();
    }
    @Test void focusChecksKeepTheCloseLeaseButANewDocumentReplacesItBeforeALateBeacon() {
        var time = new Time(); var tokens = new PageTokenService(time);
        var issued = tokens.issue(UsernamePasswordAuthenticationToken.authenticated("alice", null, java.util.List.of()));
        var focused = tokens.resume(issued.token(), issued.lease());
        assertThat(focused.lease()).isEqualTo(issued.lease());
        var reload = tokens.resume(issued.token(), issued.lease(), true);
        tokens.release(issued.token(), issued.lease());
        assertThat(tokens.authenticate(issued.token())).isNull();
        assertThat(tokens.authenticate(reload.token())).isNotNull();
    }
}
