import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { saveQuestionToSheets, getQuestionsFromSheets, SoalanData, syncSubmissionsToSheets } from './lib/sheets';",
    "import { saveQuestionToSheets, getQuestionsFromSheets, SoalanData, syncSubmissionsToSheets, saveSimulasiToSheets } from './lib/sheets';"
)

func_to_add = """  const handleSaveGeneratedToBankFromStudio = async (newQuestion: {
    idSoalan: string;
    namaGuru: string;
    tingkatan: string;
    subjek: string;
    bab: string;
    sp: string;
    html: string;
  }) => {
    if (!token) {
      alert("Sila log masuk dengan akaun Google anda terlebih dahulu.");
      return;
    }
    await saveQuestionToSheets(token, newQuestion, spreadsheetId);
    const updated = await getQuestionsFromSheets(token, spreadsheetId);
    setQuestions(updated);
  };

  const handleSaveSimulasi = async (newSim: {
    namaGuru: string;
    tingkatan: string;
    bab: string;
    html: string;
  }) => {
    if (!token) {
      alert("Sila log masuk dengan akaun Google anda terlebih dahulu.");
      return;
    }
    await saveSimulasiToSheets(token, newSim, spreadsheetId);
  };"""

content = content.replace(
"""  const handleSaveGeneratedToBankFromStudio = async (newQuestion: {
    idSoalan: string;
    namaGuru: string;
    tingkatan: string;
    subjek: string;
    bab: string;
    sp: string;
    html: string;
  }) => {
    if (!token) {
      alert("Sila log masuk dengan akaun Google anda terlebih dahulu.");
      return;
    }
    await saveQuestionToSheets(token, newQuestion, spreadsheetId);
    const updated = await getQuestionsFromSheets(token, spreadsheetId);
    setQuestions(updated);
  };""",
  func_to_add
)

content = content.replace(
    "onSaveToBank={handleSaveGeneratedToBankFromStudio}",
    "onSaveToBank={handleSaveGeneratedToBankFromStudio}\n          onSaveSimulasi={handleSaveSimulasi}"
)

with open("src/App.tsx", "w") as f:
    f.write(content)
