import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

# Add dynamic simulations to allSimulations
target = """  const allSimulations: Record<string, any[]> = {
    'Tingkatan 1': [ { id: 'sim_ketumpatan', title: 'Ketumpatan', icon: <Layers className="w-6 h-6 text-blue-400" />, desc: 'Mengkaji ketumpatan pepejal/cecair' } ],
    'Tingkatan 2': [ { id: 'sim_bandul', title: 'Bandul Ringkas (Benchmark)', icon: <Timer className="w-6 h-6 text-fuchsia-400" />, desc: 'Simulasi interaktif bandul Lovable' } ],
    'Tingkatan 3': [],
    'Tingkatan 4': [],
    'Tingkatan 5': []
  };"""

replacement = """  const allSimulations: Record<string, any[]> = {
    'Tingkatan 1': [ { id: 'sim_ketumpatan', title: 'Ketumpatan (Demo)', icon: <Layers className="w-6 h-6 text-blue-400" />, desc: 'Mengkaji ketumpatan pepejal/cecair' } ],
    'Tingkatan 2': [ { id: 'sim_bandul', title: 'Bandul Ringkas (Demo)', icon: <Timer className="w-6 h-6 text-fuchsia-400" />, desc: 'Simulasi interaktif bandul Lovable' } ],
    'Tingkatan 3': [],
    'Tingkatan 4': [],
    'Tingkatan 5': []
  };
  
  if (simulasiList && simulasiList.length > 0) {
    simulasiList.forEach((sim, idx) => {
      const form = sim.tingkatan || 'Tingkatan 1';
      if (!allSimulations[form]) {
        allSimulations[form] = [];
      }
      allSimulations[form].push({
        id: `sim_db_${idx}`,
        title: sim.bab,
        icon: <FlaskConical className="w-6 h-6 text-cyan-400" />,
        desc: `Ciptaan: ${sim.namaGuru}`,
        html: sim.html
      });
    });
  }"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
