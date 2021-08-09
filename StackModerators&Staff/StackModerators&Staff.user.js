// ==UserScript==
// @name         Stack Moderators & Staff
// @namespace    scratte-fiddlings
// @version      0.2
// @description  Indicate less that a user is moderator or staff
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @include      https://meta.stackoverflow.com*
// @exclude      https://meta.stackoverflow.com/users*
// @include      https://meta.stackexchange.com*
// @exclude      https://meta.stackexchange.com/users*
// @icon         https://www.google.com/s2/favicons?domain=stackexchange.com
// @grant        none
// ==/UserScript==

(function(window, document) {
    'use strict';
    document.addEventListener('readystatechange', () => {
        swap();
    });

    $(document) // needed to include comments using "Show X more comments"
        .ajaxComplete((event, request, settings) => {
            swap();
         });

    function swap() {
        document.querySelectorAll(".s-badge__staff")
            .forEach(element => {
                         element.className = "";
                         element.textContent = "";
                         element.title = "Stack Exchange Inc Employee";
                         element.append(Svg.LogoGlyphXxs().get(0));
                         element.style.color = "var(--orange-400)";
                });

        document.querySelectorAll(".s-badge__moderator")
            .forEach(element => {
                         element.className = "";
                         element.textContent = " ?";
                         element.style.fontSize = "125%";
                         element.style.color = "#0077cc";
                });
    }

})(window, document);