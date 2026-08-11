const fs = require('fs');
let code = fs.readFileSync('src/components/LiveGamificationStudio.tsx', 'utf-8');

// Replace the slider input with a div that acts as the container for the weight and handles dragging
const targetSlider = `                        {/* Interactive Weight Slider (Hidden but functional) */}
                        <input 
                           type="range"
                           min="0" max="80" step="1"
                           value={t4Height}
                           onChange={(e) => setT4Height(Number(e.target.value))}
                           disabled={t4Animating}
                           className="absolute left-10 top-10 bottom-[140px] w-12 appearance-none bg-transparent opacity-0 cursor-grab z-40"
                           style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                        />
                        
                        {/* Interactive Weight */}
                        <div 
                          className={\`w-24 h-24 bg-gradient-to-br from-slate-300 to-slate-500 absolute flex flex-col items-center justify-center font-bold text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-b-4 border-slate-600 rounded-md z-30 transition-all \${t4Animating ? 'animate-drop-weight' : 'duration-300 cursor-ns-resize hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}\`} 
                          style={{ 
                            top: t4Animating ? undefined : \`calc(10px + \${((80 - t4Height) / 80) * (100 - 150/5)}%)\`, 
                            '--drop-start': \`calc(10px + \${((80 - t4Height) / 80) * (100 - 150/5)}%)\`,
                            '--drop-duration': \`\${Math.max(0.4, Math.sqrt(t4Height/80) * 0.8)}s\`
                          } as React.CSSProperties}
                        >`;

const newWeight = `
                        {/* Interactive Weight */}
                        <div 
                          className={\`w-24 h-24 bg-gradient-to-br from-slate-300 to-slate-500 absolute flex flex-col items-center justify-center font-bold text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.5)] border-b-4 border-slate-600 rounded-md z-30 transition-all \${t4Animating ? 'animate-drop-weight' : 'duration-300 cursor-ns-resize hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}\`} 
                          onMouseDown={(e) => {
                             if (t4Animating) return;
                             setIsDragging(true);
                          }}
                          style={{ 
                            top: t4Animating ? undefined : \`calc(10px + \${((80 - t4Height) / 80) * (100 - 20)}%)\`, 
                            '--drop-start': \`calc(10px + \${((80 - t4Height) / 80) * (100 - 20)}%)\`,
                            '--drop-duration': \`\${Math.max(0.4, Math.sqrt(t4Height/80) * 0.8)}s\`
                          } as React.CSSProperties}
                        >`;

// Need to update the component to handle dragging.
// I need to add 'isDragging' state, 'setIsDragging' state.
// And handlers. This is complex because I have to inject it into the component scope.
// I'll try to find where to inject state first.

// Inject state
const stateTarget = `  const [t4Height, setT4Height] = useState<number>(50); // Height in cm (10 to 50)`;
const newState = `  const [t4Height, setT4Height] = useState<number>(50); // Height in cm (10 to 80)
  const [isDragging, setIsDragging] = useState(false);`;

code = code.replace(stateTarget, newState);

// Inject handlers inside the component.
// I'll add them after the resetT4 function.
const handlerTarget = `  const resetT4 = () => {
     setT4KuprumTrials([]);
     setT4GangsaTrials([]);
     setT4Dent(null);
     setT4Height(50);
  };`;

const newHandlers = handlerTarget + `

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Get the container
      const container = document.querySelector('.t4-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      // Map mouse Y to 0-80 range. 
      // Need precise mapping. 
      const newHeight = Math.max(0, Math.min(80, ((rect.height - 150 - mouseY) / (rect.height - 200)) * 80));
      setT4Height(Math.round(newHeight * 100) / 100);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);`;

code = code.replace(handlerTarget, newHandlers);

// Add className to container
const containerTarget = `<div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex justify-center items-end relative overflow-hidden h-[500px]">`;
const containerWithClass = `<div className="w-full md:w-2/3 bg-slate-950 border border-slate-800 rounded-xl p-8 flex justify-center items-end relative overflow-hidden h-[500px] t4-container">`;
code = code.replace(containerTarget, containerWithClass);

code = code.replace(targetSlider, newWeight);

fs.writeFileSync('src/components/LiveGamificationStudio.tsx', code);
console.log('Patched T4 drag and drop');
