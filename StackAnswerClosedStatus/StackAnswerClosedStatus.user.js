// ==UserScript==
// @name         Stack Answer closedStatus
// @description  Get the closed status directly on Answers too
// @version      1.0
//
// @namespace    scratte-fiddlings
// @author       Scratte
//
// @include      /^https://(?:meta\.)?askubuntu\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://(?:meta\.)?mathoverflow\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://(?:meta\.)?serverfault\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://(?:meta\.)?stackoverflow\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://(?:meta\.)?superuser\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://stackapps\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
// @include      /^https://[^/]+\.stackexchange\.com/users/(?:-)?\d+/[^/?]+(?:\?tab=(?:answers.*|summary|profile|topactivity))?$/
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

    const apiNoticeThreshold = 1500; // Set this when you'd like to get a notice.
    const USERSCRIPTNAME = "Stack Answer Status";

    const EMPTY  = "\u00A0"; // NO-BREAK SPACE https://codepoints.net/U+00A0
    const colour = "var(--red-400)";

    const site      = window.location.hostname;
    const apiUrl    = "https://api.stackexchange.com/2.2/questions/";
    const apiFilter = "!gA1*mfYBgboITmKnOM*UYbEfkJlt(kTDLiI";
    const apiKey    = "U4DMV*8nvpm3EOpvf69Rxw((";  // FIXME.. get a key! This one is "stolen"..

    // -----------------------------------------------------
    const showToast = (detail, type) => {
        const toastMessage = {
                 quota    : `You're low on API quota (${detail}). Consider turning "${USERSCRIPTNAME}" off.`,
                 error    : `${USERSCRIPTNAME} - Stack API says: <p>${detail}</p>`,
                 throttle : `${USERSCRIPTNAME} - Wait another <b>${detail}</b> seconds before making another API request!`,
        };

        // https://stackoverflow.design/product/components/notices/
        const button = document.createElement("button");
        button.classList.add("s-btn","s-notice--btn");
        button.type = "button";
        button.textContent = "✖"; // https://codepoints.net/U+2716 HEAVY MULTIPLICATION X

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("d-flex");
        buttonContainer.style.marginTop = "-2px";
        buttonContainer.style.marginRight = "-4px";
        buttonContainer.append(button);

        const message = document.createElement("div");
        message.classList.add("flex--item");
        message.style.marginLeft = "4px";
        message.style.marginTop = "6px";
        message.innerHTML = toastMessage[type];

        const flexContainer = document.createElement("div");
        flexContainer.classList.add("d-flex", "jc-space-between");
        flexContainer.style.alignItems = "flex-start";
        flexContainer.append(message, buttonContainer);

        const aside = document.createElement("aside");
        aside.classList.add("s-notice","s-notice__warning", "p8");
        aside.append(flexContainer);

        const toast = document.createElement("div");
        toast.classList.add("s-toast");
        toast.setAttribute("aria-hidden", "false");
        toast.append(aside);

        button.addEventListener("click",(event) => {
            toast.setAttribute("aria-hidden", "true");
        });

        document.body.append(toast);
    }

    // -----------------------------------------------------
    const checkResponse = ({ quota_remaining, backoff, error_message }) => {
        if (quota_remaining < apiNoticeThreshold)
            showToast(quota_remaining, "quota");
        if (backoff)
            showToast(backoff, "throttle");
        if (error_message)
            showToast(error_message, "error");
    }

    // -----------------------------------------------------
    const insertStatus = (element, text, width) => {
        const parent = element.parentElement;
        if (!parent)
            return;

        const span = document.createElement("span");
        span.classList.add("site-hyperlink"); // for the text style
        span.style.color = colour;

        if (parent.tagName === "TD") { // tab=topactivity and tab=summary
            // let's not do it twice to the same element (could happen when tabbing between views-modes)
            const sibling = element.nextElementSibling;
            if (sibling && ["[duplicate]", "[closed]"].includes(sibling.textContent))
                return;

            element.style.width = width;
            span.style.textOverflow = "unset";
            span.textContent = text;
            parent.title = (parent.title ? parent.title : element.textContent) + EMPTY + text;
            parent.classList.add("d-flex");
            parent.append(span);
        } else {
            span.textContent = EMPTY + text;
            element.append(span);
        }
    }

    // -----------------------------------------------------
    const findNupdateClosed = async () => {
        const answers = [...document.querySelectorAll("a.answer-hyperlink")]
                            .map(element => {
                                     let link = element.href;
                                     if (!link)
                                         return;
                                     const questionId = link.toString().split("/")[4];
                                     return [element, questionId];
                             });

        // Get only unique Question ids
        // https://stackoverflow.com/a/43046408/12695027 by https://stackoverflow.com/users/5372400/max-makhrov
        const questionIds = [...new Set(answers.map(element => element[1]))].join(";");
        if (!questionIds)
            return; // don't ask the API if the string is empty.

        const response = await fetch(`${apiUrl}${questionIds}?filter=${apiFilter}&site=${site}&key=${apiKey}`);
        const results = await response.json()
        const { items, quota_remaining, backoff, error_message} = results;

        checkResponse({ quota_remaining, backoff, error_message });

        items
            .forEach(item => {
                         if (!item.closed_date) {
                             return;
                         }
                         const closedAnswerpairs = answers.filter(answer => answer[1] === item.question_id.toString());
                         const text = item.closed_reason === "Duplicate" ? "[duplicate]" : "[closed]";

                         closedAnswerpairs
                             .forEach(answerpair => insertStatus(answerpair[0],
                                                                 text,
                                                                 item.closed_reason === "Duplicate" ? "360px" : "380px"));
             });
    }


    // ---- Do it! ---------------------------------------

    findNupdateClosed();

    // listen for updates.
    const answersRegex = /^(\/users\/profile\/posts\/\d+\?(?!postType=1)|\/ajax\/users\/(tab\/\d+\?tab=answers|panel\/answers\/\d+\?))/;
    $(document)
        .ajaxComplete(function(event, request, settings) {
                          if (answersRegex.test(settings.url)) {
                              findNupdateClosed();
                          }
         });

})();