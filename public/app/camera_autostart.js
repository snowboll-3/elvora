(async()=>{
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d=>d.kind==='videoinput');
    let backCam = cams.find(c=>c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'));
    if(!backCam) backCam = cams[0];
    const deviceId = backCam?.deviceId;

    const video = document.getElementById('video');
    video.srcObject = await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:deviceId}}, audio:false});
    await video.play();

    const overlay = document.getElementById('overlay');
    const ctx = overlay.getContext('2d');
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    const drawFrame = ()=>{
      ctx.clearRect(0,0,overlay.width, overlay.height);
      const w=overlay.width, h=overlay.height, m=Math.round(Math.min(w,h)*0.12), sw=w-2*m, sh=h-2*m, L=Math.round(Math.min(sw,sh)*0.14);
      ctx.strokeStyle='#39d98a'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(m, m+L); ctx.lineTo(m,m); ctx.lineTo(m+L,m); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m+sw-L,m); ctx.lineTo(m+sw,m); ctx.lineTo(m+sw,m+L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m,m+sh-L); ctx.lineTo(m,m+sh); ctx.lineTo(m+L,m+sh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m+sw-L,m+sh); ctx.lineTo(m+sw,m+sh); ctx.lineTo(m+sw,m+sh-L); ctx.stroke();
      requestAnimationFrame(drawFrame);
    };
    drawFrame();

    // Barcode detector
    const detector = ('BarcodeDetector' in window) ? new BarcodeDetector({formats:["ean_13","ean_8","upc_a","code_128","qr_code"]}) : null;

    const beep = ()=>{
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      const o=ac.createOscillator(), g=ac.createGain();
      o.type='sine'; o.frequency.value=1100; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.09);
      o.start(); o.stop(ac.currentTime+0.10);
      setTimeout(()=>{try{ac.close()}catch{}},180);
    };

    let lastCode=null;
    const loopScan=async()=>{
      try{
        if(detector){
          const codes = await detector.detect(video);
          if(codes.length){
            const code = codes[0].rawValue.replace(/\D+/g,'');
            if(code!==lastCode){ lastCode=code; beep(); if(navigator.vibrate) navigator.vibrate(60); console.log('EAN:',code); }
          }
        }
      }catch{}
      setTimeout(loopScan,200);
    };
    loopScan();

  }catch(e){console.error(e);}
})();
