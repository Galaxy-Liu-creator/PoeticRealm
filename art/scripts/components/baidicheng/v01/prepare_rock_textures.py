"""Bake explicit color/roughness factors into revision-local maps; preserve originals."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
base,rough,destination=map(Path,sys.argv[1:4]);destination.mkdir(parents=True,exist_ok=True)
srgb=np.asarray(Image.open(base).convert('RGB'),dtype=np.float64)/255
linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
roughness=np.asarray(Image.open(rough).convert('L'),dtype=np.float64)/255
rows=[]
for name,color,factor in [('dry',[.70,.81,.78],.94),('wet',[.33,.43,.39],.34)]:
    values=np.clip(linear*np.asarray(color),0,1)
    encoded=np.where(values<=.0031308,values*12.92,1.055*values**(1/2.4)-.055)
    color_path=destination/(name+'_basecolor.jpg');rough_path=destination/(name+'_roughness.png')
    Image.fromarray(np.rint(encoded*255).astype('uint8')).save(color_path,quality=95,subsampling=0)
    Image.fromarray(np.rint(np.clip(roughness*factor,0,1)*255).astype('uint8')).save(rough_path)
    rows.append({'name':name,'linearColorFactor':color,'roughnessFactor':factor,'baseColor':str(color_path),'roughness':str(rough_path)})
(destination/'processing.json').write_text(json.dumps({'sourceSHA256':{'baseColor':hashlib.sha256(base.read_bytes()).hexdigest(),'roughness':hashlib.sha256(rough.read_bytes()).hexdigest()},'maps':rows},indent=2)+'\n')
