from pathlib import Path
p=Path(r"C:\A1Hub\a1-mobi\src\app\globals.css")
s=p.read_text(encoding="utf8")
marker="/* C-LIVE-02 VISUAL PASS 03: compact repairs and selected-case workspace */"
assert marker not in s
css="""
/* C-LIVE-02 VISUAL PASS 03: compact repairs and selected-case workspace */
.mobi-live02-orders tbody td{vertical-align:middle;padding-block:11px}
.mobi-live02-orders .mobi-live02-ticket strong{font-size:12px;letter-spacing:.05px;overflow-wrap:anywhere}
.mobi-live02-orders .mobi-live02-customer strong{font-size:13px;color:#14233d}
.mobi-live02-orders .mobi-live02-customer small{line-height:1.45;margin-top:3px}
.mobi-live02-orders .mobi-live02-actions{min-width:106px}
.mobi-live02-orders .mobi-live02-actions .mobi-live02-open{
 display:inline-flex;align-items:center;justify-content:center;min-height:35px;
 padding:8px 12px;border-radius:8px;background:#eaf2ff;color:#155bba;
 border:1px solid #c9ddff;font-size:12px;font-weight:800;cursor:pointer;
}
.mobi-live02-orders .mobi-live02-actions .mobi-live02-open[aria-expanded="true"]{
 background:#1265e8;color:#fff;border-color:#1265e8;
}
.mobi-live02-orders .mobi-live02-actions .mobi-live02-open:focus-visible{
 outline:2px solid #1265e8;outline-offset:3px;
}
.mobi-live02-case-detail{
 margin:18px;padding:0;background:#fff;border:1px solid #bcd5fa;
 border-radius:15px;box-shadow:0 10px 32px rgba(20,35,61,.06);
 scroll-margin-top:100px;overflow:hidden;
}
.mobi-live02-case-head{
 display:flex;justify-content:space-between;align-items:center;gap:14px;
 padding:17px 20px;border-bottom:1px solid #e7edf7;background:#f7faff;
}
.mobi-live02-case-head span{display:block;color:#1265e8;font-size:11px;font-weight:800}
.mobi-live02-case-head h3{margin:5px 0;font-size:18px;color:#14233d;overflow-wrap:anywhere}
.mobi-live02-case-head p{margin:0;color:#65758d;font-size:12px;line-height:1.6}
.mobi-live02-case-head .mobi-live02-close{
 flex:none;background:white;border:1px solid #cddbec;color:#243c60;
 border-radius:9px;padding:9px 12px;font-size:12px;cursor:pointer;
}
.mobi-live02-case-head .mobi-live02-close:focus-visible{outline:2px solid #1265e8;outline-offset:2px}
.mobi-live02-case-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.85fr);gap:22px;padding:20px;align-items:start}
.mobi-live02-case-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.mobi-live02-case-data>div{border:1px solid #e3ebf5;border-radius:10px;padding:12px;min-width:0;display:grid;gap:7px}
.mobi-live02-case-data span{color:#65758d;font-size:12px}
.mobi-live02-case-data strong{font-size:14px;color:#14233d;overflow-wrap:anywhere}
.mobi-live02-case-data strong.mobi-live02-status{font-size:12px;width:fit-content}
.mobi-live02-panel-actions{min-width:0;border:1px solid #e2ebf6;border-radius:11px;padding:16px;background:#fcfdff}
.mobi-live02-panel-actions h4{font-size:16px;margin:0 0 14px;color:#14233d}
.mobi-live02-panel-actions>button{
 border:0;border-radius:9px;background:#1265e8;color:#fff;padding:12px 16px;
 font-size:13px;font-weight:800;cursor:pointer;min-height:42px;
}
.mobi-live02-panel-actions>button:disabled{opacity:.5}
.mobi-live02-panel-actions .mobi-live02-ready form{width:100%;max-width:380px}
.mobi-live02-panel-actions .mobi-live02-settlement{max-width:430px;width:100%;font-size:13px}
.mobi-live02-panel-actions .mobi-live02-settlement button{min-height:42px}
@media(max-width:760px){
 .mobi-live02-case-detail{margin:10px}
 .mobi-live02-case-content{grid-template-columns:1fr;gap:14px;padding:13px}
 .mobi-live02-case-head{padding:13px}
 .mobi-live02-case-head h3{font-size:15px}
 .mobi-live02-case-data{gap:8px}
 .mobi-live02-case-data>div{padding:10px}
 .mobi-live02-orders .mobi-live02-actions{min-width:0}
 .mobi-live02-orders .mobi-live02-actions .mobi-live02-open{width:100%}
}
"""
p.write_text(s+"\n"+css,encoding="utf8",newline="\n")
print("CASE_PANEL_RESPONSIVE_CSS_READY")
