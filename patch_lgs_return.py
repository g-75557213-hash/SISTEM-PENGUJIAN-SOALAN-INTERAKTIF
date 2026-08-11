import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target_props = "  onSaveSimulasi: (newSim: any) => Promise<void>;"
replacement_props = "  onSaveSimulasi: (newSim: any) => Promise<any>;"
content = content.replace(target_props, replacement_props)

target_save = """      await onSaveSimulasi(newSim);
      alert('Simulasi berjaya disimpan!');"""
replacement_save = """      const res = await onSaveSimulasi(newSim);
      if (res && res.linkSimulasi) {
        alert(`Simulasi berjaya disimpan!\\n\\nID: ${res.idSimulasi}\\nLink: ${res.linkSimulasi}`);
      } else {
        alert('Simulasi berjaya disimpan!');
      }"""
content = content.replace(target_save, replacement_save)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
