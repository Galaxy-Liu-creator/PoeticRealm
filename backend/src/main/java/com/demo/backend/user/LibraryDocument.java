package com.demo.backend.user;

import java.util.List;

/** Only exportable profile/library data. No credentials or authentication state. */
public record LibraryDocument(int version, List<String> favorites, List<Visit> visits, Profile profile,
                              Preferences preferences, Privacy privacy) {
    public record Visit(String id, String at) {}
    public record Profile(String name, String gender, String bio, String avatar, String birthday) {}
    public record Preferences(boolean dark, boolean motion, boolean transitions, boolean music, boolean sound,
                              boolean recommend, String fontSize, String startPage, String sort, String theme) {}
    public record Privacy(String profileVisibility, String favoritesVisibility, String visitsVisibility,
                          boolean searchable, boolean personalization, boolean saveHistory) {}
}
