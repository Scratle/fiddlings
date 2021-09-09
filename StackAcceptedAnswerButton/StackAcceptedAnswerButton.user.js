// ==UserScript==
// @name         Stack Accepted Answer Button
// @description  Show a button that links to the accepted Answer.
// @version      0.3
// @namespace    scratte-fiddlings
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(?:[^/]+\.)?stackoverflow.com/questions/\d+/
// @include      /^https://(?:meta\.)?serverfault.com/questions/\d+/
// @include      /^https://(?:meta\.)?superuser.com/questions/\d+/
// @include      /^https://(?:meta\.)?askubuntu.com/questions/\d+/
// @include      /^https://(?:meta\.)?mathoverflow.net/questions/\d+/
// @include      /^https://stackapps.com/questions/\d+/
// @include      /^https://[^/]+\.stackexchange.com/questions/\d+/
//
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Idea of adding the checkmark to the title came from double-beep (https://stackoverflow.com/users/10607772)
    // https://chat.stackoverflow.com/transcript/message/52991681#52991681
    const addToTitle = true;

    const answerFilters = document.querySelector("#answers #answers-header .js-filter-btn");
    if (!answerFilters)
        return;

    const isAnswerOnPage = (answerId) => {
        return !!document.querySelector(`#answer-${answerId}`);
    }

    const addButton = (answerId) => {
        const buttonLink = document.createElement("a");

        if (isAnswerOnPage(answerId)) {
            // https://chat.stackoverflow.com/transcript/message/52991704#52991704
            buttonLink.addEventListener("click", () => StackExchange.question.scrollToPost(answerId));
        } else {
            const link = `${window.location.origin}/a/${answerId}`;
            buttonLink.href = link;
        }

        if (addToTitle) {
            const title = document.querySelector("#question-header a");
            buttonLink.innerHTML = `<svg aria-hidden="true" class="svg-icon iconCheckmarkLg" width="36" height="36" viewBox="0 0 36 36">
                                        <path d="m6 14 8 8L30 6v8L14 30l-8-8v-8z"></path>
                                    </svg>`;
            buttonLink.style.color = "var(--green-500)";

            title?.before(buttonLink);
        } else {
            buttonLink.className = "mx6 flex--item s-btn s-btn__filled";
            buttonLink.title = "Links to the accepted Answer";
            buttonLink.style.backgroundColor = "var(--green-400)";
            buttonLink.style.border = "revert";
            buttonLink.style.color = "white";
            buttonLink.textContent = "Accepted";

            answerFilters.parentElement?.before(buttonLink);
        }
    }

    const fetchAnswer = async () => {
        const questionId = window.location.pathname.split('/')[2];

        const resp = await fetch(`/posts/${questionId}/timeline?filter=NoVoteDetail`);
        const text = await resp.text();
        const parsedHTML = new DOMParser().parseFromString(text, 'text/html');

        const events = parsedHTML.querySelector(".event-rows");
        for (const element of [...events.children]) {
            const eventType = element.dataset.eventtype;
            if (eventType === "answer") {
                const accepted = element.querySelector(".badge-earned-check");
                if (accepted) {
                    const answerId = element.dataset.eventid;
                    addButton(answerId);
                    return;
                }
            }
        }
    }

    fetchAnswer();

})();