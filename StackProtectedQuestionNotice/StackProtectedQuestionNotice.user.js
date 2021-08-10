// ==UserScript==
// @name         Stack Protected Question notice
// @description  Inserts a notice when a Question is protected.
// @namespace    scratte-fiddlings
// @version      0.4
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @match        https://stackoverflow.com/questions*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  async function findProtected(postId) {
      const response = await fetch(`/posts/${postId}/timeline?filter=WithVoteSummaries`);
      const timeline = await response.text();
      const parsedHTML = new DOMParser().parseFromString(timeline, 'text/html');
      const events = parsedHTML.querySelector(".event-rows");

      const protectedQuestion = "protected";
      const unprotectedQuestion = "unprotected";

      for (var e of [...events.children]) {
          const eventType = e.dataset.eventtype;
          if (eventType === "history") {
          const content = e.querySelector(".wmn1")?.textContent.trim();
              if (content === unprotectedQuestion) {
                  break;
              } else if (content === protectedQuestion) {
                  appendNotice();
                  break;
              }
          }
      }
  }

  // ---- appendDeleteVotesInAnswer -----------------------------
  function appendNotice() {
      // mostly snatched fom a post..
      // <aside class="s-notice s-notice__info js-post-notice mb16" role="status">
      const notice = document.createElement("aside");
      notice.classList.add("s-notice", "s-notice__info", "js-post-notice", "mb16");
      notice.setAttribute("role", "status");
      notice.innerHTML = `
            <div class="d-flex fd-column fw-nowrap">
              <div class="d-flex fw-nowrap">
                <div class="flex--item mr8">
                  <svg aria-hidden="true" class="svg-icon iconFire" width="18" height="18" viewBox="0 0 18 18">
                    <path opacity=".6" d="M13.18 9c-.8.33-1.46.6-1.97 1.3A9.21 9.21 0 0010 13.89a10 10 0 001.32-.8 2.53 2.53 0 0 1-.63 2.91h.78a3 3 0 001.66-.5 4.15 4.15 0 0 0 1.26-1.61c.4-.96.47-1.7.55-2.73.05-1.24-.1-2.49-.46-3.68a2 2 0 01-.4.91 2.1 2.1 0 0 1-.9.62z" fill="#FF6700"></path><path d="M10.4 12.11a7.1 7.1 0 01.78-1.76c.3-.47.81-.8 1.37-1.08 0 0-.05-3.27-1.55-5.27-1.5-2-3.37-2.75-4.95-2.61 0 0 4.19 2.94 1.18 5.67-2.14 1.92-3.64 3.81-3.1 5.94a4.14 4.14 0 003.1 3 4.05 4.05 0 0 1 1.08-3.89C9.42 10.92 8 9.79 8 9.79c.67.02 1.3.28 1.81.72a2 2 0 01.58 1.6z" fill="#EF2E2E"></path>
                  </svg>
                </div>
                <div class="flex--item wmn0 fl1 lh-lg">
                  <div class="flex--item fl1 lh-lg">
                    <b>
                      <a href="/help/privileges/protect-questions">Protected! Highly active question.</a>
                    </b>
                    Earn 10 reputation (not counting the <a href="https://meta.stackexchange.com/questions/141648/what-is-the-association-bonus-and-how-does-it-work">association bonus</a>) in order to answer this question. The reputation requirement helps protect this question from spam and non-answer activity.
                  </div>
                </div>
              </div>
            </div>`;

      const noticeCloned = notice.cloneNode([true]);

      question.before(notice);

      if (answerBox) {
          answerBox.before(noticeCloned);
      } else {
          answers && answers.append(noticeCloned);
      }

      if (fluff) {
          fluff.style.marginBottom = "revert";
      } else {
          noticeCloned.style.marginTop = "16px";
      }
  }

  // ---- Do it :) ----------------------------------------------
  const questionId = window.location.pathname.split('/')[2];

  const question = document.querySelector(".question");
  const answers = document.getElementById("answers");
  if (!question || isNaN(questionId) || !answers)
      return;

  const answerBox = document.getElementById("post-form");
  const fluff = document.querySelector(".bottom-share-links");

  findProtected(questionId);

})();