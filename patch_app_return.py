import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """    await saveSimulasiToSheets(token, newSim, spreadsheetId);
    const sims = await getSimulasiFromSheets(token, spreadsheetId);
    setSimulasiList(sims);"""

replacement = """    const res = await saveSimulasiToSheets(token, newSim, spreadsheetId);
    const sims = await getSimulasiFromSheets(token, spreadsheetId);
    setSimulasiList(sims);
    return res;"""

content = content.replace(target, replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)
