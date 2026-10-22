"""Pure constructors for one geological mass at a time."""
from common import *

def rock_materials():
    if bpy.data.materials.get('pbr_rock__bdwall'):return [bpy.data.materials['pbr_rock__bdwall'],bpy.data.materials['pbr_rock__bdwet']]
    with bpy.data.libraries.load(str(ROOT/'art/blender/fengqiao-scene-v02.blend'),link=False) as (a,b):
        names=[n for n in a.materials if n.startswith('pbr_rock') and 'wet' not in n]
        assert names;b.materials=[names[0]]
    source=b.materials[0];dry=source.copy();dry.name='pbr_rock__bdwall'
    bsdf=next(n for n in dry.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(.84,.79,.67,1)
    bsdf.inputs['Roughness'].default_value=.88
    wet=dry.copy();wet.name='pbr_rock__bdwet'
    bsdf=next(n for n in wet.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(.40,.47,.41,1)
    bsdf.inputs['Roughness'].default_value=.28
    # Shared original texture pixels, distinct factors; inputs remain normal/roughness PBR.
    return [dry,wet]

def cliff(col,name,side,y0,y1,height,width=45,phase=0,segments=64):
    """A closed layered bluff. Longitudinal buttresses and strata are real geometry."""
    materials=rock_materials();n=segments+1
    footprint=[]
    for i in range(n):
        y=y0+(y1-y0)*i/(n-1)
        x=bank_x(side,y)+side*(5*math.sin(y*.061+phase)+2.4*math.sin(y*.19+phase*.7))
        footprint.append((x,y,True))
    for i in reversed(range(n)):
        y=y0+(y1-y0)*i/(n-1)
        footprint.append((bank_x(side,y)+side*width,y,False))
    # Exact wet-line rings prevent a facewise sawtooth material boundary.
    levels=[-3.,0.,.22,1.2,3.2]+[4+(height-4)*i/60 for i in range(61)]
    vertices=[]
    for z0 in levels:
        for x,y,front in footprint:
            h=height*(.89+.12*math.sin(y*.023+phase)+.07*math.sin(y*.061+1.7*phase))
            if not front:h+=35+18*math.sin(y*.018+phase)
            z=z0 if z0<=3.2 else z0/height*h
            shift=(.17*math.sin(z*.91+y*.17+2*math.sin(y*.07))+.19*math.sin(z*.43+y*.08)+.25*math.sin(z*.19+y*.04)) if z>.22 else 0
            shift-=.75*abs(math.sin(y*.24+phase+.15*math.sin(z*.03)))**18
            erosion=-2.4*math.exp(-((z-1.2)/2.8)**2)
            taper=-(max(0,z/h-.70)/.30)**1.4*7.5
            xx=x+side*(shift+erosion+taper) if front else x
            vertices.append((xx,y,z))
    ring=len(footprint);faces=[]
    for j in range(len(levels)-1):
        for i in range(ring):faces.append((j*ring+i,j*ring+(i+1)%ring,(j+1)*ring+(i+1)%ring,(j+1)*ring+i))
    for i in range(n-1):
        faces.append((i,ring-1-i,ring-2-i,i+1))
        top=(len(levels)-1)*ring
        faces.append((top+i,top+i+1,top+ring-2-i,top+ring-1-i))
    o=mesh(name,vertices,faces,col,materials,smooth=True,uv_scale=5.)
    for p in o.data.polygons:
        z=sum((o.matrix_basis@o.data.vertices[i].co).z for i in p.vertices)/len(p.vertices)
        p.material_index=int(z<.22-1e-5)
    return o

def promontory(col,name):
    materials=rock_materials();n=64;levels=[-3.,0.,.22,2.,5.,12.,23.,36.,49.,59.,63.]
    vertices=[]
    for j,z in enumerate(levels):
        for i in range(n):
            a=math.tau*i/n
            # Broad, flat-topped city support with an irregular water-side face.
            r=1+.035*math.sin(5*a)+.024*math.cos(9*a)
            flare=1.07-.12*j/(len(levels)-1)
            vertices.append((CITY[0]+42*math.cos(a)*r*flare,CITY[1]+43*math.sin(a)*r*flare,z))
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(levels)-1) for i in range(n)]
    faces.extend([tuple(reversed(range(n))),tuple((len(levels)-1)*n+i for i in range(n))])
    o=mesh(name,vertices,faces,col,materials,smooth=True,uv_scale=5.)
    for p in o.data.polygons:p.material_index=int(sum((o.matrix_basis@o.data.vertices[i].co).z for i in p.vertices)/len(p.vertices)<.22-1e-5)
    return o
