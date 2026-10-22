"""Build one named bank section. Each invocation checks and saves that component."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from cliff_tools import cliff,promontory
which=sys.argv[sys.argv.index('--')+1]
specs={
 'right_near':(1,-90,44,94,48,.6,72),
 'left_near':(-1,-90,106,84,64,1.7,70),
 'left_far':(-1,100,285,108,86,3.9,64),
 'right_far':(1,40,265,70,82,.6,64),
}
assert bpy.context.scene.get('bd_cliff_sample_detail_checked'),'Inspect the independent cliff prototype first'
col=collection('bd_cliff_'+which)
if which=='right_near':
    bpy.data.collections['bd_cliff_sample_detail'].hide_render=True;bpy.data.collections['bd_cliff_sample_detail'].hide_viewport=True
if which=='city':o=promontory(col,'src_city_promontory')
else:o=cliff(col,'src_cliff_'+which,*specs[which])
save_component(col,{'section':which,'parameters':specs.get(which),'wetLineMeters':.22,'prototype':'bd_cliff_sample_detail'})
