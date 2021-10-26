### Re-arrange the user profiles

..and:

- Puts the badges/trophies under the "Posts".
- Reduces the row on tags to the old 1 : 2 : 3 look.
- Adds a link to the network profile on the Community box.
- Moves meta posts to the left side column.
- Puts the meta/main link on the top bar.
- Optional: 
  - Fetches the "profile views" and "Last seen" from the [Stack Exchange API](https://api.stackexchange.com/).
  - Scrapes the user activity pages (first and last page) and adds in UTC (ISO 8601 Formatted):
    - marked with a "⇑". The user's last and most recent activity, skipping awards.
    - marked with a "⇓". The user's very first activity, including awards.
    - Current time (⌚) in UTC for easy comparison.

Courtesy of [Vickel](https://stackoverflow.com/users/2275490/vickel), this is:

### Before
<img src="https://i.stack.imgur.com/2m39S.png" width="400">

### After
<img src="https://i.stack.imgur.com/28WqZ.png" width="400">

### Link to network user

If there's no "View all" link in the "Communities" header, like this one:

<img src="https://i.stack.imgur.com/mWm5H.png" width="250">


the script will insert one:

<img src="https://i.stack.imgur.com/4Uoxv.png" width="250">


### Options
There are two variables at the top of the script that controls:

- Fetching "profile views" and "Last seen". Highlighed in red.  
  Turn if off by setting this variable to false: `const getCreepyData = false;`
- Getting the first and last activity. Highlighed in blue.  
  Turn if off by setting this variable to false: `const getActivity   = false;`

<img src="https://i.stack.imgur.com/h4ohX.png" width="250">


---

**Stack Apps:** [Make better use of the space in profiles, like profiles used to be](https://stackapps.com/questions/9080/make-better-use-of-the-space-in-profiles-like-profiles-used-to-be)