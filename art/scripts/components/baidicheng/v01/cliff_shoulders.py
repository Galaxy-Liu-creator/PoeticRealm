"""Refine one bank crown into a sloped mountain shoulder, then update its published mesh."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from cliff_tools import cliff
which=sys.argv[sys.argv.index('--')+1]
specs={'right_near':(1,-210,44,94,48,.6,72),'left_near':(-1,-210,106,84,64,1.7,70),'left_far':(-1,100,285,108,86,3.9,64),'right_far':(1,40,265,70,82,.6,64)}
col=collection('bd_cliff_'+which+'_shoulder');o=cliff(col,'src_cliff_'+which+'_shoulder',*specs[which])
target=bpy.data.objects['cliff_'+which];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
save_component(col,{'section':which,'parameters':specs[which],'outerShoulderRiseMeters':[17,53],'strata':'irregular phases and reduced repetitive ledges','publishedNode':target.name})
