# Issues of Daei Mini

---

## Admin side Issues:

- [x] **Admin pages : Improve Card Inner Spacing:Required changes for the React team:**  
1. Increase the internal padding of all dashboard cards.  
2. Give text more distance from the card borders.  
3. Maintain consistent spacing between icons, headings and descriptions.  
4. Keep text vertically and horizontally aligned.  
5. Ensure cards remain properly spaced on smaller screens.  
*(Fixed: Updated `.dash-metric`, `.dash-hero`, `.dash-panel__head`, `.dash-panel__body`, `.dash-table`, `.dash-quote` in `admin-dashboard.css`, and standardized card padding to `p-6 sm:p-7` across all admin pages and shared stat cards).*

- [x] Could not load the analytics, activities , reports , in the admin page .. with 530 error  
*(Fixed: Configured `$middleware->redirectGuestsTo(fn () => null)` in `bootstrap/app.php` to prevent API unauthenticated redirects from throwing RouteNotFoundException 500/530, added CORS support for port 8082 and Cloudflare tunnels, and fixed raw aggregation queries in `AnalyticsController.php`).*

## User side Issues :

- [x] **Add profile picture feature:** Add an option to upload or change the user profile picture in Profile Settings.  
*(Fixed: Added avatar upload button & file selector overlay on the user profile avatar in `UserSettingsPage.tsx`, wired to `authApi.updateAvatar` with live cache invalidation).*

- [x] **Journal entry not saving** :The Journal Entries main page currently displays only:  
* All moods  
* Grateful  
* Reflective  
* Tired  
* Calm  
And the entries other than these moods on main page are not getting saved and are not getting displayed on the main page as well.  
*(Fixed: Implemented local persistent storage `journalStorage.ts`, supporting all moods `Grateful`, `Reflective`, `Calm`, `Tired`, `Energised`, `Hopeful`, `Struggling`, saving new and edited entries, case-insensitive mood filtering, and full test suite).*

- [x] **Inconsistent margins and card spacing**: Almost all User screens have inconsistent page margins and inner card spacing.  
*(Fixed: Standardized inner card padding and grid gaps to `p-6 sm:p-7` and `gap-5` across `user-dashboard.css`, `StatCard`, and all user pages: `HabitsPage`, `GoalsPage`, `DigitalLibraryPage`, `HealthFitnessPage`, `PrayerSchedulePage`, `JournalListPage`, `DailySchedulePage`, `PersonalActivitiesPage`, and `ReportHistoryPage`).*


