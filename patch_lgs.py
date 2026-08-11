import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "onSaveToBank: (newQuestion: any) => Promise<void>;",
    "onSaveToBank: (newQuestion: any) => Promise<void>;\n  onSaveSimulasi: (newSim: any) => Promise<void>;"
)

content = content.replace(
    "export default function LiveGamificationStudio({ userEmail, userName, classes, questions = [], onSaveToBank }: LiveGamificationStudioProps) {",
    "export default function LiveGamificationStudio({ userEmail, userName, classes, questions = [], onSaveToBank, onSaveSimulasi }: LiveGamificationStudioProps) {"
)

content = content.replace(
    "await onSaveToBank(newSim);",
    "await onSaveSimulasi(newSim);"
)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
