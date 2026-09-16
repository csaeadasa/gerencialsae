import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix the login redirect
login_check_target = """  // Redirect anonymous users to Login page unless they are using a shared public route
  if (!currentUser && !isPublicMode) {
    return <LoginPage />;
  }"""

login_check_replacement = """  // Redirect anonymous users to Login page unless they are using a shared public route or presentation mode
  const isTvMode = typeof window !== 'undefined' && window.location.search.includes('modo=tv');
  if (!currentUser && !isPublicMode && !isTvMode) {
    return <LoginPage />;
  }"""

content = content.replace(login_check_target, login_check_replacement)

# 2. Add the import for PresentationControls
import_target = """import { LoginPage } from "./components/LoginPage";"""
import_replacement = """import { LoginPage } from "./components/LoginPage";
import { PresentationControls } from "./components/PresentationMode";"""

if "import { PresentationControls" not in content:
    content = content.replace(import_target, import_replacement)

# 3. Add the PresentationControls component to the render output
# It should be added before the ending `</div>` of the App component.
# Let's find: `</AnimatePresence>\n      </main>\n    </div>`
render_target = """      </main>
    </div>"""

render_replacement = """      </main>
      
      {presentationConfig.isActive && (
        <PresentationControls 
          config={presentationConfig} 
          currentIndex={presentationIndex} 
          onNext={handlePresentationNext} 
          onPrev={handlePresentationPrev} 
          onExit={() => {
            window.location.search = "";
            window.location.hash = "";
            setPresentationConfig({ ...presentationConfig, isActive: false });
          }} 
        />
      )}
    </div>"""

if "<PresentationControls" not in content:
    content = content.replace(render_target, render_replacement)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
