window.elvoraRollback = function(){
  try {
    const t = new Date(Date.now() - 3600*1000).toLocaleString();
    alert("Rollback na ~ " + t + " (demo stub)");
  } catch(e) {}
};
