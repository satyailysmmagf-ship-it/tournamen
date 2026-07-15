/* ============================================================
   CONFIG
   ============================================================ */
const SERVER_DOMAIN = "caffemc.xyz";
const JAVA_PORT = "25565";
const BEDROCK_PORT = "19132";
const COPY_IP = SERVER_DOMAIN;

const WORKER_URL = "https://coffemc-api.chhinkimrong.workers.dev";

let checking = false;

/* ============================================================
   COPY SERVER IP
   ============================================================ */
function copyIP(){
  navigator.clipboard.writeText(COPY_IP);
  const msg = document.getElementById("copied");
  if(!msg) return;
  msg.classList.add("show");
  setTimeout(() => { msg.classList.remove("show"); }, 2200);
}

/* ============================================================
   TOGGLE MOBILE MENU
   ============================================================ */
function toggleMenu(){
  const menu = document.getElementById("menu");
  if(!menu) return;
  menu.classList.toggle("show");
}

document.addEventListener("click", function(e){
  const menu = document.getElementById("menu");
  const button = document.querySelector(".menu-btn");
  if(!menu || !button) return;
  if(!menu.contains(e.target) && !button.contains(e.target)){
    menu.classList.remove("show");
  }
});

/* ============================================================
   SERVER STATUS + LIVE PLAYER LIST
   ============================================================ */
async function checkServer(){
  if(checking) return;
  checking = true;

  const els = {
    playersJava:    document.getElementById("playersJava"),   // hero card text (repurposed as total)
    dotJava:        document.getElementById("statusDotJava"), // hero card dot
    onlineEl:       document.getElementById("onlineCount"),   // Live World panel count
    gridEl:         document.getElementById("playerGrid"),
    emptyEl:        document.getElementById("playersEmpty"),
    emptyCount:     document.getElementById("emptyCount"),
    emptyNote:      document.getElementById("emptyNote"),
  };

  if(els.playersJava) els.playersJava.textContent = "Checking...";

  try{
    let javaData, bedrockData;

    if(WORKER_URL){
      const url = `${WORKER_URL.replace(/\/$/, "")}/api/status?t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if(!res.ok) throw new Error("API Error");
      const data = await res.json();
      javaData    = data.java;
      bedrockData = data.bedrock;
    } else {
      const [javaRes, bedrockRes] = await Promise.all([
        fetch(`https://api.mcsrvstat.us/3/${SERVER_DOMAIN}?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`https://api.mcsrvstat.us/bedrock/3/${SERVER_DOMAIN}:${BEDROCK_PORT}?t=${Date.now()}`, { cache: "no-store" })
      ]);
      javaData    = javaRes.ok    ? await javaRes.json()    : { online: false };
      bedrockData = bedrockRes.ok ? await bedrockRes.json() : { online: false };
    }

    const javaOnline    = javaData?.online    ? (javaData.players?.online    ?? 0) : 0;
    const bedrockOnline = bedrockData?.online ? (bedrockData.players?.online ?? 0) : 0;
    const totalOnline   = javaOnline + bedrockOnline;
    const anyOnline     = !!(javaData?.online || bedrockData?.online);

    // hero card — single dot + total count
    if(els.dotJava){
      if(anyOnline) els.dotJava.classList.add("online");
      else          els.dotJava.classList.remove("online");
    }
    if(els.playersJava){
      els.playersJava.textContent = anyOnline ? `${totalOnline} online` : "Offline";
    }

    // Live World panel count
    if(els.onlineEl) els.onlineEl.textContent = totalOnline;

    // merge real player name lists from Java + Bedrock
    const list = [
      ...(javaData?.players?.list    ?? []),
      ...(bedrockData?.players?.list ?? [])
    ];

    if(anyOnline){
      renderPlayerList(totalOnline, list, els);
    } else {
      renderOfflineState(els);
    }

  } catch(err){
    console.error("Server check failed:", err);
    if(els.dotJava) els.dotJava.classList.remove("online");
    if(els.playersJava) els.playersJava.textContent = "Offline";
    if(els.onlineEl)    els.onlineEl.textContent = "0";
    renderOfflineState(els);
  } finally {
    checking = false;
  }
}

function renderPlayerList(online, list, els){
  const { gridEl, emptyEl, emptyCount, emptyNote } = els;
  if(!gridEl || !emptyEl) return;

  if(Array.isArray(list) && list.length > 0){
    gridEl.innerHTML = "";
    gridEl.style.display = "grid";
    emptyEl.style.display = "none";

    list.forEach(name => {
      const card = document.createElement("div");
      card.className = "player-card";

      const img = document.createElement("img");
      img.src = `https://mc-heads.net/avatar/${encodeURIComponent(name)}/48`;
      img.alt = name;
      img.loading = "lazy";
      img.onerror = function(){ this.src = "https://mc-heads.net/avatar/MHF_Steve/48"; };

      const span = document.createElement("span");
      span.textContent = name;

      card.appendChild(img);
      card.appendChild(span);
      gridEl.appendChild(card);
    });
    return;
  }

  // server online but hides the player list
  gridEl.style.display = "none";
  emptyEl.style.display = "flex";
  if(emptyCount) emptyCount.textContent = online;
  if(emptyNote){
    emptyNote.textContent = online > 0
      ? "Player list is private — set hide-online-players=false in server.properties to show names."
      : "Be the first one in — the world is waiting.";
  }
}

function renderOfflineState(els){
  const { gridEl, emptyEl, emptyCount, emptyNote } = els;
  if(!gridEl || !emptyEl) return;
  gridEl.style.display = "none";
  emptyEl.style.display = "flex";
  if(emptyCount) emptyCount.textContent = "0";
  if(emptyNote)  emptyNote.textContent = "The server looks offline right now — try again shortly.";
}

checkServer();
setInterval(checkServer, 30000);

/* ============================================================
   SOFT ANTI-INSPECT
   ============================================================ */
(function(){
  document.addEventListener("contextmenu", function(e){ e.preventDefault(); });
  document.addEventListener("keydown", function(e){
    const key = e.key.toLowerCase();
    if(key === "f12"){ e.preventDefault(); return false; }
    if(e.ctrlKey && e.shiftKey && ["i","j","c"].includes(key)){ e.preventDefault(); return false; }
    if(e.ctrlKey && key === "u"){ e.preventDefault(); return false; }
    if(e.ctrlKey && key === "s"){ e.preventDefault(); return false; }
  });
})();
