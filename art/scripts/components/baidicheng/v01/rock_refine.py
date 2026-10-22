"""C refinement: resolve near-cliff strata while retaining the first prototype."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from cliff_tools import cliff
old=bpy.data.collections['bd_cliff_sample'];old.hide_viewport=True;old.hide_render=True
col=collection('bd_cliff_sample_detail')
o=cliff(col,'src_cliff_near_right_detail',1,-35,44,94,width=48,phase=.6,segments=48)
save_component(col,{'wetLineMeters':.22,'verticalRings':66,'strata':'real submeter ledges, longitudinal buttress fractures','cap':'matched cross-channel strips'})
