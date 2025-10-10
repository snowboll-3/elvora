document.addEventListener("mousemove", (e)=>{
  const x = (e.clientX / window.innerWidth  - .5) * 6;
  const y = (e.clientY / window.innerHeight - .5) * 6;
  document.getElementById("hero").style.backgroundPosition = `${50+x}% ${50+y}%`;
});
