"""C: a single independently inspected near-cliff component."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from cliff_tools import cliff
col=collection('bd_cliff_sample')
o=cliff(col,'src_cliff_near_right',1,-35,44,94,width=48,phase=.6,segments=48)
save_component(col,{'waterLevel':0,'wetLineMeters':.22,'side':'right','yRange':[-35,44],'heightMeters':94,'source':'original stratified closed loft; registered Rock 01 pixels'})
