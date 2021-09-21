// ==UserScript==
// @name         Stack Retrieve Question CloseReopenDelete votes
// @description  Show close/reopen/delete votes under the timeline link.
// @version      0.4
// @namespace    scratte-fiddlings
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
// ==/UserScript==

// Inspired by original userscript (license: MIT):
// https://gist.github.com/double-beep/3a300ebc521d60ed3d5a0c955023ff86
// https://github.com/double-beep/my-userscripts/blob/master/retrieveDVCV.user.js
// by double-beep (https://stackoverflow.com/users/10607772)

(async () => {
    const canSeeDeleteVotes = StackExchange?.options.user?.canSeeDeletedPosts;
    const canSeeCloseVotes = document.querySelector("close-question-link");
    if (canSeeDeleteVotes && canSeeCloseVotes)
        return;

    // ---- generateAppendElement -----------------------------------
    function generateElement(innerHTML) {
        const element = document.createElement('div');
        element.innerHTML = innerHTML;
        return element;
    }

    // ---- appendThem ----------------------------------------------
    function appendThem(result, selector) {
        const item = result?.items[0];
        if (!item)
            return; // No items in the response. Post is probably deleted.

        const elements = [];

        elements.push(generateElement(`&nbsp;`));
        if (!canSeeCloseVotes) {
            elements.push(generateElement(`${item.close_vote_count} CV`));
            elements.push(generateElement(`${item.reopen_vote_count} RV`));
        }
        if (!canSeeDeleteVotes) elements.push(generateElement(`${item.delete_vote_count} DV`));
        elements.push(generateElement(`<br>Quota<br>${result.quota_remaining}`));

        document.querySelector(selector).append(...elements);
    }

    // ---- fetchVotes ----------------------------------------------
    async function fetchVotes(questionId) {
        const apiUrl = `https://api.stackexchange.com/2.2/questions/`;
        const questionFilter = '!)rbHxFp0gYkdLgKAljfv';
        const site = window.location.hostname;
        const key = 'Se2s4Zbi4YxXzg8ZP4B0gg((';

        const response = await fetch(`${apiUrl}${questionId}?filter=${questionFilter}&site=${site}&key=${key}`);
        const result = await response.json();

        return result;
    }

    // ---- getQuestion ---------------------------------------------
    function getQuestion() {
        let selector = "#panel-question";
        let questionElement = document.querySelector(selector);

        if (!questionElement) { // this must be a suggested edit on a Question
            selector = "#panel-revision";
            questionElement = document.querySelector(selector);
        }
        if (!questionElement) // ohh well.. at least we tried
            return;

        const votingContainer = questionElement.querySelector(".votecell .js-voting-container");
        if (!votingContainer)
            return;

        const questionId = votingContainer.dataset?.postId;

        return { questionId,
                 selector : selector + " .votecell"};
    }


    // ---- Do it :) ----------------------------------------------

    const pathName = window.location.pathname;

    if (!pathName.startsWith("/review/")) { // Not a review
        const questionId = window.location.pathname.split('/')[2];
        const result = await fetchVotes(questionId);
        appendThem(result, ".votecell");
    } else {
        // Needed to make it work in reviews, since posts come in late..
        const reviewRegex = /^\/review\/(next-task|task-reviewed)/;
        $(document)
            .ajaxComplete(async (event, request, settings) => {
                              if (reviewRegex.test(settings.url)) {
                                  const question = getQuestion();
                                  if (!question?.questionId)
                                      return;
                                  const result = await fetchVotes(question.questionId);
                                  appendThem(result, question.selector);
                              }
             });
    }

})();
