const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoalan.tsx', 'utf-8');

// replace the state for filtering with selection steps
code = code.replace("const [filterSubjek, setFilterSubjek] = useState('');", "const [selectedSubjek, setSelectedSubjek] = useState('');");
code = code.replace("const [filterTingkatan, setFilterTingkatan] = useState('');", "const [selectedTingkatan, setSelectedTingkatan] = useState('');");

// change useMemo for filteredQuestions
code = code.replace(
`  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qBab = q.bab?.toLowerCase() || '';
      const qSubjek = q.subjek?.toLowerCase() || '';
      const s = search.toLowerCase();
      
      const matchSearch = qBab.includes(s) || qSubjek.includes(s);
      const matchSubjek = filterSubjek ? q.subjek === filterSubjek : true;
      const matchTingkatan = filterTingkatan ? q.tingkatan === filterTingkatan : true;
      
      return matchSearch && matchSubjek && matchTingkatan;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [questions, search, filterSubjek, filterTingkatan]);`,
`  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qBab = q.bab?.toLowerCase() || '';
      const s = search.toLowerCase();
      const matchSearch = qBab.includes(s);
      const matchSubjek = selectedSubjek ? q.subjek === selectedSubjek : true;
      const matchTingkatan = selectedTingkatan ? q.tingkatan === selectedTingkatan : true;
      
      return matchSearch && matchSubjek && matchTingkatan;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [questions, search, selectedSubjek, selectedTingkatan]);`
);

fs.writeFileSync('src/components/BankSoalan.tsx', code);
