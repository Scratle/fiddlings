// ==UserScript==
// @name         Stack Flag dialog
// @description  Make the dialogs consistent and intuitive.
// @version      0.5
//
// @namespace    scratte-fiddlings
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @contributor  Oleg Valter (https://stackoverflow.com/users/11407695)
//
// @include      /^https://(?:[^/]+\.)?stackoverflow\.com/questions/\d+/
// @include      /^https://(?:[^/]+\.)?stackoverflow\.com/review/.*/
// @exclude      /^https://(?:[^/]+\.)?stackoverflow\.com/review/[^/]+/(stats|history)/
//
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ---- fixCSS -------------------------------------------------------------------------
    const fixCSS = () => {

        // adjusted and optimized by Oleg Valter (https://stackoverflow.com/users/11407695)
        // for the close vote dialog
        // https://chat.stackoverflow.com/transcript/message/52963182#52963182
        const fixItCSS = `
            #pane-main .s-label{
                font-size: revert;
            }
            #pane-main .s-label > .s-description{
                font-size: revert;
            }

            .site-specific-pane .s-label{
                font-size: revert;
            }
            .site-specific-pane .s-label > .s-description{
                font-size: revert;
            }

            .migration-pane .s-label{
                font-size: revert;
            }
            .migration-pane .s-label > .s-description{
                font-size: revert;
            }

            div#popup-close-question {
                max-width: 694px;
            }
            div#popup-close-question span.popup-title{
                font-size: 90%;
            }
            div#popup-close-question form .s-radio{
                -webkit-appearance: radio;
            }

            h1.s-modal--header{
                font-size: revert;
                font-weight: 400;
            }
            div.s-modal--body .s-label{
                font-size: revert;
                font-weigth: bold;
            }
            div.s-modal--body .s-description{
                font-size: revert;
            }
            div.s-modal--body .s-radio{
                -webkit-appearance: radio;
            }

            form.js-modal-dialog div:not(.s-modal--body) div.fc-light {
                margin: 0px 40px 0 0;
                order: 1;
            }

            div#popup-flag-post form div.popup-actions span:not(span > span),
            div#popup-close-question form div.popup-actions span:not(span > span):not(.cvrgCVPopupAndWasWrapper) {
                margin: 0px 40px 0 0;
                order: 1;
            }

            div#popup-close-question form div.popup-actions button.js-popup-submit,
            div#popup-flag-post form div.popup-actions button.js-popup-submit,
            form.js-modal-dialog div:not(.s-modal--body) button.js-modal-submit {
                order: 2;
            }

            div#popup-close-question form div.popup-actions button.js-popup-back,
            div#popup-close-question form div.popup-actions button.js-popup-cancel,
            div#popup-flag-post form div.popup-actions button.js-popup-close,
            form.js-modal-dialog div:not(.s-modal--body) button.js-modal-close {
                order: 3;
            }

            .cvrgCVPopupSDAndNatoWithFake{
                margin-left: -5px;
            }
            `;

            const styleSheet = document.createElement("style");
            styleSheet.innerText = fixItCSS;
            document.head.appendChild(styleSheet);
    }

    // ---- fixLables -------------------------------------------------------------------------
    const theBlueBox = (selector) => {
        document.querySelectorAll(selector)
                .forEach(element => {
                             const text = element.textContent.trim();

                             let matchResult = text.match(/^(You have )(\d+)\s(.*)/);
                             if (matchResult) {
                                      const blueBox = document.createElement("span");
                                      blueBox.className = "bounty-indicator-tab";
                                      blueBox.style.borderRadius = "5px";
                                      blueBox.style.padding = ".25em .5em";
                                      blueBox.style.fontSize = "13px";
                                      blueBox.textContent = matchResult[2];

                                      element.textContent = "";
                                      element.append(blueBox);
                                      element.append(matchResult[3]);
                             }
                 });
    }

    // ---- fixLablesBox -------------------------------------------------------------------------
    const fixLablesBox = () => {
        const changeText = (element) => {
            const text = element.textContent.trim();

            switch (text) {
                case "needs improvement":
                    element.textContent = text + " (should be closed) ...";
                    break;
                case "A community-specific reason":
                case "A community-specific reason (too old to migrate)":
                    element.textContent = text + " (previously off-topic) ...";
                    break;
                case "a duplicate":
                case "Duplicate":
                    element.textContent = text + " ...";
                    break;
                case "This question belongs on another site in the Stack Exchange network":
                    element.textContent = text + " ...";
                    element.classList.remove("fw-normal");
                    element.style.fontWeight = "bold";
            }
        }

        const firstClickRegex   = /^\/flags\/posts\/\d+\/popup/;
        const secondDialogRegex = /^\/flags\/questions\/\d+\/close\/popup/;
        const closeDialogRegex  = /^\/flags\/posts\/\d+\/close\/popup/;
        const commentRegex      = /^\/flags\/comments\//;

        $(document)
            .ajaxComplete((event, request, settings) => {
                          const { url } = settings;

                          if (firstClickRegex.test(url)) {
                              theBlueBox("div#popup-flag-post form div.popup-actions span:not(span > span)");
                              document.querySelectorAll("div#popup-flag-post form ul.action-list li label .action-name")
                                      .forEach(element => {
                                                   changeText(element);
                                       });
                              return;
                          }

                          if (secondDialogRegex.test(url)
                              || closeDialogRegex.test(url)) {
                              theBlueBox("div#popup-close-question form div.popup-actions span:not(span > span):not(.cvrgCVPopupAndWasWrapper)");
                              document.querySelectorAll("div#popup-close-question form ul.action-list li label .js-action-name")
                                      .forEach(element => {
                                                   changeText(element);
                                       });
                          }

                          if (commentRegex.test(url)) {
                              theBlueBox("form.js-modal-dialog div:not(.s-modal--body) div");
                              document.querySelectorAll("div.s-modal--body .s-label, h1.s-modal--header")
                                      .forEach(element => element.classList.remove("fw-normal", "fw-bold", "fs-headline1"))
                          }
             });
    }


    // ---- DoIt -------------------------------------------------------------------------

    $(document)
        .ajaxComplete((event, request, settings) => {
                          [...document.querySelectorAll(".js-flag-post-link, .js-comment-flag, .js-close-question-link")]
                               .forEach(element => element
                                                       .addEventListener("click", () => fixLablesBox(), {once : true})
                               );
         });

    fixCSS();

})();