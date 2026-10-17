"""Reproducible 8-bit delivery maps from the preserved CC0 linen source; no source overwrites."""
import os
from PIL import Image, ImageEnhance, ImageOps
root=os.environ.get('POETIC_ASSET_ROOT','D:/University-Competition/Math_Media/PoeticRealm')
path=root+'/art/textures/fengqiao-v03/'
base=Image.open(path+'rough_linen_Diffuse_1k.png').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
# Worn indigo: reduce saturation and value while retaining the photographed weave.
base=ImageEnhance.Color(base).enhance(.58)
base=ImageEnhance.Brightness(base).enhance(.65)
base.save(path+'linen_work_basecolor.jpg',quality=93,subsampling=0)
Image.open(path+'rough_linen_nor_gl_1k.png').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS).save(path+'linen_normal.png',optimize=True)
ImageOps.grayscale(Image.open(path+'rough_linen_Rough_1k.png')).resize((1024,1024),Image.Resampling.LANCZOS).save(path+'linen_roughness.png',optimize=True)
print('Prepared 1024px BaseColor JPEG, tangent-space Normal RGB8 and Roughness L8; originals retained.')
