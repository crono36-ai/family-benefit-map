/* Global Leaflet loaded from CDN. */
const $ = id => document.getElementById(id);
const map = L.map('map', {zoomControl:true}).setView([-25.5, 134], 4);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom:19}).addTo(map);
const fmt = n => n.toLocaleString('en-AU');
const color = n => n == null ? '#c9d1cf' : n < 500 ? '#e6f3ef' : n < 1000 ? '#b6ddd2' : n < 2000 ? '#77b9a8' : n < 3000 ? '#398b79' : '#145e53';
let data=[], geo, layers={}, selected=null, descending=true;
let facilities=[], areasByCode={}, facilityLayer=L.layerGroup().addTo(map), facilityRenderer=L.canvas({padding:0.5});
let facilityLoadState='loading';
const safe = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function selectArea(code) {
  if(selected && layers[selected]) geo.resetStyle(layers[selected]);
  selected=code; const layer=layers[code];
  if (!layer) return;
  layer.setStyle({weight:3,color:'#e6ad50',fillOpacity:.9}); layer.bringToFront();
  map.fitBounds(layer.getBounds(),{maxZoom:11,padding:[45,45]}); layer.openPopup(); render();
}
function filtered(){const q=$('search').value.trim().toLowerCase(), state=$('state').value; return data.filter(f=>(!state||f.properties.state===state)&&(!q||(f.properties.name+' '+f.properties.code).toLowerCase().includes(q)));}
function render(){
 const all=filtered(), valid=all.filter(f=>f.properties.value!==null).sort((a,b)=>(descending?b.properties.value-a.properties.value:a.properties.value-b.properties.value)||a.properties.name.localeCompare(b.properties.name));
 const top=[...all].filter(f=>f.properties.value!==null).sort((a,b)=>b.properties.value-a.properties.value||a.properties.name.localeCompare(b.properties.name)).slice(0,10);
 $('top-region').textContent=$('state').value ? 'in '+$('state').value : 'across Australia';
 $('top-list').innerHTML=top.map((f,i)=>`<button class="top-item ${selected===f.properties.code?'active':''}" data-code="${safe(f.properties.code)}"><span class="top-number">${String(i+1).padStart(2,'0')}</span><span class="top-name">${safe(f.properties.name)}<small>${safe(f.properties.state)} · ${safe(f.properties.code)}</small></span><span class="top-count">${fmt(f.properties.value)}<small>recipients</small></span></button>`).join('')||'<p class="rank-desc">No matching areas with available values.</p>';
 $('top-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selectArea(b.dataset.code);$('map').scrollIntoView({behavior:'smooth',block:'center'});}));
 $('rank-list').innerHTML=valid.map((f,i)=>`<button class="rank-row ${selected===f.properties.code?'active':''}" data-code="${safe(f.properties.code)}"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><span class="rank-name">${safe(f.properties.name)}<small>${safe(f.properties.state)} · ${safe(f.properties.code)}</small></span><span class="rank-value">${fmt(f.properties.value)}</span></button>`).join('')||'<p class="rank-desc">No matching areas with available values.</p>';
 $('rank-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectArea(b.dataset.code)));
 $('rank-footer').textContent=`${fmt(valid.length)} areas with values · ${fmt(all.length-valid.length)} unavailable`;
 $('sort').textContent='RECIPIENTS '+(descending?'↓':'↑');
 if(geo) geo.eachLayer(l=>{const f=l.feature; const visible=all.includes(f);l.setStyle({fillOpacity:visible?.78:.08,opacity:visible?.8:.12});});
 if(selected && layers[selected]) layers[selected].setStyle({weight:3,color:'#e6ad50',fillOpacity:.9});
 renderFacilities();
 renderAreaFacilities();
}
function renderAreaFacilities(){
 const summary=$('area-facilities-summary'),wrap=$('area-table-wrap'),body=$('area-table-body');
 wrap.hidden=true;body.innerHTML='';
 if(!selected){summary.textContent='Select an SA2 on the map or from the area ranking to see its facilities.';return;}
 const area=areasByCode[selected];if(!area)return;
 if(facilityLoadState==='loading'){summary.textContent=`Loading facilities for ${area.name}…`;return;}
 if(facilityLoadState==='error'){summary.textContent='Facility data could not be loaded. Check the local server and refresh the page.';return;}
 const matches=facilities.filter(f=>f.sa2===selected).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const schools=matches.filter(f=>f.kind==='school').length,care=matches.length-schools;
 summary.textContent=`${area.name} (${area.code}) · ${fmt(schools)} schools · ${fmt(care)} education and care services${matches.length?'':' · No mapped facilities in the supplied datasets.'}`;
 if(!matches.length)return;
 body.innerHTML=matches.map(f=>`<tr><td><button data-kind="${safe(f.kind)}" data-id="${safe(f.id)}">${safe(f.name)}</button></td><td>${f.kind==='school'?'School':'Education and care'}<small>${safe(f.extra||'Subtype unavailable')}${f.sector?' · '+safe(f.sector):''}</small></td><td>${safe([f.address,f.suburb,f.state,f.postcode].filter(Boolean).join(', ')||'Not supplied')}</td><td>${safe(f.phone||'Not supplied')}</td><td>${safe(f.id||'Not supplied')}</td></tr>`).join('');
 body.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const f=facilities.find(x=>x.kind===b.dataset.kind&&x.id===b.dataset.id);if(f)openFacility(f)}));wrap.hidden=false;
}
function facilityPopup(f){const a=areasByCode[f.sa2];return `<b>${safe(f.name)}</b><br>${safe(f.extra)} · ${safe(f.suburb)}, ${safe(f.state)}<br>${a?`SA2: ${safe(a.name)} (${safe(a.code)})<br><strong>${a.value===null?'Unavailable':fmt(a.value)+' FTB Part A recipients in this SA2'}</strong>`:'SA2 unavailable'}<br><small>Area count is not facility enrolment or CDBS eligibility.</small>`;}
function openFacility(f){
 const check=$(f.kind==='care'?'show-care':'show-school');check.checked=true;
 map.setView([f.lat,f.lon],14);renderFacilityMarkers();
 L.popup().setLatLng([f.lat,f.lon]).setContent(facilityPopup(f)).openOn(map);
 $('map').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderFacilities(){
 if(!facilities.length||!data.length)return;
 const state=$('state').value;
 for(const kind of ['care','school']){
   const list=facilities.filter(f=>f.kind===kind&&areasByCode[f.sa2]&&areasByCode[f.sa2].value!==null&&(!state||areasByCode[f.sa2].state===state))
    .sort((a,b)=>areasByCode[b.sa2].value-areasByCode[a.sa2].value||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,10);
   $(kind+'-list').innerHTML=list.map((f,i)=>{const a=areasByCode[f.sa2];return `<button class="facility-row" data-id="${safe(f.id)}"><span class="top-number">${String(i+1).padStart(2,'0')}</span><span class="facility-name">${safe(f.name)}<small>${safe(f.extra)} · ${safe(a.name)} SA2</small></span><span class="facility-count">${fmt(a.value)}<small>SA2 recipients</small></span></button>`}).join('')||'<p class="facility-note">No matching facilities with an available area count.</p>';
   $(kind+'-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const f=facilities.find(x=>x.kind===kind&&x.id===b.dataset.id);if(f)openFacility(f)}));
 }
 renderFacilityMarkers();
}
function renderFacilityMarkers(){
 facilityLayer.clearLayers();
 if(!facilities.length)return;
 if(map.getZoom()<8){$('facility-status').textContent='Zoom in to display facility markers.';return;}
 const bounds=map.getBounds(),state=$('state').value;
 let shown=0;
 for(const f of facilities){
  if(!$(f.kind==='care'?'show-care':'show-school').checked||!bounds.contains([f.lat,f.lon])||(state&&(!areasByCode[f.sa2]||areasByCode[f.sa2].state!==state)))continue;
  L.circleMarker([f.lat,f.lon],{renderer:facilityRenderer,radius:5,color:'#fff',weight:1,fillColor:f.kind==='care'?'#b5633c':'#655aa4',fillOpacity:.95}).bindPopup(facilityPopup(f)).addTo(facilityLayer);shown++;
 }
 $('facility-status').textContent=fmt(shown)+' facilities in view.';
}
map.on('moveend zoomend',renderFacilityMarkers);
for(const id of ['show-care','show-school'])$(id).addEventListener('change',renderFacilityMarkers);
fetch('data/sa2.geojson').then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}).then(json=>{
 data=json.features;
 areasByCode=Object.fromEntries(data.map(f=>[f.properties.code,f.properties]));
 [...new Set(data.map(f=>f.properties.state))].filter(Boolean).sort().forEach(s=>$('state').add(new Option(s,s)));
 geo=L.geoJSON(json,{style:f=>({fillColor:color(f.properties.value),fillOpacity:.78,color:'#fff',weight:.45,opacity:.8}),onEachFeature:(f,l)=>{const p=f.properties;layers[p.code]=l; l.bindPopup(`<b>${safe(p.name)}</b><br>${safe(p.state)} · SA2 ${safe(p.code)}<br><strong>${p.value===null?'Unavailable / unmatched':fmt(p.value)+' recipients'}</strong><br><small>DSS FTB Part A · 25 September 2026<br>2021 SA2 boundary</small>`);l.on('click',()=>selectArea(p.code));}}).addTo(map);
 $('map-status').style.display='none';render();
}).catch(e=>{$('map-status').textContent='Unable to load map data. Run the local server described in README.md. '+e.message;});
fetch('data/facilities.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{facilities=rows;facilityLoadState='ready';renderFacilities();renderAreaFacilities()}).catch(()=>{facilityLoadState='error';$('facility-status').textContent='Facility data unavailable. See README for preparation instructions.';renderAreaFacilities()});
$('search').addEventListener('input',render);$('state').addEventListener('change',render);
$('sort').addEventListener('click',()=>{descending=!descending;render()});
$('reset').addEventListener('click',()=>{$('search').value='';$('state').value='';if(selected&&layers[selected])geo.resetStyle(layers[selected]);selected=null;map.setView([-25.5,134],4);render()});
$('download').addEventListener('click',()=>{const rows=filtered().filter(f=>f.properties.value!==null).sort((a,b)=>(descending?b.properties.value-a.properties.value:a.properties.value-b.properties.value));const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';const csv=[['SA2 code','SA2 name','State or territory','FTB Part A recipients','Extraction date','Measure definition','Source'],...rows.map(({properties:p})=>[p.code,p.name,p.state,p.value,'2026-09-25','FTB Part A payment recipients; rounded to nearest 5; values 1–7 rounded to 5','DSS benefit and payment recipient demographics, September 2026'])].map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ftb-part-a-sa2.csv';a.click();URL.revokeObjectURL(url)});
