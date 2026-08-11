import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "interface LiveGamificationStudioProps {",
    "import { SimulasiData } from '../lib/sheets';\n\ninterface LiveGamificationStudioProps {"
)

content = content.replace(
    "questions?: SoalanData[];",
    "questions?: SoalanData[];\n  simulasiList?: SimulasiData[];"
)

content = content.replace(
    "export default function LiveGamificationStudio({ userEmail, userName, classes, questions = [], onSaveToBank, onSaveSimulasi }: LiveGamificationStudioProps) {",
    "export default function LiveGamificationStudio({ userEmail, userName, classes, questions = [], simulasiList = [], onSaveToBank, onSaveSimulasi }: LiveGamificationStudioProps) {"
)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
