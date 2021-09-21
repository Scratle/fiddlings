// ==UserScript==
// @name         Stack Review Suggested Edits Rework
// @description  Make reviewing nice again!
// @namespace    scratte-fiddlings
// @version      1.1.10
//
// @author       Scratte (https://stackoverflow.com/users/12695027)
// @contributor  Oleg Valter (https://stackoverflow.com/users/11407695)
// @contributor  double-beep (https://stackoverflow.com/users/10607772)
//
// @include      /^https://stackoverflow.com/review/suggested-edits.*/
// @exclude      /^https://stackoverflow.com/review/suggested-edits/(stats|history)/
// @include      /^https://superuser.com/review/suggested-edits.*/
// @exclude      /^https://superuser.com/review/suggested-edits/(stats|history)/
// @include      /^https://serverfault.com/review/suggested-edits.*/
// @exclude      /^https://serverfault.com/review/suggested-edits/(stats|history)/
// @include      /^https://stackapps.com/review/suggested-edits.*/
// @exclude      /^https://stackapps.com/review/suggested-edits/(stats|history)/
//
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function() {
    'use strict';

    // --------------------------------------------------------------------------------------------
    // ---- User Options --------------------------------------------------------------------------

    // NOTE! Do not change the structure of this!
    //       Make sure that the values are valid.

    const defaultUserConfig = {
            colour: {
                postType: "#d1383d",                         // Previously "var(--red)". Maybe now "var(--red-500)"
                summary: "#f48024",                          // Previously "var(--orange)". Maybe now "var(--orange-400)"
                radioSeperator: "var(--blue-200)",
                progressDone: "#f48024",                     // orange-y. Previously var(--theme-primary-color). Maybe now "var(--theme-primary-400)"
                progressNotDone: "var(--black-075)",         // "#e4e6e8" gray-ish
                progressTextColour: "var(--black-600)",
                editorHeader: "hotpink",                     // "#FF69B4" You may want to change this ;)
                editorApproved: "var(--green-600)",
                editorRejected: "var(--red-600)",
                editorTotal: "var(--powder-700)",            // blue-ish
                message: "var(--yellow-700)",
                messageBackground: "var(--powder-200)",      // use --powder-100 to "get rid of it"
                diffChoices: "orchid",                       // #DA70D6
            },
            size: {
                editorStatistics: "96%",
                summary: "150%",
                radioSeperator: "2",
                message: "150%",
                apiQuotaLimit: "500",
            },
            // All these are "Yes"/"No" options, and anything other than "Yes" is a "No"
            options: {
                radioVsButtons: {
                    moveRadioBox: "Yes",
                    tooltips: "No",               // Only valid when moveRadioBox is "Yes"
                    keepRadios: "No",             // ^ Same
                    radioWithBorders: "Yes",      // Only for radio buttons! No effect when turnRadioIntoButtons is "Yes"
                    largerClickArea: "Yes",       // ^ Same
                },
                moveProgressBar: "Yes",
                movePageTitleLink: "Yes",
                AnswerQuestionOnTop: "Yes",
                highlightSummary: "No",
                prominentReviewMessage: "Yes",
                keepDiffChoices: "Yes",
                moveDiffChoices: "No",
                moveNextButtons: "No",
                userCards: {
                    useStackUserCards: "No",
                    newContributor: "Yes",        // Only applies when useStackUserCards is "Yes"
                    getUserCards: "Yes",
                    withEditiorStats: "No",       // Note: This uses the Stack API and has a daily quota (of max 10,000 :-)
                },
                postSummary: {
                    useStackSummary: "No",
                    useAPI: "No",                 // Only apllies when useStackSummary is "Yes"
                },
                wantNewModeratorFlair: "No",      // Applies to StackUserCards & StackSummary
                reviewFilters: {
                    removeTextFilters: "Yes",
                    putAlertIcon: "Yes",          // Only apllies when useStackSummary is "Yes"
                    keepFilterList: "No",         // ^ Same
                },
                removeLineThrough: "Yes",
                linksOnTitles: "No",
            },
    };


    // ---- End of User Options -------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------

    const USERSCRIPTNAME = "Stack Review Suggested Edits Rework";
    const PREFIX = USERSCRIPTNAME.replaceAll(" ","");
    const GMsExists = !!window.GM_getValue && !!window.GM_setValue && !!window.GM_deleteValue;

    /* OPTION 1:
       Required for the GUI to work.
       Makes use of the userscript manager's storage
       ..or localStorage in case there's no userscript manager or GM_..Values are unavailable
       Manual changes to defaultUserConfig will only apply using the GUI (Restore button). */
    const userConfig = getUserConfig();           // <-- OPTION 1

    /* OPTION 2:
       If you don't want the GUI.
       NOTE: If using this, the GUI will have NO effect on the applied settings.
       Avoids both the userscript manager's storage and localStorage.
       Manual changes to defaultUserConfig will apply directly to the script.
       Note that clicking on the GUI icon will make use of the storage!
       ..to avoid the icon being loaded, comment out the call to userInterfaceSettings(). */
    // const userConfig = defaultUserConfig;         // <-- OPTION 2


    // --------------------------------------------------------------------------------------------
    // ---- Storage  ------------- Needed with GUI ------------------------------------------------

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

    // NOTE: these are from ViolentMonkey's docs, but TamperMonkey works in a similar way
    // https://violentmonkey.github.io/api/gm/#gm_getvalue
    // https://violentmonkey.github.io/api/gm/#gm_setvalue
    // https://violentmonkey.github.io/api/gm/#gm_deletevalue

    function getUserConfig() {
        let userConfig = getFromStorage();
        if (!userConfig) {
            updateStorage(defaultUserConfig);
            userConfig = getFromStorage();
        }

        return userConfig;
    }

    function getFromStorage() {
        return GMsExists
                   ? window.GM_getValue(PREFIX)
                   : JSON.parse(localStorage.getItem(PREFIX));
    }

    function removeFromStorage() {
        GMsExists
            ? window.GM_deleteValue(PREFIX)
            : localStorage.removeItem(PREFIX);
    }

    function updateStorage(userConfig) {
        // GM_setValue accepts an object as the second parameter, so we don't need to stringify it
        GMsExists
            ? window.GM_setValue(PREFIX, userConfig)
            : localStorage.setItem(PREFIX, JSON.stringify(userConfig));
    }


    // --------------------------------------------------------------------------------------------
    // ---- Everything ajax -----------------------------------------------------------------------

    let reviewResponse = { }; // Holds the ajax response about the review

    // https://chat.stackoverflow.com/transcript/message/52227058#52227058
    // suggestion from https://chat.stackoverflow.com/users/10607772/double-beep
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test
    const reviewRegex = /^\/review\/(next-task|task-reviewed)/;

    $(document)
        .ajaxComplete((event, request, settings) => {
                          // Just that first response with the review information
                          if (reviewRegex.test(settings.url)) {
                              if (request.responseJSON) {
                                  reviewResponse = request.responseJSON;
                              } else {
                                  try {
                                       reviewResponse = JSON.parse(request.responseText);
                                  } catch (e) {
                                      // console.error(USERSCRIPTNAME + " - error parsing JSON", request.responseText);
                                      reviewResponse.error = config.error;
                                  }
                              }
                          }
         });

    // ---------------------------
    // Lots of elements are not ready when the page is loaded. These .ajax method
    // ensures that a foonction is not fired until the page got a response

    function ajaxCompleteWrapper(foonction) {
        $(document)
            .ajaxComplete((event, request, { url }) => {
                              if (reviewRegex.test(url)) {
                                  if (reviewResponse.error) {
                                      console.error(USERSCRIPTNAME + " - " + reviewResponse.error);
                                      return;
                                  }
                                  foonction();
                              }
             });
    }


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

    const objectFromTabnItemname = (obj, menuName, itemName) =>
        obj.find(({ tabMenu }) => tabMenu === menuName)
           ?.items  // .items
           .find(({ name }) => name === itemName);

    // https://chat.stackoverflow.com/transcript/message/52355606#52355606
    // https://chat.stackoverflow.com/transcript/message/52524265#52524265
    const deepGet = (obj, path) => {
        let temp = obj;
        path.split(".").forEach(key => temp &&= temp[key]);
        return temp;
    };

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
    // https://chat.stackoverflow.com/transcript/message/52524354#52524354
    const deepSet = (obj, path, value) => {
        let temp = obj;
        const keys = path.split(".");
        keys.slice(0, -1).forEach(key => temp = temp[key] ||= {}); // ||= {} allows for new nested
        temp[keys.slice(-1)] = value;
    };


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
        const { selectors: { content: { revision : reviewRevision, tabs } } } = config;

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

        if (deepGet(userConfig, "options.highlightSummary") !== "Yes")
            return;

        const { size: { summary : summarySize },
                colour: { summary : summaryColour }
              } = userConfig;

        const { classes: { summary : summaryClass } } = config;

        const editSummary = document.querySelector(`.${summaryClass}`);
        if (!editSummary)
            return;

        highlightSummaryDoIt(editSummary, summaryColour, summarySize, summaryClass);
    }

    function highlightSummaryDoIt(editSummary, summaryColour, summarySize, summaryClass) {
        const { classList, style, textContent } = editSummary;
        editSummary.textContent = (textContent || "").trim().replace(/^Comment/, "Summary");
        style.fontSize = summarySize;
        style.color = summaryColour;
        classList.remove(summaryClass);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveDiffChoices() { // must wait for ajax
        if (deepGet(userConfig, "options.moveDiffChoices") !== "Yes")
            return;

        const { ids: { custom: { diffChoices, keepDiffChoices : keepDiffChoicesId } },
                classes: { filterDiff, buttons: { small, xsmall } },
                selectors: { fullReview }
              } = config;

        removeElement(`#${diffChoices}`);

        const theReview = document.getElementById(fullReview);
        if (!theReview)
            return;

        const choices = theReview.querySelector("." + filterDiff); // ".js-diff-choices"
        if (!choices)
            return;

        moveToFilterLine(choices, true);
        choices.id = diffChoices;
        [...choices.children].forEach((button) => {
            button.classList.remove(xsmall);
            // see https://github.com/Scratle/fiddlings/pull/2#pullrequestreview-698140714, s-btn is just too large
            button.classList.add(small);
        });

        const keepDiff = document.getElementById(keepDiffChoicesId); // there may be an empty container now.
        if (keepDiff)
            keepDiff.remove();
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function keepDiffChoices() { // must wait for ajax
        if (deepGet(userConfig, "options.keepDiffChoices") !== "Yes")
            return;

        const { ids: { custom: { keepDiffChoices : keepDiffChoicesId } },
                classes: { filterDiff },
                selectors: { fullReview, content: { revision } }
              } = config;

        const theReview = document.getElementById(fullReview); // "content"
        if (!theReview)
            return;                                    // ".js-diff-choices:not([id])"
        const presentfilterDiff = theReview.querySelector(`.${filterDiff}:not([id])`);
        if (presentfilterDiff)
            return;

        const revisionElement = document.querySelector(revision); // "#panel-revision"
        if (!revisionElement)
            return;

        revisionElement.insertBefore(createDiffChoices(keepDiffChoicesId), revisionElement.firstChild);
    }

    function createDiffChoices(elementId, modal = false) { // must wait for ajax
        const { classes: { buttons: { button : base, muted, outlined, xsmall, selected, group },
                           filterDiff,
                           navigation,
                           spaces: { marginBottom16 } },
                selectors: { content: { reviewPost, diffs } }
              } = config;

                                                // ".postcell > .diffs > [id]"
        const panels = document.querySelectorAll(`${reviewPost} > ${diffs} > [id]`);
        const buttons = [...panels].map(panel => createButton(getNiceName(panel.dataset.type),
                                                              panel.getAttribute("aria-labelledby"),
                                                              panel.id));

        const buttonGroup = document.createElement("div");
        if (!modal) buttonGroup.classList.add(filterDiff); // keep the GUI element from being found
        buttonGroup.classList.add(group);
        buttonGroup.dataset.controller = navigation;
        buttonGroup.append(...buttons);
        buttonGroup.setAttribute("role","tablist");

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add(marginBottom16); // "mb16"
        buttonContainer.id = elementId;
        buttonContainer.append(buttonGroup);

        return buttonContainer;

        function getNiceName(text) {
            const title = text.replace("Html","")
                              .replace("SideBySide","Side-by-side")
                              .replace("Markdown"," Markdown");
            return title;
        }

        function createButton(content, id, control) {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add(base, muted, outlined, xsmall);
            if (content === "Inline")
                button.classList.add(selected);
            button.id = id;
            if (!modal) // this will make them control the review.
                button.setAttribute("aria-controls", control);
            button.setAttribute("role", "tab");
            button.textContent = content;
            button.style.color = userConfig.colour.diffChoices;
            return button;
        }
    }


    // -------------------------------------------------------------------------------------------
    // -------------------------------------------------------------------------------------------
    function moveRadio(unFocusedTab) { // must wait for ajax
        // https://chat.stackoverflow.com/transcript/message/52205284#52205284 (code-review)

        const { ids: { custom : { actionRadios : actionRadiosId } },
                classes: { choiceRadios, display: { cell, container, displayBlock, center }, spaces: { negativeMargin } },
                selectors: { actions: { reviews : reviewActions, radioActionsBox } },
                tags: { radios : radiosTag },
                size: { radio : radioSize }
              } = config;

        const { colour: { radioSeperator : radioSeperatorColour },
                size: { radioSeperator : radioSeperatorSize }
              } = userConfig;

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
        // https://chat.stackoverflow.com/transcript/message/52565757#52565757
        const radioVsButtons = deepGet(userConfig, "options.radioVsButtons");
        const radioWithBorders = radioVsButtons?.radioWithBorders;
        const largerClickArea  = radioVsButtons?.largerClickArea;
        const tooltips         = radioVsButtons?.tooltips;

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
        if (!isReviewActive() && !unFocusedTab) {
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
                classList        : fieldsetClassList,
                style            : fieldsetStyle
              } = fieldset;
        fieldsetClassList.remove(...choiceRadios.fieldset); // "fd-column", "p12"
        fieldsetStyle.textAlign = "center";

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
                classList         : buttonsWrapperClassList,
                style             : buttonsWrapperStyle
              } = buttonsWrapper;
        buttonsWrapperClassList.remove(choiceRadios.button); // "pt12"
        buttonsWrapperStyle.marginLeft = "5px";

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
            .forEach(radio => {
                         const { firstElementChild : gridContainer,
                                 classList         : radioClassList,
                                 style             : radiostyle
                               } = radio;
                         const p = radio.querySelector("p");
                         if (!p || !gridContainer) // !(p && gridContainer)
                             return;

                         const { firstElementChild : inputContainer,
                                 lastElementChild  : labelContainer
                               } = gridContainer;
                         if (!inputContainer || !labelContainer)
                             return;

                         const label = labelContainer.firstElementChild;
                         if (!label)
                             return;

                         if (largerClickArea === "Yes") {

                             const input = inputContainer.firstElementChild;
                             if (!input)
                                 return;

                             input.style.margin = "2.5px 0px 0px 0px";
                             input.style.width = radioSize;
                             input.style.height = radioSize;
                             label.append(input);
                             label.classList.add(container, center);
                             label.classList.remove(displayBlock);
                             label.style.flexDirection = "column";
                             gridContainer.append(label);

                             inputContainer.remove();
                             labelContainer.remove();

                         } else {

                             const gridCells = radio.querySelectorAll("." + cell);

                             if (gridCells && gridCells.length === 2) {
                                 const { parentElement } = gridCells[0];
                                 if (parentElement)
                                     parentElement.append(gridCells[0]); // Switch them
                             }
                         }

                         if (tooltips === "Yes")
                             gridContainer.title = p.textContent;
                         p.remove();
                         gridContainer.classList.remove(container);
                         radioClassList.remove(cell);
                         radiostyle.padding = "4px";

                         const text = label.textContent || "";
                         if (radioWithBorders === "Yes" && text.trim() !== "Approve") {
                             radiostyle.paddingLeft = "3px";
                             radiostyle.borderLeft = `${radioSeperatorColour} solid ${radioSeperatorSize}px`;
                         }
             });

        // order is important.. do not do this before handling radios.
        buttonsWrapperParentClassList.remove(negativeMargin);
        buttonsWrapperParent.style.marginRight = "-12px";

        moveToFilterLine(actionBox);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveNoticeButtons() { // must wait for ajax
        if (deepGet(userConfig, "options.moveNextButtons") !== "Yes")
            return;

        const { classes: { display: { container, desktopHide } },
                selectors: { reviews: { banner } }
              } = config;

        const status = document.querySelector(banner); // "[role=status]"
        if (!status || status.classList.contains(desktopHide))
            return;

        let buttonsContainer = status.querySelector("div > div");

        if (!buttonsContainer) {
            // after an audit, there's no container element.
            const button = status.querySelector("button");
            if (!button)
                return;
            buttonsContainer = document.createElement("div");
            buttonsContainer.classList.add(container);
            button.parentElement?.append(buttonsContainer);
            buttonsContainer.append(button);
        }

        // https://chat.stackoverflow.com/transcript/message/52553183#52553183
        buttonsContainer.style.flexDirection = "row-reverse";
    }

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function highlightMessage() { // must wait for ajax
        const { classes: { display: { desktopHide },
                           notice: { base : noticeBase },
                           spaces: { marginBottom12 } },
                selectors: { reviews: { banner } }
              } = config;

        const status = document.querySelector(banner); // "[role=status]"
        if (!status)
            return;

        // https://chat.stackoverflow.com/transcript/message/52915061#52915061
        if (status.classList.contains(desktopHide)) {
            // const next = status.parentElement?.querySelector("." + noticeBase);
            const next = status.parentElement?.querySelector(`:is(div > aside.${noticeBase})`);
            if (next)
                next.classList.add(marginBottom12);
        }

        if (deepGet(userConfig, "options.prominentReviewMessage") !== "Yes")
            return;

        const info = status.firstElementChild;
        if (!info)
            return;

        const { colour: { message : messageColour, messageBackground },
                size: { message : messageSize },
              } = userConfig;

        highlightMessageDoIt(info, messageColour, messageBackground, messageSize);
    }

    function highlightMessageDoIt(info, messageColour, messageBackground, messageSize) {
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
    function isReviewActive() { // must wait for ajax
        return reviewResponse.isUnavailable === false;
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function isSkip(content) {
        return /skip/i.test(content);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function reduceFilter() {
        const reviewFilters = deepGet(userConfig, "options.reviewFilters");
        const removeTextFilters = reviewFilters?.removeTextFilters === "Yes";
        const putAlertIcon      = reviewFilters?.putAlertIcon === "Yes";
        const keepFilterList    = reviewFilters?.keepFilterList === "Yes";

        const { ids: { custom: { tagFilters : tagFiltersId, tagFilterIcon : tagFilterIconId } },
                selectors: { filter: { button, choices } },
                classes: { display: { container ,desktopHide }, tags: { legacyTag } },
              } = config;

        const filter = document.querySelector(button); // "js-review-filter-button"
        if (!filter)
            return;

        // the "pointless empty space"
        const filterchoices = document.querySelector(choices); // .js-review-filter-summary
        if (!filterchoices)
            return;

        const filters = filterchoices.textContent?.trim() || "";

        if (!removeTextFilters) {
            keepTextFilters(filter, filterchoices);
            return;
        } else {
            // hide it away
            if (!filterchoices.classList.contains(desktopHide))
                filterchoices.classList.add(desktopHide);
        }

        const theAlertIcon = filter.querySelector(`#${tagFilterIconId}`);

        if (filters) {  // there a filter present. Ensure there's an icon

            if (putAlertIcon && !theAlertIcon) {
                let icon;
                if (typeof Svg !== "undefined") {
                    icon = Svg.AlertCircle().get(0);
                } else {
                    icon = document.createElement("span");
                    icon.textContent = "🛈"; // https://codepoints.net/U+1F6C8 CIRCLED INFORMATION SOURCE
                    icon.style.fontSize = "175%";
                    icon.style.verticalAlign = "sub";
                    filter.style.paddingTop = "5px";
                    filter.style.paddingBottom = "5px";
                }
                icon.id = tagFilterIconId;
                filter.append(icon);
            }
        } else {        // there no filter. Ensure there's NO icon
            if (theAlertIcon)
                theAlertIcon.remove();
        }

        if (keepFilterList)
            listTinyFilters(filter, filters);


        function listTinyFilters(filterButton, userFilters) {

            const filteredTags = userFilters.split(" ");

            const tags = filteredTags
                             .filter(tagText => tagText !== "")
                             .map(tagText => {
                                      const tag = tagText
                                              .replaceAll("[","")
                                              .replaceAll("]","");
                                      const taglink = document.createElement("a");
                                      // taglink.classList.add("s-tag", "s-tag__xs");
                                      taglink.classList.add(legacyTag); // "post-tag"
                                      taglink.href = `https://${HOST_NAME}/questions/tagged/${tag}`;
                                      taglink.textContent = tag
                                      taglink.style.padding = "1px 2px 1px 2px";

                                      const span = document.createElement("span");
                                      span.append(taglink);
                                      return span;
                          })

            if (replace(tags))
                return;

            const filteredContainer = document.createElement("div");
            filteredContainer.classList.add(container);
            filterButton.replaceWith(filteredContainer);

            const tagContainer = document.createElement("div");
            tagContainer.classList.add(container);
            tagContainer.id = tagFiltersId;
            tagContainer.style.flexDirection = "column";
            tagContainer.style.justifyContent = "center";
            tagContainer.style.margin = "-12px";
            tagContainer.style.marginLeft = "5px";
            tagContainer.append(...tags);
            filteredContainer.append(filterButton, tagContainer);
        }

        function replace(content) {
            const existingTagContainer = document.getElementById(tagFiltersId);
            if (existingTagContainer) {
                [...existingTagContainer.children]
                    .forEach(child => child.remove());
                existingTagContainer.append(...content);
                return true;
            }
            return false;
        }

        function keepTextFilters(filterButton, filterchoices) {
            if (replace([filterchoices]))
                return;

            const filteredContainer = document.createElement("div");
            filteredContainer.classList.add(container);
            filterButton.replaceWith(filteredContainer);

            const tagContainer = document.createElement("div");
            tagContainer.id = tagFiltersId;
            tagContainer.append(filterchoices);

            filteredContainer.style.alignItems = "center";
            filteredContainer.append(filter, tagContainer);
        }
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveToFilterLine(element, afterFirst = false) {
        const filterDivSibling = document.querySelector(config.selectors.filter.dialog);
        if (!filterDivSibling)
            return;

        const { previousElementSibling : filterDiv } = filterDivSibling;
        if (!filterDiv)
            return;

        if (!afterFirst) {
            filterDiv.appendChild(element);
        } else {
            const { firstElementChild : filter } = filterDiv;  // "js-review-filter-button"
            if (filter) filterDiv.insertBefore(element, filter.nextSibling);
        }

        filterDiv.style.justifyContent = "space-between";

        // https://chat.stackoverflow.com/transcript/214345?m=52553973#52553973
        // Remove a pointless empty space:  (turns out this isn't so pointless after all!)
        // removeElement(".grid--cell.fl-grow1.js-review-filter-summary.fs-italic.fl1.ml8.mr12.v-truncate2");
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    async function shadowRadiosToButtons(unFocusedTab) { // must wait for ajax
        const tooltips = deepGet(userConfig, "options.radioVsButtons.tooltips") === "Yes";

        const state = {
            SKIP    : "skip",
            DISABLE : "disable",
            ENABLE  : "enable",
            HIDE    : "hide",
            UNHIDE  : "unhide",
            NOOP    : "no-op",
        };

        if (!isReviewActive() && !unFocusedTab) { // Do not show buttons on inactive reviews.
            changeState(state.HIDE); // Note: Audits will change from active to inactive.
            return;
        }

        const { ids: { custom: { buttons : buttonsId } },
                classes: { choiceRadios: { widget, radioParent },
                           display: { container : flexContainer, cell, gap4px },
                           buttons : buttonClasses },
                selectors: { actions, buttons : buttonSelectors }
              } = config;

        if (document.querySelector(`#${buttonsId}`)) {
            removeElement(`#${buttonsId}`);

        } else {  // We've not done this before.

            // https://chat.stackoverflow.com/transcript/message/52234064#52234064
            // by https://stackoverflow.com/users/10607772/double-beep
            document
                .body
                .addEventListener("click", event => {
                    if (event.target.type === "button" || event.target.nodeName === "BUTTON") {
                        const buttonText = event.target.innerText.trim();
/*
   // Do not remove this block. It's used to find the text of button elements that's yet unhandled.
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

        const container = createNewDiv();

        // add the radios as buttons
        const radioButtons =            // ".js-action-radio-parent"
            [...actionBox.querySelectorAll("." + radioParent)]
                .map(element => {
                         const radio = element.querySelector("input[type=radio]");
                         const label = element.querySelector("label"); // The text part
                         const p = element.querySelector("p");         // The instruction tip

                         // https://stackoverflow.com/a/50346460/12695027
                         // by https://stackoverflow.com/users/2495645/anthony-rutledge
                         if (radio
                               && p
                               && label
                               && label.firstChild
                               && label.firstChild.nodeType === Node.TEXT_NODE) {
                             return createButton({ value: label.firstChild.nodeValue.trim(), tip: p.textContent },
                                                 [radio, submitButton]);
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
        const skipContent = skipButton.textContent?.trim();
        if (!isSkip(skipContent))
            return;
        container.append(createButton({ value: skipContent }, [skipButton]));

        // Put all the buttons on the filter line
        moveToFilterLine(container);

        // start the new buttons as disabled until the actionDelay has passed. Except for Skip.
        changeState(state.SKIP);
        let { actionDelay } = reviewResponse;
        if (!actionDelay || isNaN(actionDelay))
            actionDelay = 0;
        await new Promise((resolve) => setTimeout(resolve, actionDelay));  // making the sidebar box catch up
        changeState(state.ENABLE);

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
        const buttonsActions =
            new Map([
                     ["Reject", state.NOOP],                      // Reject will open up a modal
                     ["", state.NOOP],                            // The X on the top right of the modal
                     ["Submit", state.NOOP],
                     ["Skip", state.SKIP],
                     ["Approve", state.DISABLE],
                     ["Improve edit", state.DISABLE],
                     ["Reject and edit", state.DISABLE],
                     ["Cancel", state.ENABLE],
                     ["Reject edit", state.DISABLE],
                     ["Save edits", state.DISABLE],
                     ["Approve and reopen", state.DISABLE],       // For the substantial edit review tasks
                     ["Approve and leave closed", state.DISABLE], // ^ Same
                     ["Side-by-side Markdown", state.NOOP],
                     ["Side-by-side", state.NOOP],
                     ["Inline", state.NOOP],
                     ["Revision", state.NOOP],                    // Toggling post tabs
                     ["Question", state.NOOP],                    // ^ same
                     ["Other answers", state.NOOP],               // ^ same
                     ["Filter", state.NOOP],
                     ["Apply filter", state.DISABLE],             // Changing filter options forced a new task
                     ["Clear", state.DISABLE],                    // ^ Same.. but probably not nessecary
                     ["Hide results", state.NOOP],                // From Stack snippets
                     ["Next task", state.NOOP],                   // After an audit (buttons are hidden)
                     ["Reviewer stats", state.NOOP],              // Completed reviews
                     ["Restore tab settings", state.NOOP],        // From the GUI
                     ["Apply & Exit", state.NOOP],                // ^ same
                     ["✖", state.NOOP],                          // https://codepoints.net/U+2716 HEAVY MULTIPLICATION X
                                                                  // ^ GUI and Notice if Svg is unavailable
                   ]);

        // -------    createNewDiv    --------------------
        function createNewDiv() {
            const newDiv = document.createElement("div");
            newDiv.id = buttonsId;
            newDiv.classList.add(flexContainer, gap4px);
            return newDiv;
        }

        // -------    createButton    --------------------
        // https://stackoverflow.design/product/components/buttons/
        function createButton(content, realButtons) {
            const button = document.createElement("button");
            button.type = "button";
            button.classList.add(buttonClasses.button, cell);
            button.textContent = content.value;
            if (tooltips && content.tip) button.title = content.tip;

            if (isSkip(content.value)) {
                button.style.minWidth = "70px";  // So the Skip button size doesn't change size when ".is_loading"
                button.classList.add(buttonClasses.outlined);
            } else {
                button.classList.add(buttonClasses.primary);
            }

            button.addEventListener("click", () => {
                                                 realButtons.forEach(real => real.click());
                                    });
            return button;
        }

        // -------    changeState    --------------------
        function changeState(changeTo) {
            if (!changeTo) {
                console.error(USERSCRIPTNAME + " - shadowRadiosToButtons - No such state");
                return; // effectively do a state.NOOP
            }

            if (changeTo === state.NOOP)
                return;

            const { ids: { custom: { buttons : buttonsId } },
                    classes: {buttons: { loading },
                              display: { desktopHide } }
                   } = config;

            const buttonBox = document.querySelector("#" + buttonsId); // refetch
            if (!buttonBox)
                return;

            switch (changeTo) {
                case state.SKIP    : [...buttonBox.children]
                                        .forEach(button => {
                                                     if (isSkip(button.textContent)) { // "is-loading"
                                                         button.classList.add(loading);
                                                     } else {
                                                         button.disabled = true;
                                                     }
                                         });
                    break;
                case state.DISABLE : [...buttonBox.children]
                                         .forEach(button => button.disabled = true);
                    break;
                case state.ENABLE  : [...buttonBox.children]
                                        .forEach(button => {
                                                     button.disabled = false;
                                                     if (isSkip(button.textContent)) {
                                                         button.classList.remove(loading);
                                                     }
                                         });
                    break;
                case state.HIDE    : buttonBox.classList.add(desktopHide);
                    break;
                case state.UNHIDE  : buttonBox.classList.remove(desktopHide);
                    break;
            }
        }
    }


    // --------------------------------------------------------------------------------------------
    // ---- User card related functions -----------------------------------------------------------

    // -----------------------------------------------------
    // ---- "Extracting" from extisting element ------------
    function extractUserInfo(element, userClasses) {
        const { classes: { userCards: { moderatorFlair, owner } },
                selectors: { users: { userReputation, badges : badgeSelector, newContributorLabel } } //, pii : piiElement } }
              } = config

        const isUserOwner = element.classList?.contains(owner);               // "owner"

        const newContributor = element.querySelector(newContributorLabel);   // ".js-new-contributor-label"

        let userLinkWrapper = element.querySelector(userClasses.userLink);
        if (!userLinkWrapper)
            return { };
        // const userLink = userLinkWrapper.querySelector("a");
        const userLink = userLinkWrapper.querySelector("a:not(span > a)");

        if (!userLink) {
            // trick for deleted or anonymous users
            // post summaries do not have a span element
            // user cards have and the username will be there twice as the textContent!
            const span = userLinkWrapper.querySelector("span");
            if (span)
                userLinkWrapper = span;
        }

        const userAvatarWrapper = element.querySelector(userClasses.userAvatar);
        if (!userAvatarWrapper)
            return { };

        const userAvatarImage = element.querySelector(userClasses.userAvatar + " img");

        // - reputation and badges
        const userAwards = element.querySelector(userClasses.userAwards);
        if (!userAwards)
            return { };

        const achievements = { };

        const userScore = userAwards.querySelector(userReputation);          // ".reputation-score"
        if (userScore) {
            achievements.reputation = { amount : userScore.textContent,
                                        title  : userScore.title.trim() };
            const existsBadges = userAwards.querySelector(badgeSelector);    // ".v-visible-sr"
            if (existsBadges) {
                achievements.badges = { };
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
                for (const bling of ["gold","silver","bronze"]) {
                    const award = userAwards.querySelector(`[title~=${bling}]`);
                    achievements.badges[bling] = award ? parseInt(award.textContent) : 0;
                }
            }
        }

        const isModerator = !!userLinkWrapper.querySelector("." + moderatorFlair); // ".mod-flair"

        // FIXME! Check with a moderator where the element is on the original post!
        //        This seems to turn up empty:
        // const pii = element.querySelector(piiElement); // ".pii". Only for moderators on deleted/anonymous users

        const userInfo = { accountLink    : userLink ? userLink.href : false,
                           displayName    : userLink
                                                ? userLink.textContent
                                                : userLinkWrapper.textContent,
                           profileImage   : userAvatarImage
                                                ? userAvatarImage.src
                                                : false,
                           isModerator    : isModerator,
                           isOwner        : isUserOwner,
                           newContributor : newContributor, // the entire element.
                           // pii            : pii,            // ^ same
                           achievements };
        return userInfo;
    }

    // ----------------------------------
    // ----------------------------------
    function extractTime(element, extractRelativeTime = false) {
        const details = element.querySelector("span[title]");
        if (!details)
            return { };

        const prefix = element.textContent.trim().split(" ")[0];
        const prefixLower = prefix.toLowerCase();

        const time = {
                       showTime : details.textContent,
                       timeUTC  : details.title,
                       prefix   : prefixLower,
                     };

        if (extractRelativeTime){
            const revisions = element.querySelector("a");
            if (revisions) {
               time.revisions = element;   // take it all since it has a link to revisions.
            } else {
               time.timeElement = details;
            }
        }

        return time;
    }

    // -----------------------------------------------------
    // ---- Creating user card elements --------------------

    const userCardTypes = {
        BASE    : "Base",
        MINIMAL : "Minimal",
    };

    // ----------------------------------
    // ---  just the displayName --------
    function createUserName({ accountLink, displayName, isModerator }, cardType) {
        // https://chat.stackoverflow.com/transcript/message/52696924#52696924

        const useStackUserCards = deepGet(userConfig, "options.userCards.useStackUserCards") === "Yes";
        const wantNewMod        = deepGet(userConfig, "options.wantNewModeratorFlair") === "Yes";

        const { display: { container, cell, gap4px },
                sUserCards: { cardLink },
                userCards: { moderatorFlair },
                badges: { base : badgeBase, xsmall : badgeXsmall, moderator : badgeModerator }
              } = config.classes;

        const userName = accountLink
                              ? document.createElement("a")
                              : document.createElement("span");

        if (accountLink) {
            userName.classList.add(cardLink); // "s-user-card--link"
            userName.href = accountLink;
        }

        switch (cardType) {
            case userCardTypes.BASE : userName.classList.add(container); // "d-flex"

                                      if (useStackUserCards) { // regardsless of accountLink
                                          userName.classList.add(cardLink); // "s-user-card--link"
                                      } else if (!accountLink) {
                                          // anonymous editors to be aligned with the post user cards.
                                          userName.style.padding = "2px";
                                      }

                                      const display = document.createElement("div");
                                      display.classList.add(cell); // "flex-item"
                                      display.textContent = displayName;
                                      userName.append(display);
                                      userName.style.overflowWrap = "anywhere";

                                      if (isModerator) {
                                          if (wantNewMod)
                                              userName.classList.add(gap4px); // "gs4"
                                          userName.append(moderatorBling(true, wantNewMod));
                                      }
                break;

            default                 : // userCardTypes.MINIMAL
                                      userName.style.fontSize = "100%";
                                      userName.style.paddingLeft = "5px";
                                      userName.textContent = displayName;

                                      if (isModerator)
                                          userName.append(moderatorBling(false, wantNewMod));
        }

        function moderatorBling (useFlexItem, wantNewMod) {
            const moderator = useFlexItem
                                  ? document.createElement("div")
                                  : document.createElement("span");

            if (!wantNewMod) {
                moderator.style.fontSize = "135%";
                moderator.textContent = "♦";
                moderator.classList.add(moderatorFlair); // "mod-flair"
                moderator.title = "moderator";
            } else {
                                     // "s-badge", "s-badge__moderator", "s-badge__xs"
                moderator.classList.add(badgeBase, badgeModerator, badgeXsmall);
                const modText = document.createElement("span");
                modText.style.marginBottom = "-2px";
                modText.textContent = "Mod";
                moderator.append(modText);
                if (useFlexItem) {
                    moderator.classList.add(cell); // "flex--item"
                } else {
                    moderator.style.marginBottom = "3px";
                    moderator.style.marginLeft = "5px";
                }
            }

            return moderator;
        }

        return userName;
    }

    // ----------------------------------
    // ---  just the avatar -------------
    function createUserAvatar({ accountLink, profileImage }, cardType) {
        const deletedUserImage = "https://stackoverflow.design/assets/img/anonymous-user.svg";
        // const deletedUserImage = "https://cdn-chat.sstatic.net/chat/Img/anon.png?v=6828b4d61e85";
        // const deletedUserImage = "https://cdn.sstatic.net/Img/user.svg?v=20c64bb67fc9";
        // const deletedUserImage = "https://i.stack.imgur.com/2Ajgx.png";

        const { classes: { sUserCards: { avatar, cardAvatar, avatarSize32,
                                         image : cardImage } }
              } = config;

        const userAvatarImage = document.createElement("img");
        userAvatarImage.classList.add(cardImage);       // "s-avatar--image"
        userAvatarImage.src = accountLink
                                 ? profileImage
                                 : deletedUserImage; // or <span class="anonymous-gravatar"></span> ?
        const userAvatar = accountLink
                              ? document.createElement("a")
                              : document.createElement("span");
        userAvatar.classList.add(avatar, cardAvatar);   // "s-avatar","s-user-card--avatar"
        if (accountLink)
            userAvatar.href = accountLink;
        userAvatar.append(userAvatarImage);

        switch (cardType) {
            case userCardTypes.BASE:
                userAvatar.classList.add(avatarSize32); // "s-avatar__32"
                break;

            default: // userCardTypes.MINIMAL
               userAvatarImage.style.width = "20px";
               userAvatarImage.style.height = "20px";
               userAvatar.style.backgroundColor = siteBACKGROUNDcolour;
        }

        return userAvatar;
    }

    // ----------------------------------
    // ---  just the score and badges ---
    function createUserAchievements(achievements) {
        const { sUserCards } = config.classes;

        const { reputation } = achievements;
        const userScore = document.createElement("li");
        userScore.classList.add(sUserCards.cardRep); // "s-user-card--rep"
        userScore.textContent = reputation.amount;
        userScore.title = reputation.title;

        const userAwards = document.createElement("ul");
        userAwards.classList.add(sUserCards.cardAwards); // "s-user-card--awards"
        userAwards.style.flexWrap = "wrap";
        userAwards.append(userScore);

        const { badges } = achievements;
        if (badges) {
            addBling(userAwards, badges.gold, "gold");
            addBling(userAwards, badges.silver, "silver");
            addBling(userAwards, badges.bronze, "bronze");
        }
        return userAwards;

        // --- badges
        function addBling(awardElement, amount, bling) {
            if (amount > 0) {
                const userBling = document.createElement("li");
                userBling.classList.add(sUserCards.bling, sUserCards[bling]);
                userBling.textContent = amount;
                userBling.title = amount + " " + bling + " " + (amount === 1 ? "badge" : "badges");
                awardElement.append(userBling);
            }
        }
    }

    // ----------------------------------
    // --- asked x time ago -------------
    function createPostedTime(postedTime, cardType) {
        const { showTime, timeUTC, prefix, timeElement, revisions } = postedTime;

        const time = document.createElement("time");
        time.classList.add(config.classes.sUserCards.cardTime); // "s-user-card--time"

        // If revision is provided, use that as the entire element
        // it will include a link to all revivions.
        if (revisions) {
            time.append(revisions);
            return time;
        }

        if (cardType === userCardTypes.MINIMAL) {
            time.style.fontSize = "100%";
            time.style.paddingLeft = "15px";
        }

        // If an element is provided, then use it.
        // elements with "relativetime" gets updated live on the page.
        if (timeElement) {
            time.textContent = prefix + " ";
            time.append(timeElement);
            return time;
        }

        time.textContent = prefix + " " + showTime;
        time.dateTime = timeUTC;
        time.title = timeUTC;
        return time;
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function getUserCards() { // must wait for ajax
        const userCardOption = deepGet(userConfig, "options.userCards");

        if (userCardOption?.getUserCards !== "Yes")
            return;

        const useStackUserCards  = userCardOption?.useStackUserCards === "Yes";
        const userNewContributor = userCardOption?.newContributor === "Yes";

        const { ids: { custom: { userCards } },
                selectors: { content: { reviewPost } },
                classes: { display: { container, start } }
              } = config;

        if (document.getElementById(userCards))
            return; // One is quite enough :)

        const originalEditorUserCardContainerMadeIntoOverallUserCardContainer
                  = document.querySelector(`${reviewPost} > .${container}`); // ".postcell > .d-flex"

        if (!originalEditorUserCardContainerMadeIntoOverallUserCardContainer)
            return;

        originalPostUserCards(originalEditorUserCardContainerMadeIntoOverallUserCardContainer);
        editorUserCard(originalEditorUserCardContainerMadeIntoOverallUserCardContainer);


        // -------    originalPostUserCards    --------------------
        async function originalPostUserCards(userCardsContainerAll) {
            //  https://chat.stackoverflow.com/transcript/message/52212993#52212993 (code-review)
            const { selectors: { content: { originalPost } },
                    classes: { answers, userCards: { signature } }
                  } = config;

            const originalPostLink = document.querySelector(`${originalPost} a`);
            if (!originalPostLink) // This is undefined in case of a Tag Wiki edit
                return false;

            const { href: postlink, hash, classList } = originalPostLink;

            const thePost = classList.contains(answers)
                                ? "#answer-" + hash.substring(1) // #answer-<answer id>
                                : ".question";

            userCardsContainerAll.style.justifyContent = "space-between";
            userCardsContainerAll.classList.add(start); // "ai-start"

            try {
                const userCardRequest  = await fetch(postlink);
                const userCardResponse = await userCardRequest.text();

                // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
                const userCards =
                    [...new DOMParser()
                        .parseFromString(userCardResponse, "text/html")
                        .querySelectorAll(`${thePost} .${signature}`)  // ".post-signature"
                    ];

                // Deleted Answers will come as 200 OK on Questions that are not deleted.
                // But since the Answer will be missing for < 10K users, it needs to be treated as a 404
                const requestStatus = !userCards.length ? 404 : userCardRequest.status;

                const messages = {
                                   errorNotFound: [
                                                     "The original post is unavailable.",
                                                     "User cards cannot be retrieved."
                                                  ],
                                   responseNotOk: [
                                                     "Tried to fetch usercards, but",
                                                     `Stack responded with status: ${requestStatus}`
                                                  ]
                };

                const responseMap = {
                    200    : () => postUserCards(userCards),             // response successful => append the usercards
                    404    : () => missingCards(messages.errorNotFound), // 404 => not found => Question/Answer deleted
                    default: () => missingCards(messages.responseNotOk), // unknown response from server.
                };

                const elementToAppend = (responseMap[requestStatus] || responseMap.default)();
                userCardsContainerAll.append(elementToAppend);

                replaceBrokenImages(elementToAppend);

            } catch (error) {
                const messages = [
                                   "Something is blocking fetching user cards",
                                   "Could be your ad-blocker or your network connection.",
                                   "Check the console."
                                 ];

                console.error(USERSCRIPTNAME + " - originalPostUserCards - error", error);
                userCardsContainerAll.append(missingCards(messages));
            }

            // Only necessary when keeping the Radio Button Box
            if (deepGet(userConfig, "options.radioVsButtons.moveRadioBox") !== "Yes")
                userCardsContainerAll.style.width = adjustUserCardsWidth();


            // -------    postUserCards    --------------------
            function postUserCards(originalUserCards) {
                const { gravatarSmall } = config.classes.userCards;
                const postUserCardContainer = createNewDiv();
                postUserCardContainer.classList.add(start); // "ai-start"

                if (!useStackUserCards) { // just return them as is.
                    // originalUserCards.forEach(node => postUserCardContainer.appendChild(node));
                    postUserCardContainer.append(...originalUserCards);
                    return postUserCardContainer;
                }

                // If the avatar has no children, then the author edited the post
                // so we don't need to stacksify the user card
                const stacksifiedUserCards = originalUserCards
                                                 .map((card) =>             // ".user-gravatar32"
                                                          card.querySelector(`.${gravatarSmall}`)?.children.length !== 0
                                                              ? stacksifyUserCards(card)
                                                              : card);
                postUserCardContainer.append(...stacksifiedUserCards);
                return postUserCardContainer;
            }

            // -------    stacksifyUserCards    --------------------
            function stacksifyUserCards(original) {
                const { details, gravatarSmall, flair, actionTime } = config.classes.userCards;

                const userInfo = extractUserInfo(original,
                                                 {
                                                    userLink   : "." + details,       // "user-details"
                                                    userAvatar : "." + gravatarSmall, // "user-gravatar32"
                                                    userAwards : "." + flair,         // "-flair"
                                                 });
                const timeElement = original.querySelector("." + actionTime); // ".user-action-time"
                if (!timeElement)
                    return;

                const postedTime = extractTime(timeElement, true);

                return createStackUserCard(userInfo, postedTime);
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
                    messages
                        .map(message => {
                                 const info = document.createElement("h4");
                                 info.textContent = message;
                                 info.style.color = "var(--theme-body-font-color)"; // var(--black-800);
                                 info.style.padding = "2px";
                                 return info;
                         });
                NoUserCardDiv.append(...messageElements);

                return NoUserCardDiv;
            }

            // -------    createNewDiv    --------------------
            function createNewDiv(horizontal = true) {
                const { ids: { custom: { userCards } },
                        classes: { display: { container } }
                      } = config;

                const newDiv = document.createElement("div");
                newDiv.id = userCards;
                if (horizontal)
                    newDiv.classList.add(container);
                return newDiv;
            }

        } // originalPostUserCards


        // -------    createStackUserCard    ----------------
        function createStackUserCard(userInfo, postedTime) {
            const { card, info, highlighted, cardDeleted, cardType } = config.classes.sUserCards;

            const type = userCardTypes.BASE;
            const userName   = createUserName(userInfo, type);
            const userAvatar = createUserAvatar(userInfo, type);

            const userInfoBox = document.createElement("div");
            userInfoBox.classList.add(info); // "s-user-card--info"
            userInfoBox.append(userName);

            const user = document.createElement("div");
            user.classList.add(card); // "s-user-card"
            // https://stackoverflow.design/product/base/width-height/ only has "ws2" with 211px
            user.style.width = "200px";

            if (userInfo.isOwner)
                user.classList.add(highlighted); // "s-user-card__highlighted"

            user.append(createPostedTime(postedTime, type),
                        userAvatar,
                        userInfoBox);

            const { achievements } = userInfo;
            if (!achievements || Object.getOwnPropertyNames(achievements).length === 0) {
               user.classList.add(cardDeleted); // "s-user-card__deleted"

               // do not center anonymous/deleted user cards unless the user asked for it
               if (!useStackUserCards)
                   user.classList.add(start); // "ai-start"

               // Only for moderators when editor is an anonymous user
               if (userInfo.pii)
                   userInfoBox.append(userInfo.pii);
            } else {
               userInfoBox.append(createUserAchievements(achievements));
            }

            if (userNewContributor && userInfo.newContributor) {
                const newIndicator = document.createElement("div");
                newIndicator.className = cardType; // "s-user-card--type"
                newIndicator.append(userInfo.newContributor);
                newIndicator.style.marginBottom = "-30px";
                newIndicator.querySelector("svg").style.verticalAlign = "middle";
                user.append(newIndicator);
            }

            return user;
        }


        // -------    editorUserCard    ---------------------
        function editorUserCard(userCardsContainerAll) {
            if (!userCardsContainerAll)
                return;

            const editProposedTime = userCardsContainerAll.querySelector("span");
            if (!editProposedTime)
                return;

            const { classes: { sUserCards: { cardMinimal } },
                    selectors: { users: { pii : piiElement } },
                  } = config;
                                                                              // ".s-user-card__minimal"
            const minimalUserCard = userCardsContainerAll.querySelector("." + cardMinimal);

            // deleted/anonymous user: https://stackoverflow.design/product/components/user-cards/#deleted
            if (!minimalUserCard) {
                const pii = userCardsContainerAll.querySelector(piiElement); // ".pii". Only for moderators
                const editorUserCard = createSuggestorsUserCard(null, editProposedTime, pii);
                editProposedTime.replaceWith(editorUserCard);
                return;
            }

            // Getting the editor userid
            const userLink = minimalUserCard.querySelector("a");
            if (!userLink)
                return;
            const [editorUserid] = userLink.href.split("/").slice(-2); // second last element

            const queueNumber = 1; // there must be a "1" queue-number :)
            const userInformationUrl = `https://${HOST_NAME}/review/user-info/${queueNumber}/${editorUserid}`;

            // https://chat.stackoverflow.com/transcript/message/52203151#52203151 (code-review)
            // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
            fetch(userInformationUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Response status was: " + response.status);
                    }
                    return response.text();
                 })
                .then(data => {
                    const editorReviewStats = new DOMParser().parseFromString(data, "text/html");
                    const editorUserCard = createSuggestorsUserCard(editorReviewStats, editProposedTime);

                    // minimalUserCard.parentNode.insertBefore(editorUserCard, minimalUserCard);
                    minimalUserCard.before(editorUserCard);

                    replaceBrokenImages(editorUserCard);

                    minimalUserCard.remove();
                    editProposedTime.remove();

                    if (deepGet(userConfig, "options.userCards.withEditiorStats") === "Yes") {
                        insertEditorStatistics(editorUserCard, editorUserid);
                    }
                 })
                .catch((error) => {
                    console.error(USERSCRIPTNAME + " - Error - while fetching editorUserCard : ", error);
                 });


            // -------    createSuggestorsUserCard    --------------------
            function createSuggestorsUserCard(editorReviewStats, editProposedTime, pii) {
                const isAnonymized = (editorReviewStats === null);

                if (!useStackUserCards && !isAnonymized) { // !(useStackUserCards || isAnonymized)
                    return transformUserCard(editorReviewStats, editProposedTime);
                } else {
                                                                       // extractRelativeTime
                    const suggestedTime = extractTime(editProposedTime, !useStackUserCards);

                    if (isAnonymized) {
                        // suggested edits by deleted users show as "anonymous user"
                        // SEDE query of edit examples by rene (https://stackoverflow.com/users/578411)
                        // posted in chat https://chat.stackexchange.com/transcript/message/58780796#58780796
                        // https://data.stackexchange.com/stackoverflow/query/1442692

                        const userInfo = { };

                        if (pii)
                            userInfo.pii = pii;

                        // Moderators seems to also only get "an anonymous user", but just in case they get "userX":
                        const matchResult = editProposedTime.textContent.match(/by(?: an)? (.+)/) || [];
                        userInfo.displayName = matchResult[1] || EMPTY; // nothing is better than undefined.

                        return createStackUserCard(userInfo, suggestedTime);
                    }

                    const { header, gravatar, flair } = config.classes.userCards.um;

                    const userInfo = extractUserInfo(editorReviewStats,
                                                     {
                                                        userLink       : "." + header,   // ".um-header-info",
                                                        userAvatar     : "." + gravatar, // ".um-gravatar",
                                                        userAwards     : "." + flair,    // ".um-flair",
                                                     });
                    const editorcard = createStackUserCard(userInfo, suggestedTime);
                    return editorcard;
                }
            } // createSuggestorsUserCard

            // -------    transformUserCard    --------------------
            function transformUserCard(editorReviewHover, editProposedTime) {
                // Yup! This entire thing is prone to break every time Stack changes something. Sorry :(

                const { classes: { display: { cell } , userCards },
                           size: { gravatarSmall },
                            ids: { custom: { editorCard : editorCardId } }
                      } = config;

                const editorCardContainer = document.createElement("div");
                editorCardContainer.id = editorCardId;
                editorCardContainer.classList.add(userCards.signature,                      // "post-signature"
                                                  cell);                                    // "flex--item"

                const editorCardDiv = document.createElement("div");
                editorCardDiv.classList.add(userCards.info, userCards.hover);               // "user-info", "user-hover"

                const actionTime = document.createElement("div");
                actionTime.classList.add(userCards.actionTime);                             // "user-action-time"
                actionTime.textContent = "proposed "; // editProposedTime.textContent;
                actionTime.appendChild(editProposedTime.firstElementChild);

                const editorGravatar
                    = editorReviewHover.querySelector(`.${userCards.um.gravatar}`);
                if (!editorGravatar)
                    return;
                const { classList : editorGravatarClassList } = editorGravatar;
                editorGravatarClassList.remove(userCards.um.gravatar);                      // "um-gravatar"
                editorGravatarClassList.add(userCards.gravatarSmall);                       // "user-gravatar32"

                const editorGravatarDiv
                    = editorGravatar.querySelector(`.${userCards.gravatarWrap}`);
                if (!editorGravatarDiv)
                    return;
                const { classList : editorGravatarDivClassList } = editorGravatarDiv;
                editorGravatarDivClassList.remove(userCards.gravatarWrap);                  // "gravatar-wrapper-64"
                editorGravatarDivClassList.add(userCards.gravatarSmallWrap);                // "gravatar-wrapper-32"

                const editorGravatarImg = editorGravatarDiv.querySelector("img");
                if (!editorGravatarImg)
                    return;
                editorGravatarImg.style.height
                    = editorGravatarImg.style.width
                    = gravatarSmall; // "32"

                const editorFlairDiv = document.createElement("div");
                editorFlairDiv.classList.add(userCards.details);                             // "user-details"

                const editorUserName
                          = editorReviewHover.querySelector(`.${userCards.um.header}`);     // "um-header-info"
                if (!editorUserName)
                    return;

                const editorUserNameLink = editorUserName.querySelector("a");
                if (!editorUserNameLink)
                    return;

                const editorUserNameModerator
                          = editorUserName.querySelector(`.${userCards.moderatorFlair}`);   //  ".mod-flair"

                const editorFlair = editorReviewHover.querySelector(`.${userCards.um.flair}`);
                if (!editorFlair)
                    return;
                const { classList : editorFlairClassList } = editorFlair;
                editorFlairClassList.remove(userCards.um.flair);                            // "um-flair"
                editorFlairClassList.add(userCards.flair);                                  // "-flair"

                editorFlairDiv.append(editorUserNameLink,
                                      editorUserNameModerator
                                          ? editorUserNameModerator
                                          : "",
                                      editorFlair);
                editorCardDiv.append(actionTime, editorGravatar, editorFlairDiv);
                editorCardContainer.appendChild(editorCardDiv);

                return editorCardContainer;
            } // transformUserCard

        } // editorUserCard
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function removeLineThrough() {
        // https://chat.stackoverflow.com/transcript/message/52312565#52312565 (code-review)

        if (deepGet(userConfig, "options.removeLineThrough") !== "Yes")
            return;

        // https://www.rainbodesign.com/pub/css/css-javascript.html
        // https://usefulangle.com/post/39/adding-css-to-stylesheet-with-javascript

        const style = document.createElement("style");
        document.head.appendChild(style);
        const styleSheet = style.sheet;
        if (!styleSheet)
            return;

        styleSheet.insertRule(`
              ${config.selectors.diffs.diffDelete} {
                   text-decoration: initial;
              }`);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function addLinksToTitles() { // must wait for ajax
        if (deepGet(userConfig, "options.linksOnTitles") !== "Yes")
            return;

        const { selectors: { postTitleFontSize, content: { originalPost } } } = config;

        const titles = document.querySelectorAll(`h1${postTitleFontSize}`);
        if (titles.length > 0) {
            const link = document.querySelector(originalPost + " a"); // ".js-question-title-link a"
            if (!link)
                return;
            const href = link.href;
            if (href)
                [...titles]
                    .forEach(title => {
                                 const containingLink = document.createElement("a");
                                 containingLink.href = href;
                                 title.replaceWith(containingLink);
                                 containingLink.append(title);
                     });
        }
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    async function StackSummary() { // must wait for ajax
        const useStackSummary = (deepGet(userConfig, "options.postSummary.useStackSummary") === "Yes");

        // https://stackoverflow.design/product/components/post-summary/
        // https://stackoverflow.design/product/components/badges/

        const { classes: { postSummary: { base : summaryBase, item, stats, hasAnswers, hasAccepted,
                                          content, contentTitle, link : baseLink,
                                          warm, hot, supernova,
                                          summaryAnswers, summaryAccepted },
                           tags: { meta, metaTag, tag : sTag, legacyTag },
                           badges: { base : badgeBase,  small : badgeSmall, green, red, grey },
                           sUserCards: { card, carlSmall, cardDeleted, cardAwards, avatar, cardTime, cardLink },
                           userCards: { moderatorFlair },
                           display: {container},
                           postSummaryLegacy: { contentBox, cursorPointer, square, scoreClass,
                                                viewsClass, answerClass, answered, accepted } },
               selectors: { diffs: { diffAdd }, content: { task }, users, acceptedAnswer },
               ids: { custom: { postSummary : postSummaryId } }
              } = config;

        const viewHeatMap = [
                  [supernova, 100000, () => Svg.FireSm.With("va-text-bottom mrn2").get(0)],
                  [hot,       10000],
                  [warm,      1000],
        ];
        // https://chat.stackoverflow.com/transcript/214345?m=52503624#52503624
                                               // in case I forget that it needs to be sorted
        const getHeat = (views) => viewHeatMap.sort(([_heatThis,tis],[_heatThat,tat]) => tat - tis)
                                              .find(([_heat, amount]) => views >= amount)
                                   || [];

        const badgeMap = [
                  [grey,  (score) => score === 0],
                  [green, (score) => score > 0],
                  [red,   (score) => score < 0],
        ];

        const existingPostSummary = document.querySelector(`.${summaryBase}`); // .s-post-summary
        if (!existingPostSummary)
            return;
        const existingTitleLink = existingPostSummary.querySelector(`.${contentTitle} a`); // .s-post-summary--content-title

        if (!existingTitleLink)
            return;

        let usingAPI = deepGet(userConfig, "options.postSummary.useAPI") === "Yes";
        const questionId = existingTitleLink.href.toString().split("/")[4];
        const postAPI = usingAPI ? await getQuestion(questionId) : { };
        if (!postAPI || Object.getOwnPropertyNames(postAPI).length === 0) {
            usingAPI = false;
        }

        const postInfo = { }; // all the collected information goes in here

        if (usingAPI) {
            const { owner: { badge_counts, reputation,
                             link : userAccountLink, profile_image, display_name,
                             user_type },
                    tags : postTags,
                    creation_date : postEpocs,
                    title : postTitle, closed_date, closed_reason,
                    view_count, score : postScore,
                    accepted_answer_id, answer_count
                  } = postAPI;

            postInfo.answer = {
                                isAnswered        : (answer_count !== 0),
                                hasAcceptedAnswer : !!accepted_answer_id,
                                text              : answer_count + (answer_count !== 1 ? " answers" : " answer")
                              };

            postInfo.postScore = postScore;
            postInfo.viewCount = view_count;

            postInfo.title = {
                               link : existingTitleLink.href,
                               text : postTitle
                                         + (closed_date
                                               ? closed_reason === "Duplicate"
                                                   ? " [duplicate]"
                                                   : " [closed]"
                                               : "")
                             };

            postInfo.tags = [...postTags]
                                .map(tag => {
                                         const newTag = document.createElement("a");
                                         newTag.href = `https:/${HOST_NAME}/questions/tagged/${tag}`;
                                         newTag.classList.add(sTag);
                                         newTag.textContent = tag;
                                         newTag.title = `show questions tagged '${tag}'`;
                                         return newTag;
                                 });

            postInfo.postedTime = {
                                    showTime : customPrettyDateDiff(postEpocs),
                                    timeUTC  : absoluteTime(postEpocs),
                                    prefix   : "asked",
                                  };

            const achievements = { };

            if (reputation) {
                achievements.reputation = { amount: formatAmount(reputation, "reputation"),
                                            title : "reputation score" };
                if (badge_counts)
                    achievements.badges = badge_counts;
            }

            postInfo.user = {
                              accountLink  : userAccountLink,
                              displayName  : display_name,
                              profileImage : profile_image,
                              isModerator  : user_type === "moderator" ? true : false,
                              achievements : achievements
                            };

        } else { // not usingAPI. This always applies to deleted posts.

            const existingStats = existingPostSummary.querySelectorAll("." + item); // .s-post-summary--stats-item
            if (existingStats.length < 3)
                return;

            const existingAnswers = existingStats[0];
            const existingVotes   = existingStats[1];
            const existingViews   = existingStats[2];

                                                          // ".js-accepted-answer-indicator:not(.d-none)"
            const acceptedAnswerTick = document.querySelector(`${acceptedAnswer}:not(.d-none)`);

            postInfo.answer = {
                                isAnswered        : !existingAnswers.textContent.trim().startsWith("0"),
                                hasAcceptedAnswer : !!acceptedAnswerTick,
                                text              : existingAnswers.textContent.trim()
                              };

            postInfo.postScore = existingVotes.textContent.trim().replace(" votes","").replace(" vote","");

            postInfo.viewCount = existingViews.textContent.trim().replace(" views","").replace(" view","");

            postInfo.title = {
                               link : existingTitleLink.href,
                               text : existingTitleLink.textContent,
                             };

            const existingtags = document.querySelectorAll(`${task} .${legacyTag}`); // ".js-review-task .post-tag"
            postInfo.tags = [...existingtags]
                                 .filter(tag => !tag.querySelector(diffAdd)) // remove edit added tags
                                 .map(tag => {
                                          const newTag = tag.cloneNode();
                                          newTag.className = sTag;
                                          newTag.textContent = tag.textContent;
                                          return newTag;
                                  });

            const existingUser = existingPostSummary.querySelector("." + meta); // ".s-post-summary--meta"
            if (!existingUser)
                return;

            postInfo.user = extractUserInfo(existingUser,
                                            {
                                               // userLink       : "." + cardLink,         // "s-user-card--link",
                                               userLink       : "." + card,             // "s-user-card"
                                               userAvatar     : "." + avatar,           // ".s-avatar"
                                               userAwards     : "." + cardAwards,       // ".s-user-card--awards"
                                               userReputation : users.userReputation,   // ".reputation-score"
                                               userBadges     : users.badges,           // ".v-visible-sr"
                                               moderatorFlair : "." + moderatorFlair    // ".mod-flair"
                                            });

            const existingTime = existingUser.querySelector("." + cardTime); // ".s-user-card--time"
            if (!existingTime)
                return;

            postInfo.postedTime = extractTime(existingTime);
        }

        const title = createTitle(postInfo.title);
        const tagContainer = createTags(postInfo.tags);
        const user = createUser(postInfo.user, postInfo.postedTime);

        if (useStackSummary) {
            const answers = createAnswers(postInfo.answer);
            const score   = createScore(postInfo.postScore);
            const views   = createViews(postInfo.viewCount);


            const leftContainer = createLeftContainer(answers, score, views);
            const rightContainer = createRightContainer(title, tagContainer, user);

            attachToReview(existingPostSummary, leftContainer, rightContainer);

        } else {

            const leftTriple = legacyTriple(postInfo);

            tagContainer.style.marginRight = "20px";
            const rightLegacyWithTags = document.createElement("div");
            rightLegacyWithTags.append(tagContainer, user);
            user.style.paddingTop = "revert";

            // Re-adjustment of the image size
            const avatar = user.querySelector("img");
            if (avatar) {
                avatar.style.width  = "24px";
                avatar.style.height  = "24px";
                avatar.style.marginTop  = "-1px";
            }

            rightLegacyWithTags.className = container; //"d-flex"
            rightLegacyWithTags.style.alignItems = "baseline";
            const rightLegacy = createRightContainer(title, rightLegacyWithTags);

            attachToReview(existingPostSummary, leftTriple, rightLegacy);

            // leftTriple.parentNode.style.boxSizing = "content-box";
            leftTriple.parentNode.classList.add(contentBox); // "narrow"
        }

        // ---  the score/answers/views legacyTriple ---
        function legacyTriple(postInfo) {

            // Do not remove the commented out styles. They are left because..
            // WHEN Stack break them, legacyTriples can be broght back with styles.

            const makeBox = (type, postInfo) => {
                const box = document.createElement("div");
                // box.style.display = "inline-block";
                // box.style.height = "38px";
                // box.style.fontSize = "11px";
                // box.style.boxSizing = "content-box";

                const span = document.createElement("span");
                const sisterDiv = document.createElement("div");

                const div = document.createElement("div");
                div.className = square; // "mini-counts"
                // box.style.fontSize = "1.30769231rem";
                // box.style.marginBottom = "4px";

                switch (type) {
                    case "score": {
                        span.textContent = postInfo.postScore;
                        span.title = "score: " + postInfo.postScore;

                        sisterDiv.textContent = "score";

                        box.className = scoreClass; // "votes"
                        box.style.padding = "7px 6px";  // because there's NO border on that class!
                        // box.style.minWidth:" 40x";
                        // box.style.margin = "0 7px 0 0";
                        // box.style.color = "var(--black-400)";
                        break;
                    }

                    case "answer": {
                        const answerCount = postInfo.answer.text.replace(" answers","").replace(" answer","");
                        const answetext = answerCount === 1 ? "answer": "answers";
                        span.textContent = answerCount;
                        span.title = postInfo.answer.text;

                        sisterDiv.textContent = answetext;

                        box.className = answerClass; // "status"
                        if (postInfo.answer.hasAcceptedAnswer) {
                            box.classList.add(accepted); // "answered-accepted"
                            // box.style.color = "#fff";
                            // box.style.backgroundColor = "var(--green-400)";
                        } else if (postInfo.answer.isAnswered) {
                            box.classList.add(answered); // "answered"
                            // box.style.color = "var(--green-500)";
                        }
                        // box.style.minWidth:" 44px";
                        // box.style.margin = "0 3px 0 0";
                        // box.style.padding = "6px";
                        // box.style.border = "1px solid transparent";
                        // box.style.borderRadius = "3px";
                        break;
                    }

                    case "view": {
                        const viewText = postInfo.viewCount === 1 ? "view": "views";
                        span.textContent = formatAmount(postInfo.viewCount);
                        span.title = postInfo.viewCount + " " + viewText;

                        sisterDiv.textContent = viewText;

                        const heat = getHeat(postInfo.viewCount);
                        if (heat.length > 0) {
                            const colour = heat[0].replace("is-","");
                            div.classList.add(colour);
                            sisterDiv.classList.add(colour);
                        }

                        box.className = viewsClass; // "views"
                        // box.style.minWidth:" 38px";
                        // box.style.margin = "0 7px 0 0";
                        // box.style.color = "var(--black-400)";
                        // box.style.padding = "7px 6px";
                        break;
                    }
                }

                div.append(span);

                box.append(div, sisterDiv);
                return box;
            };

            const triples = document.createElement("a");
            triples.href = postInfo.title.link;
            triples.classList.add(cursorPointer); // "cp"
            triples.append(makeBox("score" , postInfo),
                           makeBox("answer", postInfo),
                           makeBox("view"  , postInfo));

            return triples;
        }

        // ---  answers ---
        function createAnswers({ isAnswered, hasAcceptedAnswer, text }) {
            const answers = document.createElement("div");
            answers.classList.add(item);

            if (hasAcceptedAnswer) {
                answers.classList.add(hasAnswers, hasAccepted);
                if (typeof Svg !== "undefined") {
                    answers.append(Svg.CheckmarkSm.With("va-text-bottom").get(0));
                } else {
                    answers.textContent = "✓"; // https://codepoints.net/U+2713 CHECK MARK
                }

                // do NOT use answers.textContent when having an svg appended.
                answers.append(EMPTY + text);
                return answers;

            } else if (isAnswered) {
                answers.classList.add(hasAnswers);
            }

            answers.textContent = text;
            // answers.textContent = " " + text; // https://codepoints.net/U+200A HAIR SPACE
            return answers;
        }

        // ---  score ---
        function createScore(postScore) {
            const scoreBox = document.createElement("div");
            scoreBox.classList.add(badgeBase, badgeSmall);

            const [ colour ] = badgeMap.find(([_colour, handle]) => handle(parseInt(postScore))) || [];
            colour && scoreBox.classList.add(colour);

            scoreBox.textContent = postScore;
            scoreBox.style.paddingTop = "2px";
            scoreBox.style.marginTop = "-1px";

            const score = document.createElement("div");
            score.classList.add(item);
            score.textContent = "score ";
            score.append(scoreBox);
            return score;
        }

        // ---  views ---
        function createViews(viewCount) {
            const view = document.createElement("div");
            view.classList.add(item);
            const heat = getHeat(viewCount);
            if (heat.length > 0) {
                view.classList.add(heat[0]);
                if (heat[2]) {
                    if (typeof Svg !== "undefined") {
                        view.append(heat[2]());
                    } else {
                        view.append("🔥"); // https://codepoints.net/U+1F525 FIRE
                    }
                }
            }
            view.append(EMPTY + formatAmount(viewCount, "views") + " views");
            if (viewCount > 1000) view.title = viewCount;
            view.style.marginTop = "-4px";
            return view;
        }

        // first container
        function createLeftContainer (answers, score, view) {
            const leftContainer = document.createElement("div");
            leftContainer.classList.add(stats);
            leftContainer.style.flexDirection = "column";
            leftContainer.style.flexWrap = "wrap";
            leftContainer.style.alignItems = "flex-end";
            leftContainer.style.marginTop = "8px";
            leftContainer.style.paddingRight = "10px";
            leftContainer.append(answers, score, view);
            return leftContainer;
        }


        // ---  Posttitle and link ---
        function createTitle({ link, text }) {
            const title = document.createElement("a");
            title.classList.add(contentTitle, baseLink);
            title.href = link;
            title.innerText = text;
            return title;
        }

        // ---  tags ---
        function createTags(tags) {
            const metaTags = document.createElement("div");
            metaTags.classList.add(metaTag);
            metaTags.append(...tags);
            const metaContainer = document.createElement("div");
            metaContainer.classList.add(meta);
            metaContainer.append(metaTags);
            return metaContainer;
        }


        // --- the entire user element with "x time ago" appended
        function createUser(userInfo, postedTime) {
            const type = userCardTypes.MINIMAL;
            const userName   = createUserName(userInfo, type);
            const userAvatar = createUserAvatar(userInfo, type);

            const user = document.createElement("div");
            user.classList.add(card, carlSmall); // "s-user-card","s-user-card__small"
            user.style.alignItems = "baseline";
            user.style.paddingLeft = "0px";
            user.style.paddingTop = "6px";

            user.append(userAvatar, userName);

            const { achievements } = userInfo;
            if (!achievements || Object.getOwnPropertyNames(achievements).length === 0) {
               user.classList.add(cardDeleted);
            } else {
               user.append(createUserAchievements(achievements));
            }
            user.append(createPostedTime(postedTime, type));

            return user;
        }

        // second container
        function createRightContainer (...elements) {
            const rightContainer = document.createElement("div");
            rightContainer.classList.add(content);
            rightContainer.append(...elements);
            return rightContainer;
        }

        // both containers - this is the new summary
        function attachToReview(existingPostSummary, leftContainer, rightContainer) {
            const container = document.createElement("div");
            container.classList.add(summaryBase);
            container.style.marginBottom = "15px";
            container.style.borderBottom = "revert";
            container.append(leftContainer, rightContainer);
            container.id = postSummaryId;
            container.style.padding = "6px";

            existingPostSummary.before(container);
            existingPostSummary.remove();

            const parent = container.parentElement;
            if (parent) parent.style.marginTop = "-5px";

            replaceBrokenImages(rightContainer);
        }


        // --- apiRequest
        async function getQuestion(questionId) {
            const site      = HOST_NAME;
            const apiFilter = "UdJdPp-(maNxziAUeISHs";  // unsafe & user type to check for moderator
            const apiKey    = config.apiKey;
            const apiUrl = `${API_BASE}/${API_VER}/questions/${questionId}?filter=${apiFilter}&site=${site}&key=${apiKey}`;

            const apiResponse = await fetch(apiUrl);
            if (!apiResponse.ok)
                return { };
            const result = await apiResponse.json();

            checkAPIResult(result);
            // console.log("APIresult", result);
            // console.log("APIresultPost", result.items[0]);
            return result.items[0];
        };

        // https://stackoverflow.com/a/17633552/12695027 by https://stackoverflow.com/users/69083/guffa
        function formatAmount(n, type = "views") {
            const ranges = [
                { divider: 1e9, suffix: "g", views: 0, reputation: 1 },
                { divider: 1e6, suffix: "m", views: 1, reputation: 1 },
                { divider: 1e3, suffix: "k", views: 0, reputation: 1 },
            ];

            const rouding = {
                views: [
                    [1e6, 1e5],
                    [1e3, 1e3]
                ],
                reputation: [
                    [1e6, 1e5],
                    [1e5, 1e3],
                    [1e4, 100],
                ],
            };

            if (type === "reputation" && n < 10000)
                return n.toLocaleString("en-US");

            if (n > 1000) {
                const round = rouding[type].find(([limit, roundTo]) => n > limit)[1];
                n = (Math.round(n / round) * round);
            }

            // https://chat.stackoverflow.com/transcript/message/52517093#52517093
            const range = ranges.find(({ divider }) => n >= divider);
            if (range) return +(n / range.divider).toFixed(range[type]) + range.suffix;

            return n.toString();
        }

        // https://dev.stackoverflow.com/content/Js/full.en.js
        function customPrettyDateDiff(epocSeconds, months = false) {
            if (!epocSeconds) return;

            const diff = (((new Date()).getTime() / 1000) - epocSeconds)
                              + StackExchange.options.serverTimeOffsetSec;

            if (isNaN(diff) || diff < 0)
                return;

            return (
                !months && diff < 2 && "just now"                         ||
                !months && diff < 60 &&
                    (function(n){return n.seconds === 1
                                          ? n.seconds + " sec ago"
                                          : n.seconds + " secs ago"
                    })({seconds: Math.floor(diff)})                       ||
                !months && diff < 120 && "1 min ago"                      ||
                !months && diff < 3600 &&
                    (function(n){return n.minutes === 1
                                          ? n.minutes + " min ago"
                                          : n.minutes + " mins ago"
                    })({minutes: Math.floor(diff / 60)})                  ||
                !months && diff < 7200 && "1 hour ago"                    ||
                !months && diff < (86400 / 2) &&
                    (function(n){return n.hours === 1
                                          ? n.hours + " hour ago"
                                          : n.hours + " hours ago"
                    })({hours: Math.floor(diff / 3600)})                  ||
                !months && diff < 86400 && "today"                        ||
                !months && diff < (86400 * 2) && "yesterday"              ||
                !months && diff < (86400 * 7) &&
                    (function(n){return n.days + " days ago"
                    })({days: Math.floor(diff / 86400)})                  ||
                !months && diff < (86400 * 30) &&
                    (function(n){return n.weeks === 1
                                          ? n.weeks + " week ago"
                                          : n.weeks + " weeks ago"
                    })({weeks: Math.floor(diff / (86400 * 7))})           ||
                diff < (86400 * 365) &&
                    (function(n){return n.months === 0
                                          ? "" // this is false
                                          : n.months === 1
                                              ? n.months + " month ago"
                                              : n.months + " months ago"
                    })({months: Math.floor(diff / (86400 * 30.5))})       ||
                !months && (function(n){
                              const months =
                                        customPrettyDateDiff(epocSeconds +       // add the years
                                                               Math.floor(diff / (86400 * 365)) * (86400 * 365),
                                                             true);
                              return ((n.years === 1 ? n.years + " year" : n.years + " years")
                                       + (months ? ", " + months : " ago"));
                           })({years: Math.floor(diff / (86400 * 365))})
            );
        }

        // https://dev.stackoverflow.com/content/Js/full.en.js
        function absoluteTime(epocSeconds) {
            var date = new Date();
            date.setTime(epocSeconds * 1000);

            return [
                date.getUTCFullYear(),
                "-", pad(date.getUTCMonth() + 1),
                "-", pad(date.getUTCDate()),
                " ", pad(date.getUTCHours()),
                ":", pad(date.getUTCMinutes()),
                ":", pad(date.getUTCSeconds()),
                "Z"
            ].join("");

            function pad(n) {
                return n < 10 ? "0" + n : n;
            }
        }
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function checkAPIResult(result) {
        let limit = parseInt(deepGet(userConfig, "size.apiQuotaLimit"));
        if (isNaN(limit)) limit = deepGet(defaultUserConfig, "size.apiQuotaLimit");

        const { quota_remaining, backoff, error_message } = result;

        if (quota_remaining <= limit)
            showToast(quota_remaining, "quota");
        if (backoff)
            showToast(backoff, "throttle");
        if (error_message)
            showToast(error_message, "error");
    }

    function showToast(detail, type, guiID) {
        const apiOptions = `<ul><li>"with editor statistics" under "Add user cards" </li>
                                <li>"Using Stack Exchange API" under "Stack Design post summary"</li></ul>`;
        const inludeID = guiID ? ` id=${guiID}` : ""; // used in the preview

        const toastMessage = {
                 quota: `<p>${EMPTY}${USERSCRIPTNAME}.</p>
                          <p${inludeID}>${EMPTY}You're low on API quota (remaining: ${detail}).<br/>
                            ${EMPTY}Consider turning both of these off:</p>`
                        + apiOptions,
                 error: `<p>${USERSCRIPTNAME}</p>Stack API says: <p>${detail}</p>`,
                 throttle: `<p>${EMPTY}${USERSCRIPTNAME}</p>
                            <p>${EMPTY}Stack API says:<br/>
                               ${EMPTY}Wait <b>${detail}</b> seconds before making another API request!</p>
                            <p>${EMPTY}You can avoid this by turning both of these off:</p>`
                        + apiOptions,
        };

        const { display: { container, cell, spaceBetween },
                buttons: { button : buttonBase, notice : buttonNotice },
                notice: { toast : sToast, base : noticeBase, warning, padding }
              } = config.classes;

        // https://stackoverflow.design/product/components/notices/
        const button = document.createElement("button");
        button.classList.add(buttonBase, buttonNotice);
        button.type = "button";
        if (typeof Svg !== "undefined") {
            button.append(Svg.ClearSm().get(0));
        } else {
            button.textContent = "✖"; // https://codepoints.net/U+2716 HEAVY MULTIPLICATION X
        }

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add(container);
        buttonContainer.style.marginTop = "-4px";
        buttonContainer.style.marginRight = "-2px";
        buttonContainer.append(button);

        const message = document.createElement("div");
        message.classList.add(cell);
        message.innerHTML = toastMessage[type];

        const flexContainer = document.createElement("div");
        flexContainer.classList.add(container, spaceBetween);
        flexContainer.style.alignItems = "flex-start";
        flexContainer.append(message, buttonContainer);

        const aside = document.createElement("aside");
        aside.classList.add(noticeBase, warning, padding);
        aside.append(flexContainer);
        if (guiID) return aside;

        const toast = document.createElement("div");
        toast.classList.add(sToast);
        toast.setAttribute("aria-hidden", "false");
        toast.append(aside);

        button.addEventListener("click", (event) => {
                   toast.setAttribute("aria-hidden", "true");
               });

        document.body.append(toast);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------

    function replaceBrokenImages(element = document) {
        // this method is called after:
        // - the page is loaded.
        // - creating the post summary.
        // - fetching and inserting the post user cards.
        // - fetching and inserting the editor user card.

        const fixedBrokenImage = "https://i.stack.imgur.com/Y2OIR.png";

        element
           .querySelectorAll("img")
           .forEach(img => {img.addEventListener('error',
                                                 event => {
                                                     /*
                                                     console.log("Error:",
                                                                 {
                                                                    sourse: img.src,
                                                                    event,
                                                                    target: event.target,
                                                                    parent: event.target.parentNode
                                                                 });
                                                     */
                                                     img.src = fixedBrokenImage;
                                                 },
                                                 { once: true })
            });
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // Mostly snipped from Oleg Valter (https://stackoverflow.com/users/11407695/oleg-valter) at https://pastebin.com/YkG5R39h
    // https://chat.stackoverflow.com/transcript/message/52116388#52116388
    // https://chat.stackoverflow.com/transcript/message/52140612#52140612
    // https://chat.stackoverflow.com/transcript/message/52148815#52148815

    const siteBACKGROUNDcolour = "var(--white)"; // #ffffff in light mode.  #2d2d2d in dark mode
                                                 // hsl(0,0%,100%);         hsl(0,0%,17.5%);

    const API_BASE = "https://api.stackexchange.com";
    const HOST_NAME = window.location.hostname; // f.ex. "stackoverflow.com"
    const API_VER = 2.2;

    const EMPTY = "\u00A0"; // https://codepoints.net/U+00A0 NO-BREAK SPACE

    const config = {
            apiKey: "YeacD0LmoUvMwthbBXF7Lw((",//:-)) Registered Key
            ids: {
                custom: {
                    userCards:        PREFIX + "-UserCards",
                    editorCard:       PREFIX + "-EditorCard",
                    buttons:          PREFIX + "-RealButtons",
                    postType:         PREFIX + "-PostType",
                    actionRadios:     PREFIX + "-ActionRadios",
                    diffChoices:      PREFIX + "-DiffChoices",
                    keepDiffChoices:  PREFIX + "-KeepDiffChoices",
                    progressBar:      PREFIX + "-Progressbar",
                    postSummary:      PREFIX + "-postSummary",
                    tagFilters:       PREFIX + "-tagFilters",
                    tagFilterIcon:    PREFIX + "-tagFilterIcon",
                },
            },
            error: "Oh No! Oh no-no-no-no-no! Arrrrrrrgh!...",
            tags: {
                radios: "fieldset",
            },
            classes: {
                // https://stackoverflow.design/product/base/display/
                display: {
                    container: "d-flex",
                    desktopHide: "d-none",
                    displayBlock: "d-block",
                    // https://stackoverflow.design/product/base/flex/
                    cell: "flex--item",
                    center: "ai-center",
                    start: "ai-start",
                    spaceBetween: "jc-space-between",
                    // https://stackoverflow.design/product/base/flex/#gutter-classes
                    gap4px: "gs4",
                },
                spaces: {
                    marginBottom12: "mb12",
                    marginBottom16: "mb16",
                    negativeMargin: "mxn12",
                    titleSpace: "ml12",
                },
                choiceRadios: {
                    fieldset: ["fd-column", "p12"],
                    submits: ["bt", "bc-black-3"],
                    button: "pt12",
                    widget: "s-sidebarwidget",
                    radioParent: "js-action-radio-parent",
                },
                sUserCards: {
                    card: "s-user-card",
                    info: "s-user-card--info",
                    highlighted: "s-user-card__highlighted",
                    cardMinimal: "s-user-card__minimal",
                    carlSmall: "s-user-card__small",
                    cardTime: "s-user-card--time",
                    cardAwards: "s-user-card--awards",
                    cardRep: "s-user-card--rep",
                    cardLink: "s-user-card--link",
                    cardType: "s-user-card--type",
                    cardDeleted: "s-user-card__deleted",
                    avatar: "s-avatar",
                    avatarSize32: "s-avatar__32",
                    image: "s-avatar--image",
                    cardAvatar: "s-user-card--avatar",
                    bling: "s-award-bling",
                    gold: "s-award-bling__gold",
                    silver: "s-award-bling__silver",
                    bronze: "s-award-bling__bronze",
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
                    moderatorFlair: "mod-flair",
                    hover: "user-hover",
                    owner: "owner",
                    um: {
                        gravatar: "um-gravatar",
                        header: "um-header-info",
                        flair: "um-flair",
                    },
                },
                badges: {
                    base: "s-badge",
                    small: "s-badge__sm",
                    xsmall: "s-badge__xs",
                    moderator: "s-badge__moderator",
                    green: "s-badge__rep",
                    red: "s-badge__rep-down",
                    grey: "s-badge__votes",
                },
                buttons: {
                    button: "s-btn",
                    primary: "s-btn__primary",
                    outlined: "s-btn__outlined",
                    danger: "s-btn__danger",
                    muted: "s-btn__muted",
                    loading: "is-loading",
                    small: "s-btn__sm",
                    xsmall: "s-btn__xs",
                    selected: "is-selected",
                    group: "s-btn-group",
                    notice: "s-notice--btn",
                    },
                tags: {
                    meta: "s-post-summary--meta",
                    metaTag: "s-post-summary--meta-tags",
                    tag: "s-tag",
                    legacyTag: "post-tag",
                },
                notice: {
                    toast: "s-toast",
                    base: "s-notice",
                    warning: "s-notice__warning",
                    padding: "p8",
                },
                postSummary: {
                    base: "s-post-summary",
                    stats: "s-post-summary--stats",
                    item: "s-post-summary--stats-item",
                    content: "s-post-summary--content",
                    contentTitle: "s-post-summary--content-title",
                    hasAnswers: "has-answers",
                    hasAccepted: "has-accepted-answer",
                    supernova: "is-supernova",
                    hot: "is-hot",
                    warm: "is-warm",
                    link: "s-link",
                    summaryAnswers: "s-post-summary--has-answer",
                    summaryAccepted: "s-post-summary--has-accepted-answer",
                    },
                postSummaryLegacy: {
                    contentBox: "narrow",
                    cursorPointer: "cp",
                    square: "mini-counts",
                    scoreClass: "votes",
                    viewsClass: "views",
                    answerClass: "status",
                    answered: "answered",
                    accepted: "answered-accepted",
                },
                summary: "fc-red-800",
                answers: "answer-hyperlink",
                filterDiff: "js-diff-choices",
                navigation: "s-navigation-tablist",
            },
            size: {
                gravatarSmall: "32",
                radio: "0.905em",
            },
            selectors: {
                postTitleFontSize: ".fs-title",
                actions: {
                    reviewTask: ".s-page-title--actions a",
                    radioActionsBox: ".js-actions-sidebar",
                    reviews: ".js-review-actions",
                },
                buttons: {
                    action: ".js-action-button",
                    submit: ".js-review-submit",
                    },
                reviews: {
                    done: ".js-reviews-done",
                    daily: ".js-reviews-per-day",
                    banner: "[role=status]",
                },
                filter: {
                    button: ".js-review-filter-button",
                    choices: ".js-review-filter-summary",
                    dialog: "#js-review-filter-id",
                },
                title: {
                    divwrapper: ".s-page-title",
                    actionsTabs: ".s-page-title--actions",
                    description: ".s-page-title--description",
                    learnMore: ".js-show-modal-from-nav.s-link",
                    title: ".s-page-title--text",
                    header: ".s-page-title--header",
                },
                content: {
                    content: ".js-review-content",
                    originalPost: ".js-question-title-link",
                    main: ".mainbar-full",
                    reviewPost: ".postcell",
                    reviewMargin: ".votecell",
                    revision: "#panel-revision",
                    tabs: ".js-review-tabs",
                    task: ".js-review-task",
                    diffs: ".diffs",
                },
                users: {
                    userReputation: ".reputation-score",
                    badges: ".v-visible-sr",
                    newContributorLabel: ".js-new-contributor-label",
                    pii: ".pii",
                },
                diffs: {
                    diffDelete: "span.diff-delete",
                    diffAdd: "span.diff-add",
                },
                acceptedAnswer: ".js-accepted-answer-indicator",
                fullReview: "content", // <-- no #. to be used with getElementById.
            },
    };


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function moveProgress() { // must wait for ajax
        if (deepGet(userConfig, "options.moveProgressBar") !== "Yes")
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

    function moveProgressToElement(element, colour, dailyElem, reviewedElem, hide = true) {

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
            // https://gist.github.com/tzi/2953155#gistcomment-2691879
            style.setProperty("color", progressTextColour, "important");
            action.textContent = `Review tasks (${reviewed}/${daily})`;
            return hideProgressBar(dailyElem);
        };

        moveProgressToTabs(element);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function changePageTitle() {
        if (deepGet(userConfig, "options.movePageTitleLink") !== "Yes")
            return;

        // -------    createGridCell    --------------------
        const createCell = (cnf) => {
            const elem = document.createElement("div");
            elem.classList.add(cnf.classes.display.cell);
            return elem;
        };

        // -------    removeTitleLines    --------------------
        const removeTitleLines = (cnf, wrapper) =>
            (wrapper || document)
                .querySelectorAll(cnf.selectors.title.description)
                .forEach((elem) => elem.remove());

        // -------    optimizePageTitle    --------------------
        const optimizePageTitle = (cnf) => {
            const { selectors: { title: { title, header: titleHeader, learnMore } },
                    classes: { spaces: { titleSpace }, display: { container } }
                  } = cnf;

            const titleWrap = document.querySelector(title);
            if (!titleWrap)
                return false;
            titleWrap.classList.add(container);
            const header = document.querySelector(titleHeader);
            const titleCell = createCell(cnf);
            titleCell.classList.add(titleSpace); // "ml12"
            if (header)
                titleCell.append(header);
            const learnMoreBtn = titleWrap.querySelector(learnMore);
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
        if (deepGet(userConfig, "options.AnswerQuestionOnTop") !== "Yes")
            return;

        // -------    movePosttype    -------------------------
        const movePosttype = (cnf) => {
            const { ids: {custom: { postType : postTypeId } },
                    selectors: { title: { divwrapper, header : titleHeader, actionsTabs },
                                 content: { content }, postTitleFontSize },
                    classes: { spaces: { marginBottom12 } }
                  } = cnf;

            const oldPostType = document.getElementById(postTypeId);
            if (oldPostType)
                oldPostType.remove();

            const titleDivWrap = document.querySelector(divwrapper);
            if (!titleDivWrap)
                return false;

            const moveIt = (element) => {
                const tabs = titleDivWrap.querySelector(actionsTabs);
                if (!tabs)
                    return false;
                titleDivWrap.insertBefore(element, tabs);

                return true;
            }

            // wiki tag edits put the "Review the following" in an h2 header, while other reviews puts them in .fs-title
            // however searching for ".js-review-content h2" might just find an h2 header in one of the posts!
            // and.. !!! sometimes there a tag wiki with an h2 header, but no .fs-title (and the tag information is missing!).

            let wikiedit = document.querySelector(`${content} h2`);                   // .js-review-content .h2
            let posttype = document.querySelector(`${content} ${postTitleFontSize}`); // .js-review-content .fs-title

            // this covers tag wiki edits where tags are present.
            if (posttype)
                wikiedit = posttype.previousElementSibling;
            const isWikiH2 = wikiedit?.tagName === "H2"; // if this isn't an h2 header, it's NOT a tag wiki.

            if (isWikiH2 && posttype) {
                wikiedit.remove();      // we don't need to see "Review the following tag wiki.."

                [...posttype.children]  // just move the tag information. That's what's important.
                        .forEach(link => link.style.fontSize = "1.6rem");
                posttype.classList.remove(marginBottom12); // "mb12"
                posttype.id = postTypeId;  // enable deletion of this in the next review task.

                moveIt(posttype);
                return;

            } else {
                // this is an old or strange inconsistent wiki tag review task.
                // the .fs-title part is missing and there are no tags
                if (isWikiH2) posttype = wikiedit;
            }

            if (!posttype)
                return false;

            const header = titleDivWrap.querySelector(titleHeader);
            if (!header)
                return false;

            const postCell = header.cloneNode();
            postCell.id = postTypeId;
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
            const matchResult = posttype.textContent?.match(/^Review the following (.*) edit$/) || "";
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

            if (moveIt(postCell))
                posttype.remove();
        };

        movePosttype(config);
    }


    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    function insertEditorStatistics(editorUserCard, editorUserid) {

        // -------    getSuggestionsUserStats    --------------------
        const getSuggestionsUserStats = async (id) => {
            // https://chat.stackoverflow.com/transcript/message/52688684#52688684
            // See https://api.stackexchange.com/docs ("users/{ids}/suggested-edits")

            const apiEndpointUrl = new URL(`${API_BASE}/${API_VER}/users/${id}/suggested-edits`);
            const params = {
                site     : HOST_NAME,
                filter   : "!3xgWlhxc4ZsL1tY5Y",     // only include approval_date and rejection_date
                key      : config.apiKey,
                pagesize : 100
            };
            apiEndpointUrl.search = new URLSearchParams(params).toString();

            const wait = (milliseconds) => {
                return new Promise(resolve => setTimeout(resolve, milliseconds));
            };

            async function makeApiCall(apiEndpointUrl, page) {
                try {
                    const apiCall = await fetch(`${apiEndpointUrl.toString()}&page=${page}`);
                    return apiCall.ok
                               ? apiCall.json()
                               : { };
                } catch (error) {
                    console.error(USERSCRIPTNAME + " - error fetching editor stats from the API - makeApiCall", error);
                }
            }

            const allApiItems = [];
            let hasMore = true
            let pageNumber = 1;
            let backoffSeconds = 0;

            while (hasMore) {
                const result = await makeApiCall(apiEndpointUrl, pageNumber);
                const { items = [], has_more, backoff = 0} = result;

                hasMore = has_more;
                pageNumber++;
                allApiItems.push(...items);

                checkAPIResult(result);

                await wait(backoff * 1000);
            }
            return allApiItems;
        };

        // Create a container div and put the editorUserCard into it. Then add the stats into it too.
        const superDiv = document.createElement("div");
        superDiv.classList.add(config.classes.display.container);
        editorUserCard.before(superDiv);
        superDiv.appendChild(editorUserCard);

        const { colour : displayColours } = userConfig;
        const relativeFontSize = userConfig.size.editorStatistics;

        if (editorUserid < 0) { // https://stackoverflow.com/users/-1/community
            superDiv.appendChild(createEditorStatisticsItem([], displayColours, relativeFontSize, -1));
        } else {
            getSuggestionsUserStats(editorUserid)
                .then((result) => superDiv.appendChild(
                                               createEditorStatisticsItem(result,
                                                                          displayColours,
                                                                          relativeFontSize,
                                                                          editorUserid)
                 ));
        }
    }


    // --------------------------------------------------------------------------------------------
    // ---- Workaround for splitting up "insertEditorStatistics" into two functions ---------------
    function createEditorStatisticsItem(suggestions, displayColours, relativeFontSize, userId = 0) {

        // -------    createEditorStatsItem    --------------------
        const createEditorStatsItem = (suggestions, displayColours, relativeFontSize, userId) => {
            const { approved, rejected, total,
                   ratio: { approvedToRejected, ofApproved, ofRejected }
                  } = getSuggestionTotals(suggestions);

            // https://chat.stackoverflow.com/transcript/message/52203332#52203332 (code-review)
            // https://chat.stackoverflow.com/transcript/message/52203389#52203389 (...spreading)
            const commonColour = { colour: displayColours.editorHeader };

            const itemParams = {
                relativeFontSize: relativeFontSize,
                header: { ...commonColour, items: ["Editor Statistics (non-deleted posts)"], userId: userId},
                rows: [],
            };

            if (userId < 0) {
                itemParams.rows.push({ ...commonColour, items: [EMPTY]});
                itemParams.rows.push({ ...commonColour, items: ["This user does not suggest edits :)"]});
                return createItem(makeTable(itemParams));
            }

            if (!total) {
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
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
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

            suggestions
                .forEach(({ approval_date, rejection_date }) => {
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
        const makeCells = (cells) => {
            return cells
                       .map((content) => {
                                const cell = document.createElement("td");
                                cell.innerText = content;
                                return cell;
                        });
        };

        // -------    makeHead    --------------------
        const makeHead = (header) => {
            const bold = document.createElement("b");
            bold.innerText = header.items[0];

            const cell = document.createElement("th");
            cell.colSpan = 4;

            if (header.userId > 0) { // it's a valid userId
                const link = document.createElement("a");
                link.style.color = header.colour;
                const originSite = window.location.origin;
                if (originSite)
                    link.href = `${originSite}/users/${header.userId}?tab=activity&sort=suggestions`;
                link.append(bold);
                cell.append(link);
            } else {
                cell.append(bold);
            }

            return cell;
        };

        // -------    makeRow    --------------------
        const makeRow = (row, isHead = false) => {
            const tr = document.createElement("tr");
            tr.style.color = row.colour;
            if (isHead) {
               tr.append(makeHead(row));
            } else {
               tr.append(...makeCells(row.items));
            }
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
            const listItems = rows.map(subArray => makeRow(subArray));
            tab.append(...listItems);
            return tab;
        };

        // -------    createItem    --------------------
        const createItem = (...contents) => {
            const elem = document.createElement("div");
            elem.classList.add(config.classes.display.cell);
            elem.append(...contents);
            return elem;
        };

        return createEditorStatsItem(suggestions, displayColours, relativeFontSize, userId);
    }


    // --------------------------------------------------------------------------------------------
    // ---- Make it happen ------------------------------------------------------------------------

    // https://chat.stackoverflow.com/transcript/message/52214837#52214837 (code-review)

    const almostAll = (unFocusedTab = false) => {

        // Has this particular review already been loaded and handled?
        const [ reviewId ] = window.location.pathname.split("/").slice(-1);
        if (window[PREFIX + "-reviewID"] === reviewId)
            return;
        window[PREFIX + "-reviewID"] = reviewId;

        // Hides the Big Box with review radio options..
        const radioVsButtons = deepGet(userConfig, "options.radioVsButtons");
        const moveRadioBox = radioVsButtons?.moveRadioBox;
        const keepRadios   = radioVsButtons?.keepRadios;
        if (moveRadioBox === "Yes") {
            if (keepRadios !== "Yes") {
                shadowRadiosToButtons(unFocusedTab);  // ..and replaces them with buttons on the Filter button level.
            } else {
                moveRadio(unFocusedTab);              // ..and moves the items (still as radios) on the Filter button level.
            }
        }

        moveProgress();        // Puts " (0/40)" on the "Review tasks" tab instead of "Your daily reviews 0 /40 (-----)"
        movePostTypeUp();      // Removes "Review the following answer/question edit"
        highlightSummary();    // Makes the edit summary noticeable
        highlightMessage();    // Makes a review message to the reviewer more noticeable
        keepDiffChoices();     // Restore diff choices for title diffs.
        moveDiffChoices();     // Moves the "Inline | Side-by-side | Side-by-side markdown"
        getUserCards();        // Gets back the user cards! :)
        addSeparator();        // Adds a border separator between the post summary and the review
        reduceFilter();        // Do not fill up the filter div line with text.
        moveNoticeButtons();   // Moves the "Reviewer stats" and "Next task" buttons on notices.
        addLinksToTitles();    // Adds link to all Question titles.
        StackSummary();        // Changes the post summary to comply with Stack Design.
        replaceBrokenImages(); // Because it's better to have an image of a broken image.
    };

    changePageTitle();         // Removes redundant information and moves the "Learn more"
    removeLineThrough();       // Removes the strike through of text that is already highlighted in red

    ajaxCompleteWrapper(almostAll);

    // So it still works when the review is opened up in a different tab.
    document.addEventListener("visibilitychange", () => almostAll(true));

    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // --------------------------------------------------------------------------------------------
    // ---- The GUI with the icon on the top right ------------------------------------------------

    userInterfaceSettings();

    function userInterfaceSettings() {

        // ----------------------------------------------------------------------------------------
        // ----------------------------------------------------------------------------------------
        const imgHOST = "https://i.stack.imgur.com/";
        // const isLIGHT = getCSSVariableValue(siteBACKGROUNDcolour) === "#ffffff";
        // const isLIGHT = getComputedStyle(document.body)
        //                    .getPropertyValue(siteBACKGROUNDcolour.replace("var(","").replace(")"),"")
        //                === "#ffffff";
        const isLIGHT = !document.body.classList.contains("theme-dark");

        const PREFIXMODAL = PREFIX + "-modal-";

        // ----------------------------------------------------------------------------------------
        // ---- Config and map for modal elements -------------------------------------------------

        // https://stackoverflow.design/product/components/modals/

        const modalConfig = {
                headerNtooltip: USERSCRIPTNAME + " - Settings",
                ids: {
                    icon:              PREFIXMODAL + "icon",
                    header:            PREFIXMODAL + "title",
                    body:              PREFIXMODAL + "body",
                    aside:             PREFIXMODAL + "base",
                    radioName:         PREFIXMODAL + "radioName",
                    radioButtons:      PREFIXMODAL + "RadioStyleChange",
                    radioButtonLabel:  PREFIXMODAL + "radioLabel",
                    lineThrough:       PREFIXMODAL + "previewLineThough",
                    keepDiffChoices:   PREFIXMODAL + "keepDiffChoices",
                    quotaNotice:       PREFIXMODAL + "quotaNotice",
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
                    radios: {
                        base: "s-radio",
                        radioAction: "js-action-radio",
                    },
                    scroll: "overflow-y-scroll",
                    select: "s-select",
                    input: "s-input",
                    label: "s-label",
                    header: "js-user-header",
                    // pe-none => pointer-events: none; to ensure click events won't be fired
                    // https://stackoverflow.design/product/base/interactivity/#pointer-events
                    pointerEventsNone: "pe-none"
                },
                attributes: {
                    draggableTarget: "data-se-draggable-target",
                    modalTarget: "data-s-modal-target",
                },
                colours: {
                    toggleMutedOn: "var(--green-050)",
                    toggleMutedoff: "var(--black-150)",
                    muted: "var(--mp-muted-color)",
                    active: "var(--fc-dark)",
                    seperator: "var(--black-200)",
                    border: "var(--black-075)",
                },
                sizes: {
                    editorAvatar: {
                        width: "200px",
                        height: "66px",
                    },
                    labels: {
                        fontSizeToggles: "1.15384615rem",
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
                 id: PREFIXMODAL + "RadiosOrButtons",
                 tabDefault: true,
                 previewUpdates: {
                     radiosButtons:
                         (tabName) => previewRadiosOrButtonsOnf(
                                          tabName,
                                          "None, radios or buttons",
                                          "Box, radios or buttons",
                                          "Click Area",
                                          "Tooltips"),
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
                      create: () => previewRadiosOrButtons(),
                      displayOrder: 9,
                     },
                     {
                      name: "Click Area",
                      type: "preview",
                      create: () => createPreviewStyledBackground(),
                      displayOrder: 11,
                     },
                     {
                      name: "Tooltips",
                      type: "preview",
                      create: () => createPreviewStyledBackground(),
                      displayOrder: 4,
                     },
                     {
                      name: "Move review actions",
                      id: PREFIXMODAL + "moveReviewActions",
                      configKey: "options.radioVsButtons.moveRadioBox",
                      type: "toggle",
                      toggleEntry: "Move review actions",
                      dependents: ["Keep radio buttons",
                                   "Add tooltips"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 1,
                     },
                     {
                      name: "Keep radio buttons",
                      id: PREFIXMODAL + "keepRadioButtons",
                      configKey: "options.radioVsButtons.keepRadios",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      dependents: ["with borders",
                                   "Large click area"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 5,
                     },
                     {
                      name: "with borders",
                      id: PREFIXMODAL + "radiosWithBorders",
                      configKey: "options.radioVsButtons.radioWithBorders",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      dependents: ["Border colour",
                                   "Border width"],
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 6,
                     },
                     {
                      name: "Border colour",
                      id: PREFIXMODAL + "radiosBordersColour",
                      configKey: "colour.radioSeperator",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["radiosButtonsDetails"],
                      displayOrder: 7,
                     },
                     {
                      name: "Border width",
                      id: PREFIXMODAL + "radiosSizeColour",
                      configKey: "size.radioSeperator",
                      type: "select",
                      postfix : "px",
                      values: [1,2,3,4,5],
                      indents: 2,
                      refPreviewUpdates: ["radiosButtonsDetails"],
                      displayOrder: 8,
                     },
                     {
                      name: "Large click area",
                      id: PREFIXMODAL + "largeClickArea",
                      configKey: "options.radioVsButtons.largerClickArea",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 10,
                     },
                     {
                      name: "Add tooltips",
                      id: PREFIXMODAL + "Tooltips",
                      configKey: "options.radioVsButtons.tooltips",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Move review actions",
                      refPreviewUpdates: ["radiosButtons"],
                      displayOrder: 3,
                     },
                 ],
               },
               {
                 tabMenu: "User Cards",
                 id: PREFIXMODAL + "UserCards",
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
                     StackUsercards:
                         (tabName) => previewStackUsercardsUpdate(
                                          tabName,
                                          "Preview Stack user cards"),
                 },
                 needIntiliatize: ["userCards",
                                   "StackUsercards"],
                 bottomSpace: ["Add user cards",
                               "Stack Design user cards"],
                 items: [
                     {
                      name: "All user Cards",
                      type: "preview",
                      create: () => previewUserCards(),
                      displayOrder: 3,
                     },
                     {
                      name: "Editor Statistics",
                      type: "preview",
                      create: () => previewEditorStatistics(),
                      displayOrder: 10,
                     },
                     {
                      name: "Preview Stack user cards",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 13,
                     },
                     {
                      name: "Editors do not get the \"New contributor\" indicator. This is only for demonstration purpose.",
                      id: PREFIXMODAL + "newContributorNote",
                      type: "note",
                      indents: 1,
                      displayOrder: 14,
                     },
                     {
                      name: "Add user cards",
                      id: PREFIXMODAL + "addUserCards",
                      configKey: "options.userCards.getUserCards",
                      type: "toggle",
                      toggleEntry: "Add user cards",
                      dependents: ["with editor statistics",
                                   "Stack Design user cards"],
                      refPreviewUpdates: ["userCards"],
                      displayOrder: 1,
                     },
                     {
                      name: "with editor statistics",
                      id: PREFIXMODAL + "withEditorStatistics",
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
                      id: PREFIXMODAL + "editorStatisticsOptions",
                      type: "header",
                      indents: 1,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 4,
                     },
                     {
                      name: "Header colour",
                      id: PREFIXMODAL + "editorStatisticsHeaderColour",
                      configKey: "colour.editorHeader",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 5,
                     },
                     {
                      name: "Approved colour",
                      id: PREFIXMODAL + "editorStatisticsApprovedColour",
                      configKey: "colour.editorApproved",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 6,
                     },
                     {
                      name: "Rejected colour",
                      id: PREFIXMODAL + "editorStatisticsRejectedColour",
                      configKey: "colour.editorRejected",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 7,
                     },
                     {
                      name: "Total colour",
                      id: PREFIXMODAL + "editorStatisticsTotalColour",
                      configKey: "colour.editorTotal",
                      type: "colour",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 8,
                     },
                     {
                      name: "Editor statistics text size",
                      id: PREFIXMODAL + "editorStatisticsSize",
                      configKey: "size.editorStatistics",
                      type: "size",
                      postfix: "%",
                      indents: 2,
                      refPreviewUpdates: ["editorStatistics"],
                      displayOrder: 9,
                     },
                     {
                      name: "Stack Design user cards",
                      id: PREFIXMODAL + "StackUserCards",
                      configKey: "options.userCards.useStackUserCards",
                      type: "toggle",
                      toggleEntry: "Add user cards",
                      indents: 1,
                      dependents: ["Show \"New contributor\""],
                      refPreviewUpdates: ["StackUsercards"],
                      displayOrder: 11,
                     },
                     {
                      name: "Show \"New contributor\"",
                      id: PREFIXMODAL + "ShowNewContributor",
                      configKey: "options.userCards.newContributor",
                      type: "toggle",
                      toggleEntry: "Add user cards",
                      indents: 1,
                      refPreviewUpdates: ["StackUsercards"],
                      displayOrder: 12,
                     },
                 ],
               },
               {
                 tabMenu: "Move",
                 id: PREFIXMODAL + "Move",
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
                     moveNextButton:
                         (tabName) => previewMoveNextButtonsOnf(
                                          tabName,
                                          "Move Next Buttons"),
                 },
                 needIntiliatize: ["moveNextButton"],
                 topSpaceSeparator: ["Move diff choices",
                                     "Rework page title",
                                     "Move post type up",
                                     "Move notice buttons"],
                 items: [
                     {
                      name: "Progress Bar",
                      type: "preview",
                      create: () => previewProgressBar(),
                      displayOrder: 5,
                     },
                     {
                      name: "Diff Choices",
                      type: "preview",
                      create: () => previewDiffChoices(),
                      displayOrder: 7,
                     },
                     {
                      name: "Page Title Link",
                      type: "preview",
                      create: () => previewPageTitleLink(),
                      displayOrder: 9,
                     },
                     {
                      name: "Post Type",
                      type: "preview",
                      create: () => previewMovePostType(),
                      displayOrder: 11,
                     },
                     {
                      name: "Post Type Colour Preview",
                      type: "preview",
                      create: () => previewMovePostTypeColour(),
                      displayOrder: 13,
                     },
                     {
                      name: "Move Next Buttons",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 15,
                     },
                     {
                      name: "Move progress bar",
                      id: PREFIXMODAL + "moveProgressBar",
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
                      id: PREFIXMODAL + "progressDoneColour",
                      configKey: "colour.progressDone",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 2,
                     },
                     {
                      name: "Progress \"not done\" colour",
                      id: PREFIXMODAL + "progressNotDoneColour",
                      configKey: "colour.progressNotDone",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 3,
                     },
                     {
                      name: "Progress text colour",
                      id: PREFIXMODAL + "progressTextColour",
                      configKey: "colour.progressTextColour",
                      type: "colour",
                      refPreviewUpdates: ["progressBar"],
                      displayOrder: 4,
                     },
                     {
                      name: "Move diff choices",
                      id: PREFIXMODAL + "movePageTitleLink",
                      configKey: "options.moveDiffChoices",
                      type: "toggle",
                      refPreviewUpdates: ["diffChoices"],
                      displayOrder: 6,
                     },
                     {
                      name: "Rework page title",
                      id: PREFIXMODAL + "movePageTitleLink",
                      configKey: "options.movePageTitleLink",
                      type: "toggle",
                      refPreviewUpdates: ["pageTitleLink"],
                      displayOrder: 8,
                     },
                     {
                      name: "Move post type up",
                      id: PREFIXMODAL + "AnswerQuestionOnTop",
                      configKey: "options.AnswerQuestionOnTop",
                      type: "toggle",
                      toggleEntry: "Move post type up",
                      dependents: ["Post type colour"],
                      refPreviewUpdates: ["postType","postTypeColour"],
                      displayOrder: 10,
                     },
                     {
                      name: "Post type colour",
                      id: PREFIXMODAL + "postTypeColour",
                      configKey: "colour.postType",
                      type: "colour",
                      refPreviewUpdates: ["postTypeColour"],
                      displayOrder: 12,
                     },
                     {
                      name: "Move notice buttons",
                      id: PREFIXMODAL + "moveNoticeButtons",
                      configKey: "options.moveNextButtons",
                      type: "toggle",
                      toggleEntry: "Move notice buttons",
                      refPreviewUpdates: ["moveNextButton"],
                      displayOrder: 14,
                     },
                 ],
               },
               {
                 tabMenu: "Highlight",
                 id: PREFIXMODAL + "Highlight",
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
                      create: () => previewSummary(),
                      displayOrder: 4,
                     },
                     {
                      name: "Message Preview",
                      type: "preview",
                      create: () => previewMessage(),
                      displayOrder: 9,
                     },
                     {
                      name: "Line through",
                      type: "preview",
                      create: () => previewLineThough(),
                      displayOrder: 11,
                     },
                     {
                      name: "Highlight edit summary",
                      id: PREFIXMODAL + "highlightsummary",
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
                      id: PREFIXMODAL + "summaryColour",
                      configKey: "colour.summary",
                      type: "colour",
                      refPreviewUpdates: ["summaryUpdate"],
                      displayOrder: 2,
                     },
                     {
                      name: "Edit summary size",
                      id: PREFIXMODAL + "summarySize",
                      configKey: "size.summary",
                      postfix: "%",
                      type: "size",
                      refPreviewUpdates: ["summaryUpdate"],
                      displayOrder: 3,
                     },
                     {
                      name: "Prominent review message",
                      id: PREFIXMODAL + "prominentReviewMessage",
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
                      id: PREFIXMODAL + "reviewMessageColour",
                      configKey: "colour.message",
                      type: "colour",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 6,
                     },
                     {
                      name: "Review message size",
                      id: PREFIXMODAL + "reviewMessageSize",
                      configKey: "size.message",
                      postfix: "%",
                      type: "size",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 7,
                     },
                     {
                      name: "Review message background colour",
                      id: PREFIXMODAL + "reviewMessageBackgroundColour",
                      configKey: "colour.messageBackground",
                      type: "colour",
                      refPreviewUpdates: ["messageUpdate"],
                      displayOrder: 8,
                     },
                     {
                      name: "Remove LineThrough",
                      id: PREFIXMODAL + "removeLineThrough",
                      configKey: "options.removeLineThrough",
                      type: "toggle",
                      refPreviewUpdates: ["lineThrough"],
                      displayOrder: 10,
                     },
                 ],
               },
               {
                 tabMenu: "Extras",
                 id: PREFIXMODAL + "Extras",
                 previewUpdates: {
                     titleLinks:
                         (tabName) => previewTitleLinksOnf(
                                          tabName,
                                          "Title links"),
                     keepDiffs:
                         (tabName) => previewKeepDiffChoicesUpdate(
                                          tabName,
                                          "Keep Diff Choices"),
                     newSummary:
                         (tabName) => previewStackSummaryOnf(
                                          tabName,
                                          "Stack Summary"),
                     quota:
                         (tabName) => previewNoticeUpdate(
                                          tabName,
                                          "Quota Notice Limit"),
                     filters:
                         (tabName) => previewFilterListUpdate(
                                          tabName,
                                          "Filter Options"),
                     modFlair:
                         (tabName) => previewStackModeratorOnf(
                                          tabName,
                                          "Moderator Flair"),
                 },
                 needIntiliatize: ["titleLinks",
                                   "newSummary",
                                   "filters",
                                   "modFlair"],
                 topSpaceSeparator: ["Always diff choices",
                                     "Stack Design post summary",
                                     "API quota warning:",
                                     "Remove plain filters",
                                     "Stack Design moderator flair"],
                 bottomSpace: ["Stack Design post summary",
                               "Remove plain filters",
                               "Insert alert icon"],
                 items: [
                     {
                      name: "Title links",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 2,
                     },
                     {
                      name: "Keep Diff Choices",
                      type: "preview",
                      create: () => previewKeepDiffChoices(),
                      displayOrder: 5,
                     },
                     {
                      name: "Stack Summary",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 8,
                     },
                     {
                      name: "Quota Notice Limit",
                      type: "preview",
                      create: () => previewNotice(),
                      displayOrder: 11,
                     },
                     {
                      name: "Filter Options",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 15,
                     },
                     {
                      name: "Moderator Flair",
                      type: "preview",
                      create: () => createPreviewImageContainer(),
                      displayOrder: 17,
                     },
                     {
                      name: "Applies to \"Stack Design user cards\" and \"Stack Design post summary\"",
                      id: PREFIXMODAL + "onlyStackDesignNote",
                      type: "note",
                      indents: 1,
                      displayOrder: 18,
                     },
                     {
                      name: "Links in titles",
                      id: PREFIXMODAL + "linksInTitles",
                      configKey: "options.linksOnTitles",
                      type: "toggle",
                      refPreviewUpdates: ["titleLinks"],
                      displayOrder: 1,
                     },
                     {
                      name: "Always diff choices",
                      id: PREFIXMODAL + "keepDiffChoices",
                      configKey: "options.keepDiffChoices",
                      type: "toggle",
                      toggleEntry: "Always diff choices",
                      dependents: ["added diff choices colour"],
                      refPreviewUpdates: ["keepDiffs"],
                      displayOrder: 3,
                     },
                     {
                      name: "added diff choices colour",
                      id: PREFIXMODAL + "keepDiffChoicesColour",
                      configKey: "colour.diffChoices",
                      type: "colour",
                      refPreviewUpdates: ["keepDiffs"],
                      displayOrder: 4,
                     },
                     {
                      name: "Stack Design post summary",
                      id: PREFIXMODAL + "StackPostSummary",
                      configKey: "options.postSummary.useStackSummary",
                      type: "toggle",
                      toggleEntry: "Stack Design post summary",
                      refPreviewUpdates: ["newSummary"],
                      displayOrder: 6,
                     },
                     {
                      name: "Using Stack Exchange API",
                      id: PREFIXMODAL + "StackPostSummary",
                      configKey: "options.postSummary.useAPI",
                      type: "toggle",
                      toggleEntry: "Using Stack Exchange API",
                      displayOrder: 7,
                     },
                     {
                      name: "API quota warning:",
                      id: PREFIXMODAL + "quotaWarning",
                      type: "header",
                      indents: 0,
                      displayOrder: 9,
                     },
                     {
                      name: "show at (0 - 9999)",
                      id: PREFIXMODAL + "quotaLimit",
                      configKey: "size.apiQuotaLimit",
                      type: "size",
                      maxValue: 9999,
                      refPreviewUpdates: ["quota"],
                      displayOrder: 10,
                     },
                     {
                      name: "Remove plain filters",
                      id: PREFIXMODAL + "RemovePlainFilters",
                      configKey: "options.reviewFilters.removeTextFilters",
                      type: "toggle",
                      toggleEntry: "Remove plain filters",
                      dependents: ["Insert alert icon",
                                   "Show TinyTags™"], // https://codepoints.net/U+2122 TRADE MARK SIGN
                      refPreviewUpdates: ["filters"],
                      displayOrder: 12,
                     },
                     {
                      name: "Insert alert icon",
                      id: PREFIXMODAL + "InsertAlertIcon",
                      configKey: "options.reviewFilters.putAlertIcon",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Remove plain filters",
                      refPreviewUpdates: ["filters"],
                      displayOrder: 13,
                     },
                     {
                      name: "Show TinyTags™", // https://codepoints.net/U+2122 TRADE MARK SIGN
                      id: PREFIXMODAL + "InsertAlertIcon",
                      configKey: "options.reviewFilters.keepFilterList",
                      type: "toggle",
                      indents: 1,
                      toggleEntry: "Remove plain filters",
                      refPreviewUpdates: ["filters"],
                      displayOrder: 14,
                     },
                     {
                      name: "Stack Design moderator flair",
                      id: PREFIXMODAL + "StackModeratorFlair",
                      configKey: "options.wantNewModeratorFlair",
                      type: "toggle",
                      toggleEntry: "Stack Design moderator flair",
                      refPreviewUpdates: ["modFlair"],
                      displayOrder: 16,
                     },
                 ],
               },
        ];


        // ----------------------------------------------------------------------------------------
        // ---- Resetting to default  -------------------------------------------------------------

        function reset(cancel = false) {

            if (cancel) {

                modalElements                      // have to go through the modalElements
                    .forEach(modalElement => {     // since most of them are not in the DOM.
                                 resetTab(modalElement, tempUserConfig); // reset to last saved settings.
                     });

            } else {                               // reset the tab to default values

                const tabContent = document.querySelector(`#${modalConfig.ids.body} > div`);
                const modalElement = objectFromId(modalElements, tabContent.id);
                resetTab(modalElement, defaultUserConfig); // reset to default.

            }

            function resetTab(modalConfigElement, configObject) {
                modalConfigElement
                    .items
                    .forEach(item => {
                                 const element = item.element;
                                 const id = item.id;
                                 if (id) {        // Not all elements have an id
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
                    number:       (el) => el.value   = deepGet(configObject, key)?.replace(item.postfix, "")
                                                       || deepGet(defaultUserConfig, key)?.replace(item.postfix, "") || "",
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
        // removeFromStorage()  // For testing purposes

        // Just add the icon. Then wait until it's clicked.
        // insertIcon();                    // No Svg..
        ajaxCompleteWrapper(insertIcon);    // ..unless we wait


        // ----------------------------------------------------------------------------------------
        // ---- Setting up the modal --------------------------------------------------------------

        function insertIcon() {
            const { show,
                    topMenuSelector,
                    headerNtooltip,
                    ids: { icon : iconId },
                    classes: { icon, smodals: { modal } }
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
                settingsLink.textContent = "⚙️"; // https://emojipedia.org/gear/
                settingsLink.style.fontSize = "125%";
            }
            settingsLink.title = headerNtooltip; // tooltip

            // The settings-item on the top bar
            const settingsItem = document.createElement("li");
            settingsItem.classList.add(icon.iconItem);
            settingsItem.id = iconId;
            settingsItem.append(settingsLink);

            const topBar = document.querySelector(topMenuSelector);
            topBar?.append(settingsItem);

            // loads the GUI for the settings
            settingsItem.addEventListener("click", () => {
                const aside = createModalAside(loadIt());
                settingsItem.append(aside);
                settingsLink.dataset.action = show;
                settingsItem.dataset.controller = modal;

                // The GUI needs to load first..
                setTimeout(() => settingsLink.click(), 0);
                                 // alternative Stacks.showModal(settingsItem);
            }, { once: true });

        }

        // -------------------------------
        function createModalAside(linkToModal) {
            const { ids: { aside : asideId },
                    classes: { smodals: { modal } },
                    attributes: { modalTarget }
                  } = modalConfig;

            // aside holds the modal. Activates when clicking on the icon
            const modalAside = document.createElement("aside");
            modalAside.classList.add(modal);
            modalAside.id = asideId;
            modalAside.setAttribute(modalTarget, "modal");
            modalAside.append(linkToModal);

            return modalAside;
        }


        // ----------------------------------------------------------------------------------------
        // ---- This loads the GUI  ---------------------------------------------------------------

        function loadIt() { // fires on the first click on the icon.
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
            const { draggable,
                    classes: { smodals: { dialog } }
                  } = modalConfig;

            const stackModal = document.createElement("div");
            stackModal.classList.add(dialog);
            stackModal.dataset.controller = draggable;
            return stackModal;
        }

        // -------------------------------
        function createModalHeader() {
            const { headerNtooltip,
                    ids: { header : headerId },
                    classes: { smodals: { header } },
                    attributes: { draggableTarget }
                  } = modalConfig;

            const modalHeader = document.createElement("h3");
            modalHeader.classList.add(header);
            modalHeader.setAttribute(draggableTarget, "handle");
            modalHeader.id = headerId;
            modalHeader.style.fontSize = "1.72rem";
            modalHeader.textContent = headerNtooltip;
            return modalHeader;
        }

        // -------------------------------
        function createFooterButtons() {
            const { display: { cell, container },
                    buttons: { button : basebutton, primary, danger, outlined }
                  } = config.classes;
            const { hide,
                    classes: { smodals: { footer }, margins: { negative, zeroX } }
                  } = modalConfig;

            const saveButton   = createModalButton("Apply & Exit", [cell, basebutton, primary]);
            const cancelButton = createModalButton("Cancel",       [cell, basebutton]);

            saveButton.addEventListener("click", () => updateStorage(tempUserConfig));
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
            restoreButton.addEventListener("click", (event) => reset(false)); // false means the tab to default.

            const allButtons = document.createElement("div");
            allButtons.classList.add(container, negative, zeroX, footer);
            allButtons.style.justifyContent = "space-between";
            allButtons.append(restoreButton, buttons);

            return allButtons;
        }

        // -------------------------------
        function createCloseXButton() {
            const { buttons: { button : basebutton, muted } } = config.classes;
            const { hide,
                    classes: { smodals: { close } }
                  } = modalConfig;

            const closeButton = createModalButton("", [close, basebutton, muted]);
            if (typeof Svg !== "undefined") {
                closeButton.append(Svg.ClearSm().get(0));
            } else {
                closeButton.textContent = "✖"; // https://codepoints.net/U+2716 HEAVY MULTIPLICATION X
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
            const { ids: { body : bodyId },
                    classes: { scroll, smodals: { body } }
                  } = modalConfig;

            // https://css-tricks.com/the-current-state-of-styling-scrollbars/
            // https://htmldom.dev/create-a-custom-scrollbar/
            const modalBody = document.createElement("div");
            modalBody.classList.add(body); //, "js-user-panel-content");
            modalBody.id = bodyId;
            modalBody.style.paddingTop = "20px";

            // Make the body scroll without effecting the tabs nor the buttons
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
            const { classes: { naviagations: { base }, header } } = modalConfig;

            const navigation = document.createElement("ul");
            navigation.classList.add(base, header);
            return navigation;
        }

        // -------------------------------
        function createNavigationItem(textContent, selected = false) {
            const { classes: { naviagations: { item : navigationItem,
                                               selected : navigationSelected } }
                  } = modalConfig;

            const item = document.createElement("li");
            item.classList.add(navigationItem);
            if (selected)
                item.classList.add(navigationSelected);
            item.textContent = textContent;
            return item;
        }

        // -------------------------------
        function linkNavigationToContent(navigationContainer, navigationItem, modalContainer, modalContent) {
            const { classes: { naviagations: { selected : navigationSelected } } } = modalConfig;

            navigationItem
                .addEventListener("click",
                                  () => {[...navigationContainer.children]
                                             .forEach(item => item.classList.remove(navigationSelected));
                                         modalContainer.replaceChild(modalContent, modalContainer.firstElementChild);
                                         navigationItem.classList.add(navigationSelected);
                 });
        }

        // -------------------------------
        function createContentnNavigationTabs(navigation, modalContentContainer) {
            const navigationItems =
                      modalElements
                          .map(tabItem => {
                                   const contentTab = createTabBody(tabItem.tabMenu);
                                   const navigationItem = createNavigationItem(tabItem.tabMenu,
                                                                               tabItem.tabDefault);
                                   if (tabItem.tabDefault)
                                        modalContentContainer.append(contentTab);
                                   linkNavigationToContent(navigation,
                                                           navigationItem,
                                                           modalContentContainer,
                                                           contentTab);
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
                      note:    createNoteGet,
            };

            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
            const elements = tab.items
                                 .sort((firstItem, secondItem) =>
                                            firstItem.displayOrder - secondItem.displayOrder)
                                 .map(item => elementFunctionMap[item.type](item.name, tabName));

            (tab.needIntiliatize || [])
               .forEach(initialise => tab.previewUpdates[initialise](tabName));

            (tab.bottomSpace || [])
               .forEach(itemName => addBottomSpace(objectFromName(tab.items, itemName).element));

            (tab.topSpaceSeparator || [])
               .forEach(itemName => addTopSpaceSeparator(objectFromName(tab.items, itemName).element));

            initEnableDisable(tabName);

            const modalContent = document.createElement("div");
            modalContent.id = objectFromTabname(modalElements, tabName).id;
            modalContent.append(...elements);

            return modalContent;
        }


        // ----------------------------------------------------------------------------------------
        // ---- Element templates -----------------------------------------------------------------
        const indentPIXELS = 15;

        // -------------------------------
        function getPreviewUpdateFunctions(item, tabMenu) {
            const previewFunctions = item.refPreviewUpdates || [];
            const tab = objectFromTabname(modalElements, tabMenu);
            return previewFunctions.map(key => tab.previewUpdates[key]);
        }


        // -------------------------------
        function createContainer() {
            const { container : flex, center } = config.classes.display;

            const container = document.createElement("div");
            container.classList.add(flex, center);
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
            selectInput
                .addEventListener("change",
                                  (event) => {
                                      deepSet(tempUserConfig, item.configKey, event.target.value);
                                      previewUpdateFunctions.forEach(foonction => foonction(tabMenu));
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
                                        fontSize:     fontSizeSmaller,  //"1.10rem"
                                        width:        "160px",
                                        alignIndents: indents,
                                        fontWeight:   fontWeightSmaller //"525"
                                      });
            const selectInputs = document.createElement("select");
            selectInputs.id = selectInputId;
            const selectOptions =
                      options
                          .map(selectOption => {
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
                                          { fontSize: fontSizeSmaller, fontWeight: fontWeightSmaller });

            selectInputContainer.append(label, outerSelectInputs, postlabel);

            return selectInputContainer;
        }


        // -------------------------------
        function createSizeInputGet(labelText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, labelText);
            const sizeInput = createSizeInput(labelText,
                                              item.id,
                                              deepGet(tempUserConfig, item.configKey),
                                              item.maxValue || 250,
                                              item.postfix,
                                              item.indents);
            item.element = sizeInput;

            const previewUpdateFunctions = getPreviewUpdateFunctions(item, tabMenu);
            sizeInput
                .addEventListener("change",
                                  (event) => {
                                      deepSet(tempUserConfig,
                                              item.configKey,
                                              event.target.value + (item.postfix || ""));
                                      previewUpdateFunctions.forEach(foonction => foonction(tabMenu));
                 });

            return sizeInput;
        }

        // -------------------------------
        function createSizeInput(labelText, sizeInputId, option, maxValue, postfix, indents = 1) {
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
            sizeInput.type = "number";
            sizeInput.min = "0";

            sizeInput.max = maxValue;
            sizeInput.id = sizeInputId;
            if (option) sizeInput.value = option.replace(postfix, "");
                                     // 8 per digit, 16 offset, 12 for the arrows
            sizeInput.style.width = (Math.ceil(Math.log10(maxValue)) * 8 + 16 + 12) + "px";
            sizeInput.style.textAlign = "right";
            sizeInput.style.padding = ".2em .3em";

            // https://chat.stackoverflow.com/transcript/message/52534817#52534817
            sizeInput
                .addEventListener("input",
                                  ({ target }) => {
                                      const { valueAsNumber, max, min } = target;
                                      target.value = Math.floor(valueAsNumber) || min;
                                      valueAsNumber > +max && (target.value = max);
                                      valueAsNumber < +min && (target.value = min);
                 });

            const postlabel = createLabel(postfix,
                                          sizeInputId,
                                          { fontSize : fontSizeSmaller, fontWeight : fontWeightSmaller });

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
            colourPicker
                .addEventListener("change",
                                  (event) => {
                                      deepSet(tempUserConfig, item.configKey, event.target.value);
                                      previewUpdateFunctions.forEach(foonction => foonction(tabMenu));
                 });

            return colourPicker;
        }

        // -------------------------------
        function createColourPicker(labelText, colourPickerId, option, indents = 1) {
            const colourPickerContainer = createContainer();

            const { sizes: { labels: { fontSizeSmaller, fontWeightSmaller } } } = modalConfig;

            const label = createLabel(labelText,
                                      colourPickerId,
                                      { fontSize : fontSizeSmaller, fontWeight : fontWeightSmaller });

            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color
            const colour = getCSSVariableValue(option) || "#000000";
            const colourPicker = document.createElement("input");
            colourPicker.type = "color";
            colourPicker.id = colourPickerId;
            colourPicker.value = colour;
            colourPicker.style.margin = "2px";
            colourPicker.style.marginLeft = (indents * indentPIXELS) + "px";
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
            const { display: { cell } } = config.classes;
            const { classes: { label } } = modalConfig;

            const optionHeaderContainer = createContainer();

            const optionHeader = document.createElement("p");
            optionHeader.classList.add(cell, label);
            optionHeader.id = headerId;
            optionHeader.textContent = labelText;
            optionHeader.style.marginBottom = "10px";
            optionHeader.style.marginLeft = (indents * indentPIXELS) + "px";
            optionHeaderContainer.append(optionHeader);

            return optionHeaderContainer;
        }

        // -------------------------------
        function createNoteGet(noteText, tabMenu) {
            const item = objectFromTabnItemname(modalElements, tabMenu, noteText);
            const note = createNote(noteText,
                                    item.id,
                                    item.indents);
            item.element = note;
            return note;
        }

        // -------------------------------
        function createNote(noteText, noteId, indents = 0) {

            const noteSup = document.createElement("sup");
            noteSup.style.marginLeft = (indents * indentPIXELS) + "px";
            noteSup.id = noteId
            noteSup.textContent = "Note: " + noteText;

            return noteSup;
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
            toggle
                .addEventListener("change",
                                  (event) => {
                                      deepSet(tempUserConfig, item.configKey, (event.target.checked ? "Yes" : "No"));
                                      toggleEnableDisable(tabMenu, labelText);
                                      previewUpdateFunctions.forEach(foonction => foonction(tabMenu));
                 });

            return toggle;
        }

        // -------------------------------
        function createStackToggle(labelText, toggleId, option, indents = 0) {
            const { display: { cell } } = config.classes;
            const { classes: { toggle: { sweetch, indicator } },
                    sizes: { labels: {fontSizeToggles} }
                  } = modalConfig;

            // https://stackoverflow.design/product/components/labels/
            // https://stackoverflow.design/product/components/toggle-switch/
            // https://stackoverflow.design/product/components/checkbox/
            const toggleContainer = createContainer();
            toggleContainer.style.justifyContent = "space-between";

            const label = createLabel(labelText, toggleId, { indents, fontSize : fontSizeToggles });

            const toggle = document.createElement("div");
            toggle.classList.add(cell, sweetch);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = toggleId;
            // https://chat.stackoverflow.com/transcript/message/52410313#52410313
            checkbox.checked = (option === "Yes");

            const toggleButton = document.createElement("span");
            toggleButton.classList.add(indicator);

            toggle.append(checkbox, toggleButton);
            toggleContainer.append(label, toggle);

            return toggleContainer;
        }


        // -------------------------------
        function createLabel(labelText, forElementId, options) {
            const { classes: { label : stackLabel } } = modalConfig;

            const label = document.createElement("label");
            label.classList.add(stackLabel);
            label.htmlFor = forElementId;
            label.textContent = labelText;

            const {fontSize, fontWeight, width, indents, alignIndents} = options;
            if (fontSize)      label.style.fontSize   = options.fontSize;
            if (fontWeight)    label.style.fontWeight = fontWeight;
            if (width)         label.style.width      = width;
            if (indents)       label.style.marginLeft = (indents * indentPIXELS) + "px";
            if (alignIndents)  label.style.marginLeft = `${(alignIndents * indentPIXELS) + 10 + 44}px`;
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
            const { padding, paddingTop, paddingLeft, paddingBottom, marginBottom } = options;

            element.style.backgroundColor = siteBACKGROUNDcolour;

            if (padding)       element.style.padding       = padding;
            if (paddingLeft)   element.style.paddingLeft   = paddingLeft;
            if (paddingTop)    element.style.paddingTop    = paddingTop;
            if (paddingBottom) element.style.paddingBottom = paddingBottom;
            if (marginBottom)  element.style.marginBottom  = marginBottom;
        }


        // ----------------------------------------------------------------------------------------
        // ---- Colour convertion -----------------------------------------------------------------
        function getCSSVariableValue(variable) {
            if (!variable)
                return null;

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
            const colour = window.getComputedStyle(dummy).color; //Color in RGB
            dummy.remove();
            return rgbToHex(colour);

            // https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex/44134328#44134328
            // by https://stackoverflow.com/users/1376947/icl7126
            function hslToHex(hsl) {
                // const matchHSL = hsl.match(/^hsl\(([\d\.]+),\s?([\d\.]+)%,\s?([\d\.]+)%\)$/i);
                const matchHSL = hsl.match(/^hsl\(([\d.]+),\s?([\d.]+)%,\s?([\d.]+)%\)$/i);
                if (!matchHSL)
                    return;
                const [h, s, l] = [matchHSL[1], matchHSL[2], matchHSL[3] /= 100];
                const a = s * Math.min(l, 1 - l) / 100;
                const f = (n) => {
                    const k = (n + h / 30) % 12;
                    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color).toString(16).padStart(2, "0"); // convert to Hex and prefix "0" if needed
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
            const tab = objectFromTabname(modalElements, tabName).items;

            // https://chat.stackoverflow.com/transcript/message/52499177#52499177
            const entries = new Set(tab.map(({ toggleEntry }) => toggleEntry));
            entries.forEach((entry) => entry && toggleEnableDisable(tabName, entry));
        }

        // -------------------------------
        function toggleEnableDisable(tabName, labelText) {
            const tab = objectFromTabname(modalElements, tabName).items;
            let item = objectFromName(tab, labelText);

            if (!item.toggleEntry) // toggle does not control other options.
                return;

            if (labelText !== item.toggleEntry) { // this isn't the top controlling toggle.
               item = objectFromName(tab, item.toggleEntry);
            }

            recurseOnEntries(item, false, 0);

            function recurseOnEntries(entryItem, disable, level) {
                if (level > 5) return; // safetySwitch :)

                if (level > 0) { // first level cannot be enabled/disabled
                    disableModalOption(entryItem, disable);
                }

                if (entryItem.dependents) {
                    const on = deepGet(tempUserConfig, entryItem.configKey);
                    entryItem
                        .dependents
                        .forEach(newEntry =>
                                     recurseOnEntries(objectFromName(tab, newEntry),
                                                      disable || (on !== "Yes"),
                                                      level + 1));
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
                    .forEach(element => {
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
            } else { // enable
                [...containerElement.children]
                    .forEach(element => {
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


        // -------------------------------
        function createPreviewImage() {
            const imageContainer = document.createElement("img");
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
        function createPreviewStyledBackground() {
            const preview = createPreviewContainer();
            const imageContainer = createPreviewImage();
            standardStyling(imageContainer);
            preview.append(imageContainer);
            return preview;
        }


        // -------------------------------
        function previewUpdateImage(image, onf, images) {
            // https://chat.stackoverflow.com/transcript/message/52332481#52332481
            const { lightOn, lightOff, darkOn, darkOff } = images;

            if (isLIGHT) {
                image.src = onf
                    ? `${imgHOST}${lightOn}`
                    : `${imgHOST}${lightOff}`;
            } else {
                image.src = onf
                    ? `${imgHOST}${darkOn}`
                    : `${imgHOST}${darkOff}`;
            }
        }

        // -------------------------------
        function previewRadiosOrButtons() {
            const { display: { cell, container, center },
                    buttons: { button : base, primary, outlined },
                    choiceRadios: { radioParent }
                  } = config.classes;
            const { ids: { radioButtons : radioButtonsId, radioName, radioButtonLabel },
                    classes: { radios: { base : stackradio, radioAction },
                               margins: { negative, zeroX },
                               label : stackLabel,
                               pointerEventsNone }
                  } = modalConfig;

            const previewContainer = createPreviewContainer();

            const submitButton = createModalButton("Submit", [base, primary]);
            const skipButton   = createModalButton("Skip",   [base, outlined]);
            submitButton.classList.add(pointerEventsNone);
            skipButton.classList.add(pointerEventsNone);
            skipButton.style.marginLeft = "4px";
            skipButton.style.minWidth = "70px";

            const buttons = document.createElement("div");
            buttons.classList.add(container, center);
            buttons.style.marginLeft = "10px";
            buttons.append(submitButton, skipButton);

            const radios =
                      ["Approve", "Improve edit", "Reject and edit", "Reject"]
                          .map(label => makeRadio(label, radioButtonLabel));


            const fieldset = document.createElement("fieldset");
            fieldset.classList.add(container, negative);
            fieldset.style.textAlign = "center";
            fieldset.append(...radios, buttons);

            standardStyling(fieldset, { padding: "10px 0px" });
            fieldset.style.transform = "scale(0.91)";

            const fieldsetContainer = document.createElement("div");
            fieldsetContainer.style.paddingTop = "3px";
            fieldsetContainer.style.paddingBottom = "7px";
            fieldsetContainer.style.backgroundColor = siteBACKGROUNDcolour;
            fieldsetContainer.append(fieldset);

            // make Opera not eat "Approved"
            fieldsetContainer.classList.add(container);
            fieldsetContainer.style.justifyContent = "flex-end";
            fieldset.style.justifyContent = "flex-end";
            fieldset.style.whiteSpace = "nowrap";
            fieldset.style.marginLeft =  "-20px";
            fieldset.style.marginRight =  "-12px";

            const imageContainer = createPreviewImage();
            standardStyling(imageContainer);

            const lastElement = document.createElement("div");
            lastElement.append(fieldsetContainer, imageContainer);
            previewContainer.append(lastElement);

            // Do not initialize this yet since multiple preview elements needs to be set

            return previewContainer;

            function makeRadio(labelText, radioId) {
                const label = document.createElement("label");
                label.classList.add(cell, stackLabel);
                label.htmlFor = radioId;
                label.textContent = labelText;
                const labelContainer = document.createElement("div");
                labelContainer.classList.add(cell);
                labelContainer.append(label);

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.classList.add(stackradio, radioAction);
                radio.id = radioId;
                radio.name = radioName; // needed to make them exclusive
                const radioContainer = document.createElement("div");
                radioContainer.classList.add(cell);
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
        function previewRadiosOrButtonsOnf(tabMenu, actionsElementName, moveElementName, areaElementName, toolTipElementName) {
            const actionsElement   = getElement(tabMenu, actionsElementName);
            const moveElement      = getElement(tabMenu, moveElementName);
            const clickElement     = getElement(tabMenu, areaElementName);
            const tooltipElement   = getElement(tabMenu, toolTipElementName);

            const actionsContent = actionsElement.lastElementChild; // from the preview element
            const { firstElementChild : actionsRadios,
                    lastElementChild  : actionsImage
                  } = actionsContent;

            const moveImage    = moveElement.lastElementChild;
            const clickImage   = clickElement.lastElementChild;
            const tooltipImage = tooltipElement.lastElementChild;

            const radioVsButtons = deepGet(tempUserConfig, "options.radioVsButtons");
            const moveRadioBox     = radioVsButtons?.moveRadioBox === "Yes";
            const keepRadios       = radioVsButtons?.keepRadios === "Yes";
            const radioWithBorders = radioVsButtons?.radioWithBorders === "Yes";
            const largeClickArea   = radioVsButtons?.largerClickArea === "Yes";
            const tooltips         = radioVsButtons?.tooltips === "Yes";

            const { classes: { display: { desktopHide } } } = config;

            // previewRadiosOrButtons:          light   /   dark
            //  moveRadioBox,  keepRadios  ->          -             radios + previewRadiosOrButtonsUpdate(element)
            //  moveRadioBox, !keepRadios  -> YxDs0.png / FcrHn.png  image of buttons
            // !moveRadioBox               ->      WgO6m.png         image of nothing

            // previewMoveRadioBox:                               light    /   dark
            //  moveRadioBox,  keepRadios,  radioWithBorders  -> rtDv9.png / D3Qv1.png
            //  moveRadioBox,  keepRadios, !radioWithBorders  -> VdbX8.png / to4Rl.png
            //  moveRadioBox, !keepRadios                     -> XPIdk.png / Bf5Lm.png
            // !moveRadioBox                                  -> Sr586.png / 9Y7O9.png

            // previewclickArea:                                                     light   /   dark
            //  moveRadioBox,  keepRadios,  radioWithBorders,  largeClickArea  ->  oXow0.png / xzpHa.png
            //  moveRadioBox,  keepRadios,  radioWithBorders, !largeClickArea  ->  GR5nm.png / hZ8b7.png
            //  moveRadioBox,  keepRadios, !radioWithBorders,  largeClickArea  ->  DzA5H.png / c5Yvs.png
            //  moveRadioBox,  keepRadios, !radioWithBorders, !largeClickArea  ->  5mSiL.png / ck2v7.png
            //  moveRadioBox, !keepRadios                                      ->       0ucaP.png         image of nothing
            // !moveRadioBox                                                   ->       0ucaP.png         image of nothing

            // previewTooltip:                                              light    /   dark
            //  moveRadioBox,  keepRadios,  radioWithBorders,  toolTip  -> rFi20.png / WW4Fg.png
            //  moveRadioBox,  keepRadios,  radioWithBorders, !toolTip  -> QH2tk.png / bP06H.png
            //  moveRadioBox,  keepRadios, !radioWithBorders,  toolTip  -> TkAu6.png / R8laG.png
            //  moveRadioBox,  keepRadios, !radioWithBorders, !toolTip  -> gG7kO.png / lARUW.png
            //  moveRadioBox, !keepRadios, toolTip                      -> 8RB1j.png / 8zGZF.png
            //  moveRadioBox, !keepRadios, !toolTip                     -> pNECy.png / okMEA.png
            // !moveRadioBox                                            ->       0ucaP.png         image of nothing

            if (moveRadioBox && keepRadios) {

                actionsRadios.classList.remove(desktopHide);
                actionsImage.classList.add(desktopHide);
                previewRadiosOrButtonsUpdate(tabMenu, actionsElementName);

                previewUpdateImage(moveImage,
                                   radioWithBorders,
                                   { lightOn:  "rtDv9.png", // Radios with bars
                                     lightOff: "VdbX8.png", // Radios NO bars
                                     darkOn:   "D3Qv1.png",
                                     darkOff:  "to4Rl.png" });

                const lightMapClickArea = [
                    ["oXow0.png", radioWithBorders, largeClickArea],
                    ["GR5nm.png", radioWithBorders],
                    ["DzA5H.png", largeClickArea],
                    ["5mSiL.png", ],
                ];
                const darkMapClickArea = [
                    ["xzpHa.png", radioWithBorders, largeClickArea],
                    ["hZ8b7.png", radioWithBorders],
                    ["c5Yvs.png", largeClickArea],
                    ["ck2v7.png", ],
                ];

                const lightMapTooltip = [
                    ["rFi20.png", radioWithBorders, tooltips],
                    ["QH2tk.png", radioWithBorders],
                    ["TkAu6.png", tooltips],
                    ["gG7kO.png", ],
                ];
                const darkMapTooltip = [
                    ["WW4Fg.png", radioWithBorders, tooltips],
                    ["bP06H.png", radioWithBorders],
                    ["R8laG.png", tooltips],
                    ["lARUW.png", ],
                ];

                const screenShotMapClickArea = isLIGHT ? lightMapClickArea : darkMapClickArea;
                const screenShotMapTooltips  = isLIGHT ? lightMapTooltip   : darkMapTooltip;

                const [clickAreaScreenShot] =
                          screenShotMapClickArea
                              .find(([_, ...conditions]) =>
                                        conditions.every(Boolean)
                               );
                const [tooltipScreenShot] =
                          screenShotMapTooltips
                              .find(([_, ...conditions]) =>
                                        conditions.every(Boolean)
                               );
                clickImage.src   = `${imgHOST}${clickAreaScreenShot}`;
                tooltipImage.src = `${imgHOST}${tooltipScreenShot}`;

            } else {

                actionsRadios.classList.add(desktopHide);
                actionsImage.classList.remove(desktopHide);

                if (moveRadioBox) {
                    actionsImage.src = isLIGHT
                        ? `${imgHOST}YxDs0.png`
                        : `${imgHOST}FcrHn.png`;
                    moveImage.src = isLIGHT
                        ? `${imgHOST}XPIdk.png`
                        : `${imgHOST}Bf5Lm.png`;

                    if (tooltips) {
                        tooltipImage.src = isLIGHT
                            ? `${imgHOST}8RB1j.png`
                            : `${imgHOST}8zGZF.png`;
                    } else {
                        tooltipImage.src = isLIGHT
                            ? `${imgHOST}pNECy.png`
                            : `${imgHOST}okMEA.png`;
                    }
                } else { // !moveRadioBox
                    actionsImage.src = `${imgHOST}WgO6m.png`; // <-- completely transparent image
                    tooltipImage.src = `${imgHOST}0ucaP.png`; // <-- completely transparent image
                    moveImage.src = isLIGHT
                        ? `${imgHOST}Sr586.png`
                        : `${imgHOST}9Y7O9.png`;
                }
                clickImage.src = `${imgHOST}0ucaP.png`;
            }
        }

        // -------------------------------
        function previewRadiosOrButtonsUpdate(tabMenu, elementName) {
            const element = getElement(tabMenu, elementName);

            const { ids: { radioButtons : radioButtonsId }
                  } = modalConfig;

            const { colour: { radioSeperator : radioSeperatorColour },
                    size: { radioSeperator : radioSeperatorSize }
                  } = tempUserConfig;

            const radioWithBorders = deepGet(tempUserConfig, "options.radioVsButtons.radioWithBorders") === "Yes";

            const radios = element.querySelectorAll(`#${radioButtonsId}`);

            radios
                .forEach(radio => {
                             if (radioWithBorders) {
                                 radio.style.paddingLeft = "3px";
                                 radio.style.borderLeft  = `${radioSeperatorColour} solid ${radioSeperatorSize}px`;
                             } else {
                                 radio.style.paddingLeft = "4px";
                                 radio.style.borderLeft  = "none";
                             }
                 });
        }

        // -------------------------------
        function previewUserCards() {
            const previewContainer = createPreviewContainer();

            const imageContainer = createPreviewImage();
            previewContainer.append(imageContainer);

            // Do not initialize this yet since two preview elements needs to be set

            return previewContainer;
        }

        // -------------------------------
        function previewEditorStatistics() {
            const { container } = config.classes.display;
            const { sizes: { editorAvatar: { width, height } } } = modalConfig;

            const previewContainer = createPreviewContainer();

            const image = document.createElement("img");
            image.style.width = width;

            const imageContainer = document.createElement("div");
            imageContainer.style.width = width;
            imageContainer.style.height = height;
            imageContainer.append(image);

            const previewEditorStatisticsGrid = document.createElement("div");
            previewEditorStatisticsGrid.classList.add(container); // "overflow-hidden"

            // To avoid word wrapping past 127%
            // https://chat.stackoverflow.com/transcript/message/52375438#52375438
            previewEditorStatisticsGrid.style.whiteSpace = "nowrap";
            previewEditorStatisticsGrid.style.overflow = "hidden";

            standardStyling(previewEditorStatisticsGrid);
            previewEditorStatisticsGrid.append(imageContainer);

            previewContainer.append(previewEditorStatisticsGrid);

            // Do not initialize this yet since two preview elements needs to be set

            return previewContainer;
        }

        // -------------------------------
        function previewUserCardsStatisticsOnf(tabMenu, userCardsElementName, editorElementName) {
            const userCardsElement = getElement(tabMenu, userCardsElementName);
            const editorElement    = getElement(tabMenu, editorElementName);

            // https://chat.stackoverflow.com/transcript/message/52332615#52332615
            const userCardImage = userCardsElement.lastElementChild; // from the preview element
            const editorBox   = editorElement.lastElementChild;      // from the preview element
            const editorImage = editorElement.querySelector("img");

            const configUserCards  = deepGet(tempUserConfig, "options.userCards");
            const userCards        = configUserCards?.getUserCards === "Yes";
            const editorStatistics = configUserCards?.withEditiorStats === "Yes";

            const lightMap = [
                [["0N0gd.png","ABwF9.png"], userCards, editorStatistics],
                [["eGv5x.png","ABwF9.png"], userCards],
                [["yrz32.png","ZFoyD.png"]],
            ];
            const darkMap = [
                [["tbGE3.png","ETSJS.png"], userCards, editorStatistics],
                [["ldstt.png","ETSJS.png"], userCards],
                [["7Gw2y.png","aQz4W.png"]],
            ];

            const screenShotMap = isLIGHT ? lightMap : darkMap;

            const [[userCardScreenShot, editorScreenShot]] =
                      screenShotMap
                          .find(([_, ...conditions]) =>
                                    // conditions.every(c => !!c)
                                    conditions.every(Boolean)
                           );
            userCardImage.src = `${imgHOST}${userCardScreenShot}`;
            editorImage.src   = `${imgHOST}${editorScreenShot}`;

            const on = userCards && editorStatistics;

            if (on) {
                // Do not add another statistics element! Important on restore
                if (editorBox.children.length > 1) {
                    previewEditorStatisticsUpdate(null, null, editorElement);
                    return;
                }

                const sampleApiResponse = [
                                            { approval_date: 1 },
                                            { rejection_date: 1 }, { rejection_date: 1 },
                                            { }, { }, { } // pending
                                          ];
                const { colour, size: { editorStatistics : fontSize } } = tempUserConfig;

                // editorBox.append(createEditorStatisticsItem(sample, colour, fontSize));
                const editorStatsTable = createEditorStatisticsItem(sampleApiResponse, colour, fontSize);
                editorBox.append(editorStatsTable);
            } else {
                if (editorBox.children.length > 1)
                    editorBox.lastElementChild.remove();
            }
        }

        // -------------------------------
        function previewEditorStatisticsUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const editorStatisticsContainer = element.lastElementChild;
            const statisticsTable = editorStatisticsContainer.querySelector("table");
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
        function previewStackUsercardsUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            // original images from:
            // http://pngimg.com/uploads/broccoli/broccoli_PNG72874.png
            // http://order.uprintinvitations.com/photothumbs/37a283b5-c348-46a4-ad6f-36d3274032fd.png

            const userCards = deepGet(tempUserConfig, "options.userCards");
            const useStackUserCards = userCards?.useStackUserCards === "Yes";
            const newContributor    = userCards?.newContributor === "Yes";

            const lightMap = [
                ["Q9i5g.png", !useStackUserCards],
                ["rUkpt.png",  useStackUserCards && !newContributor],
                ["DFvCY.png",  useStackUserCards &&  newContributor],
            ];
            const darkMap = [
                ["sVN26.png", !useStackUserCards],
                ["THeVj.png",  useStackUserCards && !newContributor],
                ["oYl0U.png",  useStackUserCards &&  newContributor],
            ];

            const screenShotMap = isLIGHT ? lightMap : darkMap;

            const [userCardsImage] =
                      screenShotMap
                          .find(([_, condition]) => condition);

            image.src = `${imgHOST}${userCardsImage}`;
        }


        // -------------------------------
        function previewPageTitleLink() {
            const previewContainer = createPreviewImageContainer();
            previewPageTitleLinkOnf(null, null, previewContainer);
            return previewContainer;
        }

        // -------------------------------
        function previewPageTitleLinkOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.movePageTitleLink") === "Yes",
                               { lightOn:  "9JnTg.png",
                                 lightOff: "26MhB.png",
                                 darkOn:   "19rOX.png",
                                 darkOff:  "QS05y.png" });
        }


        // -------------------------------
        function previewDiffChoices() {
            const previewContainer = createPreviewImageContainer();
            previewDiffChoicesOnf(null, null, previewContainer);
            return previewContainer;
        }

        // -------------------------------
        function previewDiffChoicesOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.moveDiffChoices") === "Yes",
                               { lightOn:  "xJT8x.png",
                                 lightOff: "kTaNQ.png",
                                 darkOn:   "mPovF.png",
                                 darkOff:  "N9JyH.png" });
        }


        // -------------------------------
        function previewProgressBar() {
            const { container: flexContainer } = config.classes.display;
            const { classes: { naviagations: { base : navigationBase, item : nativationItem, selected },
                               padding: { Y : paddingY },
                               title: { base : title } }
                  } = modalConfig;

            const previewContainer = createPreviewContainer();

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
            container.style.flexDirection = "column";
            container.style.alignItems = "flex-end";

            const stackProgress = stackProgressBar();
            stackProgress.classList.add(paddingY);

            container.append(titleContainer, stackProgress);
            previewContainer.append(container);

            previewProgressBarOnfUpdate(null,null,previewContainer);

            return previewContainer;
        }

        // -------------------------------
        function stackProgressBar() {
            const { cell } = config.classes.display;

            const container = document.createElement("div");
            container.classList.add(cell);

            // I know.. I cheated here, but this is bound to break and copy'n'pasting is easy.
            const content = `
                    <div class="d-flex ai-center sm:fd-column">
                        <div class="flex--item mr12 ws-nowrap">
                            <span>Your daily reviews</span>
                            <span class="js-reviews-done mrn2">20</span>
                            <span class="js-reviews-per-day" data-reviews-per-day="40">/40</span>
                        </div>
                        <div class="flex--item">
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

            const moveProgressBar = deepGet(tempUserConfig, "options.moveProgressBar") === "Yes";

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
        function previewMovePostType() {
            const previewContainer = createPreviewImageContainer();
            previewMovePostTypeOnf(null, null, previewContainer);
            return previewContainer;
        }

        // -------------------------------
        function previewMovePostTypeOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.AnswerQuestionOnTop") === "Yes",
                               { lightOn:  "yJZuA.png",
                                 lightOff: "AdHvl.png",
                                 darkOn:   "JyPv5.png",
                                 darkOff:  "1mtpe.png" });
        }

        // -------------------------------
        function previewMovePostTypeColour() {
            const { classes: { title: { header : titleHeader } },
                    colours: { border : borderColour }
                  } = modalConfig;

            const previewContainer = createPreviewContainer();

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

            previewContainer.append(headerContainer);
            previewMovePostTypeColourUpdate(null, null, previewContainer);

            return previewContainer;
        }

        // -------------------------------
        function previewMovePostTypeColourUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const header = element.lastElementChild.firstElementChild;

            const movePostType = deepGet(tempUserConfig, "options.AnswerQuestionOnTop") === "Yes";

            if (movePostType) {
                header.textContent = "Question";
                header.style.color = tempUserConfig.colour.postType;
            } else {
                header.textContent = EMPTY;
            }
        }


        // -------------------------------
        function previewMoveNextButtonsOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.moveNextButtons") === "Yes",
                               { lightOn:  "L1opa.png",
                                 lightOff: "ew69w.png",
                                 darkOn:   "DFElk.png",
                                 darkOff:  "GEpbV.png" });
        }


        // -------------------------------
        function previewTitleLinksOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.linksOnTitles") === "Yes",
                               { lightOn:  "O1O08.png",
                                 lightOff: "ki4wD.png",
                                 darkOn:   "TM34Z.png",
                                 darkOff:  "06tam.png" });
        }


        // -------------------------------
        function previewKeepDiffChoices() {
            const { colours: { border : borderColour } } = modalConfig;

            const previewContainer = createPreviewContainer();

            const imageContainer = createPreviewImage();
            imageContainer.src = isLIGHT ? `${imgHOST}A2Xxz.png` : `${imgHOST}h7zwG.png`;

            const container = document.createElement("div");
            container.style.borderTop = `1px solid ${borderColour}`;
            standardStyling(container, { paddingTop: "10px" });
            container.append(imageContainer);

            const backgroundContainer = document.createElement("div");
            standardStyling(backgroundContainer, { paddingTop: "10px", paddingLeft: "10px" });
            backgroundContainer.append(container)

            previewContainer.append(backgroundContainer);

            previewKeepDiffChoicesUpdate(null,null,previewContainer);
            return previewContainer;
        }

        // -------------------------------
        function previewKeepDiffChoicesUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const keepDiffChoicesId = modalConfig.ids.keepDiffChoices;

            const keepDiffChoices = deepGet(tempUserConfig, "options.keepDiffChoices") === "Yes";
            const backgroundContainer = element.lastElementChild;
            const container = backgroundContainer.lastElementChild;

            if (keepDiffChoices) {
                let diffChoices = container.querySelector("#" + keepDiffChoicesId);
                if (!diffChoices) {
                    diffChoices = createDiffChoices(keepDiffChoicesId, true);
                    container.lastElementChild.before(diffChoices);
                }
                const buttons = container.querySelectorAll("button");
                [...buttons].forEach(button => button.style.color = tempUserConfig.colour.diffChoices);
            } else {
                const diffChoices = container.querySelector("#" + keepDiffChoicesId);
                if (diffChoices) diffChoices.remove();
            }
        }


        // -------------------------------
        function previewLineThough() {
            const { ids: { lineThrough : lineThroughId },
                    classes: { reviewText: { post, prose, diff } }
                  } = modalConfig;

            const previewContainer = createPreviewContainer();

            const paragraph = document.createElement("p");
            paragraph.classList.add(prose, post);
            paragraph.style.marginBottom = "0px";
            paragraph.append(document.createTextNode("You will always need to foo the bar"));
            paragraph.append(addDiffDelete(" :)"));
            paragraph.append(document.createTextNode(" If not you risk a baz occuring."));
            paragraph.append(addDiffDelete(" Thank you so much for reading and upvoting my post!"));
            standardStyling(paragraph, { padding: "3px", marginBottom: "0px" });
            previewContainer.append(paragraph);

            previewLineThoughOnf(null, null, previewContainer);

            return previewContainer;

            function addDiffDelete(text) {
                const diffDelete = document.createElement("span");
                diffDelete.classList.add(diff);
                diffDelete.id = lineThroughId;
                diffDelete.textContent = text;
                return diffDelete;
            }
        }

        // -------------------------------
        function previewLineThoughOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const { ids: { lineThrough : lineThroughId } } = modalConfig;

            const on = deepGet(tempUserConfig, "options.removeLineThrough") === "Yes";

            if (on) {
                [...element.querySelectorAll("#" + lineThroughId)]
                    .forEach(elementChild => elementChild.style.textDecoration = "initial");
            } else {
                [...element.querySelectorAll("#" + lineThroughId)]
                    .forEach(elementChild => elementChild.style.textDecoration = "line-through");
            }
        }


        // -------------------------------
        function previewMessage() {
            const { display: { container, cell },
                    buttons: { button, primary }
                  } = config.classes;
            const { notice: { base : noticeBase, info : noticeInfo },
                    padding: { top : paddingTop },
                    margins: { negative : negativeMargin },
                    pointerEventsNone
                  } = modalConfig.classes;

            const previewContainer = createPreviewContainer();

            const standardMessageNotice = document.createElement("div");

            const dummyElement = document.createElement("div");  // needed since highlightMessageDoIt wants an element.
            dummyElement.classList.add(container, negativeMargin, paddingTop);
            const dummyButton = createModalButton("Next task", [button, primary, cell]);
            dummyButton.classList.add(pointerEventsNone);
            dummyElement.append(dummyButton);

            standardMessageNotice.classList.add(noticeBase, noticeInfo);
            standardMessageNotice.append(document.createTextNode("You are not able to review this item."),
                                         dummyElement);
            previewContainer.append(standardMessageNotice);

            previewMessageOnf(null, null, previewContainer);
            return previewContainer;
        }

        // -------------------------------
        function previewMessageOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const info = element.lastElementChild;

            const on = deepGet(tempUserConfig, "options.prominentReviewMessage") === "Yes";

            if (on) {
                const { colour: { message : colour, messageBackground : backGroundColour },
                        size: {message : size }
                      } = tempUserConfig;

                highlightMessageDoIt(info, colour, backGroundColour, size);
            } else {
                if (info.firstChild.nodeValue === "") {
                    info.firstElementChild.remove();
                    info.firstChild.nodeValue = "You are not able to review this item.";
                }
            }
        }

        // -------------------------------
        function previewMessageUpdate(tabMenu, elementName, element) {
            if (deepGet(tempUserConfig, "options.prominentReviewMessage") !== "Yes")
                return;

            if (!element) {
                element = getElement(tabMenu, elementName);
            }

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
        function previewSummary() {
            const { classes: { margins: { top : marginTop } } } = modalConfig;
            const { classes: { summary : summaryRed } } = config;

            const previewContainer = createPreviewContainer();

            const comment  = document.createElement("p");
            comment.classList.add(summaryRed, marginTop);
            comment.textContent = "Comment: Fixed something.";

            previewContainer.append(comment);
            previewSummaryOnf(null, null, previewContainer);

            return previewContainer;
        }

        // -------------------------------
        function previewSummaryOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const editSummary = element.lastElementChild;

            const { classes: { summary : summaryRed } } = config;

            const on = deepGet(tempUserConfig, "options.highlightSummary") === "Yes";

            if (on) {
                const { colour: { summary : colour },
                        size: { summary : size }
                      } = tempUserConfig;

                highlightSummaryDoIt(editSummary, colour, size, summaryRed);
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
            if (deepGet(tempUserConfig, "options.highlightSummary") !== "Yes")
                return;

            const element = getElement(tabMenu, elementName);
            const editSummary = element.lastElementChild;

            const { colour: { summary : colour },
                    size: { summary : size }
                  } = tempUserConfig;

            editSummary.style.fontSize = size;
            editSummary.style.color = colour;
        }

        // -------------------------------
        function previewStackSummaryOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.postSummary.useStackSummary") === "Yes",
                               { lightOn:  "zphgU.png",
                                 lightOff: "hunsb.png",
                                 darkOn:   "TDBWF.png",
                                 darkOff:  "bgZmI.png" });
        }


        // -------------------------------
        function previewNotice() {
            const previewContainer = createPreviewContainer();

            const limit = deepGet(tempUserConfig, "size.apiQuotaLimit")
                          || deepGet(defaultUserConfig, "size.apiQuotaLimit");
            const notice = showToast(limit, "quota", modalConfig.ids.quotaNotice);

            previewContainer.append(notice);
            return previewContainer;
        }

        // -------------------------------
        function previewNoticeUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const p = element.querySelector("#" + modalConfig.ids.quotaNotice);
            const limit = deepGet(tempUserConfig, "size.apiQuotaLimit");

            if (!isNaN(limit))
                p.innerHTML = p.innerHTML.replace(/\(remaining: \d+\)/, `(remaining: ${limit})`);
        }

        // -------------------------------
        function previewFilterListUpdate(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            const reviewFilters = deepGet(tempUserConfig, "options.reviewFilters");
            const removeTextFilters = reviewFilters?.removeTextFilters === "Yes";
            const putAlertIcon      = reviewFilters?.putAlertIcon === "Yes";
            const keepFilterList    = reviewFilters?.keepFilterList === "Yes";

            const lightMap = [
                ["hDRdU.png", !removeTextFilters],
                ["nDJK9.png",  putAlertIcon &&  keepFilterList],
                ["XsHYT.png",  putAlertIcon && !keepFilterList],
                ["4P4Qo.png", !putAlertIcon &&  keepFilterList],
                ["WPs4c.png", !putAlertIcon && !keepFilterList],
            ];
            const darkMap = [
                ["KREUM.png", !removeTextFilters],
                ["9Cbil.png",  putAlertIcon &&  keepFilterList],
                ["OJqle.png",  putAlertIcon && !keepFilterList],
                ["oI6NR.png", !putAlertIcon &&  keepFilterList],
                ["JDNgn.png", !putAlertIcon && !keepFilterList],
            ];

            const screenShotMap = isLIGHT ? lightMap : darkMap;

            const [filterImage] =
                      screenShotMap
                          .find(([_, condition]) => condition);

            image.src = `${imgHOST}${filterImage}`;
        }

        // -------------------------------
        function previewStackModeratorOnf(tabMenu, elementName, element = getElement(tabMenu, elementName)) {
            const image = element.lastElementChild;

            // original image (found by VLAZ (https://chat.stackoverflow.com/users/3689450)):
            // https://freesvg.org/img/1527776405.png
            // https://chat.stackoverflow.com/transcript/214345?m=52720164#52720164

            previewUpdateImage(image,
                               deepGet(tempUserConfig, "options.wantNewModeratorFlair") === "Yes",
                               { lightOn:  "j9pvo.png",
                                 lightOff: "7NThn.png",
                                 darkOn:   "TrBPp.png",
                                 darkOff:  "2KvL5.png" });
        }

    }

    // ---- End of the GUI with the icon on the top right -----------------------------------------
    // --------------------------------------------------------------------------------------------

})();
