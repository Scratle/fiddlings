// ==UserScript==
// @name         Stack Retrieve Answer delete votes
// @description  Show the delete votes on Answers
// @version      1.0
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(?:[^/]+\.)?stackoverflow.com/questions/\d+/
// @include      /^https://(?:[^/]+\.)?serverfault.com/questions/\d+/
// @include      /^https://(?:[^/]+\.)?superuser.com/questions/\d+/
// @include      /^https://(?:[^/]+\.)?askubuntu.com/questions/\d+/
// @include      /^https://(?:[^/]+\.)?mathoverflow.net/questions/\d+/
// @include      /^https://stackapps.com/questions/\d+/
// @include      /^https://(?:[^/]+)?\.stackexchange.com/questions/\d+/
//
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Based on version 0.5 of https://github.com/double-beep/my-userscripts/blob/master/retrieveDVCV.user.js
// By double-beep (https://stackoverflow.com/users/10607772)
// Shared using the MIT license: https://chat.stackoverflow.com/transcript/message/52192390#52192390

(async function() {
    const canSeeTimelineVotes = StackExchange.options.user.rep >= 1000;
    if (!canSeeTimelineVotes) return; // under 1k rep; can't see the vote summaries in timeline

    // ---- generateAppendElement ---------------------------------
    function generateAppendElement(element, innerHTML) {
        const el = document.createElement('div');
        el.innerHTML = innerHTML;
        element.appendChild(el);
    }

    // ---- appendDeleteVotesInAnswer -----------------------------
    function appendDeleteVotesInAnswer(answerId, deleteVoteCount) {
        const appendAfterElement = document.querySelector(`#answer-${answerId} .votecell`);

        generateAppendElement(appendAfterElement, "&nbsp;");
        generateAppendElement(appendAfterElement, `${deleteVoteCount} DV`);
    }

    // ---- findDeleteVoteCountFromAnswerTimeline -----------------
    async function findDeleteVoteCountFromAnswerTimeline(postId) {
        const resp = await fetch(`/posts/${postId}/timeline?filter=WithVoteSummaries`);
        const text = await resp.text();
        const parsedHTML = new DOMParser().parseFromString(text, 'text/html');
        const events = parsedHTML.querySelector(".event-rows");

        const searchFor = "Delete: ";
        const length = searchFor.length;
        let deleteVoteCount = 0;

        for (const element of [...events.children]) {
            // https://chat.stackoverflow.com/transcript/message/52579867#52579867
            const eventType = element.dataset.eventtype;
            if (eventType === "voteaggregate") {
                element.querySelectorAll('.summary-entry')
                       .forEach(function(entry) {
                                    const text = entry.innerHTML;

                                    // Optimization by Cody Gray (https://stackoverflow.com/users/366904)
                                    // https://chat.stackoverflow.com/transcript/message/52578177#52578177
                                    let pos = text.indexOf(searchFor);
                                    if (pos != -1) {
                                        deleteVoteCount += +text[pos + length];
                                    }
                        });
            } else if (eventType === "history"){
                // element.firstElementChild.nextElementSibling.nextElementSibling.firstElementChild.textContent.trim()
                if (element.querySelector(".wmn1").textContent.trim() === "undeleted") {
                    break;
                }
            }
        };

        if (deleteVoteCount > 0) {
            appendDeleteVotesInAnswer(postId, deleteVoteCount);
        }
    }

    // ---- printToConsole ----------------------------------------
    function printToConsole(string) {
        const printIt = false;
        if (printIt) console.log(string);
    }


    // ---- Do it :) ----------------------------------------------
    // https://meta.stackexchange.com/questions/268446/are-page-requests-rate-limited-throttled
    // https://meta.stackexchange.com/questions/164899/the-complete-rate-limiting-guide

    // Inspired (most of it is identical) by Oleg Valter (https://stackoverflow.com/users/11407695)
    // https://chat.stackoverflow.com/transcript/message/52207931#52207931
    const delay = (s) => new Promise((resolve) => setTimeout(resolve, s * 1e3));
    const maxConcurrentRequests = 5;
    let pendingRequests = 0;
    let fetchCounter = 0;

    for (const element of [...document.querySelectorAll('.answer')]) {
        const { dataset: { answerid, score } } = element;
        printToConsole(`answerid: ${answerid}.  score = ${score}`);

        // https://stackoverflow.com/help/privileges/trusted-user
        // Though it's possible for 20K'ers to delete vote zero-scored Answers from the Low Quality Posts queue.
        if (score < 0) {
            if(pendingRequests >= maxConcurrentRequests) {
                await delay(1 + Math.random() + 0.1);  // delay the next fetch to not get ratelimited.
                printToConsole(`fetching timeline for answer with id: ${answerid} after ~1 sec`);
            }

            printToConsole(`already pending: ${pendingRequests}. fetching...`);
            const promise = findDeleteVoteCountFromAnswerTimeline(answerid);
            pendingRequests += 1;

            promise.finally(() => pendingRequests -= 1);
            fetchCounter++;
        }
    }
    printToConsole(`Total timelines on Answers fetched: ${fetchCounter}`);

})();