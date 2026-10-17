package com.demo.backend;

import com.demo.backend.user.LibraryDocument;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountSettingsIntegrationTests {
    private static final AtomicInteger IDS = new AtomicInteger();
    private static final String PASSWORD = "Profile123!";
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired JdbcTemplate jdbc;
    private record Session(String username, String token, MockHttpSession session, String csrf, Cookie cookie) {}
    private Session login(String username, String password, boolean remember) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        var session = (MockHttpSession) csrf.getRequest().getSession();
        var response = mvc.perform(post("/api/v1/auth/login").session(session)
                .header("X-CSRF-TOKEN",json.readTree(csrf.getResponse().getContentAsString()).get("token").asString())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username",username,"password",password,"remember",remember))))
                .andExpect(status().isOk()).andReturn();
        session = (MockHttpSession) response.getRequest().getSession();
        var fresh = mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn();
        Cookie cookie = java.util.Arrays.stream(response.getResponse().getCookies()).filter(c -> c.getName().equals("POETIC_REMEMBER") && c.getMaxAge()>0).reduce((a,b)->b).orElse(null);
        return new Session(username,json.readTree(response.getResponse().getContentAsString()).get("token").asString(),session,
                json.readTree(fresh.getResponse().getContentAsString()).get("token").asString(),cookie);
    }
    private Session account() throws Exception {
        String name="settings_"+IDS.incrementAndGet();
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        mvc.perform(post("/api/v1/auth/register").session((MockHttpSession)csrf.getRequest().getSession())
                .header("X-CSRF-TOKEN",json.readTree(csrf.getResponse().getContentAsString()).get("token").asString())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("username",name,"password",PASSWORD,"agreement",true,"agreementVersion","2026-10-02-dev","gender",""))))
                .andExpect(status().isCreated());
        return login(name,PASSWORD,true);
    }
    private MockHttpServletRequestBuilder as(Session session, MockHttpServletRequestBuilder request) throws Exception {
        var fresh=mvc.perform(get("/api/v1/auth/csrf").session(session.session())).andReturn();
        String token=json.readTree(fresh.getResponse().getContentAsString()).get("token").asString();
        return request.session(session.session()).header("X-POETIC-TOKEN",session.token()).header("X-CSRF-TOKEN",token);
    }
    private LibraryDocument document(String visibility, boolean searchable, boolean history) {
        return new LibraryDocument(1,List.of("fengqiao"),history ? List.of(new LibraryDocument.Visit("jiangxue","2026-10-06T00:00:00Z")) : List.of(),
                new LibraryDocument.Profile("墨客","男","行于诗境，藏一卷山河。","","2005-08-16"),
                new LibraryDocument.Preferences(false,true,true,false,true,true,"normal","profile","title","ink"),
                new LibraryDocument.Privacy(visibility,"private","private",searchable,false,history));
    }
    private void save(Session session, LibraryDocument document) throws Exception {
        mvc.perform(as(session,put("/api/v1/account/settings")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(document))).andExpect(status().isOk());
    }
    @Test void settingsPersistAndCannotSelectAnotherAccount() throws Exception {
        Session owner=account(), other=account(); save(owner,document("private",false,true));
        mvc.perform(as(owner,get("/api/v1/account/settings?userId=999"))).andExpect(jsonPath("$.library.profile.name").value("墨客"));
        mvc.perform(as(other,get("/api/v1/account/settings?username="+owner.username()))).andExpect(jsonPath("$.library").isEmpty());
        mvc.perform(as(owner,get("/api/v1/me"))).andExpect(jsonPath("$.birthday").value("2005-08-16"));
        mvc.perform(put("/api/v1/account/settings").header("X-POETIC-TOKEN",owner.token()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(document("private",false,true))))
                .andExpect(status().isForbidden());
    }
    @Test void privacyProtectsProfileSearchAndNestedData() throws Exception {
        Session owner=account(), viewer=account(); save(owner,document("private",false,true));
        mvc.perform(as(viewer,get("/api/v1/profiles/"+owner.username()))).andExpect(status().isNotFound());
        mvc.perform(as(viewer,get("/api/v1/profiles?query="+owner.username()))).andExpect(content().json("[]"));
        save(owner,document("everyone",true,true));
        mvc.perform(as(viewer,get("/api/v1/profiles/"+owner.username()))).andExpect(status().isOk()).andExpect(jsonPath("$.favorites").isEmpty()).andExpect(jsonPath("$.visits").isEmpty()).andExpect(jsonPath("$.birthday").doesNotExist());
        mvc.perform(as(viewer,get("/api/v1/profiles?query="+owner.username()))).andExpect(jsonPath("$[0].username").value(owner.username()));
        save(owner,document("everyone",false,true));
        mvc.perform(as(viewer,get("/api/v1/profiles?query="+owner.username()))).andExpect(content().json("[]"));
    }
    @Test void exportAndHistoryContainOnlyOwnDataAndNoCredentials() throws Exception {
        Session owner=account(); save(owner,document("private",false,true));
        var result=mvc.perform(as(owner,get("/api/v1/account/export"))).andExpect(jsonPath("$.account.username").value(owner.username())).andExpect(jsonPath("$.library.favorites[0]").value("fengqiao")).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("password","passwordHash",owner.token(),owner.cookie().getValue());
        mvc.perform(as(owner,delete("/api/v1/account/history"))).andExpect(status().isNoContent());
        mvc.perform(as(owner,get("/api/v1/account/settings"))).andExpect(jsonPath("$.library.visits").isEmpty()).andExpect(jsonPath("$.library.favorites[0]").value("fengqiao"));
    }
    @Test void revokeOthersKeepsCurrentAccessButRevokesOtherPageAndPersistentKeys() throws Exception {
        Session owner=account(), other=login(owner.username(),PASSWORD,true);
        mvc.perform(as(owner,get("/api/v1/account/devices"))).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].token").doesNotExist());
        mvc.perform(as(owner,post("/api/v1/account/devices/revoke-others")).cookie(owner.cookie()).contentType(MediaType.APPLICATION_JSON).content("{\"remember\":false}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me").header("X-POETIC-TOKEN",other.token())).andExpect(status().isUnauthorized());
        mvc.perform(as(owner,get("/api/v1/me"))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username=?",Integer.class,owner.username())).isZero();
    }
    @Test void disablingRememberOnlyRevokesThisBrowserCredential() throws Exception {
        Session owner=account(); login(owner.username(),PASSWORD,true);
        mvc.perform(as(owner,post("/api/v1/account/remember")).cookie(owner.cookie()).contentType(MediaType.APPLICATION_JSON).content("{\"remember\":false}"))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username=?",Integer.class,owner.username())).isEqualTo(1);
    }
    @Test void passwordChangeRejectsWrongPasswordAndInvalidatesEveryLogin() throws Exception {
        Session owner=account(), other=login(owner.username(),PASSWORD,false);
        mvc.perform(as(owner,post("/api/v1/account/password")).contentType(MediaType.APPLICATION_JSON).content("{\"currentPassword\":\"Wrong123!\",\"password\":\"Changed123!\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(as(owner,post("/api/v1/account/password")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword",PASSWORD,"password","Changed123!"))))
                .andExpect(status().isNoContent());
        for (Session session:List.of(owner,other)) mvc.perform(get("/api/v1/me").header("X-POETIC-TOKEN",session.token())).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username=?",Integer.class,owner.username())).isZero();
        login(owner.username(),"Changed123!",false);
    }
    @Test void deletionRequiresConfirmationAndCascadesOnlyOwnedData() throws Exception {
        Session owner=account(), other=account(); save(owner,document("private",false,true)); save(other,document("private",false,true));
        mvc.perform(as(owner,delete("/api/v1/account")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",PASSWORD,"confirmation","wrong"))))
                .andExpect(status().isBadRequest());
        mvc.perform(as(owner,get("/api/v1/account/settings"))).andExpect(jsonPath("$.library.profile.name").value("墨客"));
        mvc.perform(as(owner,delete("/api/v1/account")).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",PASSWORD,"confirmation",owner.username()))))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_users WHERE username=?",Integer.class,owner.username())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM persistent_logins WHERE username=?",Integer.class,owner.username())).isZero();
        mvc.perform(as(other,get("/api/v1/account/settings"))).andExpect(jsonPath("$.library.profile.name").value("墨客"));
    }
    @Test void malformedAndDisabledHistoryAreRejectedWithoutOverwriting() throws Exception {
        Session owner=account(); save(owner,document("private",false,true));
        String valid=json.writeValueAsString(document("private",false,true));
        for (String body:List.of(valid.replace("\"fengqiao\"","null"),valid.replace("\"saveHistory\":true","\"saveHistory\":false"),valid.replace("2005-08-16","2099-01-01")))
            mvc.perform(as(owner,put("/api/v1/account/settings")).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        mvc.perform(as(owner,get("/api/v1/account/settings"))).andExpect(jsonPath("$.library.visits.length()").value(1));
    }
}
