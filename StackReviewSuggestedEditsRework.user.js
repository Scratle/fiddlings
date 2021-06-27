// ==UserScript==
// @name         Stack Review Suggested Edits Rework
// @version      0.5-beta
// @namespace    scratte-fiddlings
// @description  Make reviewing nice again!
// @author       Scratte
// @contributor  Oleg Valter
// @include      /^https://stackoverflow.com/review/suggested-edits.*/
// @exclude      /^https://stackoverflow.com/review/suggested-edits/(stats|history)/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
    "use strict";

    // --------------------------------------------------------------------------------------------
    // ---- User Options --------------------------------------------------------------------------

    // NOTE! Do not change the structure of this!
    //       Make sure that the values are valid.

    const defaultUserConfig = {
            colour: {
                postType: "var(--red)",
                summary: "var(--orange)",
                radioSeperator: "var(--blue-200)",
                progressDone: "var(--theme-primary-color)",  // orange-y
                progressNotDone: "var(--black-075)",         // gray-ish
                progressTextColour: "var(--black-600)",
                editorHeader: "hotpink",                     // "#FF69B4" You may want to change this ;)
                editorApproved: "var(--green-600)",
                editorRejected: "var(--red-600)",
                editorTotal: "var(--powder-700)",            // blue-ish
                message: "var(--yellow-700)",
                messageBackground: "var(--powder-200)",      // use --powder-100 to "get rid of it"
            },
            size: {
                editorStatistics: "96%",
                summary: "150%",
                radioSeperator: "2",
                message: "150%",
            },
            // All these are "Yes"/"No" options, and anything other than "Yes" is a "No"
            options: {
                radioVsButtons: {
                    moveRadioBox: "Yes",
                    keepRadios: "Yes",            // Only valid when moveRadioBox is "Yes"
                    radioWithBorders: "Yes",      // Only for radio buttons! No effect when turnRadioIntoButtons is "Yes"
                },
                moveProgressBar: "Yes",
                movePageTitleLink: "Yes",
                AnswerQuestionOnTop: "Yes",
                highlightSummary: "Yes",
                prominentReviewMessage: "Yes",
                moveDiffChoices: "Yes",
                userCards: {
                    getUserCards: "Yes",
                    withEditiorStats: "No",       // Note: This uses the Stack API and has a daily quota (of max 10,000 :-)
                },
                removeLineThrough: "Yes",
            },
    };


    // ---- End of User Options -------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------

    const USERSCRIPTNAME = "Stack Review Suggested Edits Rework";
    const PREFIX = USERSCRIPTNAME.replaceAll(" ","");

    /* OPTION 1:
       Required for the GUI to work.
       Makes use of the userscript manager's storage or localStorage if the user doesn't use a userscript manager.
       Manual changes to defaultUserConfig will only apply using the GUI (Restore button). */
    const userConfig = getUserConfig();           // <-- OPTION 1

    /* OPTION 2:
       If you don't want the GUI.
       NOTE: If using this, the GUI will have NO effect on the applied settings.
       Avoids the userscript manager's storage and localStorage.
       Manual changes to defaultUserConfig will apply directly to the script. */
    // const userConfig = defaultUserConfig;         // <-- OPTION 2


    // --------------------------------------------------------------------------------------------
    // ---- Local Storage  ------------- Needed with GUI ------------------------------------------

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
    // NOTE: these are from ViolentMonkey's docs, but TamperMonkey works in a similar way
    // https://violentmonkey.github.io/api/gm/#gm_getvalue
    // https://violentmonkey.github.io/api/gm/#gm_setvalue
    // https://violentmonkey.github.io/api/gm/#gm_deletevalue

    function getUserConfig() {
        let userConfig = getValueFromCache(PREFIX);
        if (!userConfig) updateValueFromCache(PREFIX, defaultUserConfig);
        userConfig = getValueFromCache(PREFIX);

        return userConfig;
    }

    function getValueFromCache(cacheKey) {
        return window.GM_getValue ? window.GM_getValue(cacheKey) : JSON.parse(localStorage.getItem(cacheKey));
    }

    function removeValueFromCache(cacheKey) {
        window.GM_deleteValue ? window.GM_deleteValue(cacheKey) : localStorage.removeItem(cacheKey);
    }

    function updateValueFromCache(cacheKey, cacheValue) {
        // GM_setValue accepts an object as the second parameter, so we don't need to stringify it
        window.GM_setValue ? window.GM_setValue(cacheKey, cacheValue) : localStorage.setItem(cacheKey, JSON.stringify(cacheValue));
        console.log("updateValueFromCache - config", cacheValue);
    }


    // --------------------------------------------------------------------------------------------
    // ---- Everything ajax -----------------------------------------------------------------------

    let reviewResponse = { };  // Holds the ajax response about the review

    // https://chat.stackoverflow.com/transcript/message/52227058#52227058
    // suggestion from https://chat.stackoverflow.com/users/10607772/double-beep
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test
    const reviewRegex = /^\/review\/(next-task|task-reviewed)/;

    $(document).ajaxComplete((event, request, settings) => {
        // Just that first response with the review information
        if (reviewRegex.test(settings.url)) {
            if (request.responseJSON) {
                reviewResponse = request.responseJSON;
            } else {
               try {
                    reviewResponse = JSON.parse(request.responseText);
                } catch (e) {
                    console.error(USERSCRIPTNAME + " - error parsing JSON", request.responseText);
                }
            }
        }
    });

    // ---------------------------
    // Lots of elements are not ready when the page is loaded. These .ajax method
    // ensures that a foonction is not fired until the page got a response

    function ajaxCompleteWrapper(foonction) {
        $(document).ajaxComplete((event, request, { url }) => {
            if (reviewRegex.test(url)) {
                foonction();
            }
        });
    }

    /*function ajaxStopWrapper(foonction) {
        $(document).ajaxStop(() => foonction());
    }*/

    /*// https://chat.stackoverflow.com/transcript/message/52156286#52156286
    const ajaxCompleteWrapperReturn = (foonction) => {
        return new Promise((resolve) =>
            $(document).ajaxComplete(() => resolve(foonction()))
        );
    };*/

    /*const ajaxStopWrapperReturn = (foonction) => {
        return new Promise((resolve) =>
            $(document).ajaxStop(() => resolve(foonction()))
        );
    };*/


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function removeElement(classString) {
        const element = document.querySelector(classString);
        if (element) {
            element.remove();
        }
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function addSeparator() {
        const { selectors: {content: {revision : reviewRevision, tabs} } } = config;
        const revision = document.querySelector(reviewRevision);
        if (!revision)
            return;
        const revisionTabs = document.querySelector(tabs);
        if (!revisionTabs) {
            revision.style.borderTop = "var(--black-100) solid 1px";
            revision.style.paddingTop = "10px";
        }
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function highlightSummary() { // must wait for ajax
        // https://chat.stackoverflow.com/transcript/message/52205392#52205392 (code-review)

        const { options: {highlightSummary},
                size: {summary : summarySize},
                colour: {summary : summaryColour}
              } = userConfig;

        if (highlightSummary !== "Yes")
            return;

        const {classes: {summary : summaryClass}} = config;

        const editSummary = document.querySelector(`.${summaryClass}`);
        if (!editSummary)
            return;

        highlightSummaryHelper(editSummary, summaryColour, summarySize, summaryClass);
    }

    function highlightSummaryHelper(editSummary, summaryColour, summarySize, summaryClass) { // must wait for ajax
        const { classList, style, textContent } = editSummary;
        editSummary.textContent = (textContent || "").trim().replace(/^Comment/, "Summary");
        style.fontSize = summarySize;
        style.color = summaryColour;
        classList.remove(summaryClass);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveDiffChoices() { // must wait for ajax
        if (userConfig.options.moveDiffChoices !== "Yes")
            return;

        const {ids: {custom: {diffChoices} } , selectors: {reviews: {filterDiff} } } = config;
        removeElement(`#${diffChoices}`);

        const choices = document.querySelector(filterDiff); // ".js-diff-choices"
        if (!choices) return;

        moveToFilterLine(choices, true);
        choices.id = diffChoices;
        [...choices.children].forEach((button) => button.classList.remove("s-btn__xs"));
    }


    // -------------------------------------------------------------------------------------------
    // -------------------------------------------------------------------------------------------
    function moveRadio() { // must wait for ajax
        // https://chat.stackoverflow.com/transcript/message/52205284#52205284 (code-review)

        const {ids : { custom : { actionRadios : actionRadiosId } },
               selectors: {actions: {reviews : reviewActions, radioActionsBox} },
               tags: {radios : radiosTag},
              } = config;
        const { choiceRadios,
                textAlignCenter,
                grid: { cell, container },
                flex: { alignItemsCenter, marginXAxis, gap24px }
              } = config.classes;

        const {colour: { radioSeperator : radioSeperatorColour },
               size: { radioSeperator : radioSeperatorSize },
               options: { radioVsButtons: { radioWithBorders } },
              } = userConfig;

        const oldActions = document.getElementById(actionRadiosId);
        // Stack seems to insert a new action box into the sidebar on every new task.
        if (oldActions) {     // We've been here before. Remove the old
            oldActions.remove();
        } else {              // This is the first time (not counting a previous audit). (Re)Hide the sidebar.
            const sidebar = document.querySelector(radioActionsBox); // ".js-actions-sidebar"
            if (sidebar) sidebar.style.display = "none";
        }

        // Need to happen after removal of the "oldActions" to account for audits
        // ..and non-reviews, such as Tag Wiki's for low reputation users.
        if (!isReviewActive()) {
            return;
        }
                                                  // ".s-sidebarwidget.js-review-actions"
        const actionBox = document.querySelector(`.${choiceRadios.widget}${reviewActions}`);
        if (!actionBox)
            return;

        const { firstElementChild : widgetHeader,
                classList         : actionBoxClassList,
                lastElementChild  : fieldset
              } = actionBox;
        if (!fieldset)
            return;

        if (widgetHeader) widgetHeader.remove();            // "s-sidebarwidget--header"
        actionBoxClassList.remove(choiceRadios.widget);     // "s-sidebarwidget"
        actionBox.id = actionRadiosId;

        const { lastElementChild : buttonsWrapperParent,
                classList        : fieldsetClassList
              } = fieldset;
        fieldsetClassList.remove(...choiceRadios.fieldset); // "fd-column", "p12", "gsx", "gs8"
        fieldsetClassList.add(marginXAxis, gap24px, textAlignCenter, alignItemsCenter); // "gsx", "gs24", "ta-center", "ai-center"

        // The Submit and Skip buttons
        if (!buttonsWrapperParent)
            return;
        const { firstElementChild : buttonsWrapper,
                classList         : buttonsWrapperParentClassList
              } = buttonsWrapperParent;
        buttonsWrapperParentClassList.remove(...choiceRadios.submits); // "bt", "bc-black-3"

        if (!buttonsWrapper)
            return;
        const { firstElementChild : buttonsParent,
                classList         : buttonsWrapperClassList
              } = buttonsWrapper;
        buttonsWrapperClassList.remove(choiceRadios.button); // "pt12"
        // those styles no longer apply, since the Submit and Skip buttons have been moved
        buttonsWrapperClassList.remove("px12");
        buttonsWrapper.parentElement.classList.remove("mxn12");

        if (!buttonsParent)
            return;
        // Make the Skip button wider
        [...buttonsParent.children]
            .filter((button) => isSkip(button.innerText.trim()))
            .forEach((button) => button.style.minWidth = "70px");

        // https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors/Combinators
        // https://drafts.csswg.org/selectors-4/#overview

        // The radios
        const fieldsetChildren = fieldset.querySelectorAll(`${reviewActions} > ${radiosTag} > div[class="${cell}"]`);
        if (!fieldsetChildren.length)
            return;

        fieldsetChildren
            .forEach((radio) => {
                         const { firstElementChild : gridContainer,
                                 classList         : radioClassList,
                                 style             : radiostyle
                               } = radio;
                         const p = radio.querySelector("p");
                         const gridCells = radio.querySelectorAll("." + cell);

                         if (!p || !gridContainer) // !(p && gridContainer)
                             return;

                         if (gridCells && gridCells.length === 2) {
                             const { parentElement } = gridCells[0];
                             if (parentElement)
                                 parentElement.append(gridCells[0]); // Switch them
                         }

                         p.remove();
                         gridContainer.classList.remove(container);
                         radioClassList.remove(cell);
                         radiostyle.padding = "4px";

                         const label = radio.querySelector("label");
                         const text = label.textContent || "";
                         if (radioWithBorders === "Yes" && text.trim() !== "Approve") {
                             radiostyle.borderLeft = `${radioSeperatorColour} solid ${radioSeperatorSize}px`;
                         }
                    });

        moveToFilterLine(actionBox);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function highlightMessage() { // Only after ajax
        if (userConfig.options.prominentReviewMessage !== "Yes")
            return;

        const {colour: {message : messageColour, messageBackground},
               size: {message : messageSize}
              } =  userConfig;

        const status = document.querySelector(config.selectors.reviews.banner);
        if (!status)
            return;

        const info = status.firstElementChild;
        if (!info)
            return;

        highlightMessageHelper(info, messageColour, messageBackground, messageSize);
    }

    function highlightMessageHelper(info, messageColour, messageBackground, messageSize) { // Only after ajax

        const { firstChild : infoTextNode, firstElementChild } = info;

        if (!firstElementChild
              || !infoTextNode
              || infoTextNode.nodeType !== Node.TEXT_NODE
              || infoTextNode.nodeValue.trim() === "")
            return;

        // Make the message more prominent
        const p = document.createElement("p");
        p.textContent = infoTextNode.nodeValue.trim();
        p.style.color = messageColour;
        p.style.backgroundColor = messageBackground;
        p.style.padding = "5px";
        p.style.fontSize = messageSize;
        info.insertBefore(p, firstElementChild);
        infoTextNode.nodeValue = "";
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function isReviewActive() { // Only after ajax
        return reviewResponse.isUnavailable === false;
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function isSkip(content) {
        return /skip/i.test(content);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveToFilterLine(element, afterFirst = false) {

        const filterDivSibling = document.querySelector(config.selectors.reviews.filterChoice);
        if (!filterDivSibling)
            return;

        const { previousElementSibling: filterDiv } = filterDivSibling;
        if (!filterDiv)
            return;

        if (!afterFirst) {
            filterDiv.appendChild(element);
        } else {
            const { firstElementChild: filter } = filterDiv;  // "js-review-filter-button"
            if (filter) filterDiv.insertBefore(element, filter.nextSibling);
        }

        filterDiv.style.justifyContent = "space-between";

        // Remove a pointless empty space:
        removeElement(".grid--cell.fl-grow1.js-review-filter-summary.fs-italic.fl1.ml8.mr12.v-truncate2");
    }

    // -------    createButtonContainer    --------------------
    function createButtonContainer() {
        const { container: flexContainer, marginXAxis, gap4px } = config.classes.flex;
        const buttonsId = config.ids.custom.buttons;
        const newDiv = document.createElement("div");
        newDiv.id = buttonsId;
        newDiv.classList.add(flexContainer, marginXAxis, gap4px);
        return newDiv;
    }

    // -------    createButton    --------------------
    // https://stackoverflow.design/product/components/buttons/
    function createButton(content, realButtons) {
        const { buttons: buttonClasses, flex: { item } } = config.classes;

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add(buttonClasses.button, item);
        button.textContent = content;

        if (isSkip(content)) {
            button.style.minWidth = "70px";  // So the Skip button size doesn't change size when ".is_loading"
            button.classList.add(buttonClasses.outlined);
        } else {
            button.classList.add(buttonClasses.primary);
        }

        button.addEventListener("click", () => {
            realButtons.forEach((realButton) => realButton.click());
        });
        return button;
    }

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    async function shadowRadiosToButtons() { // must wait for ajax

        const state = {
            SKIP    : "skip",
            DISABLE : "disable",
            ENABLE  : "enable",
            HIDE    : "hide",
            UNHIDE  : "unhide",
            NOOP    : "no-op",
        };

        if (!isReviewActive()) {     // Do not show buttons on inactive reviews.
            changeState(state.HIDE); // Note: Audits will change from active to inactive.
            return;
        }

        const { ids: { custom: {buttons : buttonsId} },
                classes: { choiceRadios: { widget } },
                selectors: { actions , buttons : buttonSelectors},
              } = config;

        if (document.querySelector(`#${buttonsId}`)) {
            let { actionDelay } = reviewResponse;
            if (!actionDelay || isNaN(actionDelay))
                actionDelay = 0;
            await new Promise((resolve) => setTimeout(resolve, actionDelay));  // making the sidebar box catch up
            removeElement(`#${buttonsId}`);
        } else {  // We've not done this before.

            // https://chat.stackoverflow.com/transcript/message/52234064#52234064 by https://stackoverflow.com/users/10607772/double-beep
            document.body.addEventListener("click", (event) => {
                if (event.target.type === "button" || event.target.nodeName === "BUTTON") {
                    const buttonText = event.target.innerText.trim();
/*
                    console.log(USERSCRIPTNAME + " - shadowRadiosToButtons - EventListener ------",
                                {type : event.target.type,
                                 nodeName : event.target.nodeName,
                                 tagName : event.target.tagName,
                                 buttonText,
                                 length : buttonText.length,
                                 innerHRML : event.target.innerHTML.trim(),
                                });
*/

                    // https://chat.stackoverflow.com/transcript/message/52273768#52273768
                    const [buttonsActionEntry] =
                            [
                              ["Skip"         , isSkip],
                              ["Other answers", (content) => /^(Other a|A)nswer/.test(content)],
                            ].find(([_actionEntry, expr]) => expr(buttonText))
                        || [buttonText];

                    // console.log(USERSCRIPTNAME + " - shadowRadiosToButtons ------", {buttonsActionEntry} );
                    changeState(buttonsActions.get(buttonsActionEntry));
                }
            });
                                                   // ".js-actions-sidebar" (has both mobile and desktop)
            const sidebar = document.querySelector(actions.radioActionsBox);
            if (sidebar) sidebar.style.display = "none";
        }
                                                    // s-sidebarwidget (desktop)
        const actionBox = document.querySelector(`.${widget}${actions.reviews}`);
        if (!actionBox)
            return;

        const submitButton = actionBox.querySelector(buttonSelectors.submit); // ".js-review-submit"
        if (!submitButton)
            return;

        const container = createButtonContainer();

        // add the radios as buttons
        const radioButtons =            // ".js-action-radio-parent"
            [...actionBox.querySelectorAll(actions.radioParent)]
                .map((element) => {
                    const radio = element.querySelector("input[type=radio]");
                    const label = element.querySelector("label"); // The text part

                    // https://stackoverflow.com/a/50346460/12695027 by https://stackoverflow.com/users/2495645/anthony-rutledge
                    if (radio
                          && label
                          && label.firstChild
                          && label.firstChild.nodeType === Node.TEXT_NODE) {
                        // const buttonContent = label.firstChild.nodeValue.trim();
                        // return createButton(buttonContent, [radio, submitButton]);
                        return createButton(label.firstChild.nodeValue.trim(), [radio, submitButton]);
                    } else {
                        console.error(USERSCRIPTNAME + " - " + config.error + " - shadowRadiosToButtons");
                    }
                });
        if (!radioButtons.length)
            return;
        container.append(...radioButtons);

        // add the Skip button
        const skipButton = actionBox.querySelector(buttonSelectors.action); // ".js-action-button"
        if (!skipButton)
            return;
        const skipContent = skipButton.textContent.trim();
        if (!isSkip(skipContent))
            return;
        container.append(createButton(skipContent, [skipButton]));

        // Put all the buttons on the filter line
        moveToFilterLine(container);

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
        const buttonsActions =
            new Map([["Reject", state.NOOP],                // Reject will open up a modal
                     ["", state.NOOP],                      // The X on the top right of the modal
                     ["Submit", state.NOOP],
                     ["Skip", state.SKIP],
                     ["Approve", state.DISABLE],
                     ["Improve edit", state.DISABLE],
                     ["Reject and edit", state.DISABLE],
                     ["Cancel", state.ENABLE],
                     ["Reject edit", state.DISABLE],
                     ["Save edits", state.DISABLE],
                     ["Side-by-side Markdown", state.NOOP],
                     ["Side-by-side", state.NOOP],
                     ["Inline", state.NOOP],
                     ["Revision", state.NOOP],              // Toggling post tabs
                     ["Question", state.NOOP],              // ^ same
                     ["Other answers", state.NOOP],         // ^ same
                     ["Filter", state.NOOP],
                     ["Apply filter", state.DISABLE],       // Changing filter options forced a new task
                     ["Clear", state.DISABLE],              // ^ Same.. but probably not nessecary
                     ["Hide results", state.NOOP],          // From Stack snippets
                     ["Next task", state.NOOP],             // After an audit (buttons are hidden)
                     ["Reviewer stats", state.NOOP],        // Completed reviews
                     ["Restore tab settings", state.NOOP],  // From the GUI
                     ["Apply & Exit", state.NOOP],          // ^ same
                   ]);

        // -------    changeState    --------------------
        function changeState(changeTo) {
            if (!changeTo) {
                console.error(USERSCRIPTNAME + " - shadowRadiosToButtons - No such state");
                return; // do a state.NOOP
            }

            if (changeTo === state.NOOP)
                return;

            const { ids: { custom: { buttons : buttonsId } },
                    classes: {buttons: { loading },
                              desktopHide}
                   } = config;

            const buttonBox = document.querySelector("#" + buttonsId); // refetch
            if (!buttonBox)
                return;

            switch (changeTo) {
                case state.SKIP    : [...buttonBox.children]
                                        .forEach((button) => {
                                                    button.disabled = true;
                                                    if (isSkip(button.textContent)) { // "is-loading"
                                                        button.classList.add(loading);
                                                    }
                                                });
                    break;
                case state.DISABLE : [...buttonBox.children]
                                         .forEach((button) => button.disabled = true);
                    break;
                case state.ENABLE  : [...buttonBox.children]
                                         .forEach((button) => button.disabled = false);
                    break;
                case state.HIDE    : buttonBox.classList.add(desktopHide);
                    break;
                case state.UNHIDE  : buttonBox.classList.remove(desktopHide);
                    break;
            }
        }
    }

    // -------    createUserCard    --------------------
    // official Stacks documentation: https://stackoverflow.design/product/components/user-cards/
    function createUserCard({ isOwner, actionText, actionISO, profileUrl, profileImage, username, reputation, badges, isMinimal }) {
        const deletedUserImage = "https://cdn.sstatic.net/Img/user.svg?v=20c64bb67fc9";
        const anonymousUsername = "anonymous user";

        const { base: cardsBase, time: timeClass, avatar: cardsAvatar, stacksInfo, link: linkClass, reputation: reputationClass,
                awards, awardBling, gold: goldClass, silver: silverClass, bronze: bronzeClass, highlighted,
                deleted: userDeletedClass, minimal, signature } = config.classes.userCards;
        const { base: avatarsBase, avatar32px, avatarImage } = config.classes.avatars;
        const { gold: goldBadges, silver: silverBadges, bronze: bronzeBadges } = badges;
        const isUserAnonymous = !profileImage; // anonymous users do not have profile images :)
        const imageElType = isUserAnonymous ? "div" : "a"; // gravatar and username must not be clickable
        const finalActionText = actionText.replace(" by an anonymous user", "").replace("Proposed", "proposed");

        const anonymousClass = isUserAnonymous ? ` ${userDeletedClass}` : "";
        const highlightedClass = isOwner ? ` ${highlighted}` : "";
        const minimalClass = isMinimal ? ` ${minimal}` : "";
        const rawHtml = `
<div class="${cardsBase} ${signature}${anonymousClass + highlightedClass + minimalClass}">
    <time class="${timeClass}" datetime="${actionISO}">${finalActionText}</time>
    <${imageElType} href="${profileUrl || ""}" class="${avatarsBase} ${cardsAvatar}${isMinimal ? "" : ` ${avatar32px}`}">
        <img class="${avatarImage}" src="${profileImage || deletedUserImage /* guard against anonymous users image being null */}">
    </${imageElType}>
    <div class="${stacksInfo}">
        <${imageElType} href="${profileUrl}" class="${linkClass}">${username || anonymousUsername}</${imageElType}>
        <ul class="${awards}">
            ${reputation ? `<li class="${reputationClass}">${reputation}</li>` : "" }
            ${goldBadges ? `<li class="${awardBling} ${goldClass}">${goldBadges}</li>` : ""}
            ${silverBadges ? `<li class="${awardBling} ${silverClass}">${silverBadges}</li>` : ""}
            ${bronzeBadges ? `<li class="${awardBling} ${bronzeClass}">${bronzeBadges}</li>` : ""}
        </ul>
    </div>
</div>`;
        const parsedHtml = new DOMParser().parseFromString(rawHtml, "text/html");
        Stacks.setTooltipText(parsedHtml.querySelector("time"), actionISO, { placement: "top" }); // add Stacks tooltip
        return parsedHtml.querySelector(config.selectors.userCards.default);
    }

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function getUserCards() { // must wait for ajax

        if (userConfig.options.userCards.getUserCards !== "Yes")
            return;

        const {ids: {custom: {userCards} },
               selectors: {content: {reviewPost} },
               classes: {grid: {container} },
              } = config;

        if (document.getElementById(userCards))
            return; // One is quite enough :)

        const originalEditorUserCardContainerMadeIntoOverallUserCardContainerGrid
                  = document.querySelector(`${reviewPost} > .${container}`); // ".postcell > .grid"

        originalPostUserCards(originalEditorUserCardContainerMadeIntoOverallUserCardContainerGrid);
        editorUserCard(originalEditorUserCardContainerMadeIntoOverallUserCardContainerGrid);

        // -------    originalPostUserCards    --------------------
        async function originalPostUserCards(userCardsContainerAll) {
            //  https://chat.stackoverflow.com/transcript/message/52212993#52212993 (code-review)
            const { selectors: {content: {originalPost} },
                    classes: {grid: {cell}, answers, userCards: {signature} },
                  } = config;

            const originalPostLink = document.querySelector(`${originalPost} a`);
            if (!originalPostLink) // This is null in case of a Tag Wiki edit
                return false;

            const { href: postlink, hash, classList } = originalPostLink;

            const thePost = classList.contains(answers)
                                ? "#answer-" + hash.substring(1)
                                : ".question";

            userCardsContainerAll.style.justifyContent = "space-between";

            // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
            try {
                const userCardRequest = await fetch(postlink), userCardResponse = await userCardRequest.text();
                // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
                const userCards =
                    [...new DOMParser()
                        .parseFromString(userCardResponse, "text/html")
                        // .querySelectorAll(`${thePost} .post-signature.grid--cell`)
                        .querySelectorAll(`${thePost} .${signature}.${cell}`)
                        // .querySelectorAll(".post-signature.grid--cell.fl0")];   // <-- answer
                        // .querySelectorAll(".post-signature.owner.grid--cell")]; // <-- question
                    ];

                const postUserCardContainer = createNewDiv();
                // userCards.forEach(node => userCardDiv.appendChild(node));
                const stacksifiedUserCards = userCards
                    // if the avatar has no children, then the OP edited the post
                    // so we don't need to stacksify the user card
                    .map((card) => card.querySelector("img") ? stacksifyUserCards(card) : card);

                let requestStatus = userCardRequest.status;
                // if we handle a suggested edit on a deleted answer on a question that hasn't been deleted,
                // the request to the latter will be successful (200) yet the user cards wouldn't be found
                // in this case, we need to show the errorNotFound message
                requestStatus = requestStatus === 200 && !stacksifiedUserCards.length ? 404 : requestStatus;
                const messages = {
                    errorNotFound: ["The original post is unavailable.", "User cards cannot be retrieved."],
                    responseNotOk: ["Tried to fetch usercards, but", `Stack responsed with status: ${requestStatus}`]
                };

                if (requestStatus === 200 && stacksifiedUserCards.length)
                    postUserCardContainer.append(...stacksifiedUserCards);

                const responseMap = {
                    200: postUserCardContainer, // response successful => append the usercards
                    404: missingCards(messages.errorNotFound) // 404 => not found => question deleted
                };
                const elementToAppend = responseMap[requestStatus] || missingCards(messages.responseNotOk);
                userCardsContainerAll.append(elementToAppend);
            } catch (error) {
                const messages = [
                    "Something is blocking fetching user cards",
                    "Could be your ad-blocker or your network connection. Check the console."
                ];
                console.error(USERSCRIPTNAME + " - originalPostUserCards - error", error);
                userCardsContainerAll.appendChild(missingCards(messages));
            }
            if (userConfig.options.radioVsButtons.moveRadioBox !== "Yes")
                userCardsContainerAll.style.width = adjustUserCardsWidth();

            // -------    stacksifyUserCards    --------------------
            function stacksifyUserCards(original) {
                const userActionTime = original.querySelector(config.selectors.userCards.actionTime);
                // e.g. asked 4 hours ago, edited Sep 9 '19 at 10:25
                // if it's the edited user card, then the element needs to be an anchor pointing to the revision history
                const { innerText: actionInnerText, outerHTML: actionOuterHtml } = userActionTime;
                const [gold, silver, bronze] = [
                    original.querySelector(config.selectors.userCards.goldBadges),
                    original.querySelector(config.selectors.userCards.silverBadges),
                    original.querySelector(config.selectors.userCards.bronzeBadges)
                ].map((element) => element?.nextElementSibling?.innerText);

                // according to { isOwner, actionText, actionISO, profileUrl, profileImage, username, reputation, badges }
                const usernameContainer = original.querySelector(config.selectors.userCards.userDetails);
                const userCardConfig = {
                    isOwner: original.classList.contains("owner"),
                    actionText: actionInnerText.includes("edited") ? actionOuterHtml : actionInnerText,
                    actionISO: userActionTime.querySelector("span").title, // YYYY-MM-DD HH:MM:SSZ
                    profileUrl: original.querySelector(config.selectors.userCards.profileUrl)?.href,
                    profileImage: original.querySelector("img")?.src,
                    username: usernameContainer.querySelector("a")?.innerHTML || usernameContainer.innerText,
                    reputation: original.querySelector(config.selectors.userCards.reputation)?.innerText,
                    badges: { gold, silver, bronze },
                };

                return createUserCard(userCardConfig);
            }

            // -------    adjustUserCardsWidth    --------------------
            function adjustUserCardsWidth() { // Only when NOT moving the radioButtonBox
                // adjust the width of the userCards, so they do not get cramped up when using the Big Radio button box:
                const { main , revision , reviewMargin } = config.selectors.content;
                const mainbar = document.querySelector(main);
                const votecell = document.querySelector(revision + " " + reviewMargin);

                if (!mainbar || !votecell) // !(mainbar && votecell)
                    return "orange"; // ;)

                return (mainbar.clientWidth - votecell.clientWidth) + "px";
            }

            // -------    missingCards    --------------------
            function missingCards(messages) {
                const NoUserCardDiv = createNewDiv(false);
                NoUserCardDiv.style.backgroundColor = "var(--red-050)";
                NoUserCardDiv.style.border = "1px solid var(--red-100)";
                NoUserCardDiv.style.padding = "8px";
                NoUserCardDiv.style.margin = "6px";

                const messageElements =
                          messages.map((message) => {
                              const info = document.createElement("h4");
                              info.textContent = message;
                              info.style.color = "var(--theme-body-font-color)";
                              // info.style.color = "var(--black-750)";
                              info.style.padding = "2px";
                              return info;
                          });
                NoUserCardDiv.append(...messageElements);

                return NoUserCardDiv;
            }

            // -------    createNewDiv    --------------------
            function createNewDiv(horizontal = true) {
                const { ids: {custom: {userCards} },
                        classes: {flex: {container} }
                      } = config;

                const newDiv = document.createElement("div");
                newDiv.id = userCards;
                if (horizontal)
                    newDiv.classList.add(container);
                return newDiv;
            }

        } // originalPostUserCards

        // -------    editorUserCard    ---------------------
        async function editorUserCard(userCardsContainerAll) {
            const editProposedTime = userCardsContainerAll.querySelector("span");
                                                                         // ".s-user-card.s-user-card__minimal
            const minimalUserCard = userCardsContainerAll.querySelector(config.selectors.userCards.minimal);
            if (!editProposedTime)
                return;

            // deleted/anonymous user; using https://stackoverflow.design/product/components/user-cards/#deleted
            if (!minimalUserCard) {
                const editorUserCard = createSuggestorsUserCard(null, editProposedTime);
                editProposedTime.replaceWith(editorUserCard);
                return;
            }

            minimalUserCard.parentElement.classList.add("ai-center"); // spacing issue
            // Getting the editor user id
            const userLink = minimalUserCard.querySelector("a");
            if (!userLink)
                return;
            const [editorUserid] = userLink.href.split("/").slice(-2); // second last element

            const queueNumber = 1; // there must be a "1" queue-number :)
            const userInformationUrl = `https://stackoverflow.com/review/user-info/${queueNumber}/${editorUserid}`;

            try {
                const userInfoRequest = await fetch(userInformationUrl);
                if (!userInfoRequest.ok) throw new Error("Response status was: " + userInfoRequest.status);
                const userInformation = await userInfoRequest.text();

                const editorReviewStats = new DOMParser().parseFromString(userInformation, "text/html");
                const editorUserCard = createSuggestorsUserCard(editorReviewStats, editProposedTime);

                // minimalUserCard.parentNode.insertBefore(editorUserCard, minimalUserCard);
                minimalUserCard.before(editorUserCard);

                minimalUserCard.remove();
                editProposedTime.remove();

                if (userConfig.options.userCards.withEditiorStats === "Yes") {
                    insertEditorStatistics(editorUserCard, editorUserid);
                }
            } catch (error) {
                console.error(USERSCRIPTNAME + " - Error - while fetching editorUserCard : ", error);
            }

            // -------    createSuggestorsUserCard    --------------------
            function createSuggestorsUserCard(editorReviewStats, editProposedTime) {
                // Yup! This entire thing is prone to break every time Stack changes something. Sorry :(
                // https://stackoverflow.design/product/components/user-cards/

                const [gold, silver, bronze] = [
                    editorReviewStats?.querySelector(config.selectors.userCards.goldBadges),
                    editorReviewStats?.querySelector(config.selectors.userCards.silverBadges),
                    editorReviewStats?.querySelector(config.selectors.userCards.bronzeBadges)
                ].map((element) => element?.nextElementSibling?.innerText);

                // according to { isOwner, actionText, actionISO, profileUrl, profileImage, username, reputation, badges }
                const userCardConfig = {
                    isOwner: false,
                    actionText: editProposedTime.innerText, // e.g. 4 hours ago
                    actionISO: editProposedTime.firstElementChild.title, // YYYY-MM-DD HH:MM:SSZ
                    profileUrl: editorReviewStats?.querySelector(config.selectors.userCards.um.userLink).href,
                    profileImage: editorReviewStats?.querySelector("img").src,
                    username: editorReviewStats?.querySelector(config.selectors.userCards.um.userLink).innerHTML,
                    reputation: editorReviewStats?.querySelector(config.selectors.userCards.reputation).innerText,
                    badges: { gold, silver, bronze }
                };

                return createUserCard(userCardConfig);
            } // createSuggestorsUserCard

        } // editorUserCard
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function removeLineThrough() {
        // https://chat.stackoverflow.com/transcript/message/52312565#52312565 (code-review)

        if (userConfig.options.removeLineThrough !== "Yes")
            return;

        // https://www.rainbodesign.com/pub/css/css-javascript.html
        // https://usefulangle.com/post/39/adding-css-to-stylesheet-with-javascript

        // text-decoration: initial !important;

        const style = document.createElement("style");
        document.head.appendChild(style);
        const styleSheet = style.sheet;
        if (!styleSheet)
            return;

        styleSheet.insertRule(`
              ${config.lineThrough} {
                   text-decoration: initial;
              }`);

    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // Mostly snipped from Oleg Valter (https://stackoverflow.com/users/11407695/oleg-valter) at https://pastebin.com/YkG5R39h
    // https://chat.stackoverflow.com/transcript/message/52116388#52116388
    // https://chat.stackoverflow.com/transcript/message/52140612#52140612
    // https://chat.stackoverflow.com/transcript/message/52148815#52148815

    const API_BASE = "https://api.stackexchange.com";
    const API_VER = 2.2;

    const EMPTY = "\u00A0"; // NO-BREAK SPACE https://codepoints.net/U+00A0

    const config = {
            ids: {
                custom: {
                    userCards:    PREFIX + "-UserCards",
                    editorCard:   PREFIX + "-EditorCard",
                    buttons:      PREFIX + "-RealButtons",
                    postType:     PREFIX + "-PostType",
                    actionRadios: PREFIX + "-ActionRadios",
                    diffChoices:  PREFIX + "-DiffChoices",
                    progressBar:  PREFIX + "-Progressbar",
                },
            },
            error: "Oh No! Oh no-no-no-no-no! Arrrrrrrgh!...",
            tags: {
                radios: "fieldset",
            },
            classes: {
                grid: {
                    container: "grid",
                    cell: "grid--cell",
                },
                flex: {
                    container: "d-flex",
                    item: "flex--item",
                    // https://stackoverflow.design/product/base/flex/#gutter-classes
                    marginXAxis: "gsx",
                    marginYAxis: "gsy",
                    gap4px: "gs4",
                    gap24px: "gs24",
                    alignItemsCenter: "ai-center", // https://stackoverflow.design/product/base/flex/#align-items-classes
                    justifyContentFlexEnd: "jc-end" // https://stackoverflow.design/product/base/flex/#justify-content
                },
                choiceRadios: {
                    fieldset: ["fd-column", "p12", "gsy", "gs24"],
                    submits: ["bt", "bc-black-3"],
                    button: "pt12",
                    widget: "s-sidebarwidget",
                },
                userCards: {
                    signature: "post-signature",
                    info: "user-info",
                    details: "user-details",
                    actionTime: "user-action-time",
                    gravatarSmall: "user-gravatar32",
                    gravatarSmallWrap: "gravatar-wrapper-32",
                    gravatarWrap: "gravatar-wrapper-64",
                    flair: "-flair",
                    um: {
                        gravatar: "um-gravatar",
                        header: "um-header-info",
                        flair: "um-flair",
                    },
                    // https://stackoverflow.design/product/components/user-cards/
                    base: "s-user-card",
                    deleted: "s-user-card__deleted",
                    highlighted: "s-user-card__highlighted",
                    minimal: "s-user-card__minimal",
                    time: "s-user-card--time",
                    avatar: "s-user-card--avatar",
                    stacksInfo: "s-user-card--info",
                    link: "s-user-card--link",
                    awards: "s-user-card--awards",
                    awardBling: "s-award-bling",
                    reputation: "s-user-card--rep",
                    gold: "s-award-bling__gold",
                    silver: "s-award-bling__silver",
                    bronze: "s-award-bling__bronze",
                },
                avatars: {
                    base: "s-avatar",
                    avatar32px: "s-avatar__32",
                    avatarImage: "s-avatar--image"
                },
                buttons: {
                    button: "s-btn",
                    primary: "s-btn__primary",
                    outlined: "s-btn__outlined",
                    danger: "s-btn__danger",
                    muted: "s-btn__muted",
                    loading: "is-loading",
                },
                summary: "fc-red-800",
                answers: "answer-hyperlink",
                desktopHide: "d-none",
                titleSpace: "ml12",
                textAlignCenter: "ta-center", // https://stackoverflow.design/product/base/typography/#layout-classes
            },
            size: {
                gravatarSmall: "32",
            },
            selectors: {
                actions: {
                    reviewTask: ".s-page-title--actions a",
                    radioActionsBox: ".js-actions-sidebar",
                    reviews: ".js-review-actions",
                    radioParent: ".js-action-radio-parent",
                },
                buttons: {
                    action: ".js-action-button",
                    submit: ".js-review-submit",
                    },
                reviews: {
                    done: ".js-reviews-done",
                    daily: ".js-reviews-per-day",
                    filterChoice: "#js-review-filter-id",
                    filterDiff: ".js-diff-choices",
                    banner: "[role=status]",
                },
                title: {
                    divwrapper: ".s-page-title",
                    actionsTabs: ".s-page-title--actions",
                    description: ".s-page-title--description",
                    learnMore: ".js-show-modal-from-nav.s-link",
                    title: ".s-page-title--text",
                    header: ".s-page-title--header",
                },
                userCards: {
                    default: ".s-user-card",
                    minimal: ".s-user-card__minimal",
                    reputation: ".reputation-score",
                    goldBadges: ".badge1",
                    silverBadges: ".badge2",
                    bronzeBadges: ".badge3",
                    um: {
                        userLink: ".um-user-link"
                    },
                    gravatarSmall: ".user-gravatar32",
                    userDetails: ".user-details",
                    profileUrl: ".user-details a",
                    actionTime: ".user-action-time", // action = asked/answered/edited
                },
                content: {
                    content: ".js-review-content",
                    originalPost: ".js-question-title-link",
                    main: ".mainbar-full",
                    reviewPost: ".postcell",
                    reviewMargin: ".votecell",
                    revision: "#panel-revision",
                    tabs: ".js-review-tabs",
                },
            },
            lineThrough: "span.diff-delete",
    };


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveProgress() { // must wait for ajax
        if (userConfig.options.moveProgressBar !== "Yes")
            return;

        // -------    selectActions    --------------------
        const selectActions = () => Array.from(document.querySelectorAll(config.selectors.actions.reviewTask));

        const actions = selectActions();
        const action = actions.find(({ href }) => /\/review\/suggested-edits/.test(href));

        const colour = userConfig.colour;

        const { daily : dailyReviews , done : doneReviews } = config.selectors.reviews;
        const dailyElem = document.querySelector(dailyReviews);
        const reviewedElem = document.querySelector(doneReviews);

        moveProgressToElement(action, colour, dailyElem, reviewedElem);
    }

    function moveProgressToElement(element, colour, dailyElem, reviewedElem, hide = true) { // must wait for ajax

        // -------    trimNumericString    ----------------
        const trimNumericString = (text) => text.replace(/\D/g, "");

        // -------    toPercent    ------------------------
        const toPercent = (ratio) => `${Math.trunc(ratio * 100)}%`;

        // -------    goParentUp    -----------------------
        const goParentUp = (element, times = 1) => {
            if (times === 0 || !element)
                return element;
            return goParentUp(element.parentElement, times - 1);
        };

        // -------    hideProgressBar    ----------------
        const hideProgressBar = (reviewStatsElement) => {
            const wrapper = goParentUp(reviewStatsElement, 3);
            if (!wrapper)
                return false;
            wrapper.id = config.ids.custom.progressBar;
            if (hide) {
                wrapper.style.display = "none";
            } else {
                wrapper.style.visibility = "hidden";
            }
            return true;
        };

        // -------    moveProgressToTabs    ---------------
        const moveProgressToTabs = (action) => {

            if (!dailyElem || !reviewedElem)
                return false;
            const daily = trimNumericString(dailyElem.textContent || "0");
            const reviewed = trimNumericString(reviewedElem.textContent || "0");
            const ratio = +reviewed / +daily;
            const percentDone = toPercent(ratio);
            if (!action)
                return false;
            const { style } = action;
            // https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient()
            const { progressDone , progressNotDone , progressTextColour } = colour;
            style.background = "linear-gradient(90deg, " +            // rotation
                               `${progressDone} ${percentDone}, ` +   // From colour
                               `${progressNotDone} ${percentDone})`;  // To colour
            style.color = progressTextColour;
            action.textContent = `Review tasks (${reviewed}/${daily})`;
            return hideProgressBar(dailyElem);
        };

        moveProgressToTabs(element);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function changePageTitle() {
        if (userConfig.options.movePageTitleLink !== "Yes")
            return;

        // -------    createGridCell    --------------------
        const createFlexItem = () => {
            const elem = document.createElement("div");
            elem.classList.add(config.classes.flex.item); // "flex--item"
            return elem;
        };

        // -------    removeTitleLines    --------------------
        const removeTitleLines = (cnf, wrapper) => (wrapper || document)
            .querySelectorAll(cnf.selectors.title.description)
            .forEach((elem) => elem.remove());

        // -------    optimizePageTitle    --------------------
        const optimizePageTitle = (cnf) => {
            const titleWrap = document.querySelector(cnf.selectors.title.title);
            if (!titleWrap)
                return false;
            titleWrap.classList.add(config.classes.grid.container); // "grid"
            const header = document.querySelector(cnf.selectors.title.header);
            const titleCell = createFlexItem();
            titleCell.classList.add(config.classes.titleSpace); // "ml12"
            if (header)
                titleCell.append(header);
            const learnMoreBtn = titleWrap.querySelector(cnf.selectors.title.learnMore);
            const linkCell = titleCell.cloneNode();
            if (learnMoreBtn)
                linkCell.append(learnMoreBtn);
            removeTitleLines(cnf, titleWrap);
            titleWrap.append(titleCell, linkCell);
            return true;
        };

        optimizePageTitle(config);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function movePostTypeUp() { // must wait for ajax
        if (userConfig.options.AnswerQuestionOnTop !== "Yes")
            return;

        // -------    movePosttype    -------------------------
        const movePosttype = (cnf) => {
            const oldPostType = document.getElementById(cnf.ids.custom.postType);
            if (oldPostType)
                oldPostType.remove();

            const titleDivWrap = document.querySelector(cnf.selectors.title.divwrapper);
            if (!titleDivWrap)
                return false;

            const posttype = document.querySelector(`${cnf.selectors.content.content} h2`);
            const header = document.querySelector(cnf.selectors.title.header);
            if (!posttype || !header)
                return false;

            const postCell = header.cloneNode();
            postCell.id = config.ids.custom.postType;
            postCell.style.paddingRight = "80px";
            postCell.style.color = userConfig.colour.postType;

            /*
               This could also have been found from reviewResponse.postTypeId.
               .. except "0" seems to mean that the review isn't active. Go figure..?!?
               1 = Question
               2 = Answer
               3 = Orphaned tag wiki
               4 = Tag wiki excerpt
               5 = Tag wiki
               https://meta.stackexchange.com/questions/2677/database-schema-documentation-for-the-public-data-dump-and-sede
               .. or StackOverflow.Models.PostTypeId object.
            */
            const matchResult = posttype.textContent.match(/^Review the following (.*) edit$/);
            if (matchResult) {
                // https://www.freecodecamp.org/news/how-to-capitalize-words-in-javascript/
                // https://masteringjs.io/tutorials/fundamentals/capitalize-first-letter
                postCell.textContent = matchResult[1]
                                           .split(" ")
                                           .map((word) => { // TitleCase
                                                    return word[0].toUpperCase() + word.substring(1);
                                                })
                                           .join(" ");
            }

            const tabs = document.querySelector(cnf.selectors.title.actionsTabs);
            if (!tabs)
                return false;
            titleDivWrap.insertBefore(postCell,tabs);
            posttype.parentNode.removeChild(posttype);
        };

        movePosttype(config);
    }

    async function makeApiCall(apiEndpointUrl, page) {
        try {
            const apiCall = await fetch(`${apiEndpointUrl.toString()}&page=${page}`);
            if (!apiCall.ok) return [];
            return await apiCall.json();
        } catch (error) {
            console.error(USERSCRIPTNAME + " - error fetching editor stats from the API - makeApiCall", error);
        }
    }

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function insertEditorStatistics(editorUserCard, editorUserid) {

        // -------    getSuggestionsUserStats    --------------------
        const getSuggestionsUserStats = async (id) => {
            // See https://api.stackexchange.com/docs ("users/{ids}/suggested-edits")

            const apiEndpointUrl = new URL(`${API_BASE}/${API_VER}/users/${id}/suggested-edits`);
            const params = {
                site: window.location.hostname,  // "stackoverflow"
                filter: "!3xgWlhxc4ZsL1tY5Y",    // only include approval_date and rejection_date
                key: "YeacD0LmoUvMwthbBXF7Lw((", //:-)) Registered Key
                pagesize: 100
            };
            apiEndpointUrl.search = new URLSearchParams(params).toString();

            const allApiItems = [];
            let hasMore = true, pageNumber = 1;

            while (hasMore) {
                // eslint-disable-next-line no-await-in-loop
                const { items, has_more } = await makeApiCall(apiEndpointUrl, pageNumber);
                allApiItems.push(...items);
                hasMore = has_more;
                pageNumber++;
            }
            return allApiItems;
        };

        // Create a container div and put the editorUserCard into it. Then add the stats into it too.
        const superDiv = document.createElement("div");
        superDiv.classList.add("grid");
        // editorUserCard.parentNode.insertBefore(superDiv, editorUserCard);
        editorUserCard.before(superDiv);
        superDiv.appendChild(editorUserCard);

        const {colour : displayColours} = userConfig;
        const relativeFontSize = userConfig.size.editorStatistics;

        if (editorUserid < 0) { // https://stackoverflow.com/users/-1/community
            superDiv.appendChild(createEditorStatisticsItem([], displayColours, relativeFontSize, true));
        } else {
            getSuggestionsUserStats(editorUserid)
                .then((result) => superDiv.appendChild(createEditorStatisticsItem(result, displayColours, relativeFontSize)));
        }
    }


    // --------------------------------------------------------------------------------------------
    // ---- Workaround for splitting up "insertEditorStatistics" into two functions ---------------
    function createEditorStatisticsItem(suggestions, displayColours, relativeFontSize, community = false) {

        // -------    createEditorStatsItem    --------------------
        const createEditorStatsItem = (suggestions, displayColours, relativeFontSize, community) => {
            const { approved, rejected, total, ratio: { approvedToRejected, ofApproved, ofRejected }, }
                = getSuggestionTotals(suggestions);

            // https://chat.stackoverflow.com/transcript/message/52203332#52203332 (code-review)
            // https://chat.stackoverflow.com/transcript/message/52203389#52203389 (...spreading)
            const commonColour = { colour: displayColours.editorHeader };

            const itemParams = {
                relativeFontSize: relativeFontSize,
                header: { ...commonColour, items: ["Editor Statistics (non-deleted posts)"]},
                rows: [],
            };

            if (community) {
                itemParams.rows.push({ ...commonColour, items: [EMPTY]});
                itemParams.rows.push({ ...commonColour, items: ["This user does not suggest edits :)"]});
                return createItem(makeTable(itemParams));
            }

            if (!total) {        // also check that if it's a Tag
                const postType = document.getElementById(config.ids.custom.postType);
                if (postType && ["Question","Answer"].indexOf(postType.textContent) < 0) {
                    itemParams.rows.push({ ...commonColour, items: [EMPTY]});
                    itemParams.rows.push({ ...commonColour, items: ["Tag wiki/excerpt edits are not returned."]});
                    itemParams.rows.push({ ...commonColour, items: ["Please see the user's activity tab"]});
                    return createItem(makeTable(itemParams));
                }
            }

            // https://chat.stackoverflow.com/transcript/message/52168895#52168895
            itemParams.rows.push({colour: displayColours.editorApproved,
                                   items: [`Approved:${EMPTY}`,
                                           approved,
                                           `${EMPTY} ${formatted(ofApproved, true)}`,
                                           `${EMPTY} Ratio: ${formatted(approvedToRejected)}`]});
            itemParams.rows.push({colour: displayColours.editorRejected,
                                   items: ["Rejected:",
                                           rejected,
                                          `${EMPTY} ${formatted(ofRejected, true)}`]});
            itemParams.rows.push({colour: displayColours.editorTotal,
                                   items: ["Of total:",
                                           total,
                                           EMPTY,
                                          `${EMPTY} ${total - (approved + rejected)} Pending`]});
            return createItem(makeTable(itemParams));
        };

        // -------    getSuggestionTotals    --------------------
        const getSuggestionTotals = (suggestions) => {
            const stats = {
                get ratio() {
                    const { approved, rejected, total } = this;
                    return {
                        ofApproved: approved / total,
                        ofRejected: rejected / total,
                        // ratio doesn't make sense if one is 0:
                        approvedToRejected: (approved === 0 ? NaN : approved) / (rejected === 0 ? NaN : rejected),
                    };
                },
                approved: 0,
                rejected: 0,
                total: 0,
            };
            suggestions.forEach(({ approval_date, rejection_date }) => {
                stats.total += 1;
                if (approval_date)
                    stats.approved += 1;
                if (rejection_date)
                    stats.rejected += 1;
            });
            return stats;
        };

        // -------    formatted    --------------------
        const formatted = (ratio, toPercent = false) => {
            if (toPercent) {
                return isFinite(ratio) ? `(${Math.trunc(ratio * 100)}%)` : EMPTY.repeat(4);
            } else {
                return isFinite(ratio) ? ratio.toFixed(2) : "N/A";
            }
        };

        // -------    makeCells    --------------------
        const makeCells = (cells, isHead = false) => {
            return cells.map((content) => {
                const cell = document.createElement(isHead ? "th" : "td");
                if (isHead) {
                    cell.colSpan = 4;
                    const bold = document.createElement("b");
                    cell.append(bold);
                    bold.innerText = content;
                } else {
                    cell.innerText = content;
                }
                return cell;
            });
        };

        // -------    makeRow    --------------------
        const makeRow = (row, isHead = false) => {
            const tr = document.createElement("tr");
            tr.style.color = row.colour;
            tr.append(...makeCells(row.items, isHead));
            return tr;
        };

        // -------    makeTable    --------------------
        const makeTable = ({ relativeFontSize, header, rows }) => {
            const tab = document.createElement("table");
            tab.style.marginTop = "5px";
            tab.style.fontSize = relativeFontSize; // userConfig.size.editorStatistics;
            if (header) {
                const headrow = makeRow(header,true);
                tab.append(headrow);
            }
            const listItems = rows.map((subArray) => makeRow(subArray));
            tab.append(...listItems);
            return tab;
        };

        // -------    createItem    --------------------
        const createItem = (...contents) => {
            const elem = document.createElement("div");
            elem.classList.add(config.classes.flex.item); // "flex--item"
            elem.append(...contents);
            return elem;
        };

        return createEditorStatsItem(suggestions, displayColours, relativeFontSize, community);
    }


    // --------------------------------------------------------------------------------------------
    // ---- Make it happen ------------------------------------------------------------------------

    // https://chat.stackoverflow.com/transcript/message/52214837#52214837 (code-review)

    const almostAll = () => {
        // Hides the Big Box with review radio options..
        const { moveRadioBox, keepRadios } = userConfig.options.radioVsButtons;
        if (moveRadioBox === "Yes") {
            if (keepRadios !== "Yes") {
                shadowRadiosToButtons();  // ..and replaces them with buttons on the Filter button level.
            } else {
                moveRadio();              // ..and moves the items (still as radios) on the Filter button level.
            }
        }

        moveProgress();       // Puts " (0/40)" on the "Review tasks" tab instead of "Your daily reviews 0 /40 (-----)"
        movePostTypeUp();     // Removes "Review the following answer/question edit"
        highlightSummary();   // Makes the edit summary noticeable
        highlightMessage();   // Makes a review message to the reviewer more noticeable
        moveDiffChoices();    // Moves the "Inline | Side-by-side | Side-by-side markdown"
        getUserCards();       // Gets back the user cards! :)
        addSeparator();       // Adds a border separator between the post summary and the review
    };

    changePageTitle();        // Removes redundant information and moves the "Learn more"
    removeLineThrough();      // Removes the strike through of text that is already highlighted in red

    ajaxCompleteWrapper(almostAll);

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // ---- The GUI with the icon on the top right ------------------------------------------------

    userInterfaceSettings();

    function userInterfaceSettings() {

        // ----------------------------------------------------------------------------------------
        // ----------------------------------------------------------------------------------------
        const imgHOST = "https://i.stack.imgur.com/";
        const isLIGHT = getCSSVariableValue("var(--white)") === "#fff";

        // ----------------------------------------------------------------------------------------
        // ---- Config and map for modal elements -------------------------------------------------

        // https://stackoverflow.design/product/components/modals/

        const modalConfig = {
                headerNtooltip: USERSCRIPTNAME + " - Settings",
                ids: {
                    icon:              PREFIX + "-modal-" + "icon",
                    header:            PREFIX + "-modal-" + "title",
                    body:              PREFIX + "-modal-" + "body",
                    aside:             PREFIX + "-modal-" + "base",
                    radioName:         PREFIX + "-modal-" + "radioName",
                    radioButtons:      PREFIX + "-modal-" + "RadioStyleChange",
                    radioButtonLabel:  PREFIX + "-modal-" + "radioLabel",
                    lineThrough:       PREFIX + "-modal-" + "previewLineThough",
                },
                classes: {
                    icon: {
                        iconItem: "-item",
                        iconLink: "-link",
                    },
                    smodals: {
                        modal: "s-modal",
                        header: "s-modal--header",
                        close: "s-modal--close",
                        dialog: "s-modal--dialog",
                        body: "s-modal--body",
                        footer: "s-modal--footer",
                    },
                    margins: {
                        negative: "gs8",
                        zeroX: "gsx",
                        zeroY: "gsy",
                        top: "mt8",
                    },
                    naviagations: {
                        base: "s-navigation",
                        item: "s-navigation--item",
                        selected: "is-selected",
                    },
                    toggle: {
                        sweetch: "s-toggle-switch",
                        indicator: "s-toggle-switch--indicator",
                    },
                    actions: {
                        radio: "js-action-radio",
                        radioParent: "js-action-radio-parent",
                    },
                    padding: {
                        Y: "py16",
                        top: "pt16",
                    },
                    notice: {
                        base: "s-notice",
                        info: "s-notice__info",
                    },
                    title: {
                        base: "s-page-title",
                        header: "s-page-title--header",
                    },
                    reviewText: {
                        post: "js-post-body",
                        prose: "s-prose",
                        diff: "diff-delete",
                    },
                    scroll: "overflow-y-scroll",
                    center: "ai-center",
                    select: "s-select",
                    input: "s-input",
                    label: "s-label",
                    radio: "s-radio",
                    header: "js-user-header",
                },
                colours: {
                    background: "var(--white)",  // #fff or #2d2d2d;
                    toggleMutedOn: "var(--green-050)",
                    toggleMutedoff: "var(--black-150)",
                    muted: "var(--mp-muted-color)",
                    active: "var(--fc-dark)",
                    seperator: "var(--black-200)",
                    border: "var(--black-075)",
                    noticeBackground: "var(--powder-100)",
                    noticeBorder: "var(--powder-400)",
                },
                sizes: {
                    editorAvatar: {
                        width: "200px",
                        heigth: "66px",
                    },
                    labels: {
                        fontSizeSmaller: "1.10rem",
                        fontWeightSmaller: "525",
                    },
                },
                hide: "s-modal#hide",
                show: "s-modal#show",
                draggable: "se-draggable",
                topMenuSelector:  "ol.user-logged-in",
        };


        // --------------------------------------
        const modalElements = [
               {
                 tabMenu: "Radios or Buttons",
                 id: PREFIX +"-modal-" + "RadiosOrButtons",
                 tabDefault: true,
                 previewUpdates: {
                     radiosButtons:
                         (tabName) => previewRadiosOrButtonsOnf(
                                          tabName,
                                          "None, radios or buttons",
                                          "Box, radios or buttons"),
                     radiosButtonsDetails:
                         (tabName) => previewRadiosOrButtonsUpdate(
                                          tabName,
                                          "None, radios or buttons"),
                 },
                 needIntiliatize: ["radiosButtons"],
                 bottomSpace: ["Keep radio buttons"],
                 items: [
                     {
                      name: "Box, radios or buttons",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 2,
                     },
                     {
                      name: "None, radios or buttons",
                      type: "preview",
                      create: () => previewRadiosOrButtonsContainer(),
                      displayOrder: 7,
                     },
                     {
                      name: "Move review actions",
                      id: PREFIX + "-modal-" + "moveReviewActions",
                      configKey: "options.radioVsButtons.moveRadioBox",
                      type: "toggle",
                      toggleEntry: "Move review actions",
                      dependents: ["Keep radio buttons"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 1,
                     },
                     {
                      name: "Keep radio buttons",
                      id: PREFIX + "-modal-" + "keepRadioButtons",
                      configKey: "options.radioVsButtons.keepRadios",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      dependents: ["with borders"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 3,
                     },
                     {
                      name: "with borders",
                      id: PREFIX + "-modal-" + "radiosWithBorders",
                      configKey: "options.radioVsButtons.radioWithBorders",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      dependents: ["Border colour",
                                   "Border width"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 4,
                     },
                     {
                      name: "Border colour",
                      id: PREFIX + "-modal-" + "radiosBordersColour",
                      configKey: "colour.radioSeperator",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["radiosButtonsDetails"],
                      displayOrder: 5,
                     },
                     {
                      name: "Border width",
                      id: PREFIX + "-modal-" + "radiosSizeColour",
                      configKey: "size.radioSeperator",
                      type: "select",
                      postfix : "px",
                      values: [1,2,3,4,5],
                      indents: 2,
                      refPreviewUpdates: ["radiosButtonsDetails"],
                      displayOrder: 6,
                     },
                 ],
               },
               {
                 tabMenu: "User Cards",
                 id: PREFIX + "-modal-" + "UserCards",
                 previewUpdates: {
                     userCards:
                         (tabName) => previewUserCardsStatisticsOnf(
                                          tabName,
                                          "All user Cards",
                                          "Editor Statistics"),
                     editorStatistics:
                         (tabName) => previewEditorStatisticsUpdate(
                                          tabName,
                                          "Editor Statistics"),
                 },
                 needIntiliatize: ["userCards"],
                 bottomSpace: ["Add user cards"],
                 items: [
                     {
                      name: "All user Cards",
                      type: "preview",
                      create: () => previewUserCardsContainer(),
                      displayOrder: 3,
                     },
                     {
                      name: "Editor Statistics",
                      type: "preview",
                      create: () => previewEditorStatisticsContainer(),
                      displayOrder: 10,
                     },
                     {
                      name: "Add user cards",
                      id: PREFIX + "-modal-" + "addUserCards",
                      configKey: "options.userCards.getUserCards",
                      type: "toggle",
                      toggleEntry: "Add user cards",
                      dependents: ["with editor statistics"],
                      refPreviewUpdates: ["userCards"],
                      displayOrder: 1,
                     },
                     {
                      name: "with editor statistics",
                      id: PREFIX + "-modal-" + "withEditorStatistics",
                      configKey: "options.userCards.withEditiorStats",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Add user cards",
                      dependents: ["Editor statistics options:",
                                   "Header colour",
                                   "Approved colour",
                                   "Rejected colour",
                                   "Total colour",
                                   "Editor statistics text size"],
                      refPreviewUpdates: ["userCards"],
                      displayOrder: 2,
                     },
                     {
                      name: "Editor statistics options:",
                      id: PREFIX + "-modal-" + "editorStatisticsOptions",
                      type: "header",
                      indents: 1,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 4,
                     },
                     {
                      name: "Header colour",
                      id: PREFIX + "-modal-" + "editorStatisticsHeaderColour",
                      configKey: "colour.editorHeader",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 5,
                     },
                     {
                      name: "Approved colour",
                      id: PREFIX + "-modal-" + "editorStatisticsApprovedColour",
                      configKey: "colour.editorApproved",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 6,
                     },
                     {
                      name: "Rejected colour",
                      id: PREFIX + "-modal-" + "editorStatisticsRejectedColour",
                      configKey: "colour.editorRejected",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 7,
                     },
                     {
                      name: "Total colour",
                      id: PREFIX + "-modal-" + "editorStatisticsTotalColour",
                      configKey: "colour.editorTotal",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 8,
                     },
                     {
                      name: "Editor statistics text size",
                      id: PREFIX + "-modal-" + "editorStatisticsSize",
                      configKey: "size.editorStatistics",
                      type: "size",
                      postfix: "%",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 9,
                     },
                 ],
               },
               {
                 tabMenu: "Move",
                 id: PREFIX + "-modal-" + "Move",
                 previewUpdates: {
                     progressBar:
                         (tabName) => previewProgressBarOnfUpdate(
                                          tabName,
                                          "Progress Bar"),
                     diffChoices:
                         (tabName) => previewDiffChoicesOnf(
                                          tabName,
                                          "Diff Choices"),
                     pageTitleLink:
                         (tabName) => previewPageTitleLinkOnf(
                                          tabName,
                                          "Page Title Link"),
                     postType:
                         (tabName) => previewMovePostTypeOnf(
                                          tabName,
                                          "Post Type"),
                     postTypeColour:
                         (tabName) => previewMovePostTypeColourUpdate(
                                          tabName,
                                          "Post Type Colour Preview"),
                 },
                 topSpaceSeparator: ["Move diff choices",
                                     "Rework page title",
                                     "Move post type up"],
                 items: [
                     {
                      name: "Progress Bar",
                      type: "preview",
                      create: () => previewProgressBarContainer(),
                      displayOrder: 5,
                     },
                     {
                      name: "Diff Choices",
                      type: "preview",
                      create: () => previewDiffChoicesContainer(),
                      displayOrder: 7,
                     },
                     {
                      name: "Page Title Link",
                      type: "preview",
                      create: () => previewPageTitleLinkContainer(),
                      displayOrder: 9,
                     },
                     {
                      name: "Post Type",
                      type: "preview",
                      create: () => previewMovePostTypeContainer(),
                      displayOrder: 11,
                     },
                     {
                      name: "Post Type Colour Preview",
                      type: "preview",
                      create: () => previewMovePostTypeColourContainer(),
                      displayOrder: 13,
                     },
                     {
                      name: "Move progress bar",
                      id: PREFIX + "-modal-" + "moveProgressBar",
                      configKey: "options.moveProgressBar",
                      type: "toggle",
                      toggleEntry: "Move progress bar",
                      dependents: ["Progress \"done\" colour",
                                   "Progress \"not done\" colour",
                                   "Progress text colour"],
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 1,
                     },
                     {
                      name: "Progress \"done\" colour",
                      id: PREFIX + "-modal-" + "progressDoneColour",
                      configKey: "colour.progressDone",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 2,
                     },
                     {
                      name: "Progress \"not done\" colour",
                      id: PREFIX + "-modal-" + "progressNotDoneColour",
                      configKey: "colour.progressNotDone",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 3,
                     },
                     {
                      name: "Progress text colour",
                      id: PREFIX + "-modal-" + "progressTextColour",
                      configKey: "colour.progressTextColour",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 4,
                     },
                     {
                      name: "Move diff choices",
                      id: PREFIX + "-modal-" + "movePageTitleLink",
                      configKey: "options.moveDiffChoices",
                      type: "toggle",
                      refPreviewUpdates: ["diffChoices"],
                      displayOrder: 6,
                     },
                     {
                      name: "Rework page title",
                      id: PREFIX + "-modal-" + "movePageTitleLink",
                      configKey: "options.movePageTitleLink",
                      type: "toggle",
                      refPreviewUpdates: ["pageTitleLink"],
                      displayOrder: 8,
                     },
                     {
                      name: "Move post type up",
                      id: PREFIX + "-modal-" + "AnswerQuestionOnTop",
                      configKey: "options.AnswerQuestionOnTop",
                      type: "toggle",
                      toggleEntry: "Move post type up",
                      dependents: ["Post type colour"],
                      refPreviewUpdates: ["postType","postTypeColour"],
                      displayOrder: 10,
                     },
                     {
                      name: "Post type colour",
                      id: PREFIX + "-modal-" + "postTypeColour",
                      configKey: "colour.postType",
                      type: "colour",
                      refPreviewUpdates: ["postTypeColour"],
                      displayOrder: 12,
                     },
                 ],
               },
               {
                 tabMenu: "Highlight",
                 id: PREFIX + "-modal-" + "Highlight",
                 previewUpdates: {
                     summaryPreview:
                         (tabName) => previewSummaryOnf(
                                          tabName,
                                          "Summary Preview"),
                     summaryUpdate:
                         (tabName) => previewSummaryUpdate(
                                          tabName,
                                          "Summary Preview"),
                     messagePreview:
                         (tabName) => previewMessageOnf(
                                          tabName,
                                          "Message Preview"),
                     messageUpdate:
                         (tabName) => previewMessageUpdate(
                                          tabName,
                                          "Message Preview"),
                     lineThrough:
                         (tabName) => previewLineThoughOnf(
                                          tabName,
                                          "Line through"),
                 },
                 topSpaceSeparator: ["Prominent review message",
                                     "Remove LineThrough"],
                 bottomSpace: ["Highlight edit summary",
                               "Prominent review message",
                               "Remove LineThrough"],
                 items: [
                     {
                      name: "Summary Preview",
                      type: "preview",
                      create: () => previewSummaryContainer(),
                      displayOrder: 4,
                     },
                     {
                      name: "Message Preview",
                      type: "preview",
                      create: () => previewMessageContainer(),
                      displayOrder: 9,
                     },
                     {
                      name: "Line through",
                      type: "preview",
                      create: () => previewLineThoughContainer(),
                      displayOrder: 11,
                     },
                     {
                      name: "Highlight edit summary",
                      id: PREFIX + "-modal-" + "highlightsummary",
                      configKey: "options.highlightSummary",
                      type: "toggle",
                      toggleEntry: "Highlight edit summary",
                      dependents: ["Edit summary colour",
                                   "Edit summary size"],
                      refPreviewUpdates: ["summaryPreview"],
                      displayOrder: 1,
                     },
                     {
                      name: "Edit summary colour",
                      id: PREFIX + "-modal-" + "summaryColour",
                      configKey: "colour.summary",
                      type: "colour",
                      refPreviewUpdates: ["summaryUpdate"],
                      displayOrder: 2,
                     },
                     {
                      name: "Edit summary size",
                      id: PREFIX + "-modal-" + "summarySize",
                      configKey: "size.summary",
                      postfix: "%",
                      type: "size",
                      refPreviewUpdates: ["summaryUpdate"],
                      displayOrder: 3,
                     },
                     {
                      name: "Prominent review message",
                      id: PREFIX + "-modal-" + "prominentReviewMessage",
                      configKey: "options.prominentReviewMessage",
                      type: "toggle",
                      toggleEntry: "Prominent review message",
                      dependents: ["Review message colour",
                                   "Review message size",
                                   "Review message background colour"],
                      refPreviewUpdates: ["messagePreview"],
                      displayOrder: 5,
                     },
                     {
                      name: "Review message colour",
                      id: PREFIX + "-modal-" + "reviewMessageColour",
                      configKey: "colour.message",
                      type: "colour",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 6,
                     },
                     {
                      name: "Review message size",
                      id: PREFIX + "-modal-" + "reviewMessageSize",
                      configKey: "size.message",
                      postfix: "%",
                      type: "size",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 7,
                     },
                     {
                      name: "Review message background colour",
                      id: PREFIX + "-modal-" + "reviewMessageBackgroundColour",
                      configKey: "colour.messageBackground",
                      type: "colour",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 8,
                     },
                     {
                      name: "Remove LineThrough",
                      id: PREFIX + "-modal-" + "removeLineThrough",
                      configKey: "options.removeLineThrough",
                      type: "toggle",
                      refPreviewUpdates: ["lineThrough"],
                      displayOrder: 10,
                     },
                 ],
               },
        ];


        // ----------------------------------------------------------------------------------------
        // ---- Object Utility --------------------------------------------------------------------

        // https://attacomsian.com/blog/javascript-iterate-objects
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find

        const objectFromTabname = (obj, menuName) =>
            obj.find(({ tabMenu }) => tabMenu === menuName);

        const objectFromId = (obj, theId) =>
            obj.find(({ id }) => id === theId);

        const objectFromName = (obj, itemName) =>
            obj.find(({ name }) => name === itemName);

        // { const tab = obj.find(({ tabMenu }) => tabMenu === menuName);
        //   return tab.items.find(({ name }) => name === itemName); }
        // obj.find(tab => tab.tabMenu === menuName).items.find(item => item.name === itemName);
        const objectFromTabnItemname = (obj, menuName, itemName) =>
            obj.find(({ tabMenu }) => tabMenu === menuName)
               .items  // ?.items
               .find(({ name }) => name === itemName);

        // https://chat.stackoverflow.com/transcript/message/52355606#52355606
        // let defaultUserConfigValue = defaultUserConfig;
        // key.split(".").forEach(key => defaultUserConfigValue = defaultUserConfigValue[key]);
        const deepGet = (obj, path) => {
            let temp = obj;
            path.split(".").forEach((key) => temp = temp[key]);
            return temp;
        };

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
        const deepSet = (obj, path, value) => {
            let temp = obj;
            const keys = path.split(".");
            keys.slice(0, -1).forEach((key) => temp = temp[key]);
            temp[keys.slice(-1)] = value;
        };


        // ----------------------------------------------------------------------------------------
        // ---- Resetting to default  -------------------------------------------------------------

        function reset(cancel = false) {

            if (cancel) {

                modalElements                      // have to go through the modalElements
                    .forEach((modalElement) => {   // since most of them are not in the DOM.
                                 resetTab(modalElement, tempUserConfig); // reset to last saved settings.
                            });

            } else {                               // reset the tab to default values

                const tabContent = document.querySelector(`#${modalConfig.ids.body} > div`);
                const modalElement = objectFromId(modalElements, tabContent.id);
                resetTab(modalElement, defaultUserConfig);               // reset to default.

            }

            function resetTab(modalConfigElement, configObject) {
                modalConfigElement
                    .items
                    .forEach((item) => {
                                 const element = item.element;
                                 const id = item.id;
                                 if (id) {         // Preview elements may not have an id
                                     const valueElement = element.querySelector("#" + id);
                                     resetValue(valueElement, item, configObject);
                                 }
                    });
            }

            // (Oleg's nice solution) https://chat.stackoverflow.com/transcript/message/52354809#52354809
            function resetValue(element, item, configObject) {

                const { configKey : key} = item;
                if (!key)  // for headers and previews key will be undefined.
                    return;

                const actionMap = {
                    checkbox:     (el) => el.checked = (deepGet(configObject, key) === "Yes"),
                    color:        (el) => el.value   = getCSSVariableValue(deepGet(configObject, key)) || "#000000",
                    text:         (el) => el.value   = deepGet(configObject, key).replace(item.postfix, ""),
                    "select-one": (el) => el.value   = deepGet(configObject, key),
                };

                actionMap[element.type](element);

                // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
                // https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
                element.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }


        // ----------------------------------------------------------------------------------------
        // ---- Just insert the icon --------------------------------------------------------------

        let tempUserConfig;
        // removeValueFromCache(PREFIX)  // For testing purposes

        // Just add the icon. Then wait until it's clicked.
        // insertIcon();                    // No Svg..
        ajaxCompleteWrapper(insertIcon);    // ..unless we wait


        // ----------------------------------------------------------------------------------------
        // ---- Setting up the modal --------------------------------------------------------------

        function insertIcon() {
            const {topMenuSelector,
                   headerNtooltip,
                   ids: { icon : iconId },
                   classes: { icon }
                  } = modalConfig;

            if (document.querySelector(`${topMenuSelector} #${iconId}`))
                return;  // Don't add another

            // The icon inside the item on the top bar
            const settingsLink = document.createElement("a");
            settingsLink.classList.add(icon.iconLink); // unrelated to links, just a class.

            // https://chat.stackoverflow.com/transcript/message/52315572#52315572
            // https://chat.stackoverflow.com/transcript/message/52315623#52315623
            // https://chat.stackoverflow.com/transcript/message/52333918#52333918
            if (typeof Svg !== "undefined") {
                settingsLink.append(Svg.Gear().get(0));
            } else {
                settingsLink.textContent = "⚙️";
                settingsLink.style.fontSize = "125%";
            }
            settingsLink.title = headerNtooltip; // tooltip

            // The settings-item on the top bar
            const settingsItem = document.createElement("li");
            settingsItem.classList.add(icon.iconItem);
            settingsItem.id = iconId;
            settingsItem.append(settingsLink);

            const topBar = document.querySelector(topMenuSelector);
            topBar.append(settingsItem);

            // loads the GUI for the settings
            settingsItem.addEventListener("click", () => {
                let modalElement = document.querySelector(`#${modalConfig.ids.aside}`);
                if (!modalElement) { // check if the modal has been appended to the DOM
                    modalElement = createModalAside(loadIt());
                    document.body.appendChild(modalElement);
                }
                StackExchange.helpers.showModal(modalElement);
            });

        }

        // -------------------------------
        function createModalAside(linkToModal) {
            const {ids: { aside : asideId },
                   classes: { smodals: { modal } }
                  } = modalConfig;

            // aside holds the modal. Activates when clicking on the icon
            const modalAside = document.createElement("aside");
            modalAside.classList.add(modal);
            modalAside.id = asideId;
            modalAside.dataset.target = `${modal}.modal`;
            modalAside.dataset.controller = modal;
            modalAside.append(linkToModal);

            return modalAside;
        }


        // ----------------------------------------------------------------------------------------
        // ---- This loads the GUI  ---------------------------------------------------------------

        function loadIt() {  // fires on the first click on the icon.
            tempUserConfig = getUserConfig();

            const modalHeader = createModalHeader();

            const navigation = createNavigationContainer();
            const modalContentContainer = createModalContentContainer();

            // This is where it happens:
            createContentnNavigationTabs(navigation, modalContentContainer);

            const footerButtons = createFooterButtons();
            const closeXButton = createCloseXButton();

            const modal = createStackModal();
            modal.append(modalHeader, navigation, modalContentContainer, footerButtons, closeXButton);
            return modal;
        }

        // -------------------------------
        function createStackModal() {
            const {draggable,
                   classes: { smodals: { dialog } }
                  } = modalConfig;

            const stackModal = document.createElement("div");
            stackModal.classList.add(dialog);
            stackModal.dataset.controller = draggable;
            return stackModal;
        }

        // -------------------------------
        function createModalHeader() {
            const {draggable,
                   headerNtooltip,
                   ids: { header : headerId },
                   classes: { smodals: { header } }
                  } = modalConfig;

            const modalHeader = document.createElement("h3");
            modalHeader.classList.add(header);
            modalHeader.dataset.target = `${draggable}.handle`;
            modalHeader.id = (headerId);
            modalHeader.style.fontSize = "1.72rem";
            modalHeader.textContent = headerNtooltip;
            return modalHeader;
        }

        // -------------------------------
        function createFooterButtons() {
            const { flex : { container, item },
                    buttons : { button : basebutton, primary, danger, outlined },
                  } = config.classes;
            const {hide,
                   classes: { smodals: { footer }, margins: { negative,  zeroX } }
                  } = modalConfig;

            const saveButton   = createModalButton("Apply & Exit", [item, basebutton, primary]);
            const cancelButton = createModalButton("Cancel",       [item, basebutton]);

            saveButton.addEventListener("click", () => updateValueFromCache(PREFIX, tempUserConfig));
            saveButton.dataset.action = hide;

            cancelButton.addEventListener("click",
                                          () => {
                                                      tempUserConfig = getUserConfig();
                                                      reset(true); // true means Cancel back to userConfig.
                                          });
            cancelButton.dataset.action = hide;

            const buttons = document.createElement("div");
            buttons.classList.add(container, zeroX, negative);
            buttons.append(saveButton, cancelButton);

            const restoreButton = createModalButton("Restore tab settings", [basebutton, danger, outlined]);
            restoreButton.addEventListener("click", () => reset(false)); // false means the tab to default.

            const allButtons = document.createElement("div");
            allButtons.classList.add(container, negative, zeroX, footer);
            allButtons.style.justifyContent = "space-between";
            allButtons.append(restoreButton, buttons);

            return allButtons;
        }

        // -------------------------------
        function createCloseXButton() {
            const { buttons : { button : basebutton, muted } } = config.classes;
            const { hide,
                    classes: { smodals: { close } }
                  } = modalConfig;

            const closeButton = createModalButton("", [close, basebutton, muted]);
            if (typeof Svg !== "undefined") {
                closeButton.append(Svg.ClearSm().get(0));
            } else {
                // https://codepoints.net/U+2716 HEAVY MULTIPLICATION X
                closeButton.textContent = "✖";
            }
            closeButton.dataset.action = hide;

            return closeButton;
        }

        // -------------------------------
        function createModalButton(textContent, classList) {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add(...classList);
            button.textContent = textContent;
            return button;
        }

        // -------------------------------
        function createModalContentContainer() {
            const {ids: { body : bodyId },
                   classes: { scroll, smodals: { body } }
                  } = modalConfig;

            // https://css-tricks.com/the-current-state-of-styling-scrollbars/
            // https://htmldom.dev/create-a-custom-scrollbar/
            const modalBody = document.createElement("div");
            modalBody.classList.add(body); //, "js-user-panel-content");
            modalBody.id = bodyId;
            modalBody.style.paddingTop = "20px";

            // Make the body scroll without effecting on the tabs nor the buttons
            modalBody.style.maxHeight = (window.innerHeight - 275) + "px";
            // https://stackoverflow.design/product/base/overflow/
            modalBody.classList.add(scroll);
            // Put the scrollbar in the margin:
            modalBody.style.marginRight = "-15px";
            modalBody.style.paddingRight = "15px";

            return modalBody;
        }

        // -------------------------------
        function createNavigationContainer() {
            const {classes: { naviagations: { base }, header } } = modalConfig;

            const navigation = document.createElement("ul");
            navigation.classList.add(base, header);
            return navigation;
        }

        // -------------------------------
        function createNavigationItem(textContent, selected = false) {
            const {classes: { naviagations: { item : navigationItem, selected : navigationSelected } } } = modalConfig;

            const item = document.createElement("li");
            item.classList.add(navigationItem);
            if (selected)
                item.classList.add(navigationSelected);
            item.textContent = textContent;
            return item;
        }

        // -------------------------------
        function linkNavigationToContent(navigationContainer, navigationItem, modalContainer, modalContent) {
            const {classes: { naviagations: { selected : navigationSelected } } } = modalConfig;

            navigationItem.addEventListener("click", () => {
                [...navigationContainer.children].forEach((item) => item.classList.remove(navigationSelected));
                modalContainer.replaceChild(modalContent, modalContainer.firstElementChild);
                navigationItem.classList.add(navigationSelected);
            });
        }

        // -------------------------------
        function createContentnNavigationTabs(navigation, modalContentContainer) {
            const navigationItems =
                      modalElements.map((tabItem) => {
                          const contentTab = createTabBody(tabItem.tabMenu);
                          const navigationItem = createNavigationItem(tabItem.tabMenu, tabItem.tabDefault);
                          if (tabItem.tabDefault)
                               modalContentContainer.append(contentTab);
                          linkNavigationToContent(navigation, navigationItem, modalContentContainer, contentTab);
                          return navigationItem;
                      });
            navigation.append(...navigationItems);
        }


        // ----------------------------------------------------------------------------------------
        // ---- Modal bodies ----------------------------------------------------------------------

        function createTabBody(tabName) {
            const tab = objectFromTabname(modalElements, tabName);

            const elementFunctionMap = {
                      preview: createPreviewGet,
                      toggle:  createStackToggleGet,
                      colour:  createColourPickerGet,
                      select:  createSelectInputGet,
                      size:    createSizeInputGet,
                      header:  createOptionHeaderGet,
            };

            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
            const elements = tab.items
                                 .sort((firstItem, secondItem) =>
                                            firstItem.displayOrder - secondItem.displayOrder)
                                 .map((item) => elementFunctionMap[item.type](item.name, tabName));

            (tab.needIntiliatize || [])
               .forEach((initialise) => tab.previewUpdates[initialise](tabName));

            (tab.bottomSpace || [])
               .forEach((itemName) => addBottomSpace(objectFromName(tab.items, itemName).element));

            (tab.topSpaceSeparator || [])
               .forEach((itemName) => addTopSpaceSeparator(objectFromName(tab.items, itemName).element));

            initEnableDisable(tabName);

            const modalContent = document.createElement("div");
            modalContent.id = objectFromTabname(modalElements, tabName).id;
            modalContent.append(...elements);

            return modalContent;
        }


        // ----------------------------------------------------------------------------------------
        // ---- Element templates -----------------------------------------------------------------

        // -------------------------------
        function getPreviewUpdateFunctions(item, tabMenu) {
            const previewFunctions = item.refPreviewUpdates || [];
            const tab = objectFromTabname(modalElements, tabMenu);
            return previewFunctions.map((key) => tab.previewUpdates[key]);
        }


        // -------------------------------
        function createContainer() {
            const { container: flexContainer } = config.classes.flex;
            const { classes: { center } } = modalConfig;

            const container = document.createElement("div");
            container.classList.add(flexContainer, center);

            return container;
        }


        // -------------------------------
        function createPreviewGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const preview = item.create();
            item.element = preview;
            return preview;
        }


        // -------------------------------
        function createSelectInputGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const selectInput = createSelectInput(labelText,
                                                  item.id,
                                                  deepGet(tempUserConfig, item.configKey),
                                                  item.values,
                                                  item.postfix,
                                                  item.indents);
            item.element = selectInput;

            const previewUpdateFunctions = getPreviewUpdateFunctions(item, tabMenu);
            selectInput.addEventListener("change", (event) => {
                deepSet(tempUserConfig, item.configKey, event.target.value);
                previewUpdateFunctions.forEach((foonction) => foonction(tabMenu));
            });
            return selectInput;
        }

        // -------------------------------
        function createSelectInput(labelText, selectInputId, defaultOption, options, postfix, indents = 1) {
            const { classes: { select },
                    sizes: { labels: { fontSizeSmaller, fontWeightSmaller } }
                  } = modalConfig;

            const selectInputContainer = createContainer();

            const label = createLabel(labelText,
                                      selectInputId,
                                      {
                                       fontSize:     fontSizeSmaller, //"1.10rem",
                                       width:        "160px",
                                       alignIndents: indents,
                                       fontWeight:   fontWeightSmaller //"525"});
                                      });
            const selectInputs = document.createElement("select");
            selectInputs.id = selectInputId;
            const selectOptions =
                      options.map((selectOption) => {
                          const selectInputOption = document.createElement("option");
                          selectInputOption.value = selectOption;
                          selectInputOption.textContent = selectOption;
                          return selectInputOption;
                      });
            selectInputs.append(...selectOptions);
            selectInputs.value = defaultOption.replace(postfix, "");
            selectInputs.style.padding = ".4em .3em";

            const outerSelectInputs = document.createElement("div");
            outerSelectInputs.classList.add(select);
            outerSelectInputs.style.width = "45px";
            outerSelectInputs.style.textAlign = "right";
            outerSelectInputs.append(selectInputs);

            const postlabel = createLabel(postfix,
                                          selectInputId,
                                          {fontSize: fontSizeSmaller, fontWeight: fontWeightSmaller});

            selectInputContainer.append(label, outerSelectInputs, postlabel);

            return selectInputContainer;
        }


        // -------------------------------
        function createSizeInputGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const sizeInput = createSizeInput(labelText,
                                              item.id,
                                              deepGet(tempUserConfig, item.configKey),
                                              item.postfix,
                                              item.indents);
            item.element = sizeInput;

            const previewUpdateFunctions = getPreviewUpdateFunctions(item, tabMenu);
            sizeInput.addEventListener("change", (event) => {
                deepSet(tempUserConfig, item.configKey, event.target.value + item.postfix);
                previewUpdateFunctions.forEach((foonction) => foonction(tabMenu));
            });

            return sizeInput;
        }

        // -------------------------------
        function createSizeInput(labelText, sizeInputId, option, postfix, indents = 1) {
            const { classes: { input },
                    sizes: { labels: { fontSizeSmaller, fontWeightSmaller } }
                  } = modalConfig;

            const sizeInputContainer = createContainer();

            const label = createLabel(labelText,
                                      sizeInputId,
                                      {
                                       fontSize:     fontSizeSmaller,
                                       width:        "160px",
                                       alignIndents: indents,
                                       fontWeight:   fontWeightSmaller
                                      });
            label.style.marginRight = "10px";

            const sizeInput = document.createElement("input");
            sizeInput.classList.add(input);
            sizeInput.type = "text";
            sizeInput.id = sizeInputId;
            sizeInput.maxLength = "3";
            sizeInput.value = option.replace(postfix, "");
            sizeInput.style.width = "40px";
            sizeInput.style.textAlign = "right";
            sizeInput.style.padding = ".2em .3em";

            const postlabel = createLabel(postfix,
                                          sizeInputId,
                                          {fontSize : fontSizeSmaller, fontWeight : fontWeightSmaller});

            sizeInputContainer.append(label, sizeInput, postlabel);
            return sizeInputContainer;
        }


        // -------------------------------
        function createColourPickerGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const colourPicker = createColourPicker(labelText,
                                                    item.id,
                                                    deepGet(tempUserConfig, item.configKey),
                                                    item.indents);
            item.element = colourPicker;

            const previewUpdateFunctions = getPreviewUpdateFunctions(item, tabMenu);
            colourPicker.addEventListener("change", (event) => {
                deepSet(tempUserConfig, item.configKey, event.target.value);
                previewUpdateFunctions.forEach((foonction) => foonction(tabMenu));
            });

            return colourPicker;
        }

        // -------------------------------
        function createColourPicker(labelText, colourPickerId, option, indents = 1) {
            const colourPickerContainer = createContainer();

            const { sizes: { labels: { fontSizeSmaller, fontWeightSmaller } } } = modalConfig;

            const label = createLabel(labelText,
                                      colourPickerId,
                                      {fontSize : fontSizeSmaller, fontWeight : fontWeightSmaller});

            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color
            const colour = getCSSVariableValue(option) || "#000000";
            const colourPicker = document.createElement("input");
            colourPicker.type = "color";
            colourPicker.id = colourPickerId;
            colourPicker.value = colour;
            colourPicker.style.margin = "2px";
            colourPicker.style.marginLeft = (indents * 15) + "px";
            colourPicker.style.marginRight = "10px";
            colourPicker.style.borderRadius = "5px";
            colourPicker.style.height = "25px";
            colourPicker.style.width = "44px";

            colourPickerContainer.append(colourPicker, label);
            return colourPickerContainer;
        }


        // -------------------------------
        function createOptionHeaderGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const header = createOptionHeader(labelText,
                                              item.id,
                                              item.indents);
            item.element = header;
            return header;
        }

        // -------------------------------
        function createOptionHeader(labelText, headerId, indents = 0) {
            const { flex: { item } } = config.classes;
            const { classes: { label } } = modalConfig;

            const optionHeaderContainer = createContainer();

            const optionHeader = document.createElement("p");
            optionHeader.classList.add(item, label);
            optionHeader.id = headerId;
            optionHeader.textContent = labelText;
            optionHeader.style.marginLeft = (indents * 15) + "px";
            optionHeaderContainer.append(optionHeader);

            return optionHeaderContainer;
        }


        // -------------------------------
        function createStackToggleGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const toggle = createStackToggle(labelText,
                                             item.id,
                                             deepGet(tempUserConfig, item.configKey),
                                             item.indents);
            item.element = toggle;

            const previewUpdateFunctions = getPreviewUpdateFunctions(item, tabMenu);
            toggle.addEventListener("change", (event) => {
                deepSet(tempUserConfig, item.configKey, (event.target.checked ? "Yes" : "No"));
                toggleEnableDisable(tabMenu, labelText);
                previewUpdateFunctions.forEach((foonction) => foonction(tabMenu));
            });

            return toggle;
        }

        // -------------------------------
        function createStackToggle(labelText, toggleId, option, indents = 0) {
            const { flex: { item } } = config.classes;
            const { classes: { toggle: { sweetch, indicator } } } = modalConfig;

            // https://stackoverflow.design/product/components/labels/
            // https://stackoverflow.design/product/components/toggle-switch/
            // https://stackoverflow.design/product/components/checkbox/
            const toggleContainer = createContainer();
            toggleContainer.style.justifyContent = "space-between";

            const label = createLabel(labelText, toggleId, { indents });

            const toggle = document.createElement("div");
            toggle.classList.add(item, sweetch);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = toggleId;
            // https://chat.stackoverflow.com/transcript/message/52410313#52410313
            checkbox.checked = (option === "Yes");

            // const toggleButton = document.createElement("div");
            const toggleButton = document.createElement("span");
            toggleButton.classList.add(indicator);
            // toggleButton.id = toggleId + "-toggleButton";

            toggle.append(checkbox, toggleButton);
            toggleContainer.append(label, toggle);

            return toggleContainer;
        }


        // -------------------------------
        function createLabel(labelText, forElementId, options) {
            const { classes: { label : stackLabel} } = modalConfig;

            const label = document.createElement("label");
            label.classList.add(stackLabel);
            label.htmlFor = forElementId;
            label.textContent = labelText;

            const {fontSize, fontWeight, width, indents, alignIndents} = options;
            if (fontSize)      label.style.fontSize   = options.fontSize;
            if (fontWeight)    label.style.fontWeight = fontWeight;
            if (width)         label.style.width      = width;
            if (indents)       label.style.marginLeft = (indents * 15) + "px";
            if (alignIndents)  label.style.marginLeft = `${(alignIndents * 15) + 10 + 44}px`;
                                   // ^ from colourPicker: marginLeft + marginRight + width
            return label;
        }


        // ----------------------------------------------------------------------------------------
        // ---- Spaces ----------------------------------------------------------------------------

        // -------------------------------
        function addBottomSpace(element) {
            element.style.paddingBottom = "5px";
        }

        // -------------------------------
        function addTopSpaceSeparator(element) {
            const { colours: { seperator : seperatorColour } } = modalConfig;

            element.style.paddingTop = "20px";
            element.style.borderTop = `3px solid ${seperatorColour}`;
        }

        // -------------------------------
        function standardStyling(element, options = {}) {
            const { colours: { background } } = modalConfig;
            const { padding, paddingTop, paddingBottom, marginBottom } = options;

            element.style.backgroundColor = background;

            if (padding)       element.style.padding       = padding;
            if (paddingTop)    element.style.paddingTop    = paddingTop;
            if (paddingBottom) element.style.paddingBottom = paddingTop;
            if (marginBottom)  element.style.marginBottom  = marginBottom;
        }


        // ----------------------------------------------------------------------------------------
        // ---- Colour convertion -----------------------------------------------------------------

        function getCSSVariableValue(variable) {
            if (variable.startsWith("#"))
                return variable;

            const matchResult = variable.match(/^var\((--[\w-]*)\)/);
            if (matchResult) {
                // https://davidwalsh.name/css-variables-javascript
                const result = getComputedStyle(document.body).getPropertyValue(matchResult[1]);
                if (result.startsWith("hsl")) {
                    return hslToHex(result);
                }
                return result;
            }

            // https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes/1573154#1573154
            // by https://stackoverflow.com/users/190106/tim
            const dummy = document.createElement("div");
            dummy.style.color = variable;
            document.body.appendChild(dummy);
            const colour = window.getComputedStyle(dummy).color;  //Color in RGB
            dummy.remove();
            return rgbToHex(colour);

            // https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex/44134328#44134328
            // by https://stackoverflow.com/users/1376947/icl7126
            function hslToHex(hsl) {
                // const isHSL = hsl.match(/^hsl\(([\d\.]+),\s?([\d\.]+)%,\s?([\d\.]+)%\)$/i);
                const matchHSL = hsl.match(/^hsl\(([\d.]+),\s?([\d.]+)%,\s?([\d.]+)%\)$/i);
                if (!matchHSL)
                    return;
                const [h, s, l] = [matchHSL[1], matchHSL[2], matchHSL[3] /= 100];
                const a = s * Math.min(l, 1 - l) / 100;
                const f = (n) => {
                    const k = (n + h / 30) % 12;
                    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color).toString(16).padStart(2, "0");   // convert to Hex and prefix "0" if needed
                };
                return `#${f(0)}${f(8)}${f(4)}`;
            }

            // https://www.html-code-generator.com/javascript/color-converter-script
            function rgbToHex(rgb) {
                const matchRBG = rgb.match(/^rgba?\((\d+),\s?(\d+),\s?(\d+)\)$/i);
                if (!matchRBG)
                    return;
                const hex = "#" +
                   ("0" + parseInt(matchRBG[1], 10).toString(16)).slice(-2) +  // red
                   ("0" + parseInt(matchRBG[2], 10).toString(16)).slice(-2) +  // green
                   ("0" + parseInt(matchRBG[3], 10).toString(16)).slice(-2);   // blue
                return hex;
            }
        }


        // ----------------------------------------------------------------------------------------
        // ---- Disable / Enable of elemetents on Toggle choices ----------------------------------

        function initEnableDisable(tabName) {
            const entries = [];
            const tab = objectFromTabname(modalElements, tabName).items;
            tab.forEach(({ toggleEntry }) => {
                if (toggleEntry && !entries.includes(toggleEntry))
                    entries.push(toggleEntry);
            });

            entries.forEach((entry) => toggleEnableDisable(tabName, entry));
        }

        // -------------------------------
        function toggleEnableDisable(tabName, labelText) {

            const tab = objectFromTabname(modalElements, tabName).items;
            let item = objectFromName(tab, labelText);

            if (!item.toggleEntry) // toggle does not control other options.
                return;

            if (labelText !== item.toggleEntry) {  // this isn't the top controlling toggle.
               item = objectFromName(tab, item.toggleEntry);
            }

            recurseOnEntries(item, false, 0);

            function recurseOnEntries(entryItem, disable, level) {
                if (level > 5) return;  // safetySwitch :)

                if (level > 0) { // first level cannot be enabled/disabled
                    disableModalOption(entryItem, disable);
                }

                if (entryItem.dependents) {
                    const on = deepGet(tempUserConfig, entryItem.configKey);
                    const shouldDisable = disable || (on !== "Yes");
                    entryItem
                        .dependents
                        .forEach((newEntry) => recurseOnEntries(objectFromName(tab, newEntry), shouldDisable, level + 1));
                }
            }
        }

        // -------------------------------
        function disableModalOption(item, disable) {
            // const element = document.querySelector("#"+item.id);
            // ^ doesn't work as the elements aren't always added to the DOM

            const containerElement = item.element;
            if (!containerElement)
                return;

            const { classes: { select, toggle: { sweetch } },
                    colours: { active, muted, toggleMutedOn, toggleMutedoff }
                  } = modalConfig;

            if (disable) {
                [...containerElement.children]
                    .forEach((element) => {
                        if (item.type === "toggle"
                              && element.classList.contains(sweetch)) {
                            const checkbox = element.firstElementChild;
                            const toggle = element.lastElementChild;
                            checkbox.disabled = true;
                            if (checkbox.checked) {
                                toggle.style.background = toggleMutedOn;
                            } else {
                                toggle.style.background = toggleMutedoff;
                            }
                        } else {
                            element.disabled = true;
                            element.style.color = muted;
                            if (item.type === "select"
                                  && element.classList.contains(select))
                                element.firstElementChild.disabled = true;
                        }
                    });
            } else {
                [...containerElement.children]
                    .forEach((element) => {
                        if (item.type === "toggle"
                              && element.classList.contains(sweetch)) {
                            const checkbox = element.firstElementChild;
                            const toggle   = element.lastElementChild;
                            checkbox.disabled = false;
                            toggle.removeAttribute("style");
                        } else {
                            element.disabled = false;
                            element.style.color = active;
                            if (item.type === "select"
                                  && element.classList.contains(select))
                                element.firstElementChild.disabled = false;
                        }
                    });
            }
        }


        // ----------------------------------------------------------------------------------------
        // ---- Previews --------------------------------------------------------------------------

        function getElement(tabMenu, elementName) {
            const elementItem = objectFromTabnItemname(modalElements, tabMenu, elementName);
            const element = elementItem.element;
            return element;
        }


        // -------------------------------
        function createPreviewContainer() {
            const { colours: { border : borderColour } } = modalConfig;

            const previewContainer = document.createElement("div");
            previewContainer.style.width = "500px";  // Do not change this!
            previewContainer.style.margin = "5px";
            previewContainer.style.marginTop = "10px";
            previewContainer.style.marginBottom = "10px";
            previewContainer.style.padding = "5px";
            previewContainer.style.border = `3px solid ${borderColour}`;
            previewContainer.style.borderRadius = "5px";

            const previewMessage = document.createElement("p");
            previewMessage.style.borderBottom = `1px solid ${borderColour}`;
            previewMessage.style.marginBottom = "5px";
            previewMessage.textContent = "Preview:";

            previewContainer.append(previewMessage);
            return previewContainer;
        }

        /*function getWidth(element) {
            const { style } = element;
            // https://stackoverflow.com/questions/13435604/getting-an-elements-inner-height
            const elementWidth        = parseInt(style.width);
            const elementPaddingLeft  = parseInt(style.paddingLeft);
            const elementPaddingRight = parseInt(style.paddingRight);

            return elementWidth -
                       (elementPaddingLeft + elementPaddingRight) -
                       6; // magical pixels.. ?!?
        }*/


        // -------------------------------
        function createPreviewImage() {
            const imageContainer = document.createElement("img");
            // imageContainer.style.width = getWidth(previeMoveRadioBoxContainer) + "px";
            imageContainer.style.width = "100%";

            return imageContainer;
        }

        // -------------------------------
        function createPreviewImageContainer() {
            const preview = createPreviewContainer();
            const imageContainer = createPreviewImage();
            preview.append(imageContainer);

            return preview;
        }


        // -------------------------------
        function previewRadiosOrButtonsContainer() {
            const { flex: { container, item, justifyContentFlexEnd },
                    buttons: { button : base, primary, outlined },
                  } = config.classes;
            const { ids: { radioButtons : radioButtonsId, radioName, radioButtonLabel },
                    classes: { actions: { radio : radioAction, radioParent },
                               margins: { negative, zeroX },
                               center,
                               label : stackLabel,
                               radio : stackradio },
                  } = modalConfig;

            const previeRadiosVsButtonsContainer = createPreviewContainer();

            const submitButton = createModalButton("Submit", [base, primary]);
            const skipButton   = createModalButton("Skip",   [base, outlined]);
            // pe-none => pointer-events: none; to ensure click events won't be fired
            // https://stackoverflow.design/product/base/interactivity/#pointer-events
            submitButton.classList.add("pe-none");
            skipButton.classList.add("pe-none");
            skipButton.style.marginLeft = "4px";
            skipButton.style.minWidth = "70px";

            const buttons = document.createElement("div");
            buttons.classList.add(container, center);
            buttons.style.marginLeft = "10px";
            buttons.append(submitButton, skipButton);

            const radios =
                  ["Approve", "Improve edit", "Reject and edit", "Reject"]
                    // make sure the ids are actually unique using the button name to lower case and without spaces
                    .map((label) => makeRadio(label, `${radioButtonLabel}-${label.toLowerCase().replaceAll(" ", "")}`));

            const fieldset = document.createElement("fieldset");
            fieldset.classList.add(container, negative, zeroX, justifyContentFlexEnd); // align grid to the right, as in review
            fieldset.style.textAlign = "center";
            fieldset.append(...radios, buttons);

            standardStyling(fieldset, { padding: "10px" });
            fieldset.style.zoom = "91%";

            const fieldsetContainer = document.createElement("div");
            fieldsetContainer.append(fieldset);

            const buttonsContainer = createButtonContainer();

            buttonsContainer.classList.add(justifyContentFlexEnd, "p8");
            // generate the review buttons
            // the createButton() requires the original radio as well as the submit button to be present
            // however, no events should be triggered when the user clicks the preview buttons
            // hence the dummy* elements
            const dummyInput = document.createElement("input"), dummyButton = document.createElement("button");
            const reviewActions = ["Approve", "Improve edit", "Reject and edit", "Reject", "Skip"];
            const previewButtons = reviewActions.map((action) => createButton(action, [dummyInput, dummyButton]));
            // pe-none => pointer-events: none; to ensure click events won't be fired
            // https://stackoverflow.design/product/base/interactivity/#pointer-events
            previewButtons.forEach((element) => element.classList.add("pe-none"));
            buttonsContainer.append(...previewButtons);

            const lastElement = document.createElement("div");
            lastElement.append(fieldsetContainer, buttonsContainer);
            previeRadiosVsButtonsContainer.append(lastElement);

            // Do not initialize this yet since two preview elements needs to be set

            return previeRadiosVsButtonsContainer;

            function makeRadio(labelText, radioId) {
                const label = document.createElement("label");
                label.classList.add(item, stackLabel);
                label.htmlFor = radioId;
                label.textContent = labelText;
                const labelContainer = document.createElement("div");
                labelContainer.classList.add(item);
                labelContainer.append(label);

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.classList.add(stackradio, radioAction);
                radio.id = radioId;
                radio.name = radioName;  // needed to make them exclusive
                const radioContainer = document.createElement("div");
                radioContainer.classList.add(item);
                radioContainer.append(radio);

                const labelAndRadio = document.createElement("div");
                labelAndRadio.classList.add(negative, zeroX, radioParent);
                labelAndRadio.append(labelContainer, radioContainer);

                const styleContainer = document.createElement("div");
                styleContainer.style.padding = "4px";
                if (labelText !== "Approve") {
                    styleContainer.id = radioButtonsId;
                }
                styleContainer.append(labelAndRadio);
                return styleContainer;
            }
        }

        // -------------------------------
        function previewRadiosOrButtonsOnf(tabMenu, actionsElementName, moveElementName) {
            const actionsElement = getElement(tabMenu, actionsElementName);
            const moveElement    = getElement(tabMenu, moveElementName);

            const actionsContent = actionsElement.lastElementChild; // from the preview element
            const { firstElementChild : actionsRadios,
                    lastElementChild  : actionsButtons
                  } = actionsContent;

            const moveImage = moveElement.lastElementChild; // from the preview element

            const { radioVsButtons } = tempUserConfig.options;
            const moveRadioBox     = radioVsButtons.moveRadioBox === "Yes";
            const keepRadios       = radioVsButtons.keepRadios === "Yes";
            const radioWithBorders = radioVsButtons.radioWithBorders === "Yes";

            const { desktopHide } = config.classes;

            // previewRadiosOrButtons:          light   /   dark
            //  moveRadioBox,  keepRadios  ->          -             radios + previewRadiosOrButtonsUpdate(element)
            //  moveRadioBox, !keepRadios  -> YxDs0.png / FcrHn.png  image of buttons
            // !moveRadioBox               ->      WgO6m.png         image of nothing

            // previewMoveRadioBox:                               light    /   dark
            //  moveRadioBox,  keepRadios,  radioWithBorders  -> rtDv9.png / D3Qv1.png
            //  moveRadioBox,  keepRadios, !radioWithBorders  -> VdbX8.png / to4Rl.png
            //  moveRadioBox, !keepRadios                     -> XPIdk.png / Bf5Lm.png
            // !moveRadioBox                                  -> Sr586.png / 9Y7O9.png

            if (moveRadioBox && keepRadios) {

                actionsRadios.classList.remove(desktopHide);
                actionsButtons.classList.add(desktopHide);
                previewRadiosOrButtonsUpdate(tabMenu, actionsElementName);

                if (isLIGHT) {
                    moveImage.src = radioWithBorders
                        ? `${imgHOST}rtDv9.png`   // Radios with bars
                        : `${imgHOST}VdbX8.png`;  // Radios NO bars
                } else {
                    moveImage.src = radioWithBorders
                        ? `${imgHOST}D3Qv1.png`   // Radios with bars
                        : `${imgHOST}to4Rl.png`;  // Radios NO bars
                }

            } else {

                actionsRadios.classList.add(desktopHide);
                actionsButtons.classList.remove(desktopHide);

                if (moveRadioBox) {
                    moveImage.src = isLIGHT
                        ? `${imgHOST}XPIdk.png`
                        : `${imgHOST}Bf5Lm.png`;
                } else {
                    // actionsImage.src = `${imgHOST}WgO6m.png`; // <-- completely tranparent image
                    moveImage.src = isLIGHT
                        ? `${imgHOST}Sr586.png`
                        : `${imgHOST}9Y7O9.png`;
                }
            }
        }

        // -------------------------------
        function previewRadiosOrButtonsUpdate(tabMenu, elementName) {
            const element = getElement(tabMenu, elementName);

            const { ids: { radioButtons : radioButtonsId }
                  } = modalConfig;

            const { colour: { radioSeperator : radioSeperatorColour },
                    size: { radioSeperator : radioSeperatorSize },
                  } = tempUserConfig;

            const radioWithBorders = tempUserConfig.options.radioVsButtons.radioWithBorders === "Yes";

            const radios = element.querySelectorAll(`#${radioButtonsId}`);

            radios.forEach((radio) => {
                if (radioWithBorders) {
                    radio.style.borderLeft  = `${radioSeperatorColour} solid ${radioSeperatorSize}px`;
                } else {
                    radio.style.borderLeft  = "none";
                }
            });
        }


        // -------------------------------
        function previewUserCardsContainer() {
            const previewUserCards = createPreviewContainer();

            const imageContainer = createPreviewImage();
            previewUserCards.append(imageContainer);

            // Do not initialize this yet since two preview elements needs to be set

            return previewUserCards;
        }

        // -------------------------------
        function previewEditorStatisticsContainer() {
            const { container } = config.classes.flex;

            const previewEditorStatistics = createPreviewContainer();
            const previewEditorStatisticsGrid = document.createElement("div");
            previewEditorStatisticsGrid.classList.add(container);
            previewEditorStatistics.append(previewEditorStatisticsGrid);

            // Do not initialize this yet since two preview elements needs to be set

            return previewEditorStatistics;
        }

        // -------------------------------
        function previewUserCardsStatisticsOnf(tabMenu, userCardsElementName, editorElementName) {
            const userCardsElement = getElement(tabMenu, userCardsElementName);
            const editorElement    = getElement(tabMenu, editorElementName);

            // https://chat.stackoverflow.com/transcript/message/52332615#52332615
            const userCardImage = userCardsElement.lastElementChild; // from the preview element
            const editorGrid  = editorElement.lastElementChild;      // from the preview element

            const { userCards : configUserCards } = tempUserConfig.options;
            const userCards        = configUserCards.getUserCards === "Yes";
            const editorStatistics = configUserCards.withEditiorStats === "Yes";

            const lightMap = [
                ["0N0gd.png", userCards && editorStatistics],
                ["eGv5x.png", userCards],
                ["yrz32.png", true],
            ], darkMap = [
                ["tbGE3.png", userCards && editorStatistics],
                ["ldstt.png", userCards],
                ["7Gw2y.png", true],
            ];

            const screenShotMap = isLIGHT ? lightMap : darkMap;
            const userCardScreenShot = screenShotMap.find(([_, condition]) => condition)[0];
            userCardImage.src = `${imgHOST}${userCardScreenShot}`;

            // "live" preview for the editor's user card
            // { isOwner, actionText, actionISO, profileUrl, profileImage, username, reputation, badges }
            const isMinimal = !userCards;
            const exampleUserCardConfig = {
                isOwner: false,
                actionText: `${isMinimal ? "P" : "p"}roposed 8 hours ago`, // proposed is capitalised by default
                actionISO: new Date().toISOString().replace("T", " "),
                profileUrl: "#",
                profileImage: "https://i.stack.imgur.com/UDm50.png", // https://chat.stackoverflow.com/transcript/message/52496898
                username: "Sbelz gr8",
                // no badges or reputation for minimal user cards
                reputation: isMinimal ? null : 64,
                badges: isMinimal ? {} : { silver: 1, bronze: 5 }, // no badges for minimal user cards
                isMinimal
            };
            const stacksUserCard = createUserCard(exampleUserCardConfig);
            const currentUserCard = editorGrid.querySelector(config.selectors.userCards.default);
            // the .s-user-card__minimal class cancels the padding: 8px style of
            if (isMinimal) stacksUserCard.classList.add("p8");
            currentUserCard ? currentUserCard.replaceWith(stacksUserCard) : editorGrid.prepend(stacksUserCard);

            if (userCards && editorStatistics) {
                // Do not add another statistics element! Important on restore
                if (editorGrid.children.length > 1) {
                    previewEditorStatisticsUpdate(null, null, editorElement);
                    return;
                }

                const sampleApiResponse = [{ approval_date: 1 }, { rejection_date: 1 }, {}, {}, {}]; // the {} are pending edits
                const { colour, size: { editorStatistics : fontSize } } = tempUserConfig;

                // editorGrid.append(createEditorStatisticsItem(sample, colour, fontSize));
                const editorStatsTable = createEditorStatisticsItem(sampleApiResponse, colour, fontSize);
                editorGrid.append(editorStatsTable);
            } else {
                if (editorGrid.children.length > 1)
                    editorGrid.lastElementChild.remove();
            }
        }

        // -------------------------------
        function previewEditorStatisticsUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const grid = element.lastElementChild;
            const statisticsTable = grid.querySelector("table");
            if (!statisticsTable)
                return;
            const rows = statisticsTable.children;

            const { size: { editorStatistics : editorStatisticsSize },
                    colour : colours
                  } = tempUserConfig;

            statisticsTable.style.fontSize = editorStatisticsSize;
            rows[0].style.color = colours.editorHeader;
            rows[1].style.color = colours.editorApproved;
            rows[2].style.color = colours.editorRejected;
            rows[3].style.color = colours.editorTotal;
        }


        // -------------------------------
        function previewPageTitleLinkContainer() {
            const previewPageTitleLink = createPreviewImageContainer();
            previewPageTitleLinkOnf(null, null, previewPageTitleLink);
            return previewPageTitleLink;
        }

        // -------------------------------
        function previewPageTitleLinkOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {

            // https://chat.stackoverflow.com/transcript/message/52332481#52332481
            const image = element.lastElementChild;

            const movePageTitle = tempUserConfig.options.movePageTitleLink === "Yes";

            if (isLIGHT) {
                image.src = movePageTitle
                    ? `${imgHOST}9JnTg.png`
                    : `${imgHOST}26MhB.png`;
            } else {
                image.src = movePageTitle
                    ? `${imgHOST}19rOX.png`
                    : `${imgHOST}QS05y.png`;
            }
        }


        // -------------------------------
        function previewDiffChoicesContainer() {
            const previewDiffChoices = createPreviewImageContainer();
            previewDiffChoicesOnf(null, null, previewDiffChoices);
            return previewDiffChoices;
        }

        // -------------------------------
        function previewDiffChoicesOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            // https://chat.stackoverflow.com/transcript/message/52332481#52332481
            const image = element.lastElementChild;

            const moveDiffChoices = tempUserConfig.options.moveDiffChoices === "Yes";

            if (isLIGHT) {
                image.src = moveDiffChoices
                    ? `${imgHOST}xJT8x.png`
                    : `${imgHOST}kTaNQ.png`;
            } else {
                image.src = moveDiffChoices
                    ? `${imgHOST}mPovF.png`
                    : `${imgHOST}N9JyH.png`;
            }
        }


        // -------------------------------
        function previewProgressBarContainer() {
            const { container: flexContainer } = config.classes.flex;
            const { classes: { naviagations: { base : navigationBase, item : nativationItem, selected },
                               padding: { Y : paddingY },
                               title: { base : title } }
                  } = modalConfig;

            const previewProgressBar = createPreviewContainer();

            const reviewTask = document.createElement("a");
            reviewTask.classList.add(nativationItem, selected);
            reviewTask.textContent = "Review tasks";

            const stats = document.createElement("a");
            stats.classList.add(nativationItem);
            stats.textContent = "Stats";

            const history = document.createElement("a");
            history.classList.add(nativationItem);
            history.textContent = "History";

            const linkContainer = document.createElement("div");
            linkContainer.classList.add(navigationBase);
            linkContainer.style.margin = "0px";
            linkContainer.append(reviewTask, stats, history);

            const titleContainer = document.createElement("div");
            titleContainer.classList.add(title);
            titleContainer.style.flexDirection = "column";
            titleContainer.style.alignItems = "flex-end";
            titleContainer.append(linkContainer);

            const container = document.createElement("div");
            standardStyling(container,
                            {
                             padding: "3px", paddingTop: "12px", paddingBottom: "10px",
                             marginBottom: "0px"
                            });
            container.classList.add(flexContainer);
            container.style.flexDirection = "column"; // flex-direction: column
            container.style.alignItems = "flex-end";  // align-items: flex-end

            const stackProgress = stackProgressBar();
            stackProgress.classList.add(paddingY);      // for the padding

            container.append(titleContainer, stackProgress);
            previewProgressBar.append(container);

            previewProgressBarOnfUpdate(null,null,previewProgressBar);

            return previewProgressBar;
        }

        // -------------------------------
        function stackProgressBar() {
            const { container: flexContainer, item: flexItem } = config.classes.flex;

            const container = document.createElement("div");
            container.classList.add(flexItem);
            const content = `
                    <div class="${flexContainer} ai-center sm:fd-column">
                        <div class="${flexItem} mr12 ws-nowrap">
                            <span>Your daily reviews</span>
                            <span class="js-reviews-done mrn2">20</span>
                            <span class="js-reviews-per-day" data-reviews-per-day="40">/40</span>
                        </div>
                        <div class="${flexItem}">
                            <div class="s-progress wmn1 h8 bar-pill">
                                <div class="s-progress--bar bar-pill js-review-progress"
                                     role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                                     style="width: 50%;"></div>
                            </div>
                        </div>
                    </div>
                `;
            container.innerHTML = content;
            return container;
        }

        // -------------------------------
        function previewProgressBarOnfUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const taskLink = element.querySelector("." + modalConfig.classes.naviagations.selected);
            const moveProgressBar = tempUserConfig.options.moveProgressBar === "Yes";

            if (moveProgressBar) {
                const colour = tempUserConfig.colour;
                const { daily : dailyReviews, done : doneReviews } = config.selectors.reviews;

                const dailyElem = element.querySelector(dailyReviews);
                const reviewedElem = element.querySelector(doneReviews);

                moveProgressToElement(taskLink, colour, dailyElem, reviewedElem, false);

            } else {
                taskLink.removeAttribute("style");
                taskLink.textContent = "Review tasks";
                // wrapper.id = PREFIX + "-Progressbar"; // config.ids.custom.progressBar;
                const stackProgess = element.querySelector("#" + config.ids.custom.progressBar);
                if (stackProgess) stackProgess.style.visibility = "visible";
            }
        }


        // -------------------------------
        function previewMovePostTypeContainer() {
            const previewMovePostType = createPreviewImageContainer();
            previewMovePostTypeOnf(null, null, previewMovePostType);
            return previewMovePostType;
        }

        // -------------------------------
        function previewMovePostTypeOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            // https://chat.stackoverflow.com/transcript/message/52332481#52332481
            const image = element.lastElementChild;

            const movePostType = tempUserConfig.options.AnswerQuestionOnTop === "Yes";

            if (isLIGHT) {
                image.src = movePostType
                    ? `${imgHOST}yJZuA.png`
                    : `${imgHOST}AdHvl.png`;
            } else {
                image.src = movePostType
                    ? `${imgHOST}JyPv5.png`
                    : `${imgHOST}1mtpe.png`;
            }
        }

        // -------------------------------
        function previewMovePostTypeColourContainer() {
            const { classes: { title: { header : titleHeader } },
                    colours: { border : borderColour }
                  } = modalConfig;

            const previewMovePostTypeColour = createPreviewContainer();

            const header = document.createElement("h1");
            header.classList.add(titleHeader);
            header.textContent = "Question";
            header.style.borderBottom = `1px solid ${borderColour}`;
            header.style.margin = "0px";
            header.style.paddingBottom = "5px";

            const headerContainer = document.createElement("div");
            headerContainer.style.textAlign = "center";
            headerContainer.append(header);
            standardStyling(headerContainer, {padding: "3px", paddingTop: "12px", marginBottom: "0px"});

            previewMovePostTypeColour.append(headerContainer);
            previewMovePostTypeColourUpdate(null, null, previewMovePostTypeColour);

            return previewMovePostTypeColour;
        }

        // -------------------------------
        function previewMovePostTypeColourUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const header = element.lastElementChild.firstElementChild;

            const movePostType = tempUserConfig.options.AnswerQuestionOnTop === "Yes";

            if (movePostType) {
                header.textContent = "Question";
                header.style.color = tempUserConfig.colour.postType;
            } else {
                header.textContent = EMPTY;
            }
        }


        // -------------------------------
        function previewLineThoughContainer() {
            const { ids: { lineThrough : lineThroughId },
                    classes: { reviewText: { post, prose, diff } }
                  } = modalConfig;

            const previewLineThough = createPreviewContainer();

            const paragraph = document.createElement("p");
            paragraph.classList.add(prose, post);
            paragraph.style.marginBottom = "0px";
            paragraph.append(document.createTextNode("You will always need to foo the bar"));
            paragraph.append(addDiffDelete(" :)"));
            paragraph.append(document.createTextNode(" If not you risk a baz occuring."));
            paragraph.append(addDiffDelete(" Thank you so much for reading and upvoting my post!"));
            standardStyling(paragraph, { padding: "3px", marginBottom: "0px" });
            previewLineThough.append(paragraph);

            previewLineThoughOnf(null, null, previewLineThough);

            return previewLineThough;

            function addDiffDelete(text) {
                const diffDelete = document.createElement("span");
                diffDelete.classList.add(diff); // ${config.lineThrough}
                diffDelete.id = lineThroughId;
                diffDelete.textContent = text;
                return diffDelete;
            }
        }

        // -------------------------------
        function previewLineThoughOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const { ids: { lineThrough : lineThroughId } } = modalConfig;

            const on = tempUserConfig.options.removeLineThrough === "Yes";

            if (on) {
                [...element.querySelectorAll("#" + lineThroughId)]
                    .forEach((elementChild) => elementChild.style.textDecoration = "initial");
            } else {
                [...element.querySelectorAll("#" + lineThroughId)]
                    .forEach((elementChild) => elementChild.style.textDecoration = "line-through");
            }
        }


        // -------------------------------
        function previewMessageContainer() {
            const { flex: { container, item },
                    buttons: { button, primary }
                  } = config.classes;
            const { classes: { notice: { base : noticeBase, info : noticeInfo },
                               padding: { top : paddingTop },
                               margins: { negative : negativeMargin },
                             },
                    colours: { noticeBorder, noticeBackground }
                  } = modalConfig;

            const previewMessage = createPreviewContainer();

            const standardMessageNotice = document.createElement("div");

            const dummyElement = document.createElement("div");  // needed since highlightMessageHelper wants an element.
            dummyElement.classList.add(container, negativeMargin, paddingTop);
            const dummyButton = createModalButton("Next task", [button, primary, item]);
            dummyButton.disabled = true;
            dummyElement.append(dummyButton);

            standardMessageNotice.classList.add(noticeBase, noticeInfo);
            standardMessageNotice.style.borderColor = noticeBorder;
            standardMessageNotice.style.backgroundColor = noticeBackground;
            standardMessageNotice.append(document.createTextNode("You are not able to review this item."),
                                         dummyElement);
            previewMessage.append(standardMessageNotice);

            previewMessageOnf(null, null, previewMessage);
            return previewMessage;
        }

        // -------------------------------
        function previewMessageOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const info = element.lastElementChild;

            const on = tempUserConfig.options.prominentReviewMessage === "Yes";

            if (on) {
                const { colour: { message : colour, messageBackground : backGroundColour },
                        size: {message : size }
                      } = tempUserConfig;

                highlightMessageHelper(info, colour, backGroundColour, size);
            } else {
                if (info.firstChild.nodeValue === "") {
                    info.firstElementChild.remove();
                    info.firstChild.nodeValue = "You are not able to review this item.";
                }
            }
        }

        // -------------------------------
        function previewMessageUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            if (tempUserConfig.options.prominentReviewMessage !== "Yes")
                return;

            const info = element.lastElementChild;
            const textElement = info.firstElementChild;

            const { colour: { message : colour, messageBackground : backGroundColour },
                    size: { message : size }
                  } = tempUserConfig;

            textElement.style.color = colour;
            textElement.style.backgroundColor = backGroundColour;
            textElement.style.fontSize = size;
        }


        // -------------------------------
        function previewSummaryContainer() {
            const { classes: { margins: { top : marginTop } } } = modalConfig;
            const { classes: { summary : summaryRed } } = config;

            const previewSummary = createPreviewContainer();

            const comment  = document.createElement("p");
            comment.classList.add(summaryRed, marginTop);
            comment.textContent = "Comment: Fixed something.";

            previewSummary.append(comment);
            previewSummaryOnf(null, null, previewSummary);

            return previewSummary;
        }

        // -------------------------------
        function previewSummaryOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const editSummary = element.lastElementChild;
            const { classes: { summary : summaryRed } } = config;

            const on = tempUserConfig.options.highlightSummary === "Yes";

            if (on) {
                const { colour: { summary : colour },
                        size: { summary : size }
                      } = tempUserConfig;

                highlightSummaryHelper(editSummary, colour, size, summaryRed);
            } else {
                const textContent = editSummary.textContent;
                editSummary.textContent = (textContent || "").trim().replace(/^Summary/, "Comment");
                editSummary.removeAttribute("style");
                editSummary.classList.add(summaryRed);
            }

            standardStyling(editSummary, { padding: "3px", marginBottom: "0px" });
        }

        // -------------------------------
        function previewSummaryUpdate(tabMenu, elementName) {
            const element = getElement(tabMenu, elementName);

            if (tempUserConfig.options.highlightSummary !== "Yes")
                return;

            const editSummary = element.lastElementChild;

            const { colour: { summary : colour },
                    size: { summary : size }
                  } = tempUserConfig;

            editSummary.style.fontSize = size;
            editSummary.style.color = colour;
        }
    }

    // ---- End of the GUI with the icon on the top right -----------------------------------------
    // --------------------------------------------------------------------------------------------

})();
