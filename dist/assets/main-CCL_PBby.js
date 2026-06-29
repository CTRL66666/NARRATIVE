import{c as a}from"./config-BIbxg2R-.js";function n(){const t=document.getElementById("bookshelf");t&&(t.innerHTML="",a.stories.forEach((o,i)=>{const e=document.createElement("a");e.className=`book-card ${o.id}-card`,e.href=`./story.html?id=${o.id}`,e.dataset.story=o.id,e.innerHTML=`
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
    `,t.appendChild(e),e.style.opacity="0",e.style.transform="translateY(40px)",setTimeout(()=>{e.style.transition="opacity 0.6s ease, transform 0.6s ease",e.style.opacity="1",e.style.transform="translateY(0)"},200+i*200)}))}function c(){const t=document.getElementById("pageFlipOverlay");document.querySelectorAll(".book-card").forEach(i=>{i.addEventListener("click",e=>{e.preventDefault();const s=i.getAttribute("href");new Audio().play().catch(()=>{}),t&&t.classList.add("active","flipping-out"),setTimeout(()=>{window.location.href=s},650)})}),window.addEventListener("pageshow",i=>{i.persisted&&t&&t.classList.remove("active","flipping-in","flipping-out")}),t&&(t.classList.add("active","flipping-in"),setTimeout(()=>{t.classList.remove("active","flipping-in")},1e3))}document.addEventListener("DOMContentLoaded",()=>{n(),c()});
