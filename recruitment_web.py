"""Local browser-based recruitment shortlisting app. Run: python recruitment_web.py"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import threading
import webbrowser

HOST, PORT = "127.0.0.1", 8765
DATA = Path(__file__).with_name("candidates.json")
LOCK = threading.Lock()

PAGE = r'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recruitment Shortlisting</title>
<style>
:root{--ink:#172a3a;--muted:#64748b;--line:#dce5e9;--teal:#0d766e;--bg:#f4f7f6}*{box-sizing:border-box}body{margin:0;background:var(--bg);font:15px system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink)}header{padding:28px max(24px,calc((100vw - 1180px)/2));background:#103c46;color:white}header h1{margin:0 0 5px;font-size:25px}header p{margin:0;color:#cce0e0}.wrap{max-width:1180px;margin:24px auto;padding:0 20px}.card{background:white;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px;box-shadow:0 4px 16px #183b4310}.criteria{display:grid;grid-template-columns:2fr 2fr 140px auto;gap:12px;align-items:end}label{display:block;font-size:13px;font-weight:650;margin-bottom:5px}input,textarea{font:inherit;padding:10px;border:1px solid #cbd5da;border-radius:7px;width:100%;color:var(--ink)}button,.filebtn{font:inherit;font-weight:650;border:0;border-radius:7px;padding:10px 14px;background:var(--teal);color:white;cursor:pointer}button.secondary,.filebtn{background:#e5f0ef;color:#15544f}button.danger{background:#fff0ed;color:#a33120}button:hover,.filebtn:hover{filter:brightness(.96)}.toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.toolbar input[type=file]{display:none}.summary{color:var(--muted);font-size:14px;margin:0 0 12px}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:850px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #e8edef;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.score{font-weight:750;color:var(--teal)}.badge{display:inline-block;background:#e5f4ef;color:#176046;padding:4px 8px;border-radius:20px;font-size:12px}.badge.low{background:#fff1e4;color:#9a5311}.muted{color:var(--muted)}.actions{display:flex;gap:5px}.actions button{padding:6px 9px;font-size:12px}.note{font-size:13px;color:var(--muted);line-height:1.5}.empty{text-align:center;padding:36px;color:var(--muted)}dialog{border:0;border-radius:12px;padding:22px;width:min(520px,calc(100vw - 24px));box-shadow:0 20px 60px #0b263a55}dialog::backdrop{background:#102a3290}dialog h2{margin:0 0 14px}.formgrid{display:grid;gap:11px}.formbuttons{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.small{font-size:12px;color:var(--muted)}@media(max-width:720px){.criteria{grid-template-columns:1fr 1fr}.criteria button{grid-column:span 2}.wrap{padding:0 12px}header{padding:22px 18px}}
</style></head><body><header><h1>Recruitment &amp; Shortlisting</h1><p>Organize candidates and compare them against role requirements.</p></header><main class="wrap"><section class="card"><div class="criteria"><div><label for="required">Required skills</label><input id="required" placeholder="e.g. Python, SQL"></div><div><label for="preferred">Preferred skills</label><input id="preferred" placeholder="e.g. AWS, Docker"></div><div><label for="years">Minimum years</label><input id="years" type="number" min="0" step="0.5" value="2"></div><button onclick="render()">Update ranking</button></div></section>
<section class="card"><div class="toolbar"><button onclick="openForm()">Add candidate</button><label class="filebtn" for="csvFile">Import CSV</label><input id="csvFile" type="file" accept=".csv,text/csv" onchange="importCsv(event)"><button class="secondary" onclick="exportCsv()">Export ranked CSV</button></div></section>
<section class="card"><p class="summary" id="summary"></p><div class="tablewrap"><table><thead><tr><th>Score</th><th>Candidate</th><th>Email</th><th>Years</th><th>Skills</th><th>Missing required</th><th>Review</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div class="empty" id="empty" hidden>No candidates yet. Add one or import a CSV with name, email, experience, skills, and notes columns.</div></section>
<p class="note">Scores are a review aid: 60% required skills, 20% preferred skills, and 20% experience. Candidates scoring 70 or above are suggested for review. This tool does not make hiring decisions. Apply consistent criteria and assess candidates individually.</p></main>
<dialog id="candidateDialog"><form method="dialog" id="candidateForm"><h2 id="dialogTitle">Add candidate</h2><div class="formgrid"><input name="name" placeholder="Full name" required><input name="email" type="email" placeholder="Email"><input name="experience" type="number" min="0" step="0.5" placeholder="Experience in years" value="0"><input name="skills" placeholder="Skills, comma-separated"><textarea name="notes" placeholder="Notes (optional)" rows="3"></textarea></div><div class="formbuttons"><button type="button" class="secondary" onclick="candidateDialog.close()">Cancel</button><button type="submit">Save candidate</button></div><p class="small">Keep notes job-related and appropriate. Store candidate data securely.</p></form></dialog>
<script>
let candidates=[];let editing=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const split=s=>new Set((s||'').split(/[,;]/).map(x=>x.trim().toLocaleLowerCase()).filter(Boolean));
async function load(){try{let r=await fetch('/api/candidates');candidates=await r.json()}catch(e){candidates=[];alert('Could not load candidate data. Try refreshing the page.')}render()}
async function persist(){let r=await fetch('/api/candidates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(candidates)});if(!r.ok)alert('Could not save candidates. Check the server console.');render()}
function ranked(){let req=split(document.querySelector('#required').value),pref=split(document.querySelector('#preferred').value),min=Math.max(0,Number(document.querySelector('#years').value)||0);return candidates.map((p,i)=>{let sk=split(p.skills),rh=req.size?[...req].filter(s=>sk.has(s)).length/req.size:1,ph=pref.size?[...pref].filter(s=>sk.has(s)).length/pref.size:1,exp=Math.max(0,Number(p.experience)||0),eh=min?Math.min(exp/min,1):1;return {p,i,score:Math.round(100*(.6*rh+.2*ph+.2*eh)),missing:[...req].filter(s=>!sk.has(s))}}).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name))}
function render(){let list;try{list=ranked()}catch(e){return}document.querySelector('#rows').innerHTML=list.map(x=>`<tr><td class="score">${x.score}</td><td><strong>${esc(x.p.name)}</strong>${x.p.notes?`<div class="small">${esc(x.p.notes)}</div>`:''}</td><td>${esc(x.p.email||'')}</td><td>${esc(x.p.experience||0)}</td><td>${esc(x.p.skills||'')}</td><td>${x.missing.length?esc(x.missing.join(', ')):'<span class="muted">None</span>'}</td><td><span class="badge ${x.score<70?'low':''}">${x.score>=70?'Suggested for review':'Below threshold'}</span></td><td><div class="actions"><button class="secondary" onclick="openForm(${x.i})">Edit</button><button class="danger" onclick="removeCandidate(${x.i})">Delete</button></div></td></tr>`).join('');document.querySelector('#empty').hidden=!!candidates.length;document.querySelector('#summary').textContent=`${candidates.length} candidate(s) • ${list.filter(x=>x.score>=70).length} suggested for review • Ranking: 60% required skills, 20% preferred skills, 20% experience`}
function openForm(i=null){editing=i;let f=document.querySelector('#candidateForm');f.reset();document.querySelector('#dialogTitle').textContent=i===null?'Add candidate':'Edit candidate';if(i!==null)for(let [k,v] of Object.entries(candidates[i]))if(f.elements[k])f.elements[k].value=v;document.querySelector('#candidateDialog').showModal()}
document.querySelector('#candidateForm').addEventListener('submit',e=>{e.preventDefault();let f=e.currentTarget,p=Object.fromEntries(['name','email','experience','skills','notes'].map(k=>[k,f.elements[k].value.trim()]));p.experience=Math.max(0,Number(p.experience)||0);if(editing===null)candidates.push(p);else candidates[editing]=p;document.querySelector('#candidateDialog').close();persist()});
async function removeCandidate(i){if(confirm(`Delete ${candidates[i].name}?`)){candidates.splice(i,1);await persist()}}
function parseCSV(text){let out=[],row=[],field='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));if(row.some(x=>x.trim()))out.push(row);row=[];field=''}else field+=c}row.push(field.replace(/\r$/,''));if(row.some(x=>x.trim()))out.push(row);return out}
async function importCsv(e){let file=e.target.files[0];if(!file)return;try{let rows=parseCSV(await file.text());if(rows.length<2)throw Error('CSV must include a header row and at least one candidate.');let headers=rows.shift().map(h=>h.trim().toLowerCase());let get=(r,...keys)=>{let i=headers.findIndex(h=>keys.includes(h));return i<0?'':(r[i]||'').trim()};let added=0;for(let r of rows){let name=get(r,'name','full name','candidate');if(!name)continue;candidates.push({name,email:get(r,'email'),experience:Math.max(0,Number(get(r,'experience','experience years'))||0),skills:get(r,'skills'),notes:get(r,'notes')});added++}await persist();alert(`Imported ${added} candidate(s).`)}catch(err){alert('CSV import failed: '+err.message)}finally{e.target.value=''}}
function csvCell(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
function exportCsv(){let data=[['rank','score','name','email','experience_years','skills','missing_required_skills','notes']];ranked().forEach((x,i)=>data.push([i+1,x.score,x.p.name,x.p.email,x.p.experience,x.p.skills,x.missing.join(', '),x.p.notes]));let blob=new Blob(['\ufeff'+data.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ranked_candidates.csv';a.click();URL.revokeObjectURL(a.href)}
load();
</script></body></html>'''


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body, content_type="text/html; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?"):
            return self.send(200, PAGE)
        if self.path == "/api/candidates":
            with LOCK:
                try:
                    people = json.loads(DATA.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    people = []
            return self.send(200, json.dumps(people), "application/json; charset=utf-8")
        self.send(404, "Not found")

    def do_POST(self):
        if self.path != "/api/candidates":
            return self.send(404, "Not found")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            people = json.loads(self.rfile.read(length))
            if not isinstance(people, list) or len(people) > 10000:
                raise ValueError("Expected a candidate list")
            with LOCK:
                DATA.write_text(json.dumps(people, indent=2, ensure_ascii=False), encoding="utf-8")
            self.send(200, '{"saved":true}', "application/json; charset=utf-8")
        except (ValueError, OSError, json.JSONDecodeError):
            self.send(400, '{"error":"invalid data"}', "application/json; charset=utf-8")

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}"
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Recruitment app running at {url} (Ctrl+C to stop)", flush=True)
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        server.server_close()
