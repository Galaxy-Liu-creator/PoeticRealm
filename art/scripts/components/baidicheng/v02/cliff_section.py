"""Build and validate ONE bank component, then replace that published mesh."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import cliff
which=sys.argv[sys.argv.index('--')+1]
col=collection('bd_v02_cliff_'+which);o,details=cliff(col,which)
checked(o)
target=bpy.data.objects['cliff_'+which]
target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
save_component(col,{**details,'publishedNode':target.name,'revision':'fractured buttresses / recessed shoulders / sparse rear grid'})
