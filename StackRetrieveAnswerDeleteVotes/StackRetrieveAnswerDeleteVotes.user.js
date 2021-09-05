// ==UserScript==
// @name         Stack Retrieve Answer delete votes
// @description  Show the delete votes on Answers
// @version      2.1
// @author       Scratte (https://stackoverflow.com/users/12695027)
//
// @include      /^https://(?:[^/]+\.)?stackoverflow.com/(questions/\d+|review/.*)/
// @exclude      /^https://(?:[^/]+\.)?stackoverflow.com/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://(?:meta\.)?serverfault.com/(questions/\d+|review/.*)/
// @exclude      /^https://(?:meta\.)?serverfault.com/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://(?:meta\.)?superuser.com/(questions/\d+|review/.*)/
// @exclude      /^https://(?:meta\.)?superuser.com/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://(?:meta\.)?askubuntu.com/(questions/\d+|review/.*)/
// @exclude      /^https://(?:meta\.)?askubuntu.com/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://(?:meta\.)?mathoverflow.net/(questions/\d+|review/.*)/
// @exclude      /^https://(?:meta\.)?mathoverflow.net/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://stackapps.com/(questions/\d+|review/.*)/
// @exclude      /^https://stackapps.com/review/(?:[^/]+/)?(stats|history)/
// @include      /^https://[^/]+\.stackexchange.com/(questions/\d+|review/.*)/
// @exclude      /^https://[^/]+\.stackexchange.com/review/(?:[^/]+/)?(stats|history)/
//
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Based on version 0.5 of https://github.com/double-beep/my-userscripts/blob/master/retrieveDVCV.user.js
// By double-beep (https://stackoverflow.com/users/10607772)
// Shared using the MIT license: https://chat.stackoverflow.com/transcript/message/52192390#52192390

(async function() {
    const generalScoreThreshold    = 0;
    const lowQualityPostsThreshold = 1;

    const canSeeTimelineVotes = StackExchange?.options.user?.rep >= 1000;
    if (!canSeeTimelineVotes)
        return; // under 1k rep; can't see the vote summaries in timeline

    // ---- printToConsole ----------------------------------------
    function printToConsole(string) {
        const printIt = false;
        if (printIt) console.log(string);
    }

    // ---- generateAppendElement ---------------------------------
    function generateAppendElement(element, innerHTML) {
        const el = document.createElement('div');
        el.innerHTML = innerHTML;
        element.appendChild(el);
    }

    // ---- appendDeleteVotesInAnswer -----------------------------
    function appendDeleteVotesInAnswer(post, deleteVoteCount) {
        const appendAfterElement = document.querySelector(post.selector);

        generateAppendElement(appendAfterElement, "&nbsp;");
        generateAppendElement(appendAfterElement, `${deleteVoteCount} DV`);
    }

    // ---- findDeleteVoteCountFromAnswerTimeline -----------------
    async function findDeleteVoteCountFromAnswerTimeline(post) {
        const resp = await fetch(`/posts/${post.answerId}/timeline?filter=WithVoteSummaries`);
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
            appendDeleteVotesInAnswer(post, deleteVoteCount);
        }
    }

    // https://meta.stackexchange.com/questions/268446/are-page-requests-rate-limited-throttled
    // https://meta.stackexchange.com/questions/164899/the-complete-rate-limiting-guide

    // Inspired (most of it is identical) by Oleg Valter (https://stackoverflow.com/users/11407695)
    // https://chat.stackoverflow.com/transcript/message/52207931#52207931
    const delay = (s) => new Promise((resolve) => setTimeout(resolve, s * 1e3));
    const maxConcurrentRequests = 5;
    let pendingRequests = 0;
    let fetchCounter = 0;

    // ---- getDeleteVotes ----------------------------------------
    async function getDeleteVotes (ScoreThreshold) {
        printToConsole("calling getDeleteVotes");

        for (const element of [...document.querySelectorAll('.answer')]) {
            const { dataset: { answerid, score } } = element;
            printToConsole(`answerid: ${answerid}.  score = ${score}`);

            // https://stackoverflow.com/help/privileges/trusted-user
            // Though it's possible for 20K'ers to delete vote zero-scored Answers from the Low Quality Posts queue.
            if (score < ScoreThreshold) {
                if(pendingRequests >= maxConcurrentRequests) {
                    await delay(1 + Math.random() + 0.1);  // delay the next fetch to not get ratelimited.
                    printToConsole(`fetching timeline for answer with id: ${answerid} after ~1 sec`);
                }

                printToConsole(`already pending: ${pendingRequests}. fetching...`);
                const promise = findDeleteVoteCountFromAnswerTimeline({
                                                                        answerId : answerid,
                                                                        selector : `#answer-${answerid} .votecell`
                                                                      });
                pendingRequests += 1;

                promise.finally(() => pendingRequests -= 1);
                fetchCounter++;
            }
        }
        printToConsole(`Total timelines on Answers fetched: ${fetchCounter}`);
    }

    // ---- getSuggestedEditReviewDelevotes -----------------------
    function getSuggestedEditReviewDeletevotes(ScoreThreshold) {
        printToConsole("calling getSuggestedEditReviewDelevotes");

        // If there's a "Question" tab, this is a review of an Answer
        const isAnswer = !!document.querySelector("#tab-question");
        if (!isAnswer)
            return;
        const votingContainer = document.querySelector("#panel-revision .votecell .js-voting-container");
        if (!votingContainer)
            return;

        const score = votingContainer.querySelector(".js-vote-count")?.dataset?.value;
        const answerId = votingContainer.dataset?.postId;

        if (answerId && score < ScoreThreshold)
            findDeleteVoteCountFromAnswerTimeline({
                                                    answerId,
                                                    selector : "#panel-revision .votecell"
                                                    // selector : "#panel-revision .votecell, #answer .votecell"
                                                  });
    }

    // ---- Do it :) ----------------------------------------------

    const pathName = window.location.pathname;

    if (!pathName.startsWith("/review/")) { // Not a review
        getDeleteVotes(generalScoreThreshold);
    } else {
        // Needed to make it work in reviews, since posts come in late..
        const reviewRegex = /^\/review\/(next-task|task-reviewed)/;
        $(document)
            .ajaxComplete((event, request, settings) => {
                              if (reviewRegex.test(settings.url)) {
                                  getDeleteVotes(pathName.indexOf("low-quality-posts") > -1
                                                     ? lowQualityPostsThreshold
                                                     : generalScoreThreshold);
                                  getSuggestedEditReviewDeletevotes(generalScoreThreshold);
                              }
             });
    }

})();