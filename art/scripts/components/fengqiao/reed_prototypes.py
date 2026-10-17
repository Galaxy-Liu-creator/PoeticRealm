"""C06: three reed tufts below 500 triangles, with bent blades and panicles."""
import bpy,sys,math,random
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c
import importlib;importlib.reload(c)
col=c.component('reed_prototypes','nature');root=bpy.data.objects.new('reed_prototype_root',None);col.objects.link(root);root.location=(24,0,0)
mat=c.solid('pbr_foliage__reed',(.25,.205,.115),.88)
for variant,count in enumerate((12,10,9)):
    rng=random.Random(c.P['seed']+500+variant);part=c.Part('reed_prototype_'+str(variant),col,root,mat,surface=True)
    for j in range(count):
        a=j*2.399;rad=rng.uniform(.03,.35);x=math.cos(a)*rad;y=math.sin(a)*rad;h=rng.uniform(.8,1.38);dx=math.cos(a)*.10;dy=math.sin(a)*.10
        points=[(x,y,0),(x+dx*.25,y+dy*.25,h*.55),(x+dx,y+dy,h)]
        part.tube(points,[.012,.010,.004],4,weight=lambda i:(points[i//4][2]/1.5)**2)
        for sign in (-1,1):
            z=h*(.3 if sign<0 else .53);length=rng.uniform(.32,.5);direction=a+sign*1.1
            dxl=math.cos(direction)*length;dyl=math.sin(direction)*length
            wx=-math.sin(direction)*.032;wy=math.cos(direction)*.032
            verts=[(x,y,z),(x+dxl*.5+wx,y+dyl*.5+wy,z+.14),(x+dxl*.5-wx,y+dyl*.5-wy,z+.14),(x+dxl,y+dyl,z-.06)]
            part.add(verts,[(0,1,2),(1,3,2)],weight=min(1,z/1.5)**2)
        part.tube([(x+dx,y+dy,h-.16),(x+dx,y+dy,h+.04)],[.042,.014],3,weight=min(1,h/1.5)**2)
    obj=part.mesh();obj.location.x+=variant*1.7;obj['static']=False;obj['behavior']='sway';obj['amp']=.14;obj['freq']=1.1;obj['phase']=.73
c.verify(col,open_surfaces=tuple('src_reed_prototype_'+str(i) for i in range(3)))
c.checkpoint('c06-reed-prototypes-v02','CAM_nature')
