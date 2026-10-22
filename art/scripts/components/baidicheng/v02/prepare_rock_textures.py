"""Revision-local limestone color treatment of registered CC0 Rock 01 derivatives."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[5];source=root/'art/textures/baidicheng-v01';dest=root/'art/textures/baidicheng-v02';dest.mkdir(parents=True,exist_ok=False)
rows=[]
for role,factor,tint in [('dry',1.38,[.95,1.,1.025]),('wet',.96,[.92,1.,1.04])]:
    src=source/(role+'_basecolor.jpg');srgb=np.asarray(Image.open(src).convert('RGB'),dtype=np.float64)/255
    linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
    luminance=np.sum(linear*np.array([.2126,.7152,.0722]),axis=2,keepdims=True)
    treated=np.clip((linear*.18+luminance*.82)*factor*np.array(tint),0,1)
    encoded=np.where(treated<=.0031308,treated*12.92,1.055*treated**(1/2.4)-.055)
    path=dest/(role+'_basecolor.jpg');Image.fromarray(np.rint(encoded*255).astype('uint8')).save(path,quality=95,subsampling=0)
    rows.append({'role':role,'source':str(src.relative_to(root)),'sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'linearDesaturation':.82,'linearBrightness':factor,'linearTint':tint,'output':str(path.relative_to(root)),'outputSHA256':hashlib.sha256(path.read_bytes()).hexdigest()})
(dest/'processing.json').write_text(json.dumps({'sourceLicense':'CC0, registered Rock 01; see CREDITS','normalAndRoughness':'unchanged v01 pixels','maps':rows},indent=2)+'\n')
print('Prepared v02 limestone maps')
