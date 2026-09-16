const SESSION_KEY = "reeftrack_session";
let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { sessionStorage.removeItem(SESSION_KEY); }

if (!session || session.role !== "faculty") {
  alert("Faculty/Researcher access only. Please sign in with an authorized account.");
  // Keep authentication on the app's root page. This also avoids browser
  // storage being split when the project is opened directly from disk.
  window.location.replace("../../index.html");
} else {
  initializeDashboard();
}

function initializeDashboard() {
  const shortName = session.name.split(" ")[0] || "Researcher";
  document.querySelectorAll("#side-name,#top-name").forEach(el => el.textContent = session.name);
  document.querySelector("#welcome-name").textContent = shortName;
  const summaryIcons={
    ".batch-summary":["ph-stack","ph-gear-six","ph-clock-countdown","ph-map-pin"],
    ".user-summary":["ph-users-three","ph-user-check","ph-user-minus","ph-package"],
    ".log-summary":["ph-list-checks","ph-calendar-check","ph-shield-check","ph-file-arrow-down"],
    ".history-summary":["ph-clock-counter-clockwise","ph-check-circle","ph-warning-circle","ph-users-three"]
  };
  Object.entries(summaryIcons).forEach(([selector,icons])=>{
    document.querySelectorAll(`${selector} > article`).forEach((card,index)=>{
      const icon=card.querySelector(":scope > span");
      if(icon){icon.classList.add("ph",icons[index]||"ph-info");icon.setAttribute("aria-hidden","true")}
    });
  });
  document.querySelector("#profile-name").value = session.name;
  document.querySelector("#profile-email").value = session.email || "";
  const savedSettings = session.settings || {};
  document.querySelector("#profile-contact").value = savedSettings.contact || "";
  document.querySelector("#qr-label-format").value = savedSettings.qrLabelFormat || "50 × 30 mm";
  document.querySelector("#qr-error-correction").value = savedSettings.qrErrorCorrection || "High";
  document.querySelector("#qr-include-batch").checked = savedSettings.qrIncludeBatch ?? true;
  document.querySelector("#notify-pending").checked = savedSettings.notifyPending ?? true;
  document.querySelector("#notify-curing").checked = savedSettings.notifyCuring ?? true;
  document.querySelector("#notify-monitoring").checked = savedSettings.notifyMonitoring ?? true;
  document.querySelector("#notify-failed-login").checked = savedSettings.notifyFailedLogin ?? true;
  document.querySelector("#default-curing-days").value = savedSettings.defaultCuringDays || 28;
  document.querySelector("#monitoring-reminder-days").value = savedSettings.monitoringReminderDays || 30;
  document.querySelector("#coordinate-format").value = savedSettings.coordinateFormat || "Decimal degrees";

  const sidebar = document.querySelector("#sidebar");
  const toggle = document.querySelector("#menu-toggle");
  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    document.querySelector(".sidebar-backdrop")?.remove();
    if (sidebar.classList.contains("open")) {
      const backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      backdrop.addEventListener("click", closeSidebar);
      document.body.append(backdrop);
    }
  });
  function closeSidebar(){ sidebar.classList.remove("open"); document.querySelector(".sidebar-backdrop")?.remove(); }

  function showView(name) {
    const target = document.querySelector(`#view-${name}`);
    if (!target) return;
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".nav-item[data-view]").forEach(n => n.classList.toggle("active", n.dataset.view === name));
    target.classList.add("active");
    window.scrollTo({top:0,behavior:"auto"});
    closeSidebar();
  }
  document.querySelectorAll("[data-view],[data-go]").forEach(el => el.addEventListener("click", () => showView(el.dataset.view || el.dataset.go)));

  const notificationButton=document.querySelector("#notification-button");
  const notificationPanel=document.querySelector("#notification-panel");
  const notificationItems=[...document.querySelectorAll(".notification-item")];
  const notificationReadKey=`reeftrack_notification_reads_${session.accountId||session.email||"faculty"}`;
  let notificationReads=new Set();
  try{notificationReads=new Set(JSON.parse(localStorage.getItem(notificationReadKey))||[])}catch{}
  const updateNotificationState=()=>{
    const unread=notificationItems.filter(item=>item.classList.contains("unread")&&!item.hidden).length;
    document.querySelector(".notification-dot").hidden=unread===0;
    document.querySelector(".notification-head small").textContent=unread?`${unread} unread update${unread===1?"":"s"}`:"No unread updates";
    document.querySelector("#mark-read").disabled=unread===0;
  };
  notificationItems.forEach((item,index)=>{item.dataset.notificationIndex=String(index);if(notificationReads.has(index))item.classList.remove("unread")});
  notificationButton.addEventListener("click",event=>{event.stopPropagation();const opening=notificationPanel.hidden;notificationPanel.hidden=!opening;notificationButton.setAttribute("aria-expanded",String(opening))});
  notificationPanel.addEventListener("click",event=>event.stopPropagation());
  document.addEventListener("click",()=>{notificationPanel.hidden=true;notificationButton.setAttribute("aria-expanded","false")});
  document.querySelector("#mark-read").addEventListener("click",()=>{notificationItems.forEach((item,index)=>{item.classList.remove("unread");notificationReads.add(index)});localStorage.setItem(notificationReadKey,JSON.stringify([...notificationReads]));updateNotificationState();toast("All notifications marked as read.")});
  notificationItems.forEach((item,index)=>item.addEventListener("click",()=>{item.classList.remove("unread");notificationReads.add(index);localStorage.setItem(notificationReadKey,JSON.stringify([...notificationReads]));updateNotificationState();notificationPanel.hidden=true;notificationButton.setAttribute("aria-expanded","false");showView(item.dataset.notificationView)}));
  document.querySelector(".notification-footer").addEventListener("click",()=>{notificationPanel.hidden=true;notificationButton.setAttribute("aria-expanded","false");showView("logs")});
  updateNotificationState();
  document.querySelector("#admin-profile").addEventListener("click",()=>{showView("settings");setTimeout(()=>document.querySelector("#profile-name")?.focus(),0)});

  localStorage.removeItem("reeftrack_faculty_data_v1");
  const DATA_KEY = "reeftrack_faculty_data_v2";
  const defaultBatches = [];
  const defaultMonitoring = [];
  const defaultLogs = [];
  function readData(){
    try{return JSON.parse(localStorage.getItem(DATA_KEY))||{}}catch{return{}}
  }
  const storedData=readData();
  const batches=Array.isArray(storedData.batches)?storedData.batches:defaultBatches;
  const monitoring=Array.isArray(storedData.monitoring)?storedData.monitoring:defaultMonitoring;
  const deployments=Array.isArray(storedData.deployments)?storedData.deployments:[];
  globalThis.reefTrackDeployments=deployments;
  const mixtures=Array.isArray(storedData.mixtures)?storedData.mixtures:[];
  const qcDecisions=storedData.qcDecisions&&typeof storedData.qcDecisions==="object"?storedData.qcDecisions:{};
  const activityLogs=Array.isArray(storedData.logs)?storedData.logs:defaultLogs;
  const techUpdates=Array.isArray(storedData.techUpdates)?storedData.techUpdates:[];
  const techQc=Array.isArray(storedData.techQc)?storedData.techQc:[];
  function saveData(){localStorage.setItem(DATA_KEY,JSON.stringify({batches,monitoring,deployments,mixtures,qcDecisions,logs:activityLogs,techUpdates,techQc}))}
  function addLog(action,record,details){activityLogs.unshift({timestamp:new Date().toISOString(),user:session.name,action,record:record||"—",details});saveData();renderLogs();renderDashboard()}
  const formatDate=value=>{const date=new Date(String(value).length===10?`${value}T00:00:00`:value);return Number.isNaN(date.getTime())?String(value||"—"):date.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})};
  const body = document.querySelector("#batch-table tbody");
  const badgeClass = s => s === "Failed" ? "failed" : ["Passed","Ready for Deployment","Deployed"].includes(s) ? "passed" : s === "Curing" ? "curing" : "pending";
  function renderBatches(){
    const q = document.querySelector("#batch-search").value.toLowerCase();
    const filter = document.querySelector("#batch-filter").value;
    document.querySelector("#batch-summary-total").textContent=batches.length;document.querySelector("#batch-summary-production").textContent=batches.filter(b=>["Draft","Curing"].includes(b.status)).length;document.querySelector("#batch-summary-review").textContent=batches.filter(b=>["Pending Review","Pending QC"].includes(b.status)).length;document.querySelector("#batch-summary-ready").textContent=batches.filter(b=>["Passed","Ready for Deployment"].includes(b.status)).length;
    document.querySelector(".nav-item[data-view='batches'] i").textContent=batches.filter(b=>["Pending Review","Pending QC"].includes(b.status)).length;
    const visibleBatches=batches.filter(b => (b.id+b.tech).toLowerCase().includes(q) && (filter === "all" || b.status === filter));
    body.innerHTML = visibleBatches.map(b => `<tr><td><b>${b.id}</b></td><td>${b.date}</td><td>${b.units}</td><td>${b.tech}</td><td>${b.mix}</td><td><span class="badge ${badgeClass(b.status)}">${b.status}</span></td><td>${b.monitor}</td><td class="actions-cell"><span class="row-actions"><button class="small-btn batch-action" data-id="${b.id}">${b.status === "Pending Review" ? "Review" : "View / Edit"}</button><button class="dots menu-toggle-row" data-id="${b.id}" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ${b.id}">•••</button></span><div class="row-menu" data-menu="${b.id}" role="menu"><button data-action="open" data-id="${b.id}" role="menuitem">Review / Edit</button><button data-action="validate" data-id="${b.id}" role="menuitem">Validate Record</button><button data-action="reject" data-id="${b.id}" role="menuitem">Reject for Revision</button><button data-action="archive" data-id="${b.id}" role="menuitem">Archive Record</button></div></td></tr>`).join("") || `<tr class="batch-empty-row"><td colspan="8"><div><i class="ph ph-package empty-state-icon" aria-hidden="true"></i><b>${batches.length?"No matching batches":"No production batches yet"}</b><small>${batches.length?"Try a different search term or lifecycle status.":"Click New Production Batch to create the first record."}</small></div></td></tr>`;
    document.querySelectorAll(".batch-action").forEach(btn => btn.addEventListener("click",()=>openBatch(btn.dataset.id)));
    document.querySelectorAll(".menu-toggle-row").forEach(btn => btn.addEventListener("click",event=>{
      event.stopPropagation();
      const menu=document.querySelector(`[data-menu="${btn.dataset.id}"]`);
      document.querySelectorAll(".row-menu.open").forEach(m=>{if(m!==menu){m.classList.remove("open","open-up")}});
      const opening=!menu.classList.contains("open");
      menu.classList.remove("open","open-up");
      if(opening){
        menu.classList.add("open");
        const trigger=btn.getBoundingClientRect(),menuWidth=menu.offsetWidth,menuHeight=menu.offsetHeight;
        const openUp=window.innerHeight-trigger.bottom<menuHeight+12;
        menu.style.left=`${Math.max(12,Math.min(window.innerWidth-menuWidth-12,trigger.right-menuWidth))}px`;
        menu.style.top=`${openUp?Math.max(12,trigger.top-menuHeight-7):trigger.bottom+7}px`;
        menu.classList.toggle("open-up",openUp);
      }
      btn.setAttribute("aria-expanded",String(opening));
    }));
    document.querySelectorAll(".row-menu button").forEach(btn=>btn.addEventListener("click",()=>runBatchAction(btn.dataset.action,btn.dataset.id)));
    syncQrAvailability();
  }
  function renderDashboard(){
    const curingCount=batches.filter(b=>b.status==="Curing").length,pendingQcCount=batches.filter(b=>b.status==="Pending QC").length,readyBatches=batches.filter(b=>b.status==="Ready for Deployment"),monitoringDue=monitoring.filter(item=>item.status==="For Review").length,averageMixture=mixtures.length?Math.round(mixtures.reduce((sum,item)=>sum+item.score,0)/mixtures.length):0;
    const stats=[batches.length,curingCount,pendingQcCount,batches.filter(b=>b.status==="Passed").length,readyBatches.length,deployments.reduce((sum,item)=>sum+Number(item.units||0),0),monitoringDue,`${averageMixture}%`];
    document.querySelectorAll("#view-dashboard .stat strong").forEach((element,index)=>element.textContent=stats[index]);
    const passed=batches.filter(b=>["Passed","Ready for Deployment","Deployed"].includes(b.status)).length;
    const passRate=batches.length?Math.round(passed/batches.length*100):0;
    const statNotes=document.querySelectorAll("#view-dashboard .stat em");
    const nearCompletion=batches.filter(batch=>batch.status==="Curing"&&/2[1-8]|near|complete/i.test(batch.curing||"")).length;
    const statMessages=[batches.length?"Active production records":"No records yet",nearCompletion?`${nearCompletion} near completion`:curingCount?"Curing in progress":"No active curing",pendingQcCount?"Requires Faculty review":"No pending inspections",`${passRate}% lifecycle pass rate`,`${readyBatches.reduce((sum,b)=>sum+Number(b.units||0),0)} reef units`,`Across ${new Set(deployments.map(item=>item.site)).size} site(s)`,monitoringDue?"Awaiting validation":"No monitoring due",mixtures.length?`${mixtures.length} approved evaluation${mixtures.length===1?"":"s"}`:"No approved evaluations"];
    statNotes.forEach((note,index)=>note.textContent=statMessages[index]);
    const chartCounts=[batches.filter(b=>["Draft","Pending Review"].includes(b.status)).length,batches.filter(b=>b.status==="Curing").length,batches.filter(b=>b.status==="Pending QC").length,batches.filter(b=>b.status==="Passed").length,batches.filter(b=>b.status==="Ready for Deployment").length,batches.filter(b=>b.status==="Deployed").length];
    const chartMax=Math.max(1,...chartCounts);document.querySelectorAll("#view-dashboard .bar-chart div").forEach((bar,index)=>{bar.style.setProperty("--h",`${Math.max(5,chartCounts[index]/chartMax*88)}%`);bar.querySelector("b").textContent=chartCounts[index];bar.title=`${bar.querySelector("span").textContent}: ${chartCounts[index]} batch${chartCounts[index]===1?"":"es"}`});
    const failed=batches.filter(b=>b.status==="Failed").length,qcTotal=passed+failed,qcRate=qcTotal?Math.round(passed/qcTotal*100):0;const productionPanel=document.querySelector("#view-dashboard .dashboard-grid>.panel:nth-child(1)"),qcPanel=document.querySelector("#view-dashboard .dashboard-grid>.panel:nth-child(2)");productionPanel.classList.toggle("no-chart-data",!batches.length);qcPanel.classList.toggle("no-chart-data",!qcTotal);qcPanel.querySelector(".donut").style.setProperty("--value",qcRate);qcPanel.querySelector(".donut strong").textContent=`${qcRate}%`;qcPanel.querySelector(".donut span").textContent=qcTotal?"Pass rate":"No QC data";const legendValues=qcPanel.querySelectorAll(".legend b");legendValues[0].textContent=passed;legendValues[1].textContent=failed;
    const activity=document.querySelector("#view-dashboard .activity-list");
    if(activity)activity.innerHTML=activityLogs.slice(0,4).map(log=>`<div><i class="green-dot"></i><p><b>${safeHtml(log.action)} · ${safeHtml(log.record)}</b><small>${safeHtml(log.user)} · ${safeHtml(relativeActivity(log.timestamp))}</small></p></div>`).join("")||'<p style="padding:18px 0;text-align:center">No activity records yet.</p>';
    const recentBody=document.querySelector("#view-dashboard .dashboard-grid .table-wrap tbody");
    if(recentBody)recentBody.innerHTML=monitoring.slice(0,3).map(item=>`<tr><td><b>${safeHtml(item.batch)}</b></td><td>${safeHtml(item.site)}</td><td>${safeHtml(formatDate(item.date))}</td><td>${safeHtml(item.condition)}</td><td>${Number(item.coverage)||0}%</td><td><span class="badge ${item.status==="Validated"?"passed":item.status==="Rejected"?"failed":"pending"}">${safeHtml(item.status)}</span></td></tr>`).join("")||'<tr><td colspan="6"><div class="empty table-empty"><i class="ph ph-binoculars" aria-hidden="true"></i><h3>No monitoring records yet</h3><p>Validated field records will appear here.</p></div></td></tr>';
    const quality=document.querySelector("#view-quality"),qualityStats=quality.querySelectorAll(".mini-stats b"),qcPassed=Object.values(qcDecisions).filter(item=>item.decision==="Passed").length,qcFailed=Object.values(qcDecisions).filter(item=>item.decision==="Failed").length;qualityStats[0].textContent=batches.filter(batch=>batch.status==="Curing").length;qualityStats[1].textContent=batches.filter(batch=>batch.status==="Pending QC").length;qualityStats[2].textContent=batches.filter(batch=>batch.status==="Curing"&&/2[1-8]|near|complete/i.test(batch.curing||"")).length;qualityStats[3].textContent=qcPassed+qcFailed?`${Math.round(qcPassed/(qcPassed+qcFailed)*100)}%`:"0%";
    if(!batches.length&&!monitoring.length){document.querySelector(".nav-item[data-view='batches'] i").textContent="0";document.querySelectorAll(".notification-item").forEach(item=>item.hidden=true);document.querySelector(".notification-dot").hidden=true;document.querySelector(".notification-head small").textContent="No unread updates";document.querySelector("#mark-read").disabled=true;quality.querySelector(".mini-stats + .panel").hidden=true}
    renderAnalytics();
  }
  document.querySelector("#batch-search").addEventListener("input",renderBatches);
  document.querySelector("#batch-filter").addEventListener("change",renderBatches);
  document.querySelector("#batch-export").addEventListener("click",()=>{
    const query=document.querySelector("#batch-search").value.toLowerCase();
    const status=document.querySelector("#batch-filter").value;
    const records=batches.filter(batch=>(batch.id+batch.tech).toLowerCase().includes(query)&&(status==="all"||batch.status===status));
    const escapeCsv=value=>`"${String(value??"").replaceAll('"','""')}"`;
    const rows=[["Batch ID","Production Date","Reef Units","Student Technician","Clay Mixture","Status","Monitoring Status"],...records.map(batch=>[batch.id,batch.date,batch.units,batch.tech,batch.mix,batch.status,batch.monitor])];
    const csv=rows.map(row=>row.map(escapeCsv).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download=`reeftrack-batches-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
    toast(`${records.length} batch record${records.length===1?"":"s"} exported to CSV.`);
  });
  renderBatches();

  const editForm=document.querySelector("#batch-edit-form"); let activeBatchId=null;
  function findBatch(id){return batches.find(batch=>batch.id===id)}
  function openBatch(id){
    const b=findBatch(id);if(!b)return;activeBatchId=id;
    editForm.elements.id.value=b.id;editForm.elements.displayId.value=b.id;
    editForm.elements.date.value=b.dateValue||"2026-08-24";editForm.elements.units.value=b.units;editForm.elements.technician.value=b.tech;editForm.elements.mixture.value=b.mix;editForm.elements.status.value=b.status;
    editForm.elements.curing.value=b.curing||"Not started";editForm.elements.qc.value=b.qc||"Not inspected";editForm.elements.deployment.value=b.deployment||"Not scheduled";editForm.elements.remarks.value=b.remarks||"";
    document.querySelector("#detail-title").textContent=b.status==="Pending Review"?`Review ${b.id}`:`View / Edit ${b.id}`;
    const badge=document.querySelector("#detail-badge");badge.textContent=b.status;badge.className=`badge ${badgeClass(b.status)}`;document.querySelector("#detail-monitoring").textContent=b.monitor;
    openModal("batch-detail-modal");
  }
  function validateBatch(id){const b=findBatch(id);if(!b)return;const next={"Draft":"Pending Review","Pending Review":"Curing","Curing":"Pending QC","Pending QC":"Passed","Passed":"Ready for Deployment","Ready for Deployment":"Deployed","Failed":"Draft","Deployed":"Deployed"};b.status=next[b.status]||b.status;if(b.status==="Passed")b.qc="Passed";if(b.status==="Deployed"){b.deployment="Deployed";b.monitor="Scheduled"}saveData();renderBatches();renderDeploymentOptions();addLog("Batch update",id,`Validated; status changed to ${b.status}`);toast(`${id} validated. Status changed to ${b.status}.`)}
  function rejectBatch(id){const b=findBatch(id);if(!b)return;b.status="Draft";b.remarks="Returned for technician revision.";saveData();renderBatches();addLog("Batch update",id,"Rejected and returned for technician revision");toast(`${id} rejected and returned to Draft.`)}
  function archiveBatch(id){const index=batches.findIndex(b=>b.id===id);if(index<0)return;if(confirm(`Archive ${id}? It will be removed from the active batch list.`)){batches.splice(index,1);saveData();renderBatches();addLog("Batch update",id,"Archived production record");toast(`${id} archived.`);return true}return false}
  function closeRowMenus(){document.querySelectorAll(".row-menu.open").forEach(m=>m.classList.remove("open","open-up"));document.querySelectorAll(".menu-toggle-row[aria-expanded='true']").forEach(button=>button.setAttribute("aria-expanded","false"))}
  function runBatchAction(action,id){closeRowMenus();if(action==="open")openBatch(id);if(action==="validate")validateBatch(id);if(action==="reject")rejectBatch(id);if(action==="archive")archiveBatch(id)}
  document.addEventListener("click",closeRowMenus);
  editForm.addEventListener("submit",event=>{event.preventDefault();const b=findBatch(activeBatchId);if(!b)return;const d=new FormData(editForm);b.dateValue=d.get("date");b.date=formatDate(b.dateValue);b.units=Number(d.get("units"));b.tech=d.get("technician");b.mix=d.get("mixture");b.status=d.get("status");b.curing=d.get("curing");b.qc=d.get("qc");b.deployment=d.get("deployment");b.remarks=d.get("remarks");saveData();renderBatches();renderDeploymentOptions();addLog("Batch update",b.id,"Production record edited by Faculty");closeModal(document.querySelector("#batch-detail-modal"));toast(`${b.id} changes saved.`)});
  document.querySelector("#validate-batch").addEventListener("click",()=>{validateBatch(activeBatchId);closeModal(document.querySelector("#batch-detail-modal"))});
  document.querySelector("#reject-batch").addEventListener("click",()=>{rejectBatch(activeBatchId);closeModal(document.querySelector("#batch-detail-modal"))});
  document.querySelector("#archive-batch").addEventListener("click",()=>{if(archiveBatch(activeBatchId))closeModal(document.querySelector("#batch-detail-modal"))});

  const mixtureForm = document.querySelector("#mixture-form");
  mixtureForm.addEventListener("input", () => {
    const d = new FormData(mixtureForm); const total = ["clay","cement","ash","fiber"].reduce((s,k)=>s+Number(d.get(k)),0);
    const out = document.querySelector("#mixture-total"); out.textContent = `${total}%`; out.style.color = total === 100 ? "var(--success)" : "var(--danger)";
  });
  mixtureForm.addEventListener("submit", event => {
    event.preventDefault(); const d = new FormData(mixtureForm);
    const values = Object.fromEntries(["clay","cement","ash","fiber","duration"].map(k=>[k,Number(d.get(k))]));
    const total = values.clay+values.cement+values.ash+values.fiber; let score=100; const rules=[];
    const check=(ok,points,text)=>{if(!ok){score-=points;rules.push(text)}};
    check(total===100,35,`R5: Material total is ${total}%; it must equal 100%.`);
    check(values.clay>=55&&values.clay<=70,12,`R1: Clay base ${values.clay}% is outside the 55–70% recommended range.`);
    check(values.cement>=10&&values.cement<=20,12,`R2: Cement ${values.cement}% is outside the 10–20% recommended range.`);
    check(values.ash>=10&&values.ash<=25,12,`R3: Pozzolan ${values.ash}% is outside the 10–25% recommended range.`);
    check(values.fiber>=2&&values.fiber<=6,10,`R4: Coconut fiber ${values.fiber}% is outside the 2–6% recommended range.`);
    check(values.duration>=28,19,`R6: ${values.duration} curing days is below the 28-day recommendation.`);
    score=Math.max(0,score); const status=score>=85?"Recommended":score>=70?"Acceptable":"Needs Revision";
    if(!rules.length) rules.push("All predefined proportion and curing rules were satisfied.");
    const result=document.querySelector("#mixture-result");result.style.setProperty("--score",score);result.dataset.status=status.toLowerCase().replace(/\s+/g,"-");result.innerHTML=`<div class="result-heading"><div><p class="eyebrow">Evaluation result</p><h3>Mixture Performance</h3></div><span class="result-engine-chip">6-rule analysis</span></div><div class="score-wrap"><div class="result-score"><span>${score}</span><small>/ 100</small></div><div class="score-copy"><span class="result-status">${status}</span><h3>${status==="Recommended"?"Ready for faculty approval":status==="Acceptable"?"Meets minimum criteria":"Formula needs adjustment"}</h3><p>Transparent evaluation based on material proportions and curing duration.</p></div></div><div class="result-meter"><i></i><span><small>Needs revision</small><small>Acceptable</small><small>Recommended</small></span></div><div class="rule-summary"><b>${rules.length===1&&rules[0].startsWith("All")?"All rules passed":`${rules.length} rule${rules.length===1?"":"s"} require attention`}</b><small>Every result is traceable to the predefined criteria below.</small></div><ul class="trigger-list">${rules.map((r,index)=>`<li><span>${r.startsWith("All")?"Pass":(r.match(/^R\d+/)||[`R${index+1}`])[0]}</span><p>${r}</p></li>`).join("")}</ul><div class="form-row result-actions"><button class="primary" id="approve-mixture" type="button" ${status==="Needs Revision"?"disabled":""}>Approve Mixture</button><button class="secondary" id="revise-mixture" type="button">Request Revision</button></div>`;
    document.querySelector("#approve-mixture").insertAdjacentHTML("afterbegin",'<i class="ph ph-check-circle" aria-hidden="true"></i>');
    document.querySelector("#revise-mixture").insertAdjacentHTML("afterbegin",'<i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>');
    document.querySelector("#approve-mixture").addEventListener("click",event=>{
      const id=`RT-MX-${String(85+mixtures.length).padStart(3,"0")}`;
      mixtures.unshift({id,...values,score,status,approvedAt:new Date().toISOString()});
      addLog("Mixture evaluation",id,`Approved ${status} mixture with score ${score}`);
      event.currentTarget.disabled=true;
      event.currentTarget.innerHTML='<i class="ph ph-check-circle" aria-hidden="true"></i>Mixture Approved';
      toast(`${id} approved with a score of ${score}.`);
    });
    document.querySelector("#revise-mixture").addEventListener("click",event=>{
      addLog("Mixture evaluation","Draft",`Revision requested for mixture score ${score}`);
      event.currentTarget.disabled=true;
      event.currentTarget.innerHTML='<i class="ph ph-check" aria-hidden="true"></i>Revision Recorded';
      mixtureForm.querySelector('input[name="clay"]').focus();
      toast("Mixture returned for revision.");
    });
  });

  document.querySelectorAll("[data-open-modal]").forEach(btn=>btn.addEventListener("click",()=>openModal(btn.dataset.openModal)));
  document.querySelector("#view-dashboard .quick-grid button")?.addEventListener("click",()=>openModal("batch-modal"));
  document.querySelectorAll(".modal-close").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.closest(".modal"))));
  document.querySelectorAll(".modal-cancel").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.closest(".modal"))));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m)}));
  let lastModalTrigger=null;
  function openModal(id){
    const m=document.getElementById(id);if(!m)return;
    lastModalTrigger=document.activeElement;
    m.classList.add("open");m.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
    const card=m.querySelector(".modal-card");if(card)card.scrollTop=0;
    requestAnimationFrame(()=>m.querySelector(".modal-close, input:not([disabled]), select:not([disabled]), button:not([disabled])")?.focus());
  }
  function closeModal(m){
    if(!m)return;
    if(m.id==="qr-scan-modal")stopScanner();
    m.classList.remove("open");m.setAttribute("aria-hidden","true");
    if(!document.querySelector(".modal.open"))document.body.classList.remove("modal-open");
    if(lastModalTrigger instanceof HTMLElement)lastModalTrigger.focus();
  }
  document.querySelector("#batch-form").addEventListener("submit",e=>{e.preventDefault();const d=new FormData(e.target);const year=new Date().getFullYear();const max=batches.reduce((highest,b)=>Math.max(highest,Number(String(b.id).split("-").pop())||0),0);const id=`RT-${year}-${String(max+1).padStart(3,"0")}`;const dateValue=d.get("date");batches.unshift({id,date:formatDate(dateValue),dateValue,units:Number(d.get("units")),tech:d.get("technician"),mix:d.get("mixture"),status:"Draft",monitor:"Not started",site:d.get("site"),unitType:d.get("unitType"),curing:`0 of ${d.get("curingDays")} days`,curingStart:d.get("curingStart"),notes:d.get("notes")});saveData();renderBatches();addLog("Batch creation",id,"Created a new Draft production batch");e.target.reset();closeModal(e.target.closest(".modal"));toast(`${id} created as Draft.`)});

  const usersKey="reeftrack_users";
  const readUsers=()=>{try{return JSON.parse(localStorage.getItem(usersKey))||[]}catch{return[]}};
  const saveUsers=users=>localStorage.setItem(usersKey,JSON.stringify(users));
  const safeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const userInitials=name=>String(name||"User").trim().split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase();
  function relativeActivity(value){
    if(!value)return"Never logged in";
    const elapsed=Math.max(0,Date.now()-new Date(value).getTime());
    if(!Number.isFinite(elapsed))return"Unknown";
    const minutes=Math.floor(elapsed/60000);if(minutes<1)return"Just now";if(minutes<60)return`${minutes} minute${minutes===1?"":"s"} ago`;
    const hours=Math.floor(minutes/60);if(hours<24)return`${hours} hour${hours===1?"":"s"} ago`;
    const days=Math.floor(hours/24);return`${days} day${days===1?"":"s"} ago`;
  }
  function refreshTechnicianOptions(){
    const technicians=readUsers().filter(user=>user.role==="technician"&&user.status!=="inactive");
    if(!technicians.length)return;
    document.querySelectorAll('#batch-form select[name="technician"],#batch-edit-form select[name="technician"]').forEach(select=>{
      const selected=select.value;select.innerHTML=technicians.map(user=>`<option value="${safeHtml(user.name)}">${safeHtml(user.name)}</option>`).join("");
      if([...select.options].some(option=>option.value===selected))select.value=selected;
    });
  }
  function renderTechnicianUsers(){
    const technicians=readUsers().filter(user=>user.role==="technician");
    const query=String(document.querySelector("#user-search")?.value||"").trim().toLowerCase(),statusFilter=document.querySelector("#user-status-filter")?.value||"all";
    const visibleTechnicians=technicians.filter(user=>{const status=user.status==="inactive"?"inactive":"active";return(`${user.name} ${user.email}`).toLowerCase().includes(query)&&(statusFilter==="all"||status===statusFilter)});
    document.querySelector("#user-total").textContent=technicians.length;document.querySelector("#user-active").textContent=technicians.filter(user=>user.status!=="inactive").length;document.querySelector("#user-inactive").textContent=technicians.filter(user=>user.status==="inactive").length;document.querySelector("#user-assigned").textContent=batches.filter(batch=>technicians.some(user=>user.name===batch.tech)).length;
    const body=document.querySelector("#technician-users-body");
    body.innerHTML=visibleTechnicians.map(user=>{
      const active=user.status!=="inactive";const assigned=batches.filter(batch=>batch.tech===user.name).length;
      return `<tr><td><div class="user-cell"><span>${safeHtml(userInitials(user.name))}</span><b>${safeHtml(user.name)}</b></div></td><td>${safeHtml(user.email)}</td><td>${assigned} active</td><td>${safeHtml(relativeActivity(user.lastLogin))}</td><td><span class="badge ${active?"passed":"failed"}">${active?"Active":"Inactive"}</span></td><td><button class="small-btn technician-toggle" type="button" data-user-id="${safeHtml(user.id)}">${active?"Deactivate":"Activate"}</button> <button class="small-btn danger technician-delete" type="button" data-user-id="${safeHtml(user.id)}">Delete</button></td></tr>`;
    }).join("")||`<tr class="user-empty-row"><td colspan="6"><div><i class="ph ph-users-three empty-state-icon" aria-hidden="true"></i><b>${technicians.length?"No matching accounts":"No Technician accounts yet"}</b><small>${technicians.length?"Try a different search term or account status.":"Click Add Technician to create the first student account."}</small></div></td></tr>`;
    body.querySelectorAll(".technician-toggle").forEach(button=>button.addEventListener("click",()=>{
      const users=readUsers();const user=users.find(item=>item.id===button.dataset.userId);if(!user)return;user.status=user.status==="inactive"?"active":"inactive";saveUsers(users);renderTechnicianUsers();refreshTechnicianOptions();toast(`${user.name} is now ${user.status}.`);
    }));
    body.querySelectorAll(".technician-delete").forEach(button=>button.addEventListener("click",()=>{
      const users=readUsers();const user=users.find(item=>item.id===button.dataset.userId);if(!user||!confirm(`Delete the Technician account for ${user.name}?`))return;saveUsers(users.filter(item=>item.id!==user.id));renderTechnicianUsers();refreshTechnicianOptions();toast(`${user.name}'s account was deleted.`);
    }));
  }
  document.querySelector("#user-search").addEventListener("input",renderTechnicianUsers);document.querySelector("#user-status-filter").addEventListener("change",renderTechnicianUsers);
  document.querySelector("#technician-form").addEventListener("submit",event=>{
    event.preventDefault();const data=new FormData(event.target);const users=readUsers();const email=String(data.get("email")||"").trim().toLowerCase();
    if(users.some(user=>String(user.email||"").trim().toLowerCase()===email)){toast("That email address already has an account.");return}
    users.push({id:typeof globalThis.crypto?.randomUUID==="function"?globalThis.crypto.randomUUID():`user-${Date.now()}`,name:String(data.get("name")||"").trim(),email,password:data.get("password"),role:"technician",status:"active",createdAt:new Date().toISOString()});
    saveUsers(users);event.target.reset();closeModal(document.querySelector("#user-modal"));renderTechnicianUsers();refreshTechnicianOptions();toast("Technician account created. It can now be used to log in.");
  });
  renderTechnicianUsers();refreshTechnicianOptions();

  document.querySelector("#qc-guidelines").addEventListener("click",()=>openModal("qc-guidelines-modal"));
  if(!batches.length&&!Object.keys(qcDecisions).length)document.querySelector(".qc-queue tbody").innerHTML='<tr><td colspan="7"><div class="qc-empty-state"><span aria-hidden="true"></span><p>No quality-control records available.</p></div></td></tr>';
  const qcRows=[...document.querySelectorAll("[data-qc-row]")];let qcPage=0;
  qcRows.forEach(row=>{const saved=qcDecisions[row.dataset.qcRow];if(!saved)return;const status=row.querySelector(".qc-row-status"),button=row.querySelector(".qc-review");status.textContent=saved.decision==="Revision"?"For Reinspection":saved.decision;status.className=`badge qc-row-status ${saved.decision==="Passed"?"passed":saved.decision==="Failed"?"failed":"pending"}`;button.textContent="View Decision"});
  function renderQcPage(){qcRows.forEach((row,index)=>row.hidden=index!==qcPage);document.querySelector("#qc-page-current").textContent=qcRows.length?qcPage+1:0;document.querySelector("#qc-page-total").textContent=qcRows.length;document.querySelector("#qc-previous").disabled=qcPage===0;document.querySelector("#qc-next").disabled=!qcRows.length||qcPage===qcRows.length-1}
  document.querySelector("#qc-previous").addEventListener("click",()=>{if(qcPage>0){qcPage--;renderQcPage()}});
  document.querySelector("#qc-next").addEventListener("click",()=>{if(qcPage<qcRows.length-1){qcPage++;renderQcPage()}});
  renderQcPage();document.querySelector("#qc-queue-count").textContent=`${document.querySelectorAll(".qc-row-status.pending").length} Pending`;if(!qcRows.length)document.querySelector(".qc-pagination").hidden=true;
  document.querySelectorAll(".qc-review").forEach(btn=>btn.addEventListener("click",()=>{
    const form=document.querySelector("#qc-review-form");form.reset();form.elements.batch.value=btn.dataset.batch;
    const saved=qcDecisions[btn.dataset.batch];if(saved){form.elements.decision.value=saved.decision;form.elements.remarks.value=saved.remarks;form.elements.confirmed.checked=true}
    document.querySelector("#qc-review-title").textContent=`Review QC - ${btn.dataset.batch}`;
    document.querySelector("#qc-technician").textContent=btn.dataset.technician;document.querySelector("#qc-compressive").textContent=btn.dataset.compressive;document.querySelector("#qc-visual").textContent=btn.dataset.visual;openModal("qc-review-modal");
  }));
  document.querySelector("#qc-review-form").addEventListener("submit",event=>{
    event.preventDefault();const data=new FormData(event.target);const batch=data.get("batch");const decision=data.get("decision");const row=document.querySelector(`[data-qc-row="${batch}"]`);const status=row.querySelector(".qc-row-status");const button=row.querySelector(".qc-review");
    status.textContent=decision==="Revision"?"For Reinspection":decision;status.className=`badge qc-row-status ${decision==="Passed"?"passed":decision==="Failed"?"failed":"pending"}`;button.textContent="View Decision";
    qcDecisions[batch]={decision,remarks:data.get("remarks"),reviewedBy:session.name,reviewedAt:new Date().toISOString()};const record=findBatch(batch);if(record){record.qc=decision;record.status=decision==="Passed"?"Ready for Deployment":decision==="Failed"?"Failed":"Pending QC";record.remarks=data.get("remarks")}
    const pending=document.querySelectorAll(".qc-row-status.pending").length;document.querySelector("#qc-queue-count").textContent=`${pending} Pending`;saveData();renderBatches();renderDeploymentOptions();addLog("QC validation",batch,`QC decision: ${decision}. ${data.get("remarks")}`);closeModal(document.querySelector("#qc-review-modal"));toast(`${batch} QC decision saved as ${decision}.`);
  });
  const monitoringView=document.querySelector("#view-monitoring");
  const monitoringSearch=monitoringView.querySelector('.filterbar input');
  const monitoringFilters=monitoringView.querySelectorAll('.filterbar select');
  function renderMonitoring(){
    const query=monitoringSearch.value.trim().toLowerCase(),condition=monitoringFilters[0].value,status=monitoringFilters[1].value;
    const records=monitoring.filter(item=>(`${item.batch} ${item.site} ${item.submittedBy}`).toLowerCase().includes(query)&&(condition.startsWith("All")||item.condition===condition)&&(status.startsWith("All")||item.status===status));
    monitoringView.querySelector(".record-grid").innerHTML=records.map((item,index)=>`<article class="monitor-card"><div class="photo-placeholder ${index%2?"alt":""}">REEF PHOTO</div><div><span class="badge ${item.status==="Validated"?"passed":item.status==="Rejected"?"failed":"pending"}">${safeHtml(item.status)}</span><h3>${safeHtml(item.batch)} · ${safeHtml(item.site)}</h3><p>${safeHtml(item.notes)}</p><ul><li>Condition: <b>${safeHtml(item.condition)}</b></li><li>Coverage: <b>${Number(item.coverage)||0}%</b></li><li>Monitored: ${safeHtml(formatDate(item.date))}</li><li>Submitted by: ${safeHtml(item.submittedBy)}</li><li>Files: ${safeHtml(item.files)}</li></ul><div>${item.status==="For Review"?`<button class="small-btn validate-record" data-monitor="${safeHtml(item.id)}">Validate</button> <button class="small-btn danger reject-record" data-monitor="${safeHtml(item.id)}">Reject</button> `:""}<button class="text-btn monitor-history" data-monitor="${safeHtml(item.id)}">History</button></div></div></article>`).join("")||`<article class="panel empty"><i class="ph ph-binoculars" aria-hidden="true"></i><h3>No monitoring records found</h3><p>Try another filter or wait for a Technician field submission.</p></article>`;
    monitoringView.querySelectorAll(".validate-record,.reject-record").forEach(button=>button.addEventListener("click",()=>{const item=monitoring.find(record=>record.id===button.dataset.monitor);if(!item)return;item.status=button.classList.contains("validate-record")?"Validated":"Rejected";item.history.push(`${item.status} by ${session.name} on ${new Date().toLocaleString("en-PH")}`);saveData();addLog("Monitoring validation",item.batch,`${item.id} marked ${item.status}`);renderMonitoring();toast(`Monitoring record ${item.status.toLowerCase()}.`)}));
    monitoringView.querySelectorAll(".monitor-history").forEach(button=>button.addEventListener("click",()=>{const item=monitoring.find(record=>record.id===button.dataset.monitor);alert(`${item.batch} monitoring history\n\n${item.history.join("\n")}`)}));
  }
  monitoringSearch.addEventListener("input",renderMonitoring);monitoringFilters.forEach(select=>select.addEventListener("change",renderMonitoring));renderMonitoring();

  const qrRecords={
    "RT-2026-117":{mixture:"Score 91 - Recommended",curing:"28 of 28 days",qc:"Pending Faculty validation",deployment:"Not yet recorded",monitoring:"Begins after deployment"},
    "RT-2026-110":{mixture:"Score 89 - Recommended",curing:"28 of 28 days",qc:"Passed",deployment:"Ready for deployment",monitoring:"Begins after deployment"},
    "RT-2026-104":{mixture:"Score 87 - Recommended",curing:"28 of 28 days",qc:"Passed",deployment:"Deployed at Pujada Bay",monitoring:"Current - last checked Aug 20, 2026"}
  };
  let activeQrSize=300,activeQrDataUrl="";
  function linkedQrRecord(id){const batch=findBatch(id),deployment=deployments.find(item=>item.batch===id),monitor=monitoring.find(item=>item.batch===id);if(!batch)return qrRecords[id]||{mixture:"No mixture record",curing:"No curing record",qc:"No QC record",deployment:"Not yet recorded",monitoring:"Not yet recorded"};return{mixture:batch.mix||"No mixture record",curing:batch.curing||"Not started",qc:batch.qc||"Not inspected",deployment:deployment?`Deployed at ${deployment.site}`:batch.deployment||"Not yet recorded",monitoring:monitor?`${monitor.status} · ${monitor.condition}`:batch.monitor||"Not started"}}
  function qrPayload(id){return JSON.stringify({system:"ReefTrack",batchId:id,facility:"DOrSU Artificial Reef Production Facility",record:linkedQrRecord(id)})}
  function syncQrAvailability(){const available=batches.length>0,button=document.querySelector("#generate-qr");if(button)button.classList.toggle("disabled-state",!available)}
  async function renderQr(id,size=300,{persist=false}={}){
    const record=linkedQrRecord(id),batch=findBatch(id),width=[300,500,800].includes(Number(size))?Number(size):300;
    const card=document.querySelector(".qr-card"),frame=document.querySelector(".qr-code"),image=document.querySelector("#qr-image");
    activeQrSize=width;activeQrDataUrl="";card.classList.remove("qr-empty");frame.classList.remove("has-error");frame.classList.add("is-generating");
    document.querySelector("#qr-batch").textContent=id;image.removeAttribute("src");image.alt=`Generating QR code for batch ${id}`;image.setAttribute("aria-busy","true");
    document.querySelectorAll("#print-qr,#download-qr").forEach(button=>button.disabled=true);document.querySelector("#scan-qr").disabled=false;
    document.querySelector('[data-qr-field="batch"]').textContent=id;
    ["mixture","curing","qc","deployment","monitoring"].forEach(key=>document.querySelector(`[data-qr-field="${key}"]`).textContent=record[key]);
    const stages={Draft:0,"Pending Review":0,"Pending Faculty Validation":0,Curing:2,"Pending QC":3,Passed:4,"Ready for Deployment":4,Deployed:5},current=stages[batch?.status]??0;
    document.querySelectorAll("#qr-lifecycle>div").forEach((step,index)=>{step.classList.toggle("complete",index<current);step.classList.toggle("current",index===current);step.querySelector("i").textContent=index<current?"Done":index+1});
    const badge=document.querySelector("#qr-lifecycle").closest(".panel").querySelector(".badge");badge.className="badge pending";badge.textContent="Generating QR";
    try{
      if(!globalThis.ReefTrackQRCode?.toDataURL)throw new Error("QR generator runtime is unavailable.");
      const payload=qrPayload(id),errorCorrection=document.querySelector("#qr-error-correction").value==="High"?"H":"M";
      const dataUrl=await globalThis.ReefTrackQRCode.toDataURL(payload,{width,errorCorrectionLevel:errorCorrection,margin:2});
      activeQrDataUrl=dataUrl;image.src=dataUrl;image.alt=`Scannable QR code for batch ${id}`;image.removeAttribute("aria-busy");frame.classList.remove("is-generating");
      document.querySelectorAll("#print-qr,#download-qr").forEach(button=>button.disabled=false);badge.className="badge passed";badge.textContent="QR Active";
      if(persist&&batch){batch.qr={payload,size:width,generatedAt:new Date().toISOString(),generatedBy:session.name};saveData();addLog("QR generation",id,`${width} px scannable label generated`)}
      return true;
    }catch(error){
      console.error("Unable to generate ReefTrack QR code",error);image.removeAttribute("aria-busy");image.alt=`QR generation failed for batch ${id}`;frame.classList.remove("is-generating");frame.classList.add("has-error");badge.className="badge failed";badge.textContent="Generation Failed";toast("QR generation failed. Reload the page and try again.");return false;
    }
  }
  if(batches.length){void renderQr(batches[0].id)}else{const card=document.querySelector(".qr-card"),frame=document.querySelector(".qr-code");card.classList.add("qr-empty");frame.classList.remove("is-generating","has-error");activeQrDataUrl="";const image=document.querySelector("#qr-image");image.removeAttribute("src");image.alt="No QR code generated";document.querySelector("#qr-batch").textContent="No batch selected";document.querySelectorAll("[data-qr-field]").forEach(field=>field.textContent="No record available");document.querySelectorAll("#qr-lifecycle>div").forEach((step,index)=>{step.classList.remove("complete","current");step.querySelector("i").textContent=index+1});const badge=document.querySelector("#qr-lifecycle").closest(".panel").querySelector(".badge");badge.className="badge pending";badge.textContent="Waiting for Batch";document.querySelectorAll("#print-qr,#download-qr,#scan-qr").forEach(button=>button.disabled=true)}
  syncQrAvailability();
  document.querySelector("#generate-qr").addEventListener("click",()=>{if(!batches.length)return toast("Create a production batch before generating a QR code.");const select=document.querySelector('#qr-generate-form select[name="batch"]'),activeId=document.querySelector("#qr-batch").textContent;select.innerHTML=batches.map(batch=>`<option value="${safeHtml(batch.id)}">${safeHtml(batch.id)} · ${safeHtml(batch.status)}</option>`).join("");if(findBatch(activeId))select.value=activeId;openModal("qr-generate-modal")});
  document.querySelector("#qr-generate-form").addEventListener("submit",async event=>{event.preventDefault();const data=new FormData(event.target),submit=event.target.querySelector('button[type="submit"]'),original=submit.innerHTML;submit.disabled=true;submit.textContent="Generating QR...";const generated=await renderQr(String(data.get("batch")),Number(data.get("size")),{persist:true});submit.disabled=false;submit.innerHTML=original;if(generated){closeModal(document.querySelector("#qr-generate-modal"));toast(`Scannable QR generated for ${data.get("batch")}.`)}});
  document.querySelector("#print-qr").addEventListener("click",()=>{
    if(!activeQrDataUrl)return toast("Generate a QR code before printing.");
    const id=document.querySelector("#qr-batch").textContent,record=linkedQrRecord(id),printWindow=window.open("","_blank","width=620,height=760");
    if(!printWindow)return toast("Allow pop-ups to print the QR label.");
    const batchLine=document.querySelector("#qr-include-batch").checked?`<h1>${safeHtml(id)}</h1>`:"",largeLabel=document.querySelector("#qr-label-format").value.startsWith("70"),labelWidth=largeLabel?"70mm":"50mm",qrWidth=largeLabel?"44mm":"30mm";
    printWindow.document.write(`<title>${safeHtml(id)} QR Label</title><style>@page{margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#173d34}.label{width:${labelWidth};margin:auto;padding:5mm;border:1px solid #cad8ce;border-radius:3mm;text-align:center}.brand{font-size:13px;font-weight:800;letter-spacing:.08em}.facility{margin:3px 0 10px;color:#61736d;font-size:8px;text-transform:uppercase}img{display:block;width:${qrWidth};height:${qrWidth};margin:auto}h1{margin:8px 0 3px;font-size:16px}p{margin:3px 0;font-size:9px}.note{margin-top:8px;color:#61736d}@media print{.label{border:0}}</style><main class="label"><div class="brand">REEFTRACK</div><div class="facility">DOrSU Artificial Reef Production Facility</div><img src="${activeQrDataUrl}" alt="QR code for ${safeHtml(id)}">${batchLine}<p>${safeHtml(record.qc)}</p><p class="note">Scan to retrieve this production batch record.</p></main>`);
    printWindow.document.close();printWindow.addEventListener("load",()=>{printWindow.focus();printWindow.print()},{once:true});
  });
  document.querySelector("#download-qr").addEventListener("click",()=>{if(!activeQrDataUrl)return toast("Generate a QR code before downloading.");const link=document.createElement("a");link.href=activeQrDataUrl;link.download=`${document.querySelector("#qr-batch").textContent}-QR-${activeQrSize}px.png`;document.body.append(link);link.click();link.remove();toast("QR image downloaded.")});

  let cameraStream=null,scanTimer=null;
  const startCameraButton=document.querySelector("#start-camera"),stopCameraButton=document.querySelector("#stop-camera"),qrPhotoInput=document.querySelector("#qr-photo-input");
  function setCameraControls(active){startCameraButton.disabled=active;stopCameraButton.disabled=!active}
  async function stopScanner(){
    clearInterval(scanTimer);scanTimer=null;
    if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}
    const video=document.querySelector("#qr-video");video.pause();video.srcObject=null;
    document.querySelector("#scanner-status").textContent="Camera is not active.";
    setCameraControls(false);
  }
  function openScannedBatch(value){
    let id=value.trim();try{const decoded=JSON.parse(value);id=decoded.batchId||id}catch{}
    if(!/^RT-\d{4}-\d{3}$/.test(id)){toast("This is not a valid ReefTrack batch QR.");return false}
    if(!findBatch(id)&&!qrRecords[id]){toast(`No ReefTrack record was found for ${id}.`);return false}
    renderQr(id);document.querySelector("#scanner-status").textContent=`Batch ${id} found.`;toast(`${id} linked record retrieved.`);
    setTimeout(()=>{stopScanner();closeModal(document.querySelector("#qr-scan-modal"))},500);return true;
  }
  document.querySelector("#scan-qr").addEventListener("click",()=>openModal("qr-scan-modal"));
  startCameraButton.addEventListener("click",async()=>{
    const status=document.querySelector("#scanner-status");if(cameraStream)return;
    if(!window.isSecureContext){status.textContent="Live camera requires HTTPS. Opening the mobile photo scanner...";qrPhotoInput.click();return}
    if(!navigator.mediaDevices?.getUserMedia){status.textContent="Live camera is unavailable. Take or choose a QR photo instead.";setCameraControls(false);qrPhotoInput.click();return}
    startCameraButton.disabled=true;status.textContent="Starting camera...";
    try{
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      const video=document.querySelector("#qr-video");video.srcObject=cameraStream;await video.play();setCameraControls(true);
      status.textContent="Point the camera at a ReefTrack QR code.";
      if("BarcodeDetector" in window){const detector=new BarcodeDetector({formats:["qr_code"]});scanTimer=setInterval(async()=>{try{const codes=await detector.detect(video);if(codes[0])openScannedBatch(codes[0].rawValue)}catch{}},500)}
      else if(globalThis.ReefTrackQRScanner?.decodeVideo){scanTimer=setInterval(()=>{try{const value=globalThis.ReefTrackQRScanner.decodeVideo(video);if(value)openScannedBatch(value)}catch{}},500)}
      else status.textContent="Live detection is unavailable. Take or choose a QR photo instead.";
    }catch{cameraStream=null;setCameraControls(false);status.textContent="Camera access was blocked. Take or choose a QR photo below."}
  });
  qrPhotoInput.addEventListener("change",async()=>{
    const status=document.querySelector("#scanner-status"),file=qrPhotoInput.files?.[0];if(!file)return;
    status.textContent="Reading QR photo...";
    try{const value=await globalThis.ReefTrackQRScanner?.decodeFile(file);if(!value)status.textContent="No QR code was found. Retake the photo with the full code visible.";else openScannedBatch(value)}
    catch{status.textContent="The QR photo could not be read. Try another photo."}
    finally{qrPhotoInput.value=""}
  });
  document.querySelector("#stop-camera").addEventListener("click",stopScanner);
  document.querySelector("#qr-scan-modal .modal-close").addEventListener("click",stopScanner);
  document.querySelector("#manual-qr-form").addEventListener("submit",event=>{event.preventDefault();openScannedBatch(new FormData(event.target).get("batch").toUpperCase())});
  const siteData={"Pujada Bay":["RT-2026-104","Aug 12, 2026","6.8241, 126.2134","Good","Aug 20, 2026"],"Barangay Dahican":["RT-2026-092","Jul 28, 2026","6.9340, 126.2411","Excellent","Aug 22, 2026"],"San Isidro MPA":["RT-2026-088","Jul 16, 2026","6.8512, 126.1057","Fair","Aug 18, 2026"]};
  if(!deployments.length){document.querySelectorAll(".marker").forEach(marker=>marker.hidden=true);const card=document.querySelector("#site-card");card.querySelector(".badge").textContent="No Deployments";card.querySelector("h3").textContent="No site selected";card.querySelectorAll("dd").forEach(value=>value.textContent="—");card.querySelector(".primary").disabled=true}
  document.querySelectorAll(".marker").forEach(marker=>marker.addEventListener("click",()=>{const d=siteData[marker.dataset.site];const card=document.querySelector("#site-card");card.querySelector("h3").textContent=marker.dataset.site;const dd=card.querySelectorAll("dd");d.forEach((v,i)=>dd[i].textContent=v)}));
  function renderDeploymentOptions(){
    const select=document.querySelector('#deploy-modal select[name="batch"]');if(!select)return;
    const eligible=batches.filter(batch=>["Passed","Ready for Deployment"].includes(batch.status));
    select.innerHTML=eligible.map(batch=>`<option value="${safeHtml(batch.id)}">${safeHtml(batch.id)} · ${Number(batch.units)} units</option>`).join("")||`<option value="" disabled selected>No approved batches available</option>`;
    select.disabled=!eligible.length;
    const units=document.querySelector('#deploy-modal input[name="units"]');if(units&&eligible[0])units.value=eligible[0].units;
    const submit=document.querySelector('#deployment-form button[type="submit"]');
    if(submit){submit.disabled=!eligible.length;submit.title=eligible.length?"":"Validate a batch before recording deployment."}
  }
  const deploymentForm=document.querySelector("#deploy-modal form");
  renderDeploymentOptions();
  const deploymentDate=deploymentForm.elements.date,monitoringDate=deploymentForm.elements.monitoringDate;
  if(!deploymentDate.value)deploymentDate.value=new Date().toISOString().slice(0,10);
  if(!monitoringDate.value){const due=new Date();due.setDate(due.getDate()+Number(savedSettings.monitoringReminderDays||30));monitoringDate.value=due.toISOString().slice(0,10)}
  deploymentForm.elements.batch.addEventListener("change",event=>{const batch=findBatch(event.target.value);if(batch)deploymentForm.elements.units.value=batch.units});
  deploymentForm.addEventListener("submit",event=>{event.preventDefault();const data=new FormData(event.target),batch=findBatch(data.get("batch"));if(!batch)return toast("Select an approved batch first.");const deployment={batch:batch.id,date:data.get("date"),units:Number(data.get("units")),monitoringDate:data.get("monitoringDate"),site:String(data.get("site")||"").trim(),latitude:Number(data.get("latitude")),longitude:Number(data.get("longitude")),depth:Number(data.get("depth")),condition:data.get("condition"),seaCondition:data.get("seaCondition"),lead:String(data.get("lead")||"").trim(),team:String(data.get("team")||"").trim(),notes:String(data.get("notes")||"").trim()};deployments.unshift(deployment);batch.status="Deployed";batch.deployment=`Deployed at ${deployment.site}`;batch.monitor=`Scheduled ${formatDate(deployment.monitoringDate)}`;saveData();globalThis.dispatchEvent(new CustomEvent("reeftrack:deployments-updated",{detail:deployments}));renderBatches();renderDeploymentOptions();addLog("Deployment",batch.id,`${deployment.units} units deployed at ${deployment.site}; monitoring due ${formatDate(deployment.monitoringDate)}`);closeModal(document.querySelector("#deploy-modal"));toast(`${batch.id} deployment saved and monitoring scheduled.`)});
  globalThis.addEventListener("reeftrack:deployment-selected",event=>{const deployment=event.detail,card=document.querySelector("#site-card"),values=card.querySelectorAll("dd");card.querySelector(".badge").textContent="Active Deployment";card.querySelector("h3").textContent=deployment.site||"Deployment site";card.querySelector(".muted").textContent=`Led by ${deployment.lead||"Field team"}${deployment.team?` · ${deployment.team}`:""}`;values[0].textContent=deployment.batch;values[1].textContent=formatDate(deployment.date);values[2].textContent=`${Number(deployment.latitude).toFixed(5)}, ${Number(deployment.longitude).toFixed(5)}`;values[3].textContent=`${Number(deployment.units)||0} reef units`;values[4].textContent=deployment.depth?`${Number(deployment.depth).toFixed(1)} m`:"Not recorded";values[5].textContent=deployment.condition||"Not recorded";values[6].textContent=formatDate(deployment.monitoringDate);values[7].textContent=deployment.nearest==null?"Only mapped deployment":`${deployment.nearest.toFixed(2)} km away`;card.querySelector(".primary").disabled=false});
  document.querySelector("#site-card .primary").addEventListener("click",()=>{const id=document.querySelector("#site-card dd").textContent;const batch=findBatch(id);if(batch){showView("batches");openBatch(id)}else toast(`${id} is a historical deployment record.`)});
  let mapZoom=1;document.querySelectorAll(".map-controls button").forEach((button,index)=>button.addEventListener("click",()=>{mapZoom=Math.min(1.4,Math.max(.8,mapZoom+(index===0?.1:-.1)));document.querySelector(".map-grid").style.transform=`scale(${mapZoom})`;toast(`Map zoom ${Math.round(mapZoom*100)}%.`)}));

  const loginHistoryKey="reeftrack_login_history";
  const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  function getLoginHistory(){try{return JSON.parse(localStorage.getItem(loginHistoryKey))||[]}catch{return[]}}
  function filteredLoginHistory(){
    const query=document.querySelector("#login-history-search").value.trim().toLowerCase();
    const status=document.querySelector("#login-history-status").value;
    return getLoginHistory().filter(entry=>{
      const searchable=[entry.user,entry.email,entry.device,entry.ipAddress,entry.status,entry.role].join(" ").toLowerCase();
      return (!query||searchable.includes(query))&&(status==="all"||entry.status===status);
    });
  }
  function formatLoginDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?"Unknown":date.toLocaleString("en-PH",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).replace(",","")}
  function renderLoginHistory(){
    const allRecords=getLoginHistory(),records=filteredLoginHistory();document.querySelector("#history-total").textContent=allRecords.length;document.querySelector("#history-success").textContent=allRecords.filter(entry=>entry.status==="Successful").length;document.querySelector("#history-failed").textContent=allRecords.filter(entry=>entry.status==="Failed").length;document.querySelector("#history-accounts").textContent=new Set(allRecords.map(entry=>String(entry.email||entry.user||"").toLowerCase()).filter(Boolean)).size;
    document.querySelector("#login-history-body").innerHTML=records.map(entry=>`<tr><td><div class="history-user"><span>${escapeHtml(userInitials(entry.user||"Unknown"))}</span><div><b>${escapeHtml(entry.user||"Unknown user")}</b><small>${escapeHtml(entry.email||"")}</small></div></div></td><td><span class="history-date">${escapeHtml(formatLoginDate(entry.timestamp))}</span></td><td><span class="history-device">${escapeHtml(entry.device||"Unknown device")}</span></td><td><code>${escapeHtml(entry.ipAddress||"Not available")}</code></td><td><span class="badge history-status ${entry.status==="Successful"?"passed":"failed"}">${entry.status==="Successful"?"":"Failed: "}${escapeHtml(entry.status||"Failed")}</span></td></tr>`).join("")||`<tr class="history-empty-row"><td colspan="5"><div><i class="ph ph-clock-counter-clockwise empty-state-icon" aria-hidden="true"></i><b>${allRecords.length?"No matching login attempts":"No login activity recorded yet"}</b><small>${allRecords.length?"Try a different search term or login status.":"Account access attempts will appear here automatically."}</small></div></td></tr>`;
  }
  document.querySelector("#login-history-search").addEventListener("input",renderLoginHistory);
  document.querySelector("#login-history-status").addEventListener("change",renderLoginHistory);
  document.querySelector("#export-login-history").addEventListener("click",()=>{
    const records=filteredLoginHistory();
    const csvEscape=value=>`"${String(value??"").replaceAll('"','""')}"`;
    const rows=[["User","Email","Role","Date & Time","Device","IP Address","Status"],...records.map(entry=>[entry.user,entry.email,entry.role,formatLoginDate(entry.timestamp),entry.device,entry.ipAddress,entry.status])];
    const url=URL.createObjectURL(new Blob(["\uFEFF"+rows.map(row=>row.map(csvEscape).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`reeftrack-login-history-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);toast(`${records.length} login record${records.length===1?"":"s"} exported.`);
  });
  renderLoginHistory();

  const logView=document.querySelector("#view-logs"),logSearch=logView.querySelector('.filterbar input'),logAction=logView.querySelector('.filterbar select');
  function filteredLogs(){const query=logSearch.value.trim().toLowerCase(),action=logAction.value;return activityLogs.filter(log=>(`${log.user} ${log.action} ${log.record} ${log.details}`).toLowerCase().includes(query)&&(action.startsWith("All")||log.action===action))}
  function renderLogs(){if(!logView)return;const today=new Date().toDateString();logView.querySelector("#log-total").textContent=activityLogs.length;logView.querySelector("#log-today").textContent=activityLogs.filter(log=>new Date(log.timestamp).toDateString()===today).length;logView.querySelector("#log-validations").textContent=activityLogs.filter(log=>/validation/i.test(log.action)).length;logView.querySelector("#log-reports").textContent=activityLogs.filter(log=>log.action==="Report generation").length;const records=filteredLogs();logView.querySelector("#log-body").innerHTML=records.map(log=>{const actionClass=`log-${String(log.action).toLowerCase().replace(/\W+/g,"-")}`;return`<tr><td><span class="log-date">${safeHtml(new Date(log.timestamp).toLocaleString("en-PH"))}</span></td><td><b>${safeHtml(log.user)}</b></td><td><span class="badge log-action ${actionClass}">${safeHtml(log.action)}</span></td><td><b class="log-record">${safeHtml(log.record)}</b></td><td>${safeHtml(log.details)}</td></tr>`}).join("")||`<tr class="log-empty-row"><td colspan="5"><div><i class="ph ph-list-magnifying-glass empty-state-icon" aria-hidden="true"></i><b>${activityLogs.length?"No matching activity":"No activity recorded yet"}</b><small>${activityLogs.length?"Try a different search term or action filter.":"System and Faculty actions will appear here automatically."}</small></div></td></tr>`}
  function downloadCsv(filename,headers,rows){const csvEscape=value=>`"${String(value??"").replaceAll('"','""')}"`;const blob=new Blob(["\uFEFF"+[headers,...rows].map(row=>row.map(csvEscape).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url)}
  logSearch.addEventListener("input",renderLogs);logAction.addEventListener("change",renderLogs);renderLogs();
  logView.querySelector(".page-head .secondary").addEventListener("click",()=>{const rows=filteredLogs();downloadCsv(`reeftrack-activity-${new Date().toISOString().slice(0,10)}.csv`,["Date & Time","User","Action","Record","Details"],rows.map(log=>[new Date(log.timestamp).toLocaleString("en-PH"),log.user,log.action,log.record,log.details]));toast(`${rows.length} activity log(s) exported.`)});
  monitoringView.querySelector(".page-head .secondary").addEventListener("click",()=>{downloadCsv(`reeftrack-monitoring-${new Date().toISOString().slice(0,10)}.csv`,["Record","Batch","Site","Date","Condition","Coverage","Status","Submitted By"],monitoring.map(item=>[item.id,item.batch,item.site,item.date,item.condition,item.coverage,item.status,item.submittedBy]));toast(`${monitoring.length} monitoring record(s) exported.`)});
  const analytics=document.querySelector("#view-analytics");
  function renderAnalytics(){
    if(!analytics)return;
    const units=batches.reduce((sum,batch)=>sum+Number(batch.units||0),0),validated=monitoring.filter(item=>item.status==="Validated").length,onTime=monitoring.length?Math.round(validated/monitoring.length*100):0;
    const cards=analytics.querySelectorAll(".analytics-grid .panel");
    cards[0].querySelector(".big-number").textContent=units.toLocaleString();cards[0].querySelector("p").textContent=`Reef units produced across ${batches.length} active batches`;
    const categories={Draft:0,Curing:0,QC:0,Completed:0};batches.forEach(batch=>{if(batch.status==="Draft"||batch.status==="Pending Review")categories.Draft++;else if(batch.status==="Curing")categories.Curing++;else if(batch.status==="Pending QC")categories.QC++;else categories.Completed++});
    const total=Math.max(1,batches.length),bars=cards[1].querySelectorAll(".stacked i");Object.values(categories).forEach((value,index)=>bars[index].style.width=`${value/total*100}%`);cards[1].querySelector("p").textContent=Object.entries(categories).map(([key,value])=>`${key} ${Math.round(value/total*100)}%`).join(" · ");
    const donut=cards[3].querySelector(".donut");donut.style.setProperty("--value",onTime);donut.querySelector("strong").textContent=`${onTime}%`;
    if(!mixtures.length)cards[2].querySelectorAll(".hbars span").forEach(row=>{row.querySelector("i").style.width="0%";row.querySelector("b").textContent="0"});
  }
  function exportReport(type){let headers,rows;if(type.includes("Mixture")){headers=["Mixture","Score","Classification","Approved"];rows=mixtures.map(item=>[item.id,item.score,item.status,item.approvedAt])}else if(type.includes("Quality")){headers=["Batch","Status","QC Result","Remarks"];rows=batches.map(item=>[item.id,item.status,item.qc||"Not inspected",item.remarks||""])}else if(type.includes("Deployment")){headers=["Batch","Date","Units","Site","Latitude","Longitude"];rows=deployments.map(item=>[item.batch,item.date,item.units,item.site,item.latitude,item.longitude])}else if(type.includes("Monitoring")){headers=["Batch","Site","Date","Condition","Coverage","Status"];rows=monitoring.map(item=>[item.batch,item.site,item.date,item.condition,item.coverage,item.status])}else{headers=["Batch","Production Date","Units","Technician","Mixture","Status","Monitoring"];rows=batches.map(item=>[item.id,item.date,item.units,item.tech,item.mix,item.status,item.monitor])}downloadCsv(`reeftrack-${type.toLowerCase().replace(/\W+/g,"-")}-${new Date().toISOString().slice(0,10)}.csv`,headers,rows);addLog("Report generation",type,`Exported ${rows.length} record(s) to CSV`);toast(`${type} report downloaded.`)}
  analytics.querySelector(".page-head .secondary").addEventListener("click",()=>exportReport("Batch Production"));
  analytics.querySelector(".page-head .primary").addEventListener("click",()=>{addLog("Report generation","Analytics","Opened printable PDF report");window.print()});
  analytics.querySelectorAll(".report-grid button").forEach(button=>button.addEventListener("click",()=>exportReport(button.querySelector("b").textContent)));
  document.querySelector("#settings-form").addEventListener("submit",event=>{
    event.preventDefault();
    const usersKey="reeftrack_users";
    let users=[];
    try{users=JSON.parse(localStorage.getItem(usersKey))||[]}catch{}
    const normalizeEmail=value=>String(value||"").trim().toLowerCase();
    const oldEmail=normalizeEmail(session.email);
    const roleAccounts=users.filter(user=>user.role===session.role);
    const account=users.find(user=>session.accountId&&user.id===session.accountId)
      ||users.find(user=>normalizeEmail(user.email)===oldEmail&&user.role===session.role)
      ||users.find(user=>user.name===session.name&&user.role===session.role)
      ||(roleAccounts.length===1?roleAccounts[0]:null);
    const name=document.querySelector("#profile-name").value.trim();
    const email=normalizeEmail(document.querySelector("#profile-email").value);
    const currentPassword=document.querySelector("#current-password").value;
    const newPassword=document.querySelector("#new-password").value;
    const confirmPassword=document.querySelector("#confirm-password").value;
    if(users.some(user=>user!==account&&normalizeEmail(user.email)===email)){toast("That email address is already used by another account.");return}
    if(currentPassword||newPassword||confirmPassword){
      if(!account){toast("Account record not found. Please log out and sign in again.");return}
      if(currentPassword!==account.password){toast("Current password is incorrect.");return}
      if(newPassword.length<8){toast("New password must contain at least 8 characters.");return}
      if(newPassword!==confirmPassword){toast("New passwords do not match.");return}
      account.password=newPassword;
    }
    const settings={
      contact:document.querySelector("#profile-contact").value.trim(),
      qrLabelFormat:document.querySelector("#qr-label-format").value,
      qrErrorCorrection:document.querySelector("#qr-error-correction").value,
      qrIncludeBatch:document.querySelector("#qr-include-batch").checked,
      notifyPending:document.querySelector("#notify-pending").checked,
      notifyCuring:document.querySelector("#notify-curing").checked,
      notifyMonitoring:document.querySelector("#notify-monitoring").checked,
      notifyFailedLogin:document.querySelector("#notify-failed-login").checked,
      defaultCuringDays:Number(document.querySelector("#default-curing-days").value),
      monitoringReminderDays:Number(document.querySelector("#monitoring-reminder-days").value),
      coordinateFormat:document.querySelector("#coordinate-format").value
    };
    if(!account){toast("Account record not found. Please create or sign in to your account again.");return}
    if(!account.id)account.id=typeof globalThis.crypto?.randomUUID==="function"?globalThis.crypto.randomUUID():`user-${Date.now()}`;
    account.name=name;account.email=email;account.settings=settings;
    session={...session,accountId:account.id,name,email,settings};
    localStorage.setItem(usersKey,JSON.stringify(users));
    localStorage.setItem("reeftrack_latest_credentials",JSON.stringify({accountId:account.id,name,email,password:account.password,role:account.role,settings}));
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
    document.querySelectorAll("#side-name,#top-name").forEach(el=>el.textContent=name);
    document.querySelector("#welcome-name").textContent=name.split(" ")[0]||"Researcher";
    event.target.querySelectorAll('input[type="password"]').forEach(input=>input.value="");
    toast("All settings saved successfully.");
  });
  renderDashboard();
  document.querySelector("#dashboard-logout").addEventListener("click",()=>openModal("logout-confirm-modal"));
  document.querySelector("#confirm-logout").addEventListener("click",()=>{window.ReefTrackAuth?.clearHostedSession?.();sessionStorage.removeItem(SESSION_KEY);window.location.replace("../../index.html")});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal.open").forEach(closeModal)});
}

let toastTimer;
function toast(message){const t=document.querySelector("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600)}
