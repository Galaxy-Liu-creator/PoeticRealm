"""C01: two closed banks with submerged toes, a wet lip and broad dry slope."""
import bpy,sys
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c, natural_parameters as n
import importlib;importlib.reload(c)
col=c.component('shore_profile','shore');root=c.get_root('shore_root',(0,0,0))
soil=c.solid('pbr_rock__silt',(.075,.10,.087),.96)
for side in (-1,1):
    for role,mat,rows in [('wet',c.material('pbr_stone__wet'),[0,.6]),('dry',soil,[.6,1.8,None])]:
        part=c.Part('bank_'+('left' if side<0 else 'right')+'_'+role,col,root,mat)
        vertices=[]
        for y,l,r in n.STATIONS:
            x0=l if side<0 else r
            for u in rows:
                x=(-38 if side<0 else 38) if u is None else x0+side*u
                vertices.append((x,y,n.ground(x,y,side)))
        count=len(vertices);vertices += [(x,y,-1.6) for x,y,z in vertices]
        width=len(rows);length=len(n.STATIONS);faces=[]
        for i in range(length-1):
            for j in range(width-1):
                a=i*width+j;b=a+1;d=(i+1)*width+j;cc=d+1
                faces.extend([(a,b,cc,d),(a+count,d+count,cc+count,b+count)])
        rim=list(range(width))+[i*width+width-1 for i in range(1,length)]+list(reversed(range((length-1)*width,(length-1)*width+width-1)))+[i*width for i in range(length-2,0,-1)]
        faces += [(a,b,b+count,a+count) for a,b in zip(rim,rim[1:]+rim[:1])]
        part.add(vertices,faces);part.mesh()
c.verify(col);c.checkpoint('c01-smooth-shore','CAM_enter')
