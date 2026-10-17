"""B05: four hip-roof sectors with real rounded tile ribs, lips and chiwei."""
import bpy,sys,math
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
c.active()
if bpy.context.scene.get('roof_revision',0)>=2: raise RuntimeError('Roof revision 2 already exists')
old=bpy.data.collections.get('architecture_roof')
if old:
    old.name='architecture_roof_v01'
    for obj in old.objects: obj.name+='_v01'
for obj in bpy.data.collections[c.EXPORT].objects:
    if obj.type=='MESH' and any(m.name=='pbr_tile__charcoal' for m in obj.data.materials): obj.hide_set(True);obj.hide_render=True
col=c.component("architecture_roof","temple")
tile=c.solid("pbr_tile__charcoal",(.085,.105,.117),.84)

def sector(part,s,side,sign):
    hw=s["width"]/2+s["eave"];hd=s["depth"]/2+s["eave"]
    ridge=max(.8,(s["width"]-s["depth"])/2)
    nu=round((2*hw if side=="front" else 2*hd)/.24)*2
    # Keep every tile rib and the eave silhouette. Six slope intervals differ
    # from the analytic curve by less than 45 mm, including corner uplift.
    nt=6
    for u in (0,1):
        curve=lambda t:s['bracket_top']+(s['roof_ridge']-s['bracket_top'])*t**1.3+.32*(1-t)**4*u**6
        for sample in range(601):
            t=sample/600*.985;i=min(nt-1,int(t/.985*nt));a=i/nt*.985;b=(i+1)/nt*.985
            approximation=curve(a)+(curve(b)-curve(a))*(t-a)/(b-a)
            assert abs(curve(t)-approximation)<.045,'Roof curve error exceeds 45 mm'
    verts=[]
    for layer in (0,1):
        for i in range(nt+1):
            t=i/nt*.985
            for j in range(nu+1):
                u=-1+2*j/nu
                if side=="front": x=u*(hw*(1-t)+ridge*t);y=sign*hd*(1-t)
                else: x=sign*(hw*(1-t)+ridge*t);y=u*hd*(1-t)
                z=s["bracket_top"]+(s["roof_ridge"]-s["bracket_top"])*t**1.3+.32*(1-t)**4*abs(u)**6
                z+=.025*(1-t)*(1+math.cos(j*math.pi))
                verts.append((x,y,z-layer*.14))
    faces=[];n=(nu+1)*(nt+1)
    for i in range(nt):
        for j in range(nu):
            a=i*(nu+1)+j;b=a+1;d=(i+1)*(nu+1)+j;cc=d+1
            faces += [(a,b,cc,d),(a+n,d+n,cc+n,b+n)]
    boundary=list(range(nu+1))+[(i+1)*(nu+1)+nu for i in range(nt)]+list(reversed(range(nt*(nu+1),nt*(nu+1)+nu)))+[i*(nu+1) for i in range(nt-1,0,-1)]
    faces += [(a,b,b+n,a+n) for a,b in zip(boundary,boundary[1:]+boundary[:1])]
    part.add(verts,faces)
    # Rounded eave tiles are geometry visible against the sky, not a flat map.
    for j in range(0,nu,2):
        a=verts[j];b=verts[j+2]
        part.tube([a,((a[0]+b[0])/2,(a[1]+b[1])/2,a[2]+.055),b],.035,6)

for owner,root_name in [("temple","temple_main"),("tower","bell_tower")]:
    s=c.P[owner];part=c.Part(owner+"_tile_roof",col,bpy.data.objects[root_name],tile)
    for side in ("front","side"):
        for sign in (-1,1): sector(part,s,side,sign)
    ridge=max(.8,(s["width"]-s["depth"])/2)
    part.tube([(-ridge-.12,0,s["roof_ridge"]+.03),(ridge+.12,0,s["roof_ridge"]+.03)],.15,10)
    for sign in (-1,1):
        part.tube([(sign*ridge,0,s["roof_ridge"]+.05),(sign*(ridge+.14),0,s["roof_ridge"]+.48),
                   (sign*(ridge+.08),0,s["roof_ridge"]+.86),(sign*(ridge-.24),0,s["roof_ridge"]+1.02)],[.16,.15,.12,.035],8)
    roof=part.mesh()
    for p in roof.data.polygons: p.use_smooth=True
c.verify(col)
bpy.context.scene['roof_revision']=2
c.checkpoint("b05-roof-v02","CAM_temple")
