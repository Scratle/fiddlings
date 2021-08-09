// ==UserScript==
// @name         Stack User profiles
// @description  Make use of the space like before.
// @version      1.2
//
// @namespace    scratte-fiddlings
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(meta\.)?askubuntu\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://(meta\.)?mathoverflow\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://(meta\.)?stackoverflow\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://(meta\.)?superuser\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://(meta\.)?serverfault\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://stackapps\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
// @include      /^https://[^/]+\.stackexchange\.com/users/\d+/[^/?]+(?:\?tab=profile)?$/
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

    // userAvatar stuff. The box on the very left ---------------------
    function fixUserAvatarBox(userAvatar) {
        const userAvatarItems = userAvatar.firstElementChild?.children;
        if (!userAvatarItems && userAvatarItems.length < 2) // there's only the avatar
            return;

        const whoami = StackExchange?.options.user.userId?.toString();
        const whoIsThis = window.location.pathname.split("/")[2];
        if (whoami === whoIsThis) { // Don't remove the button on other users (relavant to Teams)
            // Because I can find the "Edit profile and settings" tab!
            if (userAvatarItems.length > 3) {
                userAvatarItems[3].remove();
            } else { // when Stack forgets to put in badges..
                const button = userAvatar.querySelector("a");
                if (button && button.textContent.trim() === "Edit profile")
                    button.remove();
            }
        }

        const the4 = userAvatarItems[1];
        const the4Cloned = the4.cloneNode([true]); // get a copy now.

        const the4Items = the4.children;
        if (the4Items.length < 4)
            return;
        for (let i = 3; i > 0; i--) {
            the4Items[i].remove();
        }
        the4Items[0].classList.remove("flex--item");
        the4Items[0].classList.add("d-flex");
        the4Items[0].firstElementChild.style.paddingRight = "5px";
        the4Items[0].firstElementChild.style.marginTop = "-2px";

        return the4Cloned;
    }

    // userInfo stuff. Everything to the right of the big avatar -------
    function fixUserInfoStuff(userInfo, the4Cloned) {

        const userHeader = userInfo.querySelector("h3");
                                                             // parent       me    kids
        const userInfoItems = userInfo.querySelectorAll("div:is(#user-card > div > div)");

        // Suggestion by VLAZ (https://stackoverflow.com/users/3689450)
        // https://chat.stackoverflow.com/transcript/message/52774961#52774961
        const byClass = (className) => (element) => element.classList.contains(className);
        const userProfileText = [...userInfoItems].find(byClass("overflow-x-hidden"));
        const userStuff       = [...userInfoItems].find(byClass("my16"));
        const userName = [...userInfoItems].find(x => x !== userProfileText && x !== userStuff)

        // user name, header, profile text
        const leftSide = document.createElement("div");
        leftSide.classList.add("d-flex", "fl-grow1", "fd-column", "mr48");
        leftSide.append(userName);
        if (userHeader)
            leftSide.append(userHeader);

        // Question/Answer count, list items, activity times.
        const rightSide = document.createElement("div"); // the old sidebar back
        rightSide.style.minWidth = "150px";
        if (boxOfFour) {
            const QuestionsAnswers = boxOfFour.children;
            QuestionsAnswers[0].remove(); // reputation
            QuestionsAnswers[0].remove(); // impact
            rightSide.append(boxOfFour);
        } else {
            // urgh! ..we'll need to create them then
            const noAnswers = document.createElement("div");
            noAnswers.classList.add("fs-body3", "fc-dark");
            noAnswers.textContent = "0";

            const noAnswersContainer = document.createElement("div");
            noAnswersContainer.classList.add("flex--item");
            noAnswersContainer.append(noAnswers);

            const noQuestionsContainer = noAnswersContainer.cloneNode([true]);
            noAnswersContainer.append("answers");
            noQuestionsContainer.append("questions");

            const none = document.createElement("div");
            none.classList.add("d-flex", "flex__allcells6", "fw-wrap", "gs4", "fc-light", "px4", "wmx2");
            none.append(noAnswersContainer, noQuestionsContainer);
            rightSide.append(none);
        }

        if (userProfileText) {
            userProfileText.classList.remove("mt24");
            userProfileText.classList.add("mt12");
            userProfileText.style.maxHeight = userHeader ? "211px" : "235px";
            userProfileText.style.paddingRight = "15px";
            userProfileText.style.marginRight = "-15px";
            leftSide.append(userProfileText);
        }

        // the listed items.
        if (userStuff) {
            const userStuffItems = userStuff.children;
            const userStuffItemsLength = userStuffItems.length;

            const listStuffLeft  = (userStuffItemsLength > 0) ? userStuffItems[0] : null;
            const listStuffRight = (userStuffItemsLength > 1) ? userStuffItems[1] : null;

            if (listStuffLeft) {
                listStuffLeft.classList.remove("mr48");

                const listElement = listStuffLeft.querySelector("ul");
                if (listStuffRight) {
                    listElement.append(...listStuffRight.querySelectorAll("li"));
                    listStuffRight.remove();
                }

                rightSide.append(userStuff);
            }
        }

        const sideWrapper = document.createElement("div");
        sideWrapper.classList.add("d-flex");
        leftSide.classList.add("flex--item");
        rightSide.classList.add("flex--item");
        sideWrapper.append(leftSide, rightSide);

        userInfo.classList.remove("mt16");
        userInfo.append(sideWrapper);

        return { elementToAppend : rightSide, headerPresent : !!userHeader, elementToAdjust : userProfileText};
    }

    // -----------------------------------------------------------------
    function fixSpacing() {
        ["badges", "top-tags", "top-posts"]
            .forEach(id => {
                         const element = document.getElementById(id);
                         if (!element)
                             return;
                         element.classList.remove("mb48");
                         element.classList.add("mb32");
                         if (id === "badges") {// just the one
                             const grandParent = element.parentElement?.parentElement;
                             if (grandParent) {
                                 grandParent.style.width = "revert";
                                 grandParent.style.maxWidth = "revert";
                             }
                         }
             });

        document
            .querySelectorAll(".ta-right")
            .forEach(element => {
                         element.classList.remove("mb24");
             });
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
        const title = element.firstElementChild?.title;
        if (title)
            return title;
        return element.querySelector(".date_brick")?.title;
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
        container.style.whiteSpace = "nowrap";
        container.append(header, items);

        return container;
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

        let page = 1;
        let maxPage, lastActivity, firstActivity;

        const firstParsedHTML = await fetchActivity(page++);

        // find the maxpage:
        const pages = firstParsedHTML.querySelector(".s-pagination");
        if (!pages) { // no pagination. There's just the one.
            lastActivity  = getRecentItem(firstParsedHTML);
            firstActivity = getLastItem(firstParsedHTML);
            elementToAppend.append(createList(lastActivity, firstActivity));
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

        elementToAppend.append(createList(lastActivity, firstActivity));

        // readjust the height of the profile text prose
        const height = parseInt(window.getComputedStyle(elementToAppend).height);
        elementToAdjust.style.maxHeight = (height - 80 + (headerPresent ? 0 : 30)) + "px";
    }

    // -----------------------------------------------------------------
    function fixPlaceHolder() {
        const placeHolderImage = document.querySelector(".profile-placeholder--image");
        const parent = placeHolderImage && placeHolderImage.parentElement;
        if (!parent)
            return;

        parent.classList.remove("mt64", "pt32");
        parent.classList.add("mb24");
    }

    // -----------------------------------------------------------------
    function putTopTagsonTop () {
        // Originally imspired by TylerH's Answer: https://meta.stackoverflow.com/a/408625
        // Then kindly modfied by Oleg Valter (https://stackoverflow.com/users/11407695)
        const fixItCSS = `
            body.user-page #user-card + div > div.flex--item.fl1:nth-child(2) {
                display: flex;
                flex-direction: column;
            }

            body.user-page #top-tags {
                order: 1;
            }
            body.user-page #top-posts {
                order: 2;
            }
            body.user-page #badges {
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


    // -----------------------------------------------------------------
    // ----------- Do it -----------------------------------------------

    const userCard = document.getElementById("user-card");
    if (!userCard)
        return;
    userCard.classList.remove("mb48");
    userCard.classList.add("mb32");

    const userCardItems = userCard.children;
    if (userCardItems.length < 2)
        return;

    const userAvatar = userCardItems[0];
    const userInfo = userCardItems[1];

    // fix the userAvatarBox and get the boxOfFour
    const boxOfFour = fixUserAvatarBox(userAvatar);

    // the userinfo and get the rightside bar
    const rightSideBarNuserProfileText = fixUserInfoStuff(userInfo, boxOfFour);

    fixSpacing();
    putTopTagsonTop();
    fixPlaceHolder(); // there's no posts & no tags
    scrapeActivity(rightSideBarNuserProfileText);

})();