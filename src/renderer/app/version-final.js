/* Final release-version sync. Loaded last so legacy parity layers cannot downgrade STATE.version. */
window.FLEET_DESKTOP_VERSION='0.4.6';
setTimeout(()=>{
  if(typeof STATE!=='undefined'&&STATE){STATE.version=window.FLEET_DESKTOP_VERSION;if(typeof save==='function')save(false)}
  const label=document.querySelector('.brand small');if(label)label.textContent='v0.4.6 · Asset Data Baseline Review';
},180);
