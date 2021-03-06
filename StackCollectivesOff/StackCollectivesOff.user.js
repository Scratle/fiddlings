// ==UserScript==
// @name         Stack Collectives Off
// @namespace    scratte-fiddlings
// @version      0.8
// @description  Pretending Collectives don't exist
// @author       Scratte (stackoverflow.com/users/12695027)
// @include      https://stackoverflow.com/*
// @exclude      https://stackoverflow.com/collectives*
// @grant        none
// ==/UserScript==

// NOTE: The script does not remove the "Explore Collectives" on the left sidebar.
//       It's still possible to go to a collectives site and check them out.

(function() {
    'use strict';

    // Start with user profiles (since Stack removed the defining class on the links).
    document.querySelector("a[href*='\/collectives\/']")
           // Another optimization suggested by Oleg Valter
           // https://chat.stackoverflow.com/transcript/message/52657512#52657512
           ?.closest("div.grid--item")
           ?.remove();

    // Suggested by Oleg Valter (https://stackoverflow.com/users/11407695)
    // https://chat.stackoverflow.com/transcript/message/52657173#52657173
    const mostCollectivesStuff =
              [
                  // the collective on the home page right sidebar
                  ".js-join-leave-container",
                  // both 1: the collective icons from posts on the home page
                  //      2: the award icons from user cards on posts
                  "a[href*='\/collectives\/']:not(#nav-collective-discover)",
                  // the particular collective in the sidebar on posts
                  ".sidebar-subcommunity",
              ];

    const postCollectivesStuff =
              [
                  // orange affiliation banner from user profiles on posts
                  ".affiliate-badge",
                  // "Answer recommended by ..."
                  ".js-endorsements",
                  // recognized member icon in comments.
                  "div.comment-body span[title='Recognized Member']"
              ];

    document.querySelectorAll(mostCollectivesStuff.concat(postCollectivesStuff).join()) // "," is default
            .forEach(e => e.remove());

    const removePostCollectives = () => document.querySelectorAll(postCollectivesStuff.join()) // "," is default
            .forEach(e => e.remove());

    // And the list item saying "X user groups" from user profiles
    document.querySelector("ul div[aria-describedby=groups-popover]")
           ?.closest("li.flex--item")
           ?.remove();

    $(document) // needed for it to work with updates as in reviews
        .ajaxComplete((event, request, settings) => {
            removePostCollectives();
         });

})();