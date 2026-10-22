"""Only assemble the three already checked detail components into independent LOD roots."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();roots=[]
for suffix in ['', '_lod']:
    name='city_detail'+suffix;assert name not in bpy.data.objects
    root=bpy.data.objects.new(name,None);bpy.data.collections[EXPORT].objects.link(root);root.matrix_basis=Matrix.Translation(Vector(CITY));root['static']=True;roots.append(root)
for kind in ['support','joinery','roof']:
    assert active().get('bd_v03_city_'+('roof_detail' if kind=='roof' else kind)+'_checked')
    for level,root in zip(['detail','coarse'],roots):
        src=bpy.data.objects['src_city_'+kind+'_'+level+'_v03'];checked(src);publish(src,'city_'+kind+'_'+level,root)
entries=json.loads(active()['distance_lods_json']);entries.append({'near':'city_detail','far':'city_detail_lod','distance':180.});active()['distance_lods_json']=json.dumps(entries)
report('components/city-detail-assembly.json',{'roots':[r.name for r in roots],'components':['support','joinery','roof'],'distanceMeters':180.,'worldOrigin':CITY,'geometryCreated':False})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
