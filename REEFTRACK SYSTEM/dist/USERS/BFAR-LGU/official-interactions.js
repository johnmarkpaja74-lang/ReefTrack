(()=>{
  "use strict";
  let session=null;
  try{session=JSON.parse(sessionStorage.getItem("reeftrack_session"))}catch{}
  const trailSelect=document.querySelector("#trail-batch");
  if(trailSelect){
    const hasValidatedBatch=[...trailSelect.options].some(option=>option.value.trim());
    trailSelect.disabled=!hasValidatedBatch;
    if(!hasValidatedBatch){
      const option=document.createElement("option");
      option.value="";
      option.textContent="No validated batches available";
      option.selected=true;
      trailSelect.replaceChildren(option);
      const trail=document.querySelector("#trail");
      if(trail){
        const state=document.createElement("div");
        state.className="trail-empty";
        const icon=document.createElement("i");
        icon.className="ph ph-files";
        icon.setAttribute("aria-hidden","true");
        state.append(icon);
        const heading=document.createElement("b");
        heading.textContent="No validated batch records";
        const note=document.createElement("p");
        note.textContent="Validated batches will become available here for lifecycle review.";
        state.append(heading,note);
        trail.replaceChildren(state);
      }
    }
  }
  if(session){
    const topName=document.querySelector("#top-name");
    const welcomeName=document.querySelector("#welcome-name");
    if(topName)topName.textContent=session.name||"BFAR/LGU Official";
    if(welcomeName)welcomeName.textContent=String(session.name||"Official").split(" ")[0];
  }

  const logoutButton=document.querySelector("#logout");
  const modal=document.querySelector("#official-logout-modal");
  if(logoutButton&&modal){
    const close=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true")};
    logoutButton.onclick=event=>{event.preventDefault();modal.classList.add("open");modal.setAttribute("aria-hidden","false")};
    modal.querySelector(".logout-close").onclick=close;
    modal.querySelector(".logout-stay").onclick=close;
    modal.onclick=event=>{if(event.target===modal)close()};
    modal.querySelector("#official-confirm-logout").onclick=()=>{
      window.ReefTrackAuth?.clearHostedSession?.();
      sessionStorage.removeItem("reeftrack_session");
      location.replace("../../index.html");
    };
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&modal.classList.contains("open"))close()});
  }

  const saveButton=document.querySelector("#official-save-settings");
  const profileForm=document.querySelector("#profile-form");
  const passwordForm=document.querySelector("#password-form");
  const reviewForm=document.querySelector("#review-settings-form");
  const showSaved=message=>{
    const toast=document.querySelector("#toast");
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),2200);
  };
  const readUsers=()=>{try{return JSON.parse(localStorage.getItem("reeftrack_users"))||[]}catch{return[]}};
  const saveAccountSettings=()=>{
    if(!session||!profileForm)return;
    const profile=new FormData(profileForm);
    const review=reviewForm?new FormData(reviewForm):new FormData();
    const settings={...(session.settings||{}),organization:profile.get("organization"),contact:profile.get("contact"),position:profile.get("position"),agencyType:profile.get("agencyType"),officeAddress:profile.get("officeAddress"),jurisdiction:profile.get("jurisdiction"),reportFormat:review.get("reportFormat")||"PDF",coordinateFormat:review.get("coordinateFormat")||"Decimal degrees",mapView:review.get("mapView")||"Map",notifyBatches:review.get("notifyBatches")==="on",notifyDeployments:review.get("notifyDeployments")==="on",notifyMonitoring:review.get("notifyMonitoring")==="on",notifyFailedLogin:review.get("notifyFailedLogin")==="on"};
    session.name=String(profile.get("name")||session.name).trim();
    session.settings=settings;
    const users=readUsers();
    const account=users.find(user=>user.id===session.accountId)||users.find(user=>String(user.email).toLowerCase()===String(session.email).toLowerCase()&&user.role==="official");
    if(account){account.name=session.name;account.settings=settings;account.organization=settings.organization;account.contact=settings.contact;localStorage.setItem("reeftrack_users",JSON.stringify(users));localStorage.setItem("reeftrack_latest_credentials",JSON.stringify({accountId:account.id,name:account.name,email:account.email,password:account.password,role:account.role,settings}))}
    sessionStorage.setItem("reeftrack_session",JSON.stringify(session));
    document.querySelectorAll("#side-name,#top-name").forEach(node=>node.textContent=session.name);
    const welcome=document.querySelector("#welcome-name");if(welcome)welcome.textContent=session.name.split(" ")[0]||"Official";
    showSaved("BFAR/LGU settings saved.");
  };
  if(profileForm&&session){
    const settings=session.settings||{};
    profileForm.elements.name.value=session.name||"";
    profileForm.elements.email.value=session.email||"";
    profileForm.elements.organization.value=settings.organization||session.organization||"";
    profileForm.elements.contact.value=settings.contact||session.contact||"";
    profileForm.elements.position.value=settings.position||"";
    profileForm.elements.agencyType.value=settings.agencyType||"";
    profileForm.elements.officeAddress.value=settings.officeAddress||"";
    profileForm.elements.jurisdiction.value=settings.jurisdiction||"";
    profileForm.onsubmit=event=>{event.preventDefault();if(profileForm.reportValidity())saveAccountSettings()};
  }
  if(reviewForm&&session){
    const settings=session.settings||{};
    reviewForm.elements.reportFormat.value=settings.reportFormat||"PDF";
    reviewForm.elements.coordinateFormat.value=settings.coordinateFormat||"Decimal degrees";
    reviewForm.elements.mapView.value=settings.mapView||"Map";
    ["notifyBatches","notifyDeployments","notifyMonitoring","notifyFailedLogin"].forEach(name=>reviewForm.elements[name].checked=settings[name]??true);
    reviewForm.onsubmit=event=>{event.preventDefault();saveAccountSettings()};
  }
  if(saveButton&&profileForm&&passwordForm){
    saveButton.onclick=()=>{
      if(!profileForm.reportValidity())return;
      saveAccountSettings();
      const fields=[passwordForm.elements.current,passwordForm.elements.password,passwordForm.elements.confirm].filter(Boolean);
      if(fields.some(input=>input.value))passwordForm.requestSubmit();
    };
  }

  const historyBody=document.querySelector("#history-body");
  const historyDate=document.querySelector("#history-date");
  if(historyBody&&historyDate&&session){
    const escapeHtml=value=>String(value??"").replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
    const dateKey=value=>{const date=new Date(value),year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");return `${year}-${month}-${day}`};
    let allHistory=[];
    try{allHistory=JSON.parse(localStorage.getItem("reeftrack_login_history"))||[]}catch{}
    const email=String(session.email||"").toLowerCase();
    const ownHistory=allHistory.filter(entry=>String(entry.email||"").toLowerCase()===email).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    const availableDates=[...new Set(ownHistory.map(entry=>dateKey(entry.timestamp)))];
    const pageSize=7;
    let page=1;
    const todayKey=dateKey(new Date());
    historyDate.value=availableDates[0]||todayKey;
    historyDate.max=todayKey;
    const renderDailyHistory=()=>{
      const selected=historyDate.value;
      const records=ownHistory.filter(entry=>dateKey(entry.timestamp)===selected);
      const pages=Math.max(1,Math.ceil(records.length/pageSize));
      page=Math.min(page,pages);
      const shown=records.slice((page-1)*pageSize,page*pageSize);
      const titleDate=new Date(`${selected}T00:00:00`);
      document.querySelector("#history-date-title").textContent=titleDate.toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
      document.querySelector("#history-day-total").textContent=records.length;
      document.querySelector("#history-day-success").textContent=records.filter(entry=>/success/i.test(entry.status)).length;
      document.querySelector("#history-day-failed").textContent=records.filter(entry=>!/success/i.test(entry.status)).length;
      historyBody.innerHTML=shown.length?shown.map(entry=>`<tr><td><b>${new Date(entry.timestamp).toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"})}</b></td><td>${escapeHtml(entry.device||"Unknown device")}</td><td>${escapeHtml(entry.ipAddress||"Not available")}</td><td><span class="badge">${escapeHtml(entry.status||"Unknown")}</span></td></tr>`).join(""):`<tr class="history-empty"><td colspan="4">No login activity recorded for this date.</td></tr>`;
      const first=records.length?(page-1)*pageSize+1:0,last=Math.min(page*pageSize,records.length);
      document.querySelector("#history-page-info").textContent=`Showing ${first}–${last} of ${records.length} record${records.length===1?"":"s"} · Page ${page} of ${pages}`;
      document.querySelector("#history-prev-page").disabled=page<=1;
      document.querySelector("#history-next-page").disabled=page>=pages;
      document.querySelector("#history-prev-date").disabled=false;
      document.querySelector("#history-next-date").disabled=selected>=todayKey;
    };
    const moveHistoryDate=days=>{
      const current=historyDate.value||todayKey;
      const date=new Date(`${current}T00:00:00`);
      if(Number.isNaN(date.getTime()))return;
      date.setDate(date.getDate()+days);
      const next=dateKey(date);
      if(next>todayKey)return;
      historyDate.value=next;
      page=1;
      renderDailyHistory();
    };
    historyDate.onchange=()=>{page=1;renderDailyHistory()};
    document.querySelector("#history-prev-page").onclick=()=>{if(page>1){page--;renderDailyHistory()}};
    document.querySelector("#history-next-page").onclick=()=>{page++;renderDailyHistory()};
    document.querySelector("#history-prev-date").onclick=()=>moveHistoryDate(-1);
    document.querySelector("#history-next-date").onclick=()=>moveHistoryDate(1);
    renderDailyHistory();
  }

  const recordDialog=document.querySelector("#record-dialog");
  const recordContent=document.querySelector("#full-record");
  if(recordDialog&&recordContent){
    const safe=value=>String(value??"").replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
    const formatDate=value=>value?new Date(String(value).length===10?`${value}T00:00:00`:value).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}):"Not recorded";
    const getValidatedRecord=id=>{
      let data={};try{data=JSON.parse(localStorage.getItem("reeftrack_faculty_data_v2"))||{}}catch{}
      const fallbackBatch={id:"RT-2026-104",date:"2026-06-14",units:48,mix:"Clay 65% · Cement 15% · Ash 15% · Fiber 5%",qc:"Passed",status:"Deployed",validatedBy:"Faculty Researcher"};
      const fallbackDeployment={batch:"RT-2026-104",date:"2026-07-22",site:"Pujada Bay Marine Protected Area",latitude:6.8276,longitude:126.2147,units:48,condition:"Good",status:"Validated"};
      const fallbackMonitoring={id:"MON-031",batch:"RT-2026-104",site:"Pujada Bay Marine Protected Area",date:"2026-08-20",condition:"Good",observation:"Reef units stable with early fish aggregation.",status:"Validated",validatedBy:"Faculty Researcher"};
      const batch=(data.batches||[]).find(item=>String(item.id).toLowerCase()===String(id).toLowerCase())||(id===fallbackBatch.id?fallbackBatch:null);
      if(!batch)return null;
      const deployment=(data.deployments||[]).find(item=>item.batch===batch.id)||(batch.id===fallbackBatch.id?fallbackDeployment:null);
      const monitoring=(data.monitoring||[]).filter(item=>item.batch===batch.id&&/validated/i.test(item.status||""));
      if(!monitoring.length&&batch.id===fallbackBatch.id)monitoring.push(fallbackMonitoring);
      return{batch,deployment,monitoring};
    };
    const openValidatedRecord=id=>{
      const record=getValidatedRecord(id);
      if(!record)return showSaved("Validated record not found.");
      const {batch,deployment,monitoring}=record,latest=monitoring[0];
      recordContent.innerHTML=`<div class="record-modal-head"><div><small>VALIDATED REGULATORY RECORD</small><h2>${safe(batch.id)}</h2><p>Complete authorized lifecycle information</p></div><span>READ ONLY</span></div><div class="record-status-row"><span>${safe(batch.qc||"Validated")}</span><span>${deployment?"Deployed":"Not deployed"}</span><span>${monitoring.length?"Monitored":"Not monitored"}</span></div><div class="record-detail-grid"><div><small>Production date</small><b>${formatDate(batch.date)}</b></div><div><small>Mixture result</small><b>${safe(batch.mixtureResult||batch.mix||"Validated mixture")}</b></div><div><small>Quality control</small><b>${safe(batch.qc||"Validated")}</b></div><div><small>Reef units</small><b>${Number(deployment?.units||batch.units||0)}</b></div><div><small>Deployment date</small><b>${formatDate(deployment?.date)}</b></div><div><small>Deployment site</small><b>${safe(deployment?.site||"Not deployed")}</b></div><div><small>Latitude</small><b>${deployment?.latitude??"—"}</b></div><div><small>Longitude</small><b>${deployment?.longitude??"—"}</b></div><div><small>Latest condition</small><b>${safe(latest?.condition||deployment?.condition||"Not monitored")}</b></div><div><small>Latest monitoring</small><b>${formatDate(latest?.date||deployment?.monitoringDate)}</b></div><div><small>Validated by</small><b>${safe(latest?.validatedBy||batch.validatedBy||"Faculty / Researcher")}</b></div><div><small>Record status</small><b>Authorized for review</b></div></div><section class="record-monitoring"><h3>Monitoring History</h3>${monitoring.length?monitoring.map(item=>`<article><span>${formatDate(item.date)}</span><div><b>${safe(item.condition||"Recorded")}</b><p>${safe(item.observation||"Validated field observation")}</p></div></article>`).join(""):`<p>No validated monitoring history available.</p>`}</section><div class="record-readonly-note">This record is read-only. BFAR/LGU Officials cannot change validated source information.</div>`;
      if(typeof recordDialog.showModal==="function")recordDialog.showModal();else recordDialog.setAttribute("open","");
    };
    document.addEventListener("click",event=>{const button=event.target.closest("[data-record]");if(!button)return;event.preventDefault();event.stopImmediatePropagation();openValidatedRecord(button.dataset.record)},true);
    const closeButton=recordDialog.querySelector(".close");if(closeButton)closeButton.onclick=()=>recordDialog.close();
    recordDialog.addEventListener("click",event=>{if(event.target===recordDialog)recordDialog.close()});
  }

  /* Keep the topbar role title fixed, matching Faculty and Technician. */
  const officialPageTitle=document.querySelector("#page-title");
  document.querySelectorAll("[data-view],[data-go]").forEach(control=>{
    control.addEventListener("click",()=>{
      if(officialPageTitle)officialPageTitle.textContent="BFAR / LGU Official";
    });
  });

  const cameraPhotoInput=document.querySelector("#camera-photo-input");
  const cameraStartButton=document.querySelector("#start-camera");
  const cameraStopButton=document.querySelector("#stop-camera");
  const cameraStatus=document.querySelector("#camera-status");
  const lookupForm=document.querySelector("#lookup");
  let fallbackScanTimer=null;
  const submitScannedValue=value=>{
    let batchId=String(value||"").trim();
    try{batchId=JSON.parse(batchId).batchId||batchId}catch{}
    const input=lookupForm?.elements.batch;
    if(!input||!batchId)return;
    input.value=batchId;
    lookupForm.requestSubmit();
  };
  if(cameraPhotoInput&&cameraStartButton&&cameraStatus&&lookupForm){
    const startLiveCamera=cameraStartButton.onclick;
    cameraStartButton.onclick=async event=>{
      if(!window.isSecureContext){cameraStatus.textContent="Live camera requires HTTPS. Opening the mobile photo scanner...";cameraPhotoInput.click();return}
      if(!navigator.mediaDevices?.getUserMedia){cameraStatus.textContent="Live camera is unavailable. Take or choose a QR photo instead.";cameraPhotoInput.click();return}
      await startLiveCamera?.call(cameraStartButton,event);
      const video=document.querySelector("#video");
      if(!video?.srcObject){cameraStatus.textContent="Camera access was blocked. Take or choose a QR photo below.";return}
      if(!("BarcodeDetector"in window)&&globalThis.ReefTrackQRScanner?.decodeVideo){
        clearInterval(fallbackScanTimer);
        fallbackScanTimer=setInterval(()=>{try{const value=globalThis.ReefTrackQRScanner.decodeVideo(video);if(value){clearInterval(fallbackScanTimer);submitScannedValue(value)}}catch{}},500);
      }
    };
    cameraPhotoInput.onchange=async()=>{
      const file=cameraPhotoInput.files?.[0];if(!file)return;
      cameraStatus.textContent="Reading QR photo...";
      try{const value=await globalThis.ReefTrackQRScanner?.decodeFile(file);if(value)submitScannedValue(value);else cameraStatus.textContent="No QR code was found. Retake the photo with the full code visible."}
      catch{cameraStatus.textContent="The QR photo could not be read. Try another photo."}
      finally{cameraPhotoInput.value=""}
    };
    cameraStopButton?.addEventListener("click",()=>{clearInterval(fallbackScanTimer);fallbackScanTimer=null});
  }

  const createIcon=(name,extraClass="")=>{
    const icon=document.createElement("i");
    icon.className=`ph ${name}${extraClass?` ${extraClass}`:""}`;
    icon.setAttribute("aria-hidden","true");
    return icon;
  };
  const addButtonIcon=(button,name)=>{
    if(button&&!button.querySelector(":scope > .ph"))button.prepend(createIcon(name));
  };
  const enhanceUiIcons=()=>{
    const recentRecords=document.querySelector("#recent");
    if(recentRecords&&!recentRecords.querySelector("tbody tr")&&!recentRecords.querySelector(".empty")){
      const state=document.createElement("div");
      state.className="empty";
      state.append(createIcon("ph-files"));
      const heading=document.createElement("h3");
      heading.textContent="No validated records yet";
      const note=document.createElement("p");
      note.textContent="Authorized batch records will appear here.";
      state.append(heading,note);
      recentRecords.replaceChildren(state);
    }
    const summaryIcons={
      ".report-overview":["ph-files","ph-database","ph-file-arrow-down"],
      ".history-summary":["ph-calendar","ph-check-circle","ph-warning-circle"]
    };
    Object.entries(summaryIcons).forEach(([selector,icons])=>{
      document.querySelectorAll(`${selector} > article`).forEach((card,index)=>{
        const icon=card.querySelector(":scope > span");
        if(icon&&!icon.classList.contains("ph")){icon.classList.add("ph",icons[index]||"ph-info");icon.setAttribute("aria-hidden","true")}
      });
    });
    document.querySelectorAll("#report-list > article").forEach(card=>{
      const legacyHead=card.querySelector(":scope > .report-card-head");
      if(legacyHead){
        const heading=legacyHead.querySelector("h3");
        if(heading)card.insertBefore(heading,legacyHead);
        legacyHead.remove();
      }
      const buttons=[...card.querySelectorAll(":scope > button, :scope > .report-actions > button")];
      buttons.forEach(button=>button.querySelectorAll(":scope > .ph, :scope > svg").forEach(icon=>icon.remove()));
      let actions=card.querySelector(":scope > .report-actions");
      if(!actions&&buttons.length){
        actions=document.createElement("div");
        actions.className="report-actions";
        buttons.forEach(button=>actions.append(button));
        card.append(actions);
      }
      if(buttons[0])buttons[0].classList.add("secondary");
    });

    document.querySelectorAll(".empty, .result-empty").forEach(empty=>{
      if(empty.tagName!=="TD"&&!empty.querySelector(":scope > .ph"))empty.prepend(createIcon("ph-package"));
    });
    document.querySelectorAll("tbody td[colspan]").forEach(cell=>{
      if(cell.querySelector(".table-empty"))return;
      const message=cell.textContent.trim();
      if(!message)return;
      const state=document.createElement("div");
      state.className="empty table-empty";
      state.append(createIcon("ph-magnifying-glass"));
      const heading=document.createElement("h3");
      heading.textContent=message;
      state.append(heading);
      cell.replaceChildren(state);
    });

    const result=document.querySelector("#scan-result");
    if(result&&!result.querySelector(".result-empty")&&result.querySelector(":scope > h2")){
      result.classList.add("has-result");
      if(!result.querySelector(":scope > .scan-result-icon"))result.prepend(createIcon("ph-qr-code","scan-result-icon"));
      addButtonIcon(result.querySelector(":scope > [data-record]"),"ph-arrow-square-out");
    }
  };
  enhanceUiIcons();
  const dynamicUiObserver=new MutationObserver(enhanceUiIcons);
  [document.querySelector("#recent"),document.querySelector("#report-list"),document.querySelector("#scan-result"),document.querySelector("#record-body"),document.querySelector("#monitor-list"),document.querySelector("#history-body")].filter(Boolean).forEach(node=>dynamicUiObserver.observe(node,{childList:true,subtree:true}));
})();
