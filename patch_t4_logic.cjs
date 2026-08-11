const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

const t4StateAnchor = `  // --- T4 Simulation State (Aloi) ---`;
const t4EndAnchor = `  const allSimulations: Record<string, any[]> = {`;

const startIdx = code.indexOf(t4StateAnchor);
const endIdx = code.indexOf(t4EndAnchor);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find T4 anchors");
    process.exit(1);
}

const newT4State = `  // --- T4 Simulation State (Aloi) ---
  const [t4Block, setT4Block] = useState<'Kuprum' | 'Gangsa'>('Kuprum');
  const [t4Dent, setT4Dent] = useState<number | null>(null);
  const [t4Animating, setT4Animating] = useState(false);
  const [t4ShowInfo, setT4ShowInfo] = useState(false);
  const [t4Height, setT4Height] = useState<number>(50); // Height in cm (10 to 50)
  const [t4KuprumTrials, setT4KuprumTrials] = useState<number[]>([]);
  const [t4GangsaTrials, setT4GangsaTrials] = useState<number[]>([]);

  const runT4Experiment = () => {
    if (t4Animating) return;
    
    // Validate trial limits
    if (t4Block === 'Kuprum' && t4KuprumTrials.length >= 3) {
      alert('Anda telah melengkapkan 3 percubaan untuk Kuprum. Sila tukar ke Gangsa atau reset.');
      return;
    }
    if (t4Block === 'Gangsa' && t4GangsaTrials.length >= 3) {
      alert('Anda telah melengkapkan 3 percubaan untuk Gangsa. Sila tukar ke Kuprum atau reset.');
      return;
    }

    playSound('click');
    setT4Animating(true); 
    setT4Dent(null);
    
    // Animation duration based on height to simulate physics
    // Drop time t = sqrt(2h/g)
    const normalizedHeight = t4Height / 50; 
    const animDurationMs = Math.max(400, Math.sqrt(normalizedHeight) * 800); 

    setTimeout(() => {
      playSound('drop');
      
      // Calculate realistic diameter based on height and block type
      // Kuprum base: 2.5cm, Gangsa base: 1.2cm (at 50cm height)
      const baseDent = t4Block === 'Kuprum' ? 2.5 : 1.2;
      let calculatedDent = baseDent * Math.sqrt(t4Height / 50);
      
      // Add slight random variation (+- 0.05)
      calculatedDent = calculatedDent + (Math.random() * 0.1 - 0.05);
      calculatedDent = Math.max(0.1, calculatedDent); // At least 0.1
      calculatedDent = parseFloat(calculatedDent.toFixed(1));

      setT4Dent(calculatedDent); 
      setT4Animating(false);

      if (t4Block === 'Kuprum') {
         setT4KuprumTrials(prev => [...prev, calculatedDent]);
      } else {
         setT4GangsaTrials(prev => [...prev, calculatedDent]);
      }

    }, animDurationMs);
  };

  const resetT4 = () => {
     setT4KuprumTrials([]);
     setT4GangsaTrials([]);
     setT4Dent(null);
     setT4Height(50);
  };

`;

code = code.substring(0, startIdx) + newT4State + code.substring(endIdx);
fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log("Patched T4 Logic!");
