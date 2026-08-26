import os
import re

PATTERNS = ["mock", "dummy", "fake", "sample", "hardcoded", "Coming Soon", "TODO", "placeholder"]

EXCLUDE_DIRS = {".git", "node_modules", "dist", ".pytest_cache", "__pycache__", "build"}

def scan_codebase():
    results = {
        "Production functionality": [],
        "Test fixtures": [],
        "Development-only tooling": [],
        "Decorative/mock UI": [],
    }

    base_dir = "c:\\Users\\Windows\\CareSync"
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if not f.endswith((".ts", ".tsx", ".py", ".html", ".css", ".md", ".json")):
                continue
            rel_path = os.path.relpath(os.path.join(root, f), base_dir)
            if "brain" in rel_path or "scratch" in rel_path:
                continue

            filepath = os.path.join(root, f)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                    for line_num, line in enumerate(fh, 1):
                        for pat in PATTERNS:
                            if re.search(r'\b' + re.escape(pat) + r'\b', line, re.IGNORECASE) or pat in line:
                                entry = f"{rel_path}:{line_num} — {line.strip()[:100]}"
                                
                                # Categorization logic
                                if "test" in rel_path.lower() or f.startswith("test_"):
                                    results["Test fixtures"].append(entry)
                                elif "dev" in rel_path.lower() or "seed" in rel_path.lower() or "dev_otp" in line:
                                    results["Development-only tooling"].append(entry)
                                elif f.endswith((".tsx", ".ts", ".html")) and any(k in line.lower() for k in ["mock", "dummy", "coming soon", "todo", "placeholder"]):
                                    results["Decorative/mock UI"].append(entry)
                                else:
                                    results["Production functionality"].append(entry)
                                break
            except Exception:
                pass

    return results

if __name__ == "__main__":
    res = scan_codebase()
    print("=== CARESYNC CODEBASE MOCK & PLACEHOLDER AUDIT ===")
    for category, entries in res.items():
        print(f"\n--- {category} ({len(entries)} instances) ---")
        for e in entries[:15]:
            clean_e = e.encode('ascii', 'ignore').decode('ascii')
            print(f"  - {clean_e}")
        if len(entries) > 15:
            print(f"  ... and {len(entries) - 15} more.")
