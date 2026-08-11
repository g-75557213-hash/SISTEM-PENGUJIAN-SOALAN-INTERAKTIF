import sys

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

target = """  const [isFullscreen, setIsFullscreen] = useState(false);"""
replacement = """  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    if (onActiveSimulationChange) {
      onActiveSimulationChange(!!selectedApp);
    }
  }, [selectedApp, onActiveSimulationChange]);"""

content = content.replace(target, replacement)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
