import sys
import re

with open("src/components/LiveGamificationStudio.tsx", "r") as f:
    content = f.read()

# Add browser fullscreen effect
old_state = "  const [isFullscreen, setIsFullscreen] = useState(false);"
new_state = """  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const toggleFullscreen = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };"""
content = content.replace(old_state, new_state)

with open("src/components/LiveGamificationStudio.tsx", "w") as f:
    f.write(content)
