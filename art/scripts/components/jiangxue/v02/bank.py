"""One component: continuous eroded shore contour and layered rock shoulder."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_bank');parent=bpy.data.objects['shore_root']
rows=99;columns=65;vertices=[]
for j in range(rows):
    y=-40+230*j/(rows-1)
    for i in range(columns):
        d=95*(i/(columns-1))**1.75;x=edge(y)+d
        vertices.append((x,y,ground(x,y)))
rock=bpy.data.materials['pbr_rock__jxbank']
shell_grid('shore_bank_v02',vertices,rows,columns,col,rock,parent)
finish(col,extra={'waterline':0,'heightFunction':'common_v02.ground','variableWaterEdge':True,'continuousRockShoulder':True})
view('CAM_enter')
