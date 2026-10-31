# o fim do gera.cjs: o favicon.ico com 16, 32 e 48 dentro, sem transparência no do iPhone e no do Android (o celular corta), e tudo pro site/
import os, shutil
from PIL import Image
o = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
site = os.path.join(o, '..', '..', '..', 'site')
ims = [Image.open(os.path.join(o, f'f{n}.png')).convert('RGBA') for n in (48, 32, 16)]
ims[0].save(os.path.join(o, 'favicon.ico'), sizes=[(48, 48), (32, 32), (16, 16)], append_images=ims[1:])
for f in ['apple-touch-icon.png', 'icon-maskable-512.png', 'icon-maskable-192.png']:
  Image.open(os.path.join(o, f)).convert('RGB').save(os.path.join(o, f), optimize=True)
for f in ['icon-512.png', 'icon-192.png', 'badge-96.png']:
  Image.open(os.path.join(o, f)).save(os.path.join(o, f), optimize=True)
for f in ['icon-512.png', 'icon-192.png', 'icon-maskable-512.png', 'icon-maskable-192.png', 'apple-touch-icon.png', 'badge-96.png', 'favicon.ico', 'favicon.svg']:
  shutil.copy(os.path.join(o, f), os.path.join(site, f))
print('ícones no site/')
