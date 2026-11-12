import zipfile, re, sys
path = sys.argv[1]
z = zipfile.ZipFile(path)
media = [n for n in z.namelist() if n.startswith('word/media/')]
print("[media]", media, file=sys.stderr)
xml = z.read('word/document.xml').decode('utf-8', 'ignore')
paras = re.split(r'</w:p>', xml)
out = []
for p in paras:
    texts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', p, re.S)
    line = ''.join(texts)
    line = re.sub(r'<[^>]+>', '', line)
    if line.strip():
        out.append(line)
tb = re.findall(r'<w:txbxContent>(.*?)</w:txbxContent>', xml, re.S)
for t in tb:
    texts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', t, re.S)
    line = ''.join(texts)
    line = re.sub(r'<[^>]+>', '', line)
    if line.strip():
        out.append("[TB] "+line)
print("\n".join(out))
