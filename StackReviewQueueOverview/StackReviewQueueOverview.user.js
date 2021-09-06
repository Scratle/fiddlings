// ==UserScript==
// @name         Stack Review Queues Overview
// @description  Make use of the empty space in the overview
// @namespace    scratte-fiddlings
// @version      0.3
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @match        https://stackoverflow.com/review
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

     const removeTitle = () => {
         [...document.getElementsByClassName("s-page-title--description")]
             .forEach(item => {
                        if (item.innerHTML.startsWith("Help "))
                            item.remove();
                     })
     }

     const removeOnboarding = () => {
         document.querySelector(".js-review-onboarding-banner")?.remove();
     }

     const resizeAvatars = () => {
        [...document.querySelectorAll(".gravatar-wrapper-16")]
            .forEach(element => element.className = "gravatar-wrapper-32");
     }

     const setRightMargin = () => {
        [...document.querySelectorAll(".ml16")]
            // .forEach(element => element.style.marginRight = "42px");
            .forEach(element => {
                         element.classList.remove("ml16");
                         element.classList.add("mr48");
            });
     }

    const setFontSize = () => {
        const editCSSFontSize = document.createElement("style");
        editCSSFontSize.innerHTML = ".StackReviewQueuesOverviewCSSFontSize {font-size: 1.80rem;}";
        document.body.appendChild(editCSSFontSize);

        [...document.getElementsByClassName("flex--item ta-center fl-shrink0 wmn1")]
            .forEach(wrapper => {
                         const postCount = wrapper.querySelector('.fs-body3');
                         if (!postCount)
                             return;
                         const { classList } = postCount;

                         classList.remove("fs-body3");
                         classList.add("StackReviewQueuesOverviewCSSFontSize");
             });
    }

    // --- DoIt :) ---------------------------------------

    removeTitle();
    removeOnboarding();
    resizeAvatars();
    setRightMargin();
    setFontSize();

})();