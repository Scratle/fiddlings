// ==UserScript==
// @name         Stack Moderators & Staff
// @namespace    scratte-fiddlings
// @version      0.9
// @description  Indicate less that a user is moderator or staff
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @include      /^https://(?:[^/]+\.)?stackoverflow\.com/
// @exclude      /^https://(?:[^/]+\.)?stackoverflow\.com/users/
// @include      /^https://stackapps\.com/
// @exclude      /^https://stackapps\.com/users/
// @include      /^https://meta\.stackexchange\.com/
// @exclude      /^https://meta\.stackexchange\.com/users/
// @grant        none
// ==/UserScript==

(function(win, doc) {
    'use strict';

    doc.addEventListener('readystatechange', () => {
        swap();
    });

    $(doc) // needed to include reviews and comments using "Show X more comments"
        .ajaxComplete((event, request, settings) => {
            swap();
            add();
         });

    const botNames = ["Bot", "Бот"];

    // Suggested by Oleg Valter (https://stackoverflow.com/users/11407695)
    // https://chat.stackoverflow.com/transcript/message/53157675#53157675
    const communityApperences =
              [
                "a[href*='/users/-1'] + .s-badge",  // comments & timelines & front page & review notice & editor
                "a[href*='/users/-1'] > .s-badge",  // Suggested review editor
              ]

    const fixCommunity = (element) => {
        // https://codepoints.net/U+1F79A WHITE DIAMOND CONTAINING BLACK VERY SMALL DIAMOND
        element.textContent = "🞚";
        element.style.fontSize = "95%";
        element.className = "mod-flair";
        element.title = "Community Bot — not a real person";
    };

    // add when missing (because consistency on the Community user is just too hard for Stack Inc :-)
    function add() {
        const community = "/users/-1/community";
        const bots = document.querySelectorAll(".s-expandable ul > li > a");
        bots.forEach(bot => {
                         if (bot.href.indexOf(community) > -1) {
                             // This was already done on the element
                             if (bot.querySelector("span")?.classList.contains("mod-flair"))
                                 return;
                             // This was already done on the element and it's a sibling
                             [...bot.parentElement
                                 .children]
                                 .forEach(child => {
                                              if (child.classList.contains("mod-flair"))
                                                  return;
                                  });
                             const botFlair = document.createElement("span");
                             fixCommunity(botFlair);
                             bot.append(botFlair);
                         }
             });
    }

    // just swap the box with an icon
    function swap() {
        // Change the Community bot-box to a 🞚.
        doc.querySelectorAll(communityApperences.join())
            .forEach(botBox => {
                         const { textContent, parentElement } = botBox;
                         if (!textContent || !parentElement)
                             return;
                         if (botNames.includes(textContent.trim())) {
                             const { firstChild } = parentElement;
                             // Because Community as a suggested editor has a trailling space :/
                             // And here the bot-Box is inside the link, not a sibling
                             if (parentElement.nodeName === "A" && firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                                 firstChild.nodeValue = firstChild.nodeValue.trimEnd();
                             }

                             fixCommunity(botBox);
                             const classList = botBox.parentElement?.classList;
                             if (classList) {
                                 classList.remove("ai-center");
                                 classList.add("ai-baseline");
                             }
                         }
             });

        // Change the moderator mod-box to a ♦.
        doc.querySelectorAll(".s-badge__moderator")
            .forEach(element => {
                         element.className = "";
                         element.textContent = "♦";
                         element.style.fontSize = "125%";
                         element.style.color = "#0077cc";
                         element.previousElementSibling?.classList.add("mr2");
                });

        // Change the staff-box to a Stack logo.
        doc.querySelectorAll(".s-badge__staff")
            .forEach(element => {
                         element.className = "";
                         element.textContent = "";
                         element.title = "Stack Exchange Inc Employee";
                         element.append(Svg.LogoGlyphXxs().get(0));
                         element.style.color = "var(--orange-400)";
                });
    }

})(window, document);