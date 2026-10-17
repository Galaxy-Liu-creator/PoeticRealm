package com.demo.backend.user;

import com.demo.backend.auth.AccountService;
import com.demo.backend.common.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.sql.Timestamp;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class AccountSettingsService {
    private static final Set<String> POEMS = Set.of("fengqiao", "jiangxue", "baidicheng");
    private final AccountRepository accounts;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final JsonMapper json = JsonMapper.builder().build();
    public AccountSettingsService(AccountRepository accounts, JdbcTemplate jdbc, PasswordEncoder passwords) {
        this.accounts = accounts; this.jdbc = jdbc; this.passwords = passwords;
    }
    private Account account(String name) {
        return accounts.findByUsernameKey(AccountService.usernameKey(name)).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "登录已失效，请重新登录"));
    }
    private Account locked(String name) {
        var ids = jdbc.query("SELECT id FROM app_users WHERE username_key=? FOR UPDATE",
                (row,index) -> row.getLong(1), AccountService.usernameKey(name));
        if (ids.isEmpty()) throw new ApiException(HttpStatus.UNAUTHORIZED,"SESSION_EXPIRED","登录已失效，请重新登录");
        return account(name);
    }
    public LibraryDocument get(String name) {
        var values = jdbc.query("SELECT document FROM account_settings WHERE user_id=?",
                (row, index) -> row.getString(1), account(name).getId());
        return values.isEmpty() ? null : json.readValue(values.getFirst(), LibraryDocument.class);
    }
    @Transactional
    public LibraryDocument save(String name, LibraryDocument body) {
        validate(body);
        Account account = locked(name);
        var profile = body.profile();
        LocalDate birthday = profile.birthday() == null || profile.birthday().isBlank() ? null : LocalDate.parse(profile.birthday());
        account.updateDetails(birthday, profile.gender()); accounts.saveAndFlush(account);
        String document = json.writeValueAsString(body);
        int count = jdbc.update("UPDATE account_settings SET document=?, updated_at=? WHERE user_id=?",
                document, Timestamp.from(Instant.now()), account.getId());
        if (count == 0) jdbc.update("INSERT INTO account_settings(user_id,document,updated_at) VALUES(?,?,?)",
                account.getId(), document, Timestamp.from(Instant.now()));
        return body;
    }
    private static void require(boolean condition, String message) {
        if (!condition) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SETTINGS", message);
    }
    private static boolean text(String value, int max) { return value != null && value.length() <= max; }
    private static boolean choice(String value, String... choices) { return value != null && Set.of(choices).contains(value); }
    private static void validate(LibraryDocument body) {
        require(body != null && body.version() == 1 && body.profile() != null && body.preferences() != null && body.privacy() != null,
                "资料格式不正确，请刷新后重试");
        var p = body.profile();
        require(text(p.name(),24) && !p.name().isBlank() && text(p.bio(),80) && text(p.avatar(),500_000), "昵称、简介或头像超出限制");
        require(choice(p.gender(),"","女","男","其他"), "性别选项不正确");
        require(p.avatar().isEmpty() || p.avatar().matches("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+"), "头像格式不正确");
        try { if (p.birthday() != null && !p.birthday().isEmpty()) require(!LocalDate.parse(p.birthday()).isAfter(LocalDate.now()), "生日不能晚于今天"); }
        catch (java.time.format.DateTimeParseException e) { require(false,"生日格式不正确"); }
        require(body.favorites() != null && body.favorites().size() <= 100
                && body.favorites().stream().allMatch(id -> id != null && POEMS.contains(id)), "收藏数据不正确");
        require(body.visits() != null && body.visits().size() <= 50, "浏览记录超出限制");
        for (var visit : body.visits()) {
            require(visit != null && visit.id() != null && POEMS.contains(visit.id()) && text(visit.at(),40), "浏览记录不正确");
            try { Instant.parse(visit.at()); } catch (java.time.format.DateTimeParseException e) { require(false,"浏览时间不正确"); }
        }
        var pref = body.preferences(); var privacy = body.privacy();
        require(choice(pref.fontSize(),"small","normal","large") && choice(pref.startPage(),"home","favorites","profile")
                && choice(pref.sort(),"default","title","recent") && choice(pref.theme(),"ink","night"), "偏好选项不正确");
        require(choice(privacy.profileVisibility(),"everyone","private") && choice(privacy.favoritesVisibility(),"everyone","private")
                && choice(privacy.visitsVisibility(),"everyone","private"), "公开范围不正确");
        require(privacy.saveHistory() || body.visits().isEmpty(), "关闭记录保存后不得上传浏览记录");
    }
    @Transactional
    public void clearHistory(String name) {
        locked(name);
        var current = get(name);
        if (current != null) save(name,new LibraryDocument(current.version(),current.favorites(),List.of(),current.profile(),current.preferences(),current.privacy()));
    }
    private void verify(Account account, String password) {
        if (password == null || password.length() > 128 || !passwords.matches(password,account.getPasswordHash()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"PASSWORD_INCORRECT","当前密码不正确");
    }
    @Transactional
    public void password(String name, String previous, String next) {
        Account account = locked(name); verify(account,previous);
        int types = (next.matches(".*[A-Za-z].*") ? 1 : 0) + (next.matches(".*[0-9].*") ? 1 : 0) + (next.matches("(?s).*[^A-Za-z0-9].*") ? 1 : 0);
        require(types >= 2 && !previous.equals(next),"新密码需包含至少两类字符，且与原密码不同");
        account.changePassword(passwords.encode(next)); accounts.saveAndFlush(account);
        jdbc.update("DELETE FROM persistent_logins WHERE username=?",account.getUsername());
    }
    @Transactional
    public void delete(String name, String password, String confirmation) {
        Account account = locked(name); verify(account,password);
        require(account.getUsername().equals(confirmation),"请输入完整账号确认注销");
        jdbc.update("DELETE FROM persistent_logins WHERE username=?",account.getUsername());
        jdbc.update("DELETE FROM account_settings WHERE user_id=?",account.getId());
        accounts.delete(account); accounts.flush();
    }
    public record PublicProfile(String username, String name, String bio, String avatar, List<String> favorites, List<LibraryDocument.Visit> visits) {}
    public PublicProfile publicProfile(String name, String viewer) {
        name = accounts.findByUsernameKey(AccountService.usernameKey(name)).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND,"PROFILE_NOT_FOUND","没有可查看的个人主页")).getUsername();
        var doc = get(name);
        boolean owner = AccountService.usernameKey(name).equals(AccountService.usernameKey(viewer));
        if (doc == null || (!owner && !"everyone".equals(doc.privacy().profileVisibility())))
            throw new ApiException(HttpStatus.NOT_FOUND,"PROFILE_NOT_FOUND","没有可查看的个人主页");
        return new PublicProfile(name,doc.profile().name(),doc.profile().bio(),doc.profile().avatar(),
                owner || "everyone".equals(doc.privacy().favoritesVisibility()) ? doc.favorites() : List.of(),
                owner || "everyone".equals(doc.privacy().visitsVisibility()) ? doc.visits() : List.of());
    }
    public List<PublicProfile> search(String query, String viewer) {
        if (query == null || query.isBlank() || query.length() > 32) return List.of();
        String key = AccountService.usernameKey(query);
        return accounts.findTop50ByUsernameKeyContaining(key).stream()
                .filter(a -> { var d = get(a.getUsername()); return d != null && d.privacy().searchable() && "everyone".equals(d.privacy().profileVisibility()); })
                .limit(10).map(a -> publicProfile(a.getUsername(),viewer)).toList();
    }
}
