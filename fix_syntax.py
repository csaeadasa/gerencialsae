import subprocess
import re

MAX_ITER = 50

for i in range(MAX_ITER):
    result = subprocess.run(
        ["npx", "eslint", "src/components/TomadaSubsidiosTab.tsx"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"Success after {i} iterations!")
        break
        
    match = re.search(r"TomadaSubsidiosTab\.tsx\s+(\d+):\d+", result.stdout)
    if not match:
        print("Could not find line number in output:")
        print(result.stdout)
        break
        
    line_num = int(match.group(1))
    
    with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
        lines = f.readlines()
        
    if line_num - 1 < len(lines):
        line = lines[line_num - 1]
        print(f"Fixing line {line_num}: {line.repr() if hasattr(line, 'repr') else repr(line)}")
        if line.strip() == ")}":
            lines[line_num - 1] = line.replace(")}", "})}")
            with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
                f.writelines(lines)
            print("Fixed!")
        elif line.strip() == ");":
            lines[line_num - 1] = line.replace(");", ")")
            with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
                f.writelines(lines)
            print("Fixed ); to )!")
        elif line.strip() == ">":
            lines[line_num - 1] = line.replace(">", "}>")
            with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
                f.writelines(lines)
            print("Fixed > to }>!")
        else:
            print("Unknown syntax error at this line, cannot autofix.")
            break
    else:
        print("Line number out of bounds.")
        break
