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
!function(){const d=1500,c="Stack Answer Status",l=" ",p="var(--red-400)",m=window.location.hostname,u=(e,t)=>{e={quota:`You're low on API quota (${e}). Consider turning "${c}" off.`,error:`${c} - Stack API says: <p>${e}</p>`,throttle:`${c} - Wait another <b>${e}</b> seconds before making another API request!`};const n=document.createElement("button");n.classList.add("s-btn","s-notice--btn"),n.type="button",n.textContent="✖";const s=document.createElement("div");s.classList.add("d-flex"),s.style.marginTop="-2px",s.style.marginRight="-4px",s.append(n);const a=document.createElement("div");a.classList.add("flex--item"),a.style.marginLeft="4px",a.style.marginTop="6px",a.innerHTML=e[t];const o=document.createElement("div");o.classList.add("d-flex","jc-space-between"),o.style.alignItems="flex-start",o.append(a,s);const i=document.createElement("aside");i.classList.add("s-notice","s-notice__warning","p8"),i.append(o);const r=document.createElement("div");r.classList.add("s-toast"),r.setAttribute("aria-hidden","false"),r.append(i),n.addEventListener("click",e=>{r.setAttribute("aria-hidden","true")}),document.body.append(r)},s=async()=>{const s=[...document.querySelectorAll("a.answer-hyperlink")].map(e=>{let t=e.href;if(t)return[e,t.toString().split("/")[4]]});var e,t,n=[...new Set(s.map(e=>e[1]))].join(";");if(n){const a=await fetch(`https://api.stackexchange.com/2.2/questions/${n}?filter=!gA1*mfYBgboITmKnOM*UYbEfkJlt(kTDLiI&site=${m}&key=U4DMV*8nvpm3EOpvf69Rxw((`);const{items:o,quota_remaining:i,backoff:r,error_message:c}=await a.json();[{quota_remaining:e,backoff:t,error_message:n}]=[{quota_remaining:i,backoff:r,error_message:c}],e<d&&u(e,"quota"),t&&u(t,"throttle"),n&&u(n,"error"),o.forEach(t=>{if(t.closed_date){const e=s.filter(e=>e[1]===t.question_id.toString()),n="Duplicate"===t.closed_reason?"[duplicate]":"[closed]";e.forEach(e=>((e,t,n)=>{const s=e.parentElement;if(s){const o=document.createElement("span");var a;o.classList.add("site-hyperlink"),o.style.color=p,"TD"===s.tagName?(a=e.nextElementSibling)&&["[duplicate]","[closed]"].includes(a.textContent)||(e.style.width=n,o.style.textOverflow="unset",o.textContent=t,s.title=(s.title||e.textContent)+l+t,s.classList.add("d-flex"),s.append(o)):(o.textContent=l+t,e.append(o))}})(e[0],n,"Duplicate"===t.closed_reason?"360px":"380px"))}})}};s();const a=/^(\/users\/profile\/posts\/\d+\?(?!postType=1)|\/ajax\/users\/(tab\/\d+\?tab=answers|panel\/answers\/\d+\?))/;$(document).ajaxComplete(function(e,t,n){a.test(n.url)&&s()})}();