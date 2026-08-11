import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const [t2Angle, setT2Angle] = useState(0);",
    "const [t2Angle, setT2Angle] = useState(-30 * (Math.PI / 180));"
)

content = content.replace(
    "setT2Angle(0);",
    "setT2Angle(-t2MaxAngle);"
)

content = content.replace(
    "setT2Angle(t2MaxAngle);",
    "setT2Angle(-t2MaxAngle);"
)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
