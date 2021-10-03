// ==UserScript==
// @name         Stack User Profiles
// @description  Make use of the space like before.
// @version      2.9
//
// @namespace    scratte-fiddlings
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(?:meta\.)?askubuntu\.com/users//
// @include      /^https://(?:meta\.)?mathoverflow\.net/users//
// @include      /^https://(?:[^/]+\.)?stackoverflow\.com/users//
// @include      /^https://(?:meta\.)?superuser\.com/users//
// @include      /^https://(?:meta\.)?serverfault\.com/users//
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

    const getActivity   = true;
    const getCreepyData = true;

    // ------------------------------------------------------------------------------------------

    const profileTABNAMES = ["Profile","Профиль","Perfil","プロフィール"];

    // ---- waitForSelector --------------------------------------------------------------------------
    // https://chat.stackoverflow.com/transcript/message/53020918#53020918
    const waitForSelector = (selector) => {
        const initial = document.querySelectorAll(selector);
        if (initial.length)
            return Promise.resolve(initial);


        return new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                const target = document.querySelectorAll(selector);
                if (!target.length)
                    return;

                observer.disconnect();
                resolve(target);
            });

            observer.observe(document, {
                subtree: true,
                childList: true,
                attributes: true,
            });
        });
    };

    // ---- userAvatar --------------------------------------------------------------------------
    const fetchBricks = async () => {
        const bricks = { }; // Keep it all here.

        bricks.userId = document.location.pathname.match(/\/(\d+)(?:\/|$)/)?.[1];

        // The full page (except the top bar and margins)
        const [ content ] = await waitForSelector("#mainbar-full");
        if (!content)
            return;
        const contentSplit = content.children;
        const firstElementClassList = contentSplit[0]?.classList;
        let offset = (firstElementClassList.contains("js-cursor-container")
                      || firstElementClassList.contains("system-alert")) // "suspended" notice
                          ? 1
                          : 0;

        // The huge top area:
        const hugeUselessTopBar = contentSplit[offset + 0];
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

        const tabs = contentSplit[offset + 1];
        bricks.tabs = tabs;

        bricks.page = tabs.querySelector(".is-selected")?.textContent;

        // Elements on the profile:
        if (profileTABNAMES.includes(bricks.page)) {
            const mainContent = contentSplit[offset + 2];
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
    const userAvatar = (bricks) => {
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
        reputation.parentElement?.classList.remove("flex__allcells6");

        const image = bricks.avatar.querySelector("img");
        bricks.avatar.querySelector(".gravatar-wrapper-128")
                    ?.classList
                    ?.remove("gravatar-wrapper-128");
        // https://chat.stackoverflow.com/transcript/message/53146009#53146009
        const imageContainer = bricks.avatar.querySelector("[class~='md:d-none']");
        if (imageContainer) imageContainer.className = "";
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
    const makeChanges = (bricks) => {
        const { airOfMysteryContainer, contributions, profileButtonClone,
                profileTextArea, prose, stats, userFirstList
              } = bricks;

        bricks.avatar.querySelectorAll(".d-none")
                     .forEach(none => none.remove());

        // Put the avatar and username on the top right
        bricks.avatarClone.style.marginRight = "10px";
        bricks.avatarClone.querySelectorAll(".d-none")
                     .forEach(none => none.remove());
        bricks.avatarClone.querySelector(".gravatar-wrapper-128")
                         ?.classList
                         ?.remove("gravatar-wrapper-128");
        const imageContainer = bricks.avatarClone.querySelector("[class~='md:d-none']");
        if (imageContainer) imageContainer.className = "";
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
        if (profileTABNAMES.includes(bricks.page)) {
            bricks.topMainContent.className = "d-flex mb32 md:fd-column";

            profileTextArea.firstElementChild.replaceWith(bricks.userDetails);

            if (prose) {
                const { classList, style } = prose;
                setTimeout(() => classList.remove("overflow-hidden", "v-truncate-fade", "hmx3"),100);
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
                             element.querySelector(".v-visible-sr")?.remove();
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
    const theThreeBadges = () => {

        const bling = (colour, amount) => {
            const span1 = document.createElement("span");
            span1.classList.add("flex--item");
            const span2 = document.createElement("span");
            span2.classList.add("d-flex", "flex__center", "fl1");
            span2.textContent = amount;

            const blingHolder = document.createElement("div");
            blingHolder.classList.add("d-flex", "ai-center", "s-badge");

            switch (colour) {
                    case "gold":
                    case "oro":     // spanish
                    case "ouro":    // portuguese
                    case "золотых":
                    case "золотой":    blingHolder.classList.add("s-badge__gold");
                                       blingHolder.title = amount + " gold badges";
                                       span1.classList.add("badge1");
                    break;
                    case 'silver':
                    case "plata":   // spanish
                    case "prata":   // portuguese
                    case "серебряных":
                    case "серебряный": blingHolder.classList.add("s-badge__silver");
                                       blingHolder.title = amount + " silver badges";
                                       span1.classList.add("badge2");
                    break;
                    case "bronze":
                    case "bronce":  // spanish
                    case "бронзовых":
                    case "бронзовый":  blingHolder.classList.add("s-badge__bronze");
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
                                                            .replace(" badge","")
                                                            .replace("medallas de ","") // spanish
                                                            .replace("medalla de ","")  // spanish
                                                            .replace("medalhas de ","") // portuguese
                                                            .replace(" знаков","")
                                                            .replace(" знака","")
                                                            .replace(" знак", "");
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
    }


    // ---- putTopTagsonTop -------------------------------------------------------------------------
    const putTopTagsonTop = () => {
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
                transform: scale(0.75,0.75);
            }

            /* make the background transparent on the tag badge medal */
            .badge1-alternate.badge-tag,
            .badge2-alternate.badge-tag,
            .badge3-alternate.badge-tag {
                background-color: transparent !important;
            }

            /* center the tag badge medal */
            .profile-top-tags > div:first-child .badge1-alternate.badge-tag > span,
            .profile-top-tags > div:first-child .badge2-alternate.badge-tag > span,
            .profile-top-tags > div:first-child .badge3-alternate.badge-tag > span {
                vertical-align: initial !important;
            }
            `;

            const styleSheet = document.createElement("style");
            styleSheet.innerText = fixItCSS;
            document.head.appendChild(styleSheet);
    }

    // now as a string in Stack representation -------------------------
    const getNow = () => {
        // alternatively use absoluteTime()..
        const now = (new Date).toISOString();
        return now.substr(0, 10)
                   + " " // substitute the T
                   + now.substr(11, 8) // No milis
                   + now.substr(23);
    }

    // -----------------------------------------------------------------
    const getDate = (element) => {
        let title = element.title;
        if (title)
            return title;
        title = element.firstElementChild?.title;
        if (title)
            return title;
        return element.querySelector(".date_brick")?.title;
    }

    // -----------------------------------------------------------------
    const makeListItem = (type, text, tooltip) => {
        const item = document.createElement("li");
        item.textContent = text;
        item.style.listStyleType = `"${type} "`;
        item.title = tooltip;
        return item;
    }

    // -----------------------------------------------------------------
    const createList = (last, first) => {
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
    const fetchActivity = async (page) => {
        const { location } = window;

        const url = location.pathname;
        const resp = await fetch(`${url}?tab=activity&sort=all&page=${page}`);

        const text = await resp.text();
        return new DOMParser().parseFromString(text, 'text/html');
    }

    // -----------------------------------------------------------------
    const scrapeActivity = async ({ elementToAppend, headerPresent, elementToAdjust }) => {

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

            const currentHeight = +elementToAdjust?.style.maxHeight.replace("px","");
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

    // ---- In case there's no global Svg  -----------------------------
    const createSvg = (type) => {
        // https://chat.stackoverflow.com/transcript/message/53149584#53149584
        // https://github.com/userscripters/stacks-helpers/blob/master/src/icons/index.ts
        const svg     = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

        switch (type) {
            case "eye":
                svg.classList.add("svg-icon", "iconEye");
                svgPath.setAttribute("d", "M9.06 3C4 3 1 9 1 9s3 6 8.06 6C14 15 17 9 17 9s-3-6-7.94-6ZM9 13a4 4 0 "
                                           + "110-8 4 4 0 010 8Zm0-2a2 2 0 002-2 2 2 0 00-2-2 2 2 0 00-2 2 2 2 0 002 2Z");
                break;
            case "clock":
                svg.classList.add("svg-icon", "iconClock");
                svgPath.setAttribute("d", "M9 17c-4.36 0-8-3.64-8-8 0-4.36 3.64-8 8-8 4.36 0 8 3.64 8 8 0 4.36-3.64 8-8 8Zm0-2c3.27 "
                                          + "0 6-2.73 6-6s-2.73-6-6-6-6 2.73-6 6 2.73 6 6 6ZM8 5h1.01L9 9.36l3.22 2.1-.6.93L8 10V5Z");
        }

        svg.append(svgPath);
        svg.ariaHidden = "true";
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("viewBox", "0 0 18 18");

        return svg;
    }

    // -----------------------------------------------------------------
    const fetchCreepyData = async ({ userId, userFirstList }) => {
        const fetchUser = async (userId) => {
            const apiUrl = `https://api.stackexchange.com/2.2/users/`;
            const userFilter = '!bWWrYUhX0a2k7x';
            const site = window.location.hostname;
            const key = 'Ql5)rGNzh1JB8xiEjeYQmQ((';

            const response = await fetch(`${apiUrl}${userId}?filter=${userFilter}&site=${site}&key=${key}`);
            const result = await response.json();
            return result?.items[0];
        }

        // https://dev.stackoverflow.com/content/Js/full.en.js
        const customPrettyDateDiff = (epocSeconds, months = false) => {
            if (!epocSeconds) return;

            const diff = (((new Date()).getTime() / 1000) - epocSeconds)
                              + StackExchange.options.serverTimeOffsetSec;

            if (isNaN(diff) || diff < 0)
                return;

            return (
                !months && diff < 2 && "just now"                         ||
                !months && diff < 60 &&
                    (function(n){return n.seconds === 1
                                          ? n.seconds + " sec ago"
                                          : n.seconds + " secs ago"
                    })({seconds: Math.floor(diff)})                       ||
                !months && diff < 120 && "1 min ago"                      ||
                !months && diff < 3600 &&
                    (function(n){return n.minutes === 1
                                          ? n.minutes + " min ago"
                                          : n.minutes + " mins ago"
                    })({minutes: Math.floor(diff / 60)})                  ||
                !months && diff < 7200 && "1 hour ago"                    ||
                !months && diff < (86400 / 2) &&
                    (function(n){return n.hours === 1
                                          ? n.hours + " hour ago"
                                          : n.hours + " hours ago"
                    })({hours: Math.floor(diff / 3600)})                  ||
                !months && diff < 86400 && "today"                        ||
                !months && diff < (86400 * 2) && "yesterday"              ||
                !months && diff < (86400 * 7) &&
                    (function(n){return n.days + " days ago"
                    })({days: Math.floor(diff / 86400)})                  ||
                !months && diff < (86400 * 30) &&
                    (function(n){return n.weeks === 1
                                          ? n.weeks + " week ago"
                                          : n.weeks + " weeks ago"
                    })({weeks: Math.floor(diff / (86400 * 7))})           ||
                diff < (86400 * 365) &&
                    (function(n){return n.months === 0
                                          ? "" // this is false
                                          : n.months === 1
                                              ? n.months + " month ago"
                                              : n.months + " months ago"
                    })({months: Math.floor(diff / (86400 * 30.5))})       ||
                !months && (function(n){
                              const months =
                                        customPrettyDateDiff(epocSeconds +       // add the years
                                                               Math.floor(diff / (86400 * 365)) * (86400 * 365),
                                                             true);
                              return ((n.years === 1 ? n.years + " year" : n.years + " years")
                                       + (months ? ", " + months : " ago"));
                           })({years: Math.floor(diff / (86400 * 365))})
            );
        }

        // https://dev.stackoverflow.com/content/Js/full.en.js
        const absoluteTime = (epocSeconds) => {
            var date = new Date();
            date.setTime(epocSeconds * 1000);

            return [
                date.getUTCFullYear(),
                "-", pad(date.getUTCMonth() + 1),
                "-", pad(date.getUTCDate()),
                " ", pad(date.getUTCHours()),
                ":", pad(date.getUTCMinutes()),
                ":", pad(date.getUTCSeconds()),
                "Z"
            ].join("");

            function pad(n) {
                return n < 10 ? "0" + n : n;
            }
        }

        const splitViews = (viewCount) => {
            return viewCount.toLocaleString("en-US");
            // const splitViewCount = viewCount.toString().split(/(?=(?:(?:\d{3})*$))/); // every 3rd from the end
            // return splitViewCount.join(); // "," id default
        }

        const createListItem = (type, userDetails) => {
            const listItemContent = document.createElement("div");
            let listItemIcon;
            if (type === "view") {
                listItemContent.textContent = `${splitViews(userDetails.view_count)} profile views`;
                listItemIcon = (typeof Svg !== "undefined")
                                   ? Svg.Eye()?.get(0)
                                   : createSvg("eye");
            } else {
                listItemContent.title = absoluteTime(userDetails.last_access_date);
                listItemContent.textContent = `Last seen ${customPrettyDateDiff(userDetails.last_access_date)}`;
                listItemIcon = (typeof Svg !== "undefined")
                                   ? Svg.Clock()?.get(0)
                                   : createSvg("clock");
            }

            const listItemContentContainer = document.createElement("div");
            listItemContentContainer.className = "flex--item";
            listItemContentContainer.append(listItemContent);

            const listItemIconContainer = document.createElement("div");
            listItemIconContainer.className = "flex--item fc-black-350";
            listItemIconContainer.append(listItemIcon);

            const listItemContainer = document.createElement("div");
            listItemContainer.className = "d-flex gs4 gsx ai-center";
            listItemContainer.append(listItemIconContainer,listItemContentContainer);

            const listItem = document.createElement("li");
            listItem.className = "flex--item";
            listItem.append(listItemContainer);

            return listItem;
        }

        const userDetails = await fetchUser(userId);
        userFirstList.append(createListItem("view", userDetails), createListItem("last", userDetails));
    }


    // ---- DoIt -------------------------------------------------------------------------

    const doIt = async () => {
        const bricks = await fetchBricks();

        makeChanges(bricks);

        if (getActivity && profileTABNAMES.includes(bricks.page))
            scrapeActivity({
                             elementToAppend : bricks.rightSide,
                             headerPresent   : bricks.headerExists,
                             elementToAdjust : bricks.prose
                          });

        putTopTagsonTop();

        if (getCreepyData && profileTABNAMES.includes(bricks.page))
            fetchCreepyData(bricks);
    }

    doIt();

})();