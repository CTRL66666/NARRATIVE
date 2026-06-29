import{u as a}from"./config-BIbxg2R--DzfPGOwd-BhSlepLY-4h9jTUR1.js";function i(){const s=document.getElementById("bookshelf");s&&(s.innerHTML="",a.stories.forEach((t,o)=>{const e=document.createElement("a");e.className=`book-card ${t.id}-card`,e.href=`./story.html?id=${t.id}`,e.dataset.story=t.id,e.innerHTML=`
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-front">
          <span class="book-tag">${t.tag}</span>
          <h2 class="book-title">${t.title}</h2>
          <p class="book-author">${t.author}</p>
        </div>
      </div>
      <div class="book-info">
        <p class="book-desc">${t.summary}</p>
        <span class="read-btn">开始阅读</span>
      </div>
    `,s.appendChild(e),e.style.opacity="0",e.style.transform="translateY(40px)",setTimeout(()=>{e.style.transition="opacity 0.6s ease, transform 0.6s ease",e.style.opacity="1",e.style.transform="translateY(0)"},200+o*200)}))}function n(){const s=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(t=>{t.addEventListener("click",o=>{o.preventDefault();const e=t.getAttribute("href");new Audio().play().catch(()=>{}),s&&s.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=e},650)})}),window.addEventListener("pageshow",t=>{t.persisted&&s&&s.classList.remove("active","flipping-in","flipping-out")}),s&&(s.classList.add("active","flipping-in"),setTimeout(()=>{s.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{i(),n()});
