import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """  if (simulasiList && simulasiList.length > 0) {
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

replacement = """  if (simulasiList && simulasiList.length > 0) {
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
    
    // Sort each tingkatan by tajuk (title)
    Object.keys(allSimulations).forEach(form => {
      allSimulations[form].sort((a, b) => a.title.localeCompare(b.title));
    });
  }"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
