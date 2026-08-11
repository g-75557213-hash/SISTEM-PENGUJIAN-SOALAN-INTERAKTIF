import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Add state
target_state = "  const [systemMode, setSystemMode] = useState<'soalan_interaktif' | 'live_gamification'>('soalan_interaktif');"
replacement_state = """  const [systemMode, setSystemMode] = useState<'soalan_interaktif' | 'live_gamification'>('soalan_interaktif');
  const [isSimulationActive, setIsSimulationActive] = useState(false);"""
content = content.replace(target_state, replacement_state)

# 2. Add onActiveSimulationChange to LiveGamificationStudio
target_lgs = "          onSaveSimulasi={handleSaveSimulasi}\n        />"
replacement_lgs = """          onSaveSimulasi={handleSaveSimulasi}
          onActiveSimulationChange={setIsSimulationActive}
        />"""
content = content.replace(target_lgs, replacement_lgs)

# 3. Hide Dual Mode Selector
target_selector = "      {/* DUAL MODE SELECTOR (Moved outside header) */}\n      <div className=\"bg-slate-900 border-b border-slate-800 shadow-sm z-10 relative\">"
replacement_selector = """      {/* DUAL MODE SELECTOR (Moved outside header) */}
      {!isSimulationActive && (
        <div className="bg-slate-900 border-b border-slate-800 shadow-sm z-10 relative">"""
content = content.replace(target_selector, replacement_selector)

# Close the !isSimulationActive div
target_selector_end = """              </button>
            </div>
          )}
        </div>
      </div>"""
replacement_selector_end = """              </button>
            </div>
          )}
        </div>
      </div>
      )}"""
content = content.replace(target_selector_end, replacement_selector_end)

with open("src/App.tsx", "w") as f:
    f.write(content)
