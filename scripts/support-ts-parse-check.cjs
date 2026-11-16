const ts=require('typescript');
const fs=require('node:fs');
const paths=['src/core/support-gate.ts','src/core/support-local-contract.ts','src/app/[locale]/support/page.tsx',
'src/app/[locale]/support/support-center-client.tsx','src/app/api/a1-support/[operation]/route.ts'];
for(const file of paths){
 const source=fs.readFileSync(file,'utf8');
 const result=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve}});
 const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 if(errors.length){console.error(file,errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')));process.exitCode=1;}
 else console.log('PARSE PASS',file);
}
