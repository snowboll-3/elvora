window.ElvoraScanner = (() => {
  let stream, video, raf;
  const hasBarcode = 'BarcodeDetector' in window;

  async function start(videoEl, onDecode, onStatus){
    video = videoEl;
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
      video.srcObject = stream;
      await video.play();
      onStatus?.("Kamera pokrenuta.");
      if(hasBarcode){
        const detector = new BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','code_128','code_39'] });
        const loop = async () => {
          try{
            const codes = await detector.detect(video);
            if(codes && codes.length){ onDecode(codes[0].rawValue); }
          }catch{}
          raf = requestAnimationFrame(loop);
        };
        loop();
      }else{
        onStatus?.("Ovaj preglednik nema BarcodeDetector – koristi ručni unos.");
      }
    }catch(e){
      onStatus?.("Nije moguće otvoriti kameru: " + e.message);
    }
  }

  function stop(){
    cancelAnimationFrame(raf);
    if(stream){ stream.getTracks().forEach(t=>t.stop()); }
    if(video){ video.pause(); video.srcObject = null; }
  }

  return { start, stop, hasBarcode };
})();
