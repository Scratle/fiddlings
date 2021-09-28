// ==UserScript==
// @name         Stack Moderators & Staff
// @namespace    scratte-fiddlings
// @version      0.6
// @description  Indicate less that a user is moderator or staff
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @include      /^https://(?:meta\.)?stackoverflow\.com/
// @exclude      /^https://(?:meta\.)?stackoverflow\.com/users/
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

    const communityApperences =
              [
                  ".user-details > span",
                  ".comment-body > div > span",
                  ".comment-user > span",
                  ".summary > div > div > span",   // front page
                  ".list-reset > li > div > span", // review notice
              ];

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
        // Change the Community bot-box to the old diamond.
        doc.querySelectorAll(communityApperences.join())
            .forEach(botBox => {
                             if (botBox && botBox.textContent.trim() === "Bot") {
                                 fixCommunity(botBox);
                                 const classList = botBox.parentElement?.classList;
                                 if (classList) {
                                     classList.remove("ai-center");
                                     classList.add("ai-baseline");
                                 }

                             }
             });

        doc.querySelectorAll(".s-badge__moderator")
            .forEach(element => {
                         element.className = "";
                         element.textContent = "♦";
                         element.style.fontSize = "125%";
                         element.style.color = "#0077cc";
                         element.previousElementSibling?.classList.add("mr2");
                });

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