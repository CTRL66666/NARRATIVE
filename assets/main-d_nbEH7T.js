import{u as a}from"./config-BIbxg2R--DzfPGOwd-BhSlepLY-4h9jTUR1-xx9YZiOZ.js";function i(){const s=document.getElementById("bookshelf");s&&(s.innerHTML="",a.stories.forEach((e,o)=>{const t=document.createElement("a");t.className=`book-card ${e.id}-card`,t.href=`./story.html?id=${e.id}`,t.dataset.story=e.id,t.innerHTML=`
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-front">
          <span class="book-tag">${e.tag}</span>
          <h2 class="book-title">${e.title}</h2>
          <p class="book-author">${e.author}</p>
        </div>
      </div>
      <div class="book-info">
        <p class="book-desc">${e.summary}</p>
        <span class="read-btn">开始阅读</span>
      </div>
    `,s.appendChild(t),t.style.opacity="0",t.style.transform="translateY(40px)",setTimeout(()=>{t.style.transition="opacity 0.6s ease, transform 0.6s ease",t.style.opacity="1",t.style.transform="translateY(0)"},200+o*200)}))}function n(){const s=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(e=>{e.addEventListener("click",o=>{o.preventDefault();const t=e.getAttribute("href");new Audio().play().catch(()=>{}),s&&s.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=t},650)})}),window.addEventListener("pageshow",e=>{e.persisted&&s&&s.classList.remove("active","flipping-in","flipping-out")}),s&&(s.classList.add("active","flipping-in"),setTimeout(()=>{s.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{i(),n()});
