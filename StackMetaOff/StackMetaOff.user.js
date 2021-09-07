// ==UserScript==
// @name         Stack MetaOff
// @description  Remove any trace of Meta
// @version      0.3
// @namespace    scratte-fiddlings
// @author       Oleg Valter (https://stackoverflow.com/users/11407695)
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @include      /^https://meta.stackoverflow.com/
// @include      /^https://stackoverflow.com/(?:(?:questions|users).*)?$/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const isMeta = window.location.hostname.split(".")[0] === "meta";

    if (isMeta) {
        // replace the page with "NO!"
        const p = document.createElement("p");
        p.style.fontSize = "172px";
        p.style.fontWeight = "bold";
        p.style.textAlign = "center";
        p.textContent = "NO!";

        const body = document.createElement("body");
        body.appendChild(p);

        const title = document.createElement("title");
        title.textContent = "Meta :(";

        const html = document.createElement("html");
        html.append(title, body);

        document.documentElement.replaceWith(html);

    } else {

        const removeSiblingsAfter = (element) => {
            let nextsibling;
            while (nextsibling = element.nextSibling) {
                element.parentNode.removeChild(nextsibling);
            }
        }

        // Remove "Featured on Meta" and below in the yellow right sidebar box
        const featured = document.getElementsByClassName("s-sidebarwidget--header")[1];
        if (featured) {
            removeSiblingsAfter(featured)
            featured.parentNode.removeChild(featured);
        }

        // Remove "Top Meta Posts" from user profiles
        const communityPosts = document.getElementsByClassName("communities-posts")[0];
        if (communityPosts) {
            communityPosts.parentNode.removeChild(communityPosts);
        }

        // Remove "Meta user"-link from user profiles
        const metaUser = document.querySelector(".js-user-header a[href*='meta.']");
        if (metaUser) {
            metaUser.parentNode.removeChild(metaUser);
        }


        // Remove notification from meta (once the inbox is clicked)
        // Remove meta achievement from the ahcievement dropdown.
        // Remove the meta link from "Current communities" in the upper right hamburger bar
        // https://chat.stackoverflow.com/transcript/message/52052477#52052477 by https://stackoverflow.com/users/11407695/oleg-valter
        const config = {
            selectors: {
                relatedSite: ".current-site .related-site a[href*='meta.']",
                metaItem: ".modal-content a[href*='meta.']",
                unreadIcon: ".indicator-badge.js-unread-count._important",
                dateGroup: ".date-group",
                dateSummary: "ul.items"
            }
        };

        const makeMutationFinder =
              (mutations) =>
                  (cls) => mutations.find(({type, addedNodes}) =>
                                              type === "childList"
                                              && [...addedNodes].some(({nodeType, classList}) => nodeType !== Node.TEXT_NODE
                                              && classList.contains(cls)));

        const removeMetaFromInbox = (mutation) => {
            if (!mutation)
                return;

            const {addedNodes: [notifWrapper]} = mutation;

            const notifs = notifWrapper.querySelectorAll(config.selectors.metaItem);
            const {length: deletedNotifs} = notifs;

            if (!deletedNotifs)
                return;

            const unread = [...notifs].filter(({parentElement: {classList}})=>classList.contains("unread-item"));

            const {length: unreadCount} = unread;

            notifs.forEach((item)=>item.parentElement.remove());

            const unreadIcon = document.querySelector(config.selectors.unreadIcon);
            if (unreadIcon) {
                const {textContent: oldNumberOfNotifs} = unreadIcon;

                if (oldNumberOfNotifs === "0")
                    return;

                const newNumberOfNotifs = +oldNumberOfNotifs - unreadCount;
                unreadIcon.textContent = newNumberOfNotifs;

                unreadIcon.style.display = newNumberOfNotifs ? "" : "none";
                unreadIcon.classList.remove("d-none");
            }
        };

        const removeMetaFromAchievements = (mutation) => {
            if (!mutation)
                return;

            const {addedNodes: [achievWrapper]} = mutation;

            const achievs = achievWrapper.querySelectorAll(config.selectors.metaItem);

            achievs.forEach((achievement)=>{
                //must be before removal or `closest` will fail;
                const dailySummary = achievement.closest(config.selectors.dailySummary);

                achievement.parentElement.remove();

                if (!dailySummary || dailySummary.children.length)
                    return;

                const dailyWrapper = dailySummary.closest(config.selectors.dateGroup);
                dailyWrapper && dailyWrapper.remove();
            });
        }

        const removeMetaFromCommunitites = (mutation) => {
            if(!mutation)
                return;

            const {addedNodes: [dialog]} = mutation;

            const relatedSite = dialog.querySelector(config.selectors.relatedSite);

            if(!relatedSite)
                return;

            const relatedWrapper = relatedSite.closest(".related-site");

            relatedWrapper && relatedWrapper.remove();
        };

        const topBar = document.querySelector(".top-bar");
        if (topBar) {
            const observer = new MutationObserver((mutationsList) => {
                const mutationFinder = makeMutationFinder(mutationsList);

                const notifsMutation = mutationFinder("inbox-dialog");
                const achievMutation = mutationFinder("achievements-dialog");
                const communMutation = mutationFinder("siteSwitcher-dialog");

                removeMetaFromInbox(notifsMutation);
                removeMetaFromAchievements(achievMutation);
                removeMetaFromCommunitites(communMutation);
            });

            observer.observe(topBar, {
                childList: true,
                subtree: true
            });
        }
    }

})();