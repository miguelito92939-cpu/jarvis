(() => {
  const $ = (id) => document.getElementById(id);
  const messages = $("messages");
  const input = $("messageInput");
  const form = $("chatForm");
  const voiceBtn = $("voiceBtn");
  const voiceBtnText = $("voiceBtnText");
  const voiceNote = $("voiceNote");
  const savedKey = "jarvis-local-memory-v1";
  let recognition = null;
  let listening = false;

  function updateClock() {
    $("clock").textContent = new Date().toLocaleTimeString("pt-BR", {hour12:false});
  }
  setInterval(updateClock, 1000); updateClock();

  function loadMemory() {
    try { return JSON.parse(localStorage.getItem(savedKey) || "[]"); } catch { return []; }
  }
  function saveMemory(items) {
    localStorage.setItem(savedKey, JSON.stringify(items.slice(-80)));
    $("memoryCount").textContent = `${items.length} itens salvos`;
  }
  function addMessage(who, text, save = true) {
    const row = document.createElement("div");
    row.className = `message ${who === "Você" ? "user-message" : "jarvis-message"}`;
    const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = who === "Você" ? "U" : "J";
    const body = document.createElement("div"); body.className = "message-body";
    const author = document.createElement("div"); author.className = "message-author";
    author.textContent = who;
    const time = document.createElement("span"); time.textContent = new Date().toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"});
    author.appendChild(time);
    const p = document.createElement("p"); p.textContent = text;
    body.append(author,p); row.append(avatar,body); messages.appendChild(row); messages.scrollTop = messages.scrollHeight;
    if (save) { const data = loadMemory(); data.push({who,text,at:Date.now()}); saveMemory(data); }
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR"; utterance.rate = 0.96; utterance.pitch = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const pt = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("pt-br")) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith("pt"));
    if (pt) utterance.voice = pt;
    window.speechSynthesis.speak(utterance);
  }
  function localReply(text) {
    const t = text.toLowerCase().trim();
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite)\b/.test(t)) return "Olá. JARVIS à sua disposição. Esta interface ainda está em modo de demonstração.";
    if (t.includes("que horas") || t.includes("hora agora")) return `Agora são ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.`;
    if (t.includes("que dia") || t.includes("data de hoje")) return `Hoje é ${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}.`;
    if (t.includes("limpar conversa")) { clearChat(); return "Conversa visual limpa. As memórias salvas podem ser apagadas na seção Memória local."; }
    if (t.includes("memória") || t.includes("memoria")) return `Tenho ${loadMemory().length} mensagens registradas neste navegador. Isso não é memória de um modelo de IA; é apenas histórico local.`;
    if (t.includes("ajuda") || t.includes("o que você faz") || t.includes("o que voce faz")) return "Posso demonstrar respostas básicas, informar a hora e a data e guardar o histórico neste navegador. Para raciocínio avançado e controle real de aplicativos, ainda preciso ser conectado a um modelo local e a integrações Android.";
    if (t.includes("abrir") || t.includes("mande mensagem") || t.includes("ligue para")) return "Ainda não tenho permissão nem integração para controlar aplicativos neste protótipo. Por segurança, não vou fingir que executei essa ação.";
    return "Recebi sua mensagem. No momento, estou funcionando como uma interface local de demonstração, sem um modelo de inteligência artificial conectado. A próxima etapa é integrar um modelo de IA e os recursos de voz offline.";
  }
  function handleMessage(text, fromVoice = false) {
    const clean = text.trim(); if (!clean) return;
    addMessage("Você", clean);
    input.value = "";
    $("orbTitle").textContent = "Analisando solicitação...";
    $("orbSubtitle").textContent = "Processamento local de demonstração";
    setTimeout(() => {
      const answer = localReply(clean);
      addMessage("J.A.R.V.I.S.", answer);
      $("orbTitle").textContent = "JARVIS está à sua disposição.";
      $("orbSubtitle").textContent = "Digite uma mensagem ou experimente a entrada por voz.";
      speak(answer);
    }, 350);
  }
  form.addEventListener("submit", e => { e.preventDefault(); handleMessage(input.value); });
  function clearChat() {
    messages.replaceChildren();
    const data = loadMemory().filter(x => x.who === "Você" || x.who === "J.A.R.V.I.S.");
    addMessage("J.A.R.V.I.S.", "Canal visual reiniciado. Como posso ajudar?", false);
  }
  $("clearBtn").addEventListener("click", () => { clearChat(); });
  function setListening(value) {
    listening = value;
    voiceBtn.classList.toggle("listening", value);
    voiceBtnText.textContent = value ? "PARAR ESCUTA" : "INICIAR VOZ";
    $("audioModule").textContent = value ? "Microfone ativo" : "Aguardando ativação";
    $("orbTitle").textContent = value ? "Estou ouvindo." : "JARVIS está à sua disposição.";
    $("orbSubtitle").textContent = value ? "Fale agora; o reconhecimento depende do navegador." : "Digite uma mensagem ou experimente a entrada por voz.";
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR"; recognition.continuous = true; recognition.interimResults = true;
    let finalText = "";
    recognition.onstart = () => { setListening(true); voiceNote.textContent = "Microfone ativo. O reconhecimento pode exigir internet, dependendo do navegador."; };
    recognition.onresult = event => {
      let interim = "";
      for (let i=event.resultIndex;i<event.results.length;i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      if (interim) { input.placeholder = interim; }
      if (finalText.trim()) { const phrase=finalText.trim(); finalText=""; handleMessage(phrase,true); }
    };
    recognition.onerror = event => { voiceNote.textContent = `Reconhecimento indisponível: ${event.error}. Tente novamente ou use o teclado.`; };
    recognition.onend = () => { if (listening) { try { recognition.start(); } catch {} } else { setListening(false); } };
  } else {
    voiceBtn.disabled = true; voiceBtn.style.opacity = ".5";
    voiceNote.textContent = "Este navegador não oferece reconhecimento de fala. Você ainda pode digitar e ouvir respostas se a síntese estiver disponível.";
  }
  voiceBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (listening) { setListening(false); recognition.stop(); }
    else { try { recognition.start(); } catch { voiceNote.textContent = "Não foi possível iniciar o microfone. Verifique a permissão do navegador."; } }
  });
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
    const view = btn.dataset.view;
    if (view === "memory") {
      $("pageTitle").textContent = "Memória local.";
      $("pageSubtitle").textContent = "Histórico armazenado somente neste navegador.";
      $("viewCode").textContent = "02";
      addMessage("J.A.R.V.I.S.", `O histórico contém ${loadMemory().length} itens. Para apagar os dados salvos, use o botão Limpar conversa e limpe os dados do site nas configurações do navegador.`, false);
    } else if (view === "commands") {
      $("pageTitle").textContent = "Centro de comandos.";
      $("pageSubtitle").textContent = "Recursos disponíveis nesta demonstração.";
      $("viewCode").textContent = "03";
      addMessage("J.A.R.V.I.S.", "Comandos de demonstração: 'Que horas são?', 'Que dia é hoje?', 'Ajuda' e 'O que você faz?'. Abrir aplicativos e executar ações reais ainda não está conectado.", false);
    } else {
      $("pageTitle").textContent = "Bom ter você de volta.";
      $("pageSubtitle").textContent = "Estou pronto para receber suas instruções.";
      $("viewCode").textContent = "01";
    }
  }));
  saveMemory(loadMemory());
})();