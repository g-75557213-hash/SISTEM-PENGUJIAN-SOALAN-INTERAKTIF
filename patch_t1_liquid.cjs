const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const liquidOptions = `
  const liquidOptions = [
    {id: 'air', name: 'Air', density: 1.0, color: 'bg-blue-500/30', border: 'border-blue-400/80', textColor: 'text-blue-300/80', tagColor: 'bg-blue-900/50'},
    {id: 'minyak', name: 'Minyak', density: 0.9, color: 'bg-yellow-500/40', border: 'border-yellow-400/80', textColor: 'text-yellow-300/80', tagColor: 'bg-yellow-900/50'},
    {id: 'madu', name: 'Madu', density: 1.4, color: 'bg-amber-600/50', border: 'border-amber-500/80', textColor: 'text-amber-300/80', tagColor: 'bg-amber-900/50'},
    {id: 'alkohol', name: 'Alkohol', density: 0.79, color: 'bg-cyan-400/20', border: 'border-cyan-300/80', textColor: 'text-cyan-200/80', tagColor: 'bg-cyan-900/50'}
  ];
  const [baseLiquidId, setBaseLiquidId] = useState<string>('air');
  const baseLiquid = liquidOptions.find(l => l.id === baseLiquidId) || liquidOptions[0];
`;

code = code.replace(
  "const [t1Dropped, setT1Dropped] = useState<T1DroppedObj[]>([]);",
  liquidOptions + "\n  const [t1Dropped, setT1Dropped] = useState<T1DroppedObj[]>([]);"
);

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
