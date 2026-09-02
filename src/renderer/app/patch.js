const _documentFormV040=documentForm;
documentForm=(d={},assetId='')=>_documentFormV040(d||{},assetId);
setTimeout(()=>{let changed=false;for(const a of STATE.assets||[]){let wanted='';if(/สรรัฐ/.test(a.sourceOwner||''))wanted='OW90';else if(/ธำรงค์/.test(a.sourceOwner||''))wanted='OW91';else wanted=(STATE.ownerRegistry||[]).find(o=>o.referenceId===a.companyId)?.id||'OW99';if(wanted&&a.ownerId!==wanted){a.ownerId=wanted;changed=true}}if(changed)save(false)},0);
