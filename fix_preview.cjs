const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf8');

code = code.replace(
`                    <div className="aspect-video w-full bg-slate-100 relative rounded-t-2xl overflow-hidden shrink-0">
                      <iframe 
                        srcDoc={q.html} 
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                      />
                      <div className="absolute inset-0 bg-transparent pointer-events-auto"></div>
                    </div>`,
`                    <div 
                      className="aspect-video w-full bg-slate-100 relative rounded-t-2xl overflow-hidden shrink-0 cursor-pointer group"
                      onClick={() => setPreviewQuestion(q)}
                      title="Tekan untuk pratonton soalan"
                    >
                      <iframe 
                        srcDoc={q.html.replace('<style>', '<style>body{overflow-x:hidden !important; margin:0; padding:0;}</style><style>')} 
                        className="w-full h-full border-0 pointer-events-none transition-transform duration-300 group-hover:scale-105 origin-top"
                        sandbox="allow-scripts"
                        scrolling="no"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-auto flex items-center justify-center">
                        <div className="bg-white text-slate-800 text-xs font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 shadow-sm flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Pratonton
                        </div>
                      </div>
                    </div>`
);

fs.writeFileSync('src/components/BankSoalan.tsx', code);
