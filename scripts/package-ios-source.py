"""New reproducible source handoff; no dependency directory or signing material."""
import json
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
output = root / 'releases' / f'Frontline-{version}-iOS-Source.zip'
output.parent.mkdir(exist_ok=True)
files = [root / name for name in ['package.json', 'pnpm-lock.yaml', 'capacitor.config.ts', 'tsconfig.json', 'vite.config.ts', 'index.html', 'duel.html', '.gitignore', '.env.example']]
files += list(root.glob('*.md'))
for directory in ['src', 'server', 'public', 'scripts', 'ios', 'dist', '.github']:
    for file in (root / directory).rglob('*'):
        if not file.is_file() or file.is_symlink(): continue
        if any(part in {'node_modules', 'build', 'DerivedData', 'xcuserdata', 'Pods', '__pycache__'} for part in file.relative_to(root).parts): continue
        if file.suffix in {'.p12', '.mobileprovision', '.pem', '.key', '.ipa'} or file.name.startswith('.env'): continue
        files.append(file)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(set(files)):
        archive.write(file, Path('frontline') / file.relative_to(root))
    if archive.testzip() is not None: raise SystemExit('Archive integrity check failed.')
print(f'Source package, not an IPA: {output}')
