"""Revise ONE shoulder component after the first real-browser review."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import cliff
which=sys.argv[sys.argv.index('--')+1]
col=collection('bd_v02_shoulders_'+which);o,details=cliff(col,which,'shoulders_v02')
checked(o);target=bpy.data.objects['cliff_'+which];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
save_component(col,{**details,'publishedNode':target.name,'revision':'seven-span eroded shoulder, continuous top UV'})
