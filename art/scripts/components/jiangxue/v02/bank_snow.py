"""One component: a closed snow mantle following the inspected curved bank."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_bank_snow',('jx_v02_bank',));rows=99;columns=65;top=[];bottom=[]
snow=bpy.data.materials['pbr_snow__fresh'].copy();snow.name='pbr_snow__driftv02'
normal=next(n for n in snow.node_tree.nodes if n.type=='NORMAL_MAP');normal.inputs['Strength'].default_value=1.0
depths=[]
for j in range(rows):
    y=-40+230*j/(rows-1);start=3.35+.58*math.sin(y*.14)+.28*math.sin(y*.41)
    for i in range(columns):
        d=start+(95-start)*(i/(columns-1))**1.75;x=edge(y)+d;z=ground(x,y)
        depth=.08+.16*(.5+.5*math.sin(y*.071+x*.18))+.025*math.sin(x*1.9+y*.4)
        top.append((x,y,z+depth));bottom.append((x,y,z-.008));depths.append(depth+.008)
count=len(top);faces=[(j*columns+i,j*columns+i+1,(j+1)*columns+i+1,(j+1)*columns+i) for j in range(rows-1) for i in range(columns-1)]
faces+= [tuple(reversed(tuple(i+count for i in face))) for face in list(faces)]
perimeter=[*range(columns),*(j*columns+columns-1 for j in range(1,rows)),*((rows-1)*columns+i for i in range(columns-2,-1,-1)),*(j*columns for j in range(rows-2,0,-1))]
for j,index in enumerate(perimeter):
    nxt=perimeter[(j+1)%len(perimeter)];faces.append((index,nxt,nxt+count,index+count))
mesh('shore_snow_v02',top+bottom,faces,col,snow,bpy.data.objects['shore_root'])
finish(col,extra={'thicknessMetres':[min(depths),max(depths)],'support':'common_v02.ground','exposedRockCliff':True,'varyingSnowEdge':True})
view('CAM_enter')
