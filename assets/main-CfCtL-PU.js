import{c as n}from"./config-BIbxg2R-.js";function c(){const e=document.getElementById("bookshelf");e&&(e.innerHTML="",n.stories.forEach((o,s)=>{const t=document.createElement("a");t.className=`book-card ${o.id}-card`,t.href=`./story.html?id=${o.id}`,t.dataset.story=o.id,t.innerHTML=`
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-front">
          <span class="book-tag">${o.tag}</span>
          <h2 class="book-title">${o.title}</h2>
          <p class="book-author">${o.author}</p>
        </div>
      </div>
      <div class="book-info">
        <p class="book-desc">${o.summary}</p>
        <span class="read-btn">开始阅读</span>
      </div>
    `,e.appendChild(t),t.style.opacity="0",t.style.transform="translateY(40px)",setTimeout(()=>{t.style.transition="opacity 0.6s ease, transform 0.6s ease",t.style.opacity="1",t.style.transform="translateY(0)"},200+s*200)}))}function l(){const e=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(s=>{s.addEventListener("click",t=>{t.preventDefault();const r=s.getAttribute("href"),d=s.dataset.story,a=n.stories.find(i=>i.id===d);if(a&&a.bgm){const i=new Audio(a.bgm);i.preload="auto",i.load()}e&&e.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=r},650)})}),window.addEventListener("pageshow",s=>{s.persisted&&e&&e.classList.remove("active","flipping-in","flipping-out")}),e&&(e.classList.add("active","flipping-in"),setTimeout(()=>{e.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{c(),l();const e=document.querySelector(".version-mark");e&&(e.textContent="v1.0.16")});
