// ==UserScript==
// @name         Stack User profiles
// @description  Make use of the space like before.
// @version      2.0
//
// @namespace    scratte-fiddlings
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(meta\.)?askubuntu\.com/users//
// @include      /^https://(meta\.)?mathoverflow\.net/users//
// @include      /^https://(meta\.)?stackoverflow\.com/users//
// @include      /^https://(meta\.)?superuser\.com/users//
// @include      /^https://(meta\.)?serverfault\.com/users//
// @include      /^https://stackapps\.com/users//
// @include      /^https://[^/]+\.stackexchange\.com/users//
// @exclude      *://api.stackexchange.com/*
// @exclude      *://data.stackexchange.com/*
// @exclude      *://elections.stackexchange.com/*
// @exclude      *://openid.stackexchange.com/*
// @exclude      *://blog.*.com/*
// @exclude      *://chat.*.com/*
// @exclude      *://contests.*.com/*
//
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ---- userAvatar --------------------------------------------------------------------------
    function fetchBricks() {
        const bricks = { }; // Keep it all here.

        // The full page (expect the top bar and margins)
        const content = document.querySelector("#mainbar-full");
        if (!content)
            return;
        const contentSplit = content.children;

        // The huge top area:
        const hugeUselessTopBar = contentSplit[0];
        bricks.hugeUselessTopBar = hugeUselessTopBar;
        const splitHugeUselessTopBar = hugeUselessTopBar.children;
        const profile = splitHugeUselessTopBar[0];

        const splitProfile = profile.children;
        const avatar = splitProfile[0];
        bricks.avatar = avatar;

        const avatarClone = avatar.cloneNode(true);
        bricks.avatarClone = avatarClone;

        bricks.avatarCloneImage = avatarClone.querySelector("img");
        const userDetails = splitProfile[1];
        bricks.userDetails = userDetails;

        const splitUserDetails = userDetails.children;
        const userName = userDetails.firstElementChild;
        bricks.userName = userName;
        bricks.headerExists = !!userDetails.querySelector(".fs-title");
        // bricks.userLists = userDetails.querySelectorAll("ul:not(.list-ls-none)");
        bricks.userLists = userDetails.querySelectorAll("ul:not(#groups-popover > ul)");
        bricks.userFirstList = bricks.userLists[0];

        const userNameClone = userName.cloneNode(true);
        bricks.userNameClone = userNameClone;
        bricks.userNameCloneElement = userNameClone.querySelector(".fs-headline2");

        const buttons = splitHugeUselessTopBar[1];
        bricks.profileButtonClone = buttons.cloneNode(true);

        const tabs = contentSplit[1];
        bricks.tabs = tabs;

        bricks.page = tabs.querySelector(".is-selected")?.textContent;

        // Elements on the profile:
        if (bricks.page === "Profile") {
            const mainContent = contentSplit[2];
            const splitMainContent = mainContent.children;
            const topMainContent = splitMainContent[0];
            bricks.topMainContent = topMainContent;

            const splitTopMainContent = topMainContent.children;
            bricks.stats = splitTopMainContent[0];

            const profileTextArea = splitTopMainContent[1];
            bricks.airOfMysteryContainer = profileTextArea.firstElementChild?.lastElementChild?.cloneNode(true);;

            bricks.profileTextArea = profileTextArea;
            bricks.prose = profileTextArea.children[1];

            const bottomMainContent = splitMainContent[1];
            bricks.bottomMainContent = bottomMainContent;
            const splitbottomMainContent = bottomMainContent.children;
            bricks.contributions = splitbottomMainContent[1];
        }

        return bricks;
    }

    // ---- userAvatar --------------------------------------------------------------------------
    function userAvatar(bricks) {
        let { stats } = bricks;

        if (stats.classList.contains("grid--item")) {
            const realstats = stats.firstElementChild;
            stats = realstats;
            stats.className = "flex--item fl-shrink0 ws2 mr24 md:mr0 md:mb24 md:w100 d-flex";
        }

        const splitStats = stats.children;
        const title = splitStats[0];
        const box = splitStats[1];
        box.style.alignSelf = "center";
        box.style.border = "none";


        const userStats = box.firstElementChild.children;
        const reputation = userStats[0];
        const reached    = userStats[1];
        const answers    = userStats[2];
        const questions  = userStats[3];
        answers.style.marginRight = "30px";
        reached.remove();


        const top = box.querySelector(".js-rank-container");
        if (top) {
            top.firstElementChild?.remove();
            top.firstElementChild?.classList.add("d-flex");
            bricks.userName.append(top);
        }

        const QuestionsAnswers = document.createElement("div");
        QuestionsAnswers.className = "d-flex";
        QuestionsAnswers.style.marginBottom = "20px"
        QuestionsAnswers.append(answers, questions);

        bricks.rightSide.append(QuestionsAnswers, bricks.userFirstList);

        reputation.classList.remove("flex--item");
        reputation.classList.add("d-flex");
        reputation.firstElementChild.style.paddingRight = "5px";
        reputation.firstElementChild.style.marginTop = "-2px";

        const image = bricks.avatar.querySelector("img");
        image.removeAttribute("width");
        image.removeAttribute("height");
        image.style.width = "100%"

        bricks.avatar.style.padding = "10px"
        title.replaceWith(bricks.avatar);

        stats.classList.add("d-flex");
        stats.style.flexDirection = "column";
        stats.append(theThreeBadges());

    }

    // ---- makeChanges --------------------------------------------------------------------------
    function makeChanges(bricks) {
        const { airOfMysteryContainer, contributions, profileButtonClone,
                profileTextArea, prose, stats, userFirstList
              } = bricks;

        // Put the avatar and username on the top right
        bricks.avatarClone.style.marginRight = "10px";
        bricks.avatar.querySelectorAll(".d-none")
                     .forEach(none => none.remove());
        bricks.avatarCloneImage.querySelectorAll(".d-none")
                               .forEach(none => none.remove());
        bricks.avatarCloneImage.width = bricks.avatarCloneImage.height = 30;

        bricks.userNameCloneElement.classList.remove("mb12", "fs-headline2");
        bricks.userNameCloneElement.style.fontSize = "1.61538461rem"
        bricks.userNameClone.style.marginRight = "10px";

        if (profileButtonClone.firstElementChild?.textContent.trim() === "Edit profile")
            profileButtonClone.firstElementChild.remove();

        profileButtonClone.classList.remove("ps-absolute");
        bricks.tabs.append(bricks.avatarClone, bricks.userNameClone, profileButtonClone);

        // Rearrange the top part of the profile.
        if (bricks.page === "Profile") {
            bricks.topMainContent.className = "d-flex mb32 md:fd-column";

            profileTextArea.firstElementChild.replaceWith(bricks.userDetails);
            // bricks.userDetails.style.marginBottom = "5px";

            if (prose) {
                const { classList, style } = prose;
                classList.remove("overflow-hidden", "v-truncate-fade", "hmx3");
                classList.add("overflow-y-scroll");
                style.marginRight = "-5px";
                style.paddingRight = "5px";
                style.maxHeight = bricks.headerExists ? "211px" : "235px";

                const readMore = prose.nextElementSibling;
                if (readMore)
                    readMore.remove();
            } else {
                bricks.userDetails.append(airOfMysteryContainer);
                airOfMysteryContainer.classList.remove("flex-center");
                airOfMysteryContainer.style.marginRight = "50px";
            }

            const profileContainer = document.createElement("div");
            profileContainer.classList.add("d-flex", "fl-grow1");
            profileTextArea.replaceWith(profileContainer);

            userFirstList.style.flexDirection = "column";
            for (let i = 1; i < bricks.userLists.length; i++) {
                userFirstList.append(...bricks.userLists[i].querySelectorAll("li:not(#groups-popover li)"));
                bricks.userLists[i].remove();
            }

            [...userFirstList.children]
                .forEach(element => {
                             if (!element.textContent.trim()) {
                                 const link = element.querySelector("a");
                                 const text = link.cloneNode(true)
                                 text.textContent = link.href.toString().replace("https://", "");
                                 element.append(text);
                             }
                 });

            userFirstList.style.whiteSpace = "nowrap";

            const rightSide = document.createElement("div");
            rightSide.append(userFirstList);
            bricks.rightSide = rightSide;

            profileTextArea.style.marginRight = "20px";
            profileTextArea.classList.add("fl-grow1");
            profileContainer.append(profileTextArea, rightSide);

            const notEmpty = contributions?.children?.length > 1;
            if (notEmpty) {
                bricks.bottomMainContent?.classList.remove("gs24");
                contributions.classList.add("ml24", "d-flex", "fd-column");
                [...contributions.children]
                    .forEach(block => {
                                 block.classList.remove("mb32", "mb48", "mt64", "pt32");
                                 block.classList.add("mb24");
                     });
            } else {
                document.querySelector(".profile-placeholder--image")?.parentNode?.classList.remove("mt64", "pt32");
            }

            userAvatar(bricks);
        }

        bricks.hugeUselessTopBar.remove();

    }

    // ---- theThreeBadges --------------------------------------------------------------------------
    function theThreeBadges () {
        const container = document.createElement("div");
        container.classList.add("d-flex", "gs4", "flex__fl-equal");

        const badges = document.querySelector("#badges");
        let profileBadges;
        if (badges) {

             profileBadges = [...badges.querySelectorAll(".fs-caption")]
                                 .map(badge => {
                                          const text = badge.textContent
                                                            .trim()
                                                            .replace(" badges","")
                                                            .replace(" badge","");
                                          const amount = badge.previousElementSibling?.textContent.trim();
                                          if (amount)
                                              return bling(text, amount);
                                  });
        } else {
            profileBadges = [bling("bronze", 0)];
        }

        container.append(...profileBadges);
        container.style.padding = "10px";

        return container;

        function bling(colour, amount) {

            const span1 = document.createElement("span");
            span1.classList.add("flex--item");
            const span2 = document.createElement("span");
            span2.classList.add("d-flex", "flex__center", "fl1");
            span2.textContent = amount;

            const blingHolder = document.createElement("div");
            blingHolder.classList.add("d-flex", "ai-center", "s-badge");

            switch (colour) {
                    case "gold":   blingHolder.classList.add("s-badge__gold");
                                   blingHolder.title = amount + " gold badges";
                                   span1.classList.add("badge1");
                    break;
                    case 'silver': blingHolder.classList.add("s-badge__silver");
                                   blingHolder.title = amount + " silver badges";
                                   span1.classList.add("badge2");
                    break;
                    case "bronze": blingHolder.classList.add("s-badge__bronze");
                                   blingHolder.title = amount + " bronze badges";
                                   span1.classList.add("badge3");
                    break;
            }

            blingHolder.append(span1, span2);

            const blingContainer = document.createElement("div");
            blingContainer.classList.add("flex--item");
            blingContainer.append(blingHolder);

            return blingContainer;
        }

    }


    // ---- putTopTagsonTop -------------------------------------------------------------------------
    function putTopTagsonTop () {
        // Originally imspired by TylerH's Answer: https://meta.stackoverflow.com/a/408625
        // Then kindly modfied by Oleg Valter (https://stackoverflow.com/users/11407695)
        const fixItCSS = `
            .flex--item.fl1 #top-tags {
                order: 1;
            }
            .flex--item.fl1 #top-posts {
                order: 2;
            }
            .flex--item.fl1 #badges {
                order: 3;
            }

            .profile-badges .fl1:nth-child(2) {
                display: flex;
                align-items: center;
            }

            .profile-badges .fs-title {
                float: left;
                margin-right: 4px;
            }

            .spotAward {
                transform: scale(0.75,0.75);`;

            const styleSheet = document.createElement("style");
            styleSheet.innerText = fixItCSS;
            document.head.appendChild(styleSheet);
    }

    // now as a string in Stack representation -------------------------
    function getNow() {
        const now = (new Date).toISOString();
        return now.substr(0, 10)
                   + " " // substitute the T
                   + now.substr(11, 8) // No milis
                   + now.substr(23);
    }

    // -----------------------------------------------------------------
    function getDate(element) {
        let title = element.title;
        if (title)
            return title;
        title = element.firstElementChild?.title;
        if (title)
            return title;
        return element.querySelector(".date_brick")?.title;
    }

    // -----------------------------------------------------------------
    function makeListItem(type, text, tooltip) {
        const item = document.createElement("li");
        item.textContent = text;
        item.style.listStyleType = `"${type} "`;
        item.title = tooltip;
        return item;
    }

    // -----------------------------------------------------------------
    function createList(last, first) {
        const header = document.createElement("h3");
        header.textContent = "Activity";
        header.style.color = "var(--theme-primary-400)";
        header.style.margin = "0";
        const items = document.createElement("ul");
        if (!first) {
            // hack to avoid ❌ rendering to the left of "Activity"
            items.append(makeListItem(" ", "❌ none"));
        } else {
            items.append(makeListItem("⇑", last ? getDate(last) : getDate(first), "Most recent"),
                         makeListItem("⇓", getDate(first), "Very first"),
                         makeListItem(" ", " "), // emply item before the "now"
                         makeListItem("⌚", getNow(), "Current time"));
        }

        items.style.lineHeight = "1.5";
        items.style.marginLeft = "15px";

        const container = document.createElement("div");
        container.style.marginLeft = "2px";
        container.style.marginTop = "20px";
        container.style.whiteSpace = "nowrap";
        container.append(header, items);

        return container;
    }

    // -----------------------------------------------------------------
    async function fetchActivity(page) {
        const { location } = window;

        const url = location.pathname;
        const resp = await fetch(`${url}?tab=activity&sort=all&page=${page}`);

        const text = await resp.text();
        return new DOMParser().parseFromString(text, 'text/html');
    }

    // -----------------------------------------------------------------
    async function scrapeActivity({ elementToAppend, headerPresent, elementToAdjust }) {

        // delay by Oleg Valter (https://stackoverflow.com/users/11407695/oleg-valter)
        // https://chat.stackoverflow.com/transcript/message/52207931#52207931
        const delay = (s) => new Promise((resolve) => setTimeout(resolve, s * 1e3));

        const getLastItem = (parsedHTM) => {
            // if that's an award it's fine.
            const activities = parsedHTM.querySelectorAll(".date");
            if (activities)
                return activities[activities.length -1];
        }

        const getRecentItem = (parsedHTM) => {
            const historyElements = parsedHTM.querySelectorAll(".history-table tr");
            for (const element of historyElements) {
                const childElements = element.children;
                if (childElements.length > 1 && childElements[1].textContent !== "awarded") {
                    return childElements[0];
                }
            }
            return;
        }

        const insertAndAdjust = (lastActivity, firstActivity) => {
            elementToAppend.append(createList(lastActivity, firstActivity));
            // readjust the height of the profile text prose

            const currentHeight = +elementToAdjust.style.maxHeight.replace("px","");
            const height = parseInt(window.getComputedStyle(elementToAppend).height);
            if (elementToAdjust)
                elementToAdjust.style.maxHeight = Math.max(currentHeight, (height - 92 + (headerPresent ? 0 : 20))) + "px";
        }

        let page = 1;
        let maxPage, lastActivity, firstActivity;

        const firstParsedHTML = await fetchActivity(page++);

        // find the maxpage:
        const pages = firstParsedHTML.querySelector(".s-pagination");
        if (!pages) { // no pagination. There's just the one.
            lastActivity  = getRecentItem(firstParsedHTML);
            firstActivity = getLastItem(firstParsedHTML);
            insertAndAdjust(lastActivity, firstActivity);
            return;
        } else {
            let lastButton = pages.lastElementChild;
            if (lastButton && lastButton.textContent.trim() === "Next")
                lastButton = lastButton.previousElementSibling;
            maxPage = lastButton.textContent.trim();
        }


        lastActivity = getRecentItem(firstParsedHTML);

        // if there are only awards go to the next page
        while (!lastActivity && page < maxPage) {
            await delay(1 + Math.random() + 0.1); // delay the next fetch to not get ratelimited.
            const nextParsedHTML = await fetchActivity(page++);
            lastActivity = getRecentItem(nextParsedHTML);
            if (page === maxPage)
                firstActivity = getLastItem(nextParsedHTML);
        }

        // get that first ever activity
        if (page !== maxPage) {
            await delay(1 + Math.random() + 0.1);
            const lastParsedHTML = await fetchActivity(maxPage);
            firstActivity = getLastItem(lastParsedHTML);
        }

        insertAndAdjust(lastActivity, firstActivity);
    }

    // ---- DoIt -------------------------------------------------------------------------

    const bricks = fetchBricks();
    makeChanges(bricks);
    scrapeActivity({
                      elementToAppend : bricks.rightSide,
                      headerPresent   : bricks.headerExists,
                      elementToAdjust : bricks.prose
                   });
    putTopTagsonTop();

})();