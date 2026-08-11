import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

# Import SimulasiData and getSimulasiFromSheets
content = content.replace(
    "import { saveQuestionToSheets, getQuestionsFromSheets, SoalanData, syncSubmissionsToSheets, saveSimulasiToSheets } from './lib/sheets';",
    "import { saveQuestionToSheets, getQuestionsFromSheets, SoalanData, syncSubmissionsToSheets, saveSimulasiToSheets, getSimulasiFromSheets, SimulasiData } from './lib/sheets';"
)

# Add state
old_state = "  const [questions, setQuestions] = useState<SoalanData[]>([]);"
new_state = """  const [questions, setQuestions] = useState<SoalanData[]>([]);
  const [simulasiList, setSimulasiList] = useState<SimulasiData[]>([]);"""
content = content.replace(old_state, new_state)

# Load simulasi data
old_load = """      const qs = await getQuestionsFromSheets(accessToken, targetSheetId);
      setQuestions(qs);
      successCount++;"""
new_load = """      const qs = await getQuestionsFromSheets(accessToken, targetSheetId);
      setQuestions(qs);
      const sims = await getSimulasiFromSheets(accessToken, targetSheetId);
      setSimulasiList(sims);
      successCount++;"""
content = content.replace(old_load, new_load)

# Reload on save
old_save = """    await saveSimulasiToSheets(token, newSim, spreadsheetId);
  };"""
new_save = """    await saveSimulasiToSheets(token, newSim, spreadsheetId);
    const sims = await getSimulasiFromSheets(token, spreadsheetId);
    setSimulasiList(sims);
  };"""
content = content.replace(old_save, new_save)

# Pass to component
old_comp = """        <LiveGamificationStudio questions={questions}
          userEmail={user?.email || undefined}
          userName={user?.displayName || undefined}
          classes={classes}
          onSaveToBank={handleSaveGeneratedToBankFromStudio}
          onSaveSimulasi={handleSaveSimulasi}
        />"""
new_comp = """        <LiveGamificationStudio questions={questions}
          simulasiList={simulasiList}
          userEmail={user?.email || undefined}
          userName={user?.displayName || undefined}
          classes={classes}
          onSaveToBank={handleSaveGeneratedToBankFromStudio}
          onSaveSimulasi={handleSaveSimulasi}
        />"""
content = content.replace(old_comp, new_comp)

with open("src/App.tsx", "w") as f:
    f.write(content)
