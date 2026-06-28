import{c as a}from"./config-DRmfdqFn.js";function n(){const t=document.getElementById("bookshelf");t&&(t.innerHTML="",a.stories.forEach((s,i)=>{const e=document.createElement("a");e.className=`book-card ${s.id}-card`,e.href=`./story.html?id=${s.id}`,e.dataset.story=s.id,e.innerHTML=`
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-front">
          <span class="book-tag">${s.tag}</span>
          <h2 class="book-title">${s.title}</h2>
          <p class="book-author">${s.author}</p>
        </div>
      </div>
      <div class="book-info">
        <p class="book-desc">${s.summary}</p>
        <span class="read-btn">开始阅读</span>
      </div>
    `,t.appendChild(e),e.style.opacity="0",e.style.transform="translateY(40px)",setTimeout(()=>{e.style.transition="opacity 0.6s ease, transform 0.6s ease",e.style.opacity="1",e.style.transform="translateY(0)"},200+i*200)}))}function c(){const t=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(i=>{i.addEventListener("click",e=>{e.preventDefault();const o=i.getAttribute("href");t&&t.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=o},650)})}),window.addEventListener("pageshow",i=>{i.persisted&&t&&t.classList.remove("active","flipping-in","flipping-out")}),t&&(t.classList.add("active","flipping-in"),setTimeout(()=>{t.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{n(),c()});
