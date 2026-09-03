/* Compatibility only: preserve v0.4.4 direct attachment preview while REQ-05 groups Asset documents. */
(function(){
  const attachmentOf=d=>d?.attachment||((d?.attachmentData||d?.attachmentName)?{name:d.attachmentName||'เอกสารแนบ',type:d.attachmentType||'',data:d.attachmentData||''}:null);
  function preview(d){
    const a=attachmentOf(d);if(!a?.data)return toast('เอกสารนี้ไม่มีไฟล์แนบ',true);
    const image=(a.type||'').startsWith('image/')||/^data:image\//.test(a.data);
    dialog.classList.add('asset-view-dialog');
    dialog.innerHTML=`<div class="dialog-head"><div><h2>${esc(a.name||'ไฟล์แนบ')}</h2><small>${image?'รูปภาพ':'PDF / เอกสารแนบ'}</small></div><button data-close>×</button></div><div class="asset-file-viewer">${image?`<img src="${a.data}" alt="${esc(a.name||'attachment')}">`:`<iframe src="${a.data}" title="${esc(a.name||'PDF')}"></iframe>`}</div>`;
    modal.classList.remove('hidden');dialog.querySelector('[data-close]').onclick=()=>{dialog.classList.remove('asset-view-dialog');closeModal()};
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-attachment]');if(!b||!document.querySelector('#assetTab')?.contains(b))return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=(STATE.documents||[]).find(x=>x.id===b.dataset.attachment);if(d)preview(d);
  },true);
})();
