import{a as n}from"./config-BIbxg2R--DzfPGOwd.js";function r(){const t=document.getElementById("bookshelf");t&&(t.innerHTML="",n.stories.forEach((e,a)=>{const s=document.createElement("a");s.className=`book-card ${e.id}-card`,s.href=`./story.html?id=${e.id}`,s.dataset.story=e.id,s.innerHTML=`
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
    `,t.appendChild(s),s.style.opacity="0",s.style.transform="translateY(40px)",setTimeout(()=>{s.style.transition="opacity 0.6s ease, transform 0.6s ease",s.style.opacity="1",s.style.transform="translateY(0)"},200+a*200)}))}function c(){const t=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(e=>{e.addEventListener("click",a=>{a.preventDefault();const s=e.getAttribute("href"),d=e.dataset.story,i=n.stories.find(o=>o.id===d);if(i&&i.bgm){const o=new Audio(i.bgm);o.preload="auto",o.load()}t&&t.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=s},650)})}),window.addEventListener("pageshow",e=>{e.persisted&&t&&t.classList.remove("active","flipping-in","flipping-out")}),t&&(t.classList.add("active","flipping-in"),setTimeout(()=>{t.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{r(),c();const t=document.querySelector(".version-mark");t&&(t.textContent="v1.0.16")});
