"""Convert bundled Kenney OBJ assets to a file://-friendly script; no runtime fetch."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
assets = root / 'assets' / 'kenney'
models = []
for name in ['rock_tallA', 'rock_tallB', 'rock_tallF']:
    vertices, faces, normals = [], [], []
    for line in (assets / (name + '.obj')).read_text().splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == 'v':
            vertices.append(list(map(float, parts[1:4])))
        elif parts[0] == 'vn':
            normals.append(list(map(float, parts[1:4])))
        elif parts[0] == 'f':
            refs = [p.split('/') for p in parts[1:]]
            for i in range(1, len(refs) - 1):
                tri = [refs[0], refs[i], refs[i + 1]]
                faces.append({'indices': [int(r[0])-1 for r in tri],
                              'normal': normals[int(tri[0][2])-1]})
    assert vertices and faces
    assert all(0 <= i < len(vertices) for f in faces for i in f['indices'])
    models.append({'name': name, 'vertices': vertices, 'faces': faces})
(assets / 'rocks.js').write_text('// Kenney Nature Kit 2.1 / CC0. See License.txt and ATTRIBUTION.md.\n'
                               + 'globalThis.RockAssets=' + json.dumps(models, separators=(',', ':')) + ';\n')
print('Prepared:', ', '.join('{}: {} triangles'.format(m['name'], len(m['faces'])) for m in models))
