# v5.34 · uso: python3 ferramentas/impressao/pdfx.py imagem-rgb.png perfil-cmyk.icc saida.pdf "Título". A imagem já com a sangria
# (A5 + 3 mm: 154 x 216 mm; a 400 dpi, 2425 x 3402 px). O perfil usado no QR do Noel foi o FOGRA39 do registro da
# color.org (https://www.color.org/registry/profiles/Coated_Fogra39L_VIGC_300.icc), que não mora no repositório (8 MB).
# PDF/X-1a:2001 de uma imagem: converte RGB -> CMYK pelo perfil FOGRA39 (Coated_Fogra39L_VIGC_300, color.org), põe a
# imagem CMYK (sem transparência, sem fonte, sem RGB) numa página com MediaBox/BleedBox = A5 + 3 mm de sangria e
# TrimBox = A5, e escreve o OutputIntent GTS_PDFX com o perfil embutido, o Info com GTS_PDFXVersion/Conformance e
# Trapped, e o ID no trailer. PDF 1.3, como o X-1a:2001 pede.
import sys, zlib, hashlib, datetime
from PIL import Image, ImageCms
src, icc, out, titulo = sys.argv[1:5]
mm = 72 / 25.4
W, H, B = 154 * mm, 216 * mm, 3 * mm
im = Image.open(src).convert('RGB')
tr = ImageCms.buildTransform(ImageCms.createProfile('sRGB'), ImageCms.getOpenProfile(icc), 'RGB', 'CMYK',
                             renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC, flags=ImageCms.Flags.BLACKPOINTCOMPENSATION)
cmyk = ImageCms.applyTransform(im, tr)
dados = zlib.compress(cmyk.tobytes(), 9)
perfil = open(icc, 'rb').read(); perfilZ = zlib.compress(perfil, 9)
agora = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
d = agora.strftime("D:%Y%m%d%H%M%S-03'00'")
pdfstr = lambda s: '(' + s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)') + ')'
conteudo = f'q {W:.4f} 0 0 {H:.4f} 0 0 cm /Im0 Do Q'.encode()
obj = {}
obj[1] = b'<< /Type /Catalog /Pages 2 0 R /OutputIntents [5 0 R] >>'
obj[2] = b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
obj[3] = (f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {W:.4f} {H:.4f}] /BleedBox [0 0 {W:.4f} {H:.4f}] '
          f'/TrimBox [{B:.4f} {B:.4f} {W - B:.4f} {H - B:.4f}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 6 0 R >>').encode()
obj[4] = (f'<< /Type /XObject /Subtype /Image /Width {cmyk.width} /Height {cmyk.height} /ColorSpace /DeviceCMYK '
          f'/BitsPerComponent 8 /Filter /FlateDecode /Length {len(dados)} >>\nstream\n').encode() + dados + b'\nendstream'
obj[5] = (b'<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (FOGRA39) /RegistryName (http://www.color.org) '
          b'/OutputCondition (Offset printing, according to ISO 12647-2:2004/Amd 1, OFCOM, paper type 1 or 2 = coated art, 115 g/m2) '
          b'/Info (Coated FOGRA39) /DestOutputProfile 7 0 R >>')
obj[6] = f'<< /Length {len(conteudo)} >>\nstream\n'.encode() + conteudo + b'\nendstream'
obj[7] = f'<< /N 4 /Filter /FlateDecode /Length {len(perfilZ)} >>\nstream\n'.encode() + perfilZ + b'\nendstream'
obj[8] = (f'<< /Title {pdfstr(titulo)} /Author (Corre) /Creator (Corre) /Producer (Corre pdfx.py) /CreationDate ({d}) /ModDate ({d}) '
          f'/Trapped /False /GTS_PDFXVersion (PDF/X-1a:2001) /GTS_PDFXConformance (PDF/X-1a:2001) >>').encode('latin-1', 'replace')
saida = bytearray(b'%PDF-1.3\n%\xe2\xe3\xcf\xd3\n'); pos = {}
for n in sorted(obj):
    pos[n] = len(saida); saida += f'{n} 0 obj\n'.encode() + obj[n] + b'\nendobj\n'
xref = len(saida)
saida += f'xref\n0 {len(obj) + 1}\n0000000000 65535 f \n'.encode()
for n in sorted(obj): saida += f'{pos[n]:010d} 00000 n \n'.encode()
ident = hashlib.md5(bytes(saida[:4096]) + d.encode()).hexdigest().upper()
saida += f'trailer\n<< /Size {len(obj) + 1} /Root 1 0 R /Info 8 0 R /ID [<{ident}> <{ident}>] >>\nstartxref\n{xref}\n%%EOF\n'.encode()
open(out, 'wb').write(saida)
print(out, len(saida) // 1024, 'KB', cmyk.size, cmyk.mode)
