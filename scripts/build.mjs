import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,strict:true,noEmit:true,skipLibCheck:true,noImplicitReturns:true,noFallthroughCasesInSwitch:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']};
const files=['engine.ts','glass.ts','client.ts'].map(file=>fileURLToPath(new URL(file,root)));
const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram(files,options));
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:file=>file,getNewLine:()=>"\n"}));process.exit(1);}

const compile=file=>ts.transpileModule(readFileSync(new URL(file,root),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const engine=compile('engine.ts');
const avatar='data:image/png;base64,'+readFileSync(new URL('assets/deepseek-girl.png',root)).toString('base64');
const client=compile('client.ts').replace('/* AVATAR */ null',JSON.stringify(avatar));
mkdirSync(new URL('dist/',root),{recursive:true});
const output=new URL('dist/client.js',root);
writeFileSync(output,engine+'\n'+compile('glass.ts')+'\n'+client);
console.log('Built '+fileURLToPath(output));
