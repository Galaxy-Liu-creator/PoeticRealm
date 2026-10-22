"""Extend one near-bank component behind the overview camera; keep earlier revisions."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from cliff_tools import cliff
which=sys.argv[sys.argv.index('--')+1];assert which in ['right_near','left_near']
old=bpy.data.objects['cliff_'+which];col=collection('bd_cliff_'+which+'_framed')
spec=(1,-210,44,94,48,.6,72) if which=='right_near' else (-1,-210,106,84,64,1.7,70)
o=cliff(col,'src_cliff_'+which+'_framed',*spec)
old.data=o.data.copy();old.matrix_basis=o.matrix_basis.copy();old['static']=True
save_component(col,{'section':which,'parameters':spec,'purpose':'put the geological end cap behind the overview camera','publishedNode':old.name})
