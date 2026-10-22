"""Pure geological constructors. No scene work occurs on import."""
from common import *
import random

SPECS={
 'right_near':(1,-210.,44.,94.,58.,.6,120),
 'left_near':(-1,-210.,106.,84.,70.,1.7,140),
 'left_far':(-1,100.,285.,108.,86.,3.9,92),
 'right_far':(1,40.,265.,70.,82.,.6,104),
}

def hash1(i,seed):
    a=(i*374761393+seed*668265263)&0xffffffff
    a=((a^(a>>13))*1274126177)&0xffffffff
    return ((a^(a>>16))&0xffffffff)/4294967295.

def noise(x,seed):
    i=math.floor(x);t=x-i;t=t*t*(3-2*t)
    return (hash1(i,seed)*(1-t)+hash1(i+1,seed)*t)*2-1

def noise2(x,z,seed):
    i=math.floor(z);t=z-i;t=t*t*(3-2*t)
    return noise(x,seed+i*79)*(1-t)+noise(x,seed+(i+1)*79)*t

def sharp_normals(o):
    bm=bmesh.new();bm.from_mesh(o.data)
    for e in bm.edges:
        if e.is_manifold:e.smooth=e.calc_face_angle()<.64
    bm.to_mesh(o.data);bm.free();o.data.update()

def finish(name,vs,fs,col):
    mats=[bpy.data.materials['pbr_rock__bdwall'],bpy.data.materials['pbr_rock__bdwet']]
    o=mesh(name,vs,fs,col,mats,smooth=True,uv_scale=11.)
    # Explicit basis is required for hidden parentless sources.
    for p in o.data.polygons:
        zs=[(o.matrix_basis@o.data.vertices[i].co).z for i in p.vertices]
        assert not(min(zs)<.22-1e-5 and max(zs)>.22+1e-5)
        p.material_index=int(max(zs)<=.22+1e-5)
        # Continuous vertical bedding coordinates; avoid per-face axis switching.
        for li in p.loop_indices:
            q=o.matrix_basis@o.data.vertices[o.data.loops[li].vertex_index].co
            if abs(p.normal.z)<.7:o.data.uv_layers.active.data[li].uv=((q.y+.17*q.x)/11.,q.z/11.)
    sharp_normals(o);return o

def cliff(col,which,suffix='fractured_v03'):
    side,y0,y1,height,width,phase,segments=SPECS[which]
    seed=SEED+int(phase*100)+int(y1)
    rng=random.Random(seed);n=segments+1
    # Uneven vertical joints divide a continuous closed bank into visible masses.
    joints=[];y=y0-14
    while y<y1+18:
        joints.append((y,rng.uniform(1.5,3.8),rng.uniform(4.5,10.5),rng.uniform(-.09,.09)))
        y+=rng.uniform(13,29)
    strata=[];z=8.
    while z<height*1.4:
        strata.append((z,rng.uniform(.4,1.2),rng.uniform(.4,1.5)));z+=rng.uniform(7,17)
    # Dense visible face; sparse rear avoids spending half the budget off camera.
    levels=[-3.,0.,.22,1.2,3.6,7.]+[9.+(height-9.)*i/38 for i in range(39)]
    vs=[];fs=[];front=[];back=[]
    ys=[y0+(y1-y0)*i/segments for i in range(n)]
    def h_at(y):return height*(.95+.19*noise(y/39,seed)+.105*noise(y/13,seed+4)+.035*noise(y/5,seed+21))
    for i,y in enumerate(ys):
        h=h_at(y);row=[]
        for j,z0 in enumerate(levels):
            z=z0 if z0<=7 else 7+(z0-7)/(height-7)*(h-7)
            t=max(0,z/h);flood=min(1,max(0,(z-.22)/10))
            macro=-3.5*noise(y/28,seed+2)-2*noise(y/9,seed+3)
            relief=3.2*noise2(y/13,z/18,seed+5)+1.4*noise2(y/4.8,z/8,seed+6)
            cuts=sum(depth*math.exp(-((y-(cy+tilt*z))/w)**2) for cy,w,depth,tilt in joints)
            ledges=sum(-amp*math.exp(-((z-(cz+1.9*noise(y/21,seed+int(cz))))/w)**2) for cz,w,amp in strata)
            retreat=19*max(0,(t-.52)/.48)**1.45
            x=bank_x(side,y)+side*(macro+flood*(relief+cuts+ledges)+retreat-1.2*math.exp(-((z-1.5)/1.6)**2))
            row.append(len(vs));vs.append((x,y,z))
        front.append(row)
        rear=[]
        for z in [-3.,0.,.22,h+width*.48+7*noise(y/31,seed+30)]:
            rear.append(len(vs));vs.append((bank_x(side,y)+side*width,y,z))
        back.append(rear)
    shoulders=[];across=7
    for i,y in enumerate(ys):
        a=Vector(vs[front[i][-1]]);b=Vector(vs[back[i][-1]]);row=[front[i][-1]]
        for k in range(1,across):
            t=k/across;p=a.lerp(b,t)
            p.z+=math.sin(math.pi*t)*(5.5*noise2(y/14,t*4,seed+91)+2.1*noise2(y/5,t*8,seed+92))
            row.append(len(vs));vs.append(tuple(p))
        row.append(back[i][-1]);shoulders.append(row)
    top_faces=[]
    for i in range(n-1):
        for j in range(len(levels)-1):fs.append((front[i][j],front[i+1][j],front[i+1][j+1],front[i][j+1]))
        for j in range(3):fs.append((back[i+1][j],back[i][j],back[i][j+1],back[i+1][j+1]))
        fs.append((front[i][0],back[i][0],back[i+1][0],front[i+1][0]))
        for k in range(across):
            top_faces.append(len(fs));fs.append((shoulders[i][k],shoulders[i+1][k],shoulders[i+1][k+1],shoulders[i][k+1]))
    for i in [0,n-1]:
        fs.extend([(front[i][0],front[i][1],back[i][1],back[i][0]),(front[i][1],front[i][2],back[i][2],back[i][1])])
        fs.append(tuple(front[i][2:]+shoulders[i][1:-1]+list(reversed(back[i][2:]))))
    o=finish('src_cliff_'+which+'_'+suffix,vs,fs,col)
    for pi in top_faces:
        for li in o.data.polygons[pi].loop_indices:
            p=o.matrix_basis@o.data.vertices[o.data.loops[li].vertex_index].co;o.data.uv_layers.active.data[li].uv=(p.x/11.,p.y/11.)
    # Triangulate only end caps; the source face grid stays editable.
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
    return o,{'parameters':SPECS[which],'joints':joints,'bedding':strata,'frontColumns':n,'frontLevels':len(levels),'rearLevels':4,'shoulderSpans':across}

def promontory(col):
    n=112;seed=SEED+751;vs=[];fs=[]
    levels=[-3.,0.,.22,1.2,3.6,6.,10.,15.,21.,28.,36.,44.,51.,57.,61.,63.]
    for j,z in enumerate(levels):
        t=j/(len(levels)-1)
        for i in range(n):
            a=math.tau*i/n;u=i/n
            # Top radius supports the complete square terrace; lower faces have deep joints.
            detail=(1-t)**.65*(.10*noise(math.cos(a)*5+math.sin(a)*7,seed)+.045*noise(i/3,seed+3))
            flare=1.07-.12*t+detail
            flare+=.018*noise2(i/7,z/6,seed+8)*(1-t)
            vs.append((CITY[0]+42*math.cos(a)*flare,CITY[1]+43*math.sin(a)*flare,z))
    for j in range(len(levels)-1):
        for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    # Centre fans keep the closed caps free of export-ngon ambiguity.
    for j in [0,len(levels)-1]:
        k=len(vs);vs.append((CITY[0],CITY[1],levels[j]))
        for i in range(n):fs.append((k,j*n+i,j*n+(i+1)%n))
    return finish('src_city_promontory_fractured_v03',vs,fs,col)
