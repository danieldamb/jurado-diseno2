/* Efectos de sonido estilo videojuego — sintetizados con Web Audio, sin archivos de audio */
(function(){
  let ctx,master,muted=false,hoverAt=0,lobbySeen=false;
  try{muted=localStorage.getItem('sfx')==='off'}catch(e){}
  const m=n=>440*Math.pow(2,(n-69)/12);
  function init(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
      ctx=new AC();const comp=ctx.createDynamicsCompressor();master=ctx.createGain();master.gain.value=.55;
      master.connect(comp);comp.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume();
    return true;
  }
  function tone(f,t,d,type,v,to){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);
    if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.06,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.03);
  }
  function noise(t,d,v,fc){
    const len=Math.floor(ctx.sampleRate*d),b=ctx.createBuffer(1,len,ctx.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<len;i++)a[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=b;f.type='bandpass';f.frequency.value=fc;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    s.connect(f);f.connect(g);g.connect(master);s.start(t);
  }
  const SFX={
    click(t){tone(m(79),t,.05,'square',.05);tone(m(86),t+.03,.06,'square',.035)},
    hover(t){tone(m(91),t,.03,'triangle',.012)},
    star(t,n){
      const base=[72,74,76,79,81][(n||1)-1];
      tone(m(base),t,.07,'square',.055);tone(m(base+12),t+.06,.16,'square',.05);tone(m(base),t+.06,.2,'triangle',.07);
      if(n===5)[84,88,91,96].forEach((k,i)=>tone(m(k),t+.16+i*.055,.14,'triangle',.05));
    },
    submit(t){
      [60,64,67,72,76].forEach((k,i)=>tone(m(k),t+i*.07,.12,'square',.055));
      [72,76,79].forEach(k=>tone(m(k),t+.42,.55,'triangle',.07));
      tone(m(84),t+.42,.5,'square',.03);
    },
    ok(t){tone(m(76),t,.08,'square',.05);tone(m(83),t+.07,.18,'square',.05)},
    error(t){tone(150,t,.16,'sawtooth',.06,90);tone(120,t+.1,.2,'sawtooth',.06,70)},
    whoosh(t){tone(200,t,.35,'triangle',.06,1100);noise(t,.3,.05,1500)},
    join(t){tone(m(79),t,.07,'square',.05);tone(m(84),t+.07,.07,'square',.05);tone(m(91),t+.14,.2,'square',.05)},
    podium(t){
      for(let i=0;i<15;i++)noise(t+i*.055,.05,.025+i*.004,1800);
      tone(200,t,.85,'triangle',.04,800);
      [[.8,64],[.98,72],[1.14,60]].forEach(([d,k])=>{tone(m(k-24),t+d,.16,'sine',.2,m(k-36));tone(m(k),t+d,.12,'square',.04)});
      const f=t+1.25;
      [67,72,76,79].forEach((k,i)=>{tone(m(k),f+i*.12,.14,'square',.06);tone(m(k-12),f+i*.12,.16,'triangle',.07)});
      [72,76,79,84].forEach(k=>tone(m(k),f+.5,.8,'triangle',.07));
      tone(m(84),f+.5,.7,'square',.035);
      [96,100,103,108].forEach((k,i)=>tone(m(k),f+.9+i*.06,.14,'triangle',.04));
    }
  };
  function play(name,arg){if(muted||!init())return;SFX[name](ctx.currentTime+.005,arg)}
  window.GameSFX={play,isMuted:()=>muted};

  /* Botones y estrellas: suena al presionar para sentirse inmediato */
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest&&e.target.closest('button,.student');
    if(!b||b.disabled)return;
    if(b.classList.contains('star')){const n=b.dataset.n||b.dataset.ts;if(n)return play('star',+n)}
    if(b.id==='sfxToggle')return;
    play('click');
  },true);
  document.addEventListener('pointerover',e=>{
    if(e.pointerType&&e.pointerType!=='mouse')return;
    const b=e.target.closest&&e.target.closest('.btn,.student,.modebar button,button.star');
    const now=performance.now();
    if(!b||b.disabled||b.contains(e.relatedTarget)||now-hoverAt<70)return;
    hoverAt=now;play('hover');
  });

  /* Reacciones a lo que ocurre en la app (avisos, podio, acceso al lobby) */
  const errRe=/^(Completa|Selecciona|No se|No hay|No encontramos|Introduce|Error|Firebase|La sesión ya|Esta evaluación ya|Ese estudiante)/i;
  function addToggle(){
    const top=document.querySelector('.top');
    if(!top||top.querySelector('#sfxToggle'))return;
    const b=document.createElement('button');b.id='sfxToggle';b.className='sfx-toggle';b.type='button';
    const paint=()=>{b.textContent=muted?'🔇':'🔊';b.setAttribute('aria-pressed',String(!muted));b.setAttribute('aria-label',muted?'Activar sonidos':'Silenciar sonidos');b.title=muted?'Activar sonidos':'Silenciar sonidos'};
    paint();
    b.onclick=()=>{muted=!muted;try{localStorage.setItem('sfx',muted?'off':'on')}catch(e){}paint();play('click')};
    top.append(b);
  }
  new MutationObserver(list=>{
    addToggle();
    for(const mu of list)for(const n of mu.addedNodes){
      if(n.nodeType!==1)continue;
      if(n.classList.contains('toast')){
        const tx=n.textContent||'';
        play(errRe.test(tx)?'error':/evaluación.*(registrada|enviada)/i.test(tx)?'submit':'ok');
      }
      const ps=n.matches('.podium-stage')?n:n.querySelector&&n.querySelector('.podium-stage');
      if(ps&&!ps.dataset.sfx){ps.dataset.sfx='1';play('podium')}
      if(n.id==='lobbyModal'||(n.querySelector&&n.querySelector('#lobbyModal'))){play(lobbySeen?'join':'whoosh');lobbySeen=true}
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
  addToggle();
})();
