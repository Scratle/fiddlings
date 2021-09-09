### Re-arrange the user profiles

..and:

- Removes a lot of padding and margins.
- Puts the trophies on the bottom of the page.
- Optional: 
  - Fetches the "profile views" and "Last seen" from the [Stack Exchange API](https://api.stackexchange.com/).
  - Scrapes the user activity pages (first and last page) and adds in UTC (ISO 8601 Formatted):
    - marked with a "⇑". The user's last and most recent activity, skipping awards.
    - marked with a "⇓". The user's very first activity, including awards.
    - Current time (⌚) in UTC for easy comparison.

Courtesy of [Vickel](https://stackoverflow.com/users/2275490/vickel), this is:

### Before
<img src="https://i.stack.imgur.com/0zbI6.png" width="400">

### After (roughly)
<img src="https://i.stack.imgur.com/wjgaO.png" width="400">

Due to "responsiveness", the script was reworked, and this is now the top part of profile:

### After
<img src="https://i.stack.imgur.com/yzrAY.png" width="400">  


### Options
There are two variables at the top of the script that controls:

- Fetching "profile views" and "Last seen". Highlighed in red.  
  Turn if off by setting this variable to false: `const getCreepyData = false;`
- Getting the first and last activity. Highlighed in blue.  
  Turn if off by setting this variable to false: `const getActivity   = false;`

<img src="https://i.stack.imgur.com/h4ohX.png" width="250">

---

**Stack Apps:** [Make better use of the space in profiles, like profiles used to be](https://stackapps.com/questions/9080/make-better-use-of-the-space-in-profiles-like-profiles-used-to-be)